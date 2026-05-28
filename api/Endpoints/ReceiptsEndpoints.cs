using System.Net.Http.Headers;
using System.Text.Json;
using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class ReceiptEndpoints
{
    public static void MapReceiptEndpoints(this WebApplication app)
    {
        // Upload + parse a receipt image.
        // Returns parsed data including blobUrl — caller (frontend) keeps this
        // in state and attaches it when creating the order.
        app.MapPost("/api/receipts/parse", async (
            HttpContext ctx,
            IFormFile file,
            BlobService blobs,
            IHttpClientFactory httpFactory,
            IConfiguration config) =>
        {
            // Guests are allowed to upload receipts (full guest flow per brief)
            // so we don't gate on auth here.

            if (file is null || file.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            if (!file.ContentType.StartsWith("image/"))
                return Results.BadRequest(new { error = "File must be an image" });

            if (file.Length > 10 * 1024 * 1024)
                return Results.BadRequest(new { error = "Image too large — max 10 MB" });

            // 1. Upload to Azure Blob first so we always have the original image
            //    even if OCR fails. We can retry parsing later if needed.
            string blobUrl;
            using (var stream = file.OpenReadStream())
            {
                blobUrl = await blobs.UploadAsync(stream, file.FileName, file.ContentType);
            }

            // 2. Forward the same image to the Python OCR service
            var ocrBaseUrl  = config["OcrService:BaseUrl"]
                ?? throw new InvalidOperationException("OcrService:BaseUrl not configured");
            var sharedSecret = config["OcrService:SharedSecret"] ?? "dev-secret";

            var http = httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(90); // OCR can take 60-90s on Container Apps cold start

            using var multipart = new MultipartFormDataContent();
            using var fileStream = file.OpenReadStream();
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
            multipart.Add(fileContent, "file", file.FileName);

            var req = new HttpRequestMessage(HttpMethod.Post, $"{ocrBaseUrl}/parse-receipt")
            {
                Content = multipart
            };
            req.Headers.Add("x-shared-secret", sharedSecret);

            HttpResponseMessage ocrResponse;
            try
            {
                ocrResponse = await http.SendAsync(req);
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: $"OCR service unreachable: {ex.Message}",
                    statusCode: 502);
            }

            if (!ocrResponse.IsSuccessStatusCode)
            {
                var body = await ocrResponse.Content.ReadAsStringAsync();
                return Results.Problem(
                    detail: $"OCR service error: {body}",
                    statusCode: (int)ocrResponse.StatusCode);
            }

            // 3. Deserialize Python JSON → C# Receipt model
            var json = await ocrResponse.Content.ReadAsStringAsync();
            var parsed = JsonSerializer.Deserialize<Receipt>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (parsed is null)
                return Results.Problem("Failed to parse OCR response", statusCode: 500);

            // 4. Stamp server-side fields and return
            parsed.BlobUrl  = blobUrl;
            parsed.ParsedAt = DateTime.UtcNow;

            return Results.Ok(parsed);
        }).DisableAntiforgery(); // multipart upload from non-form clients (fetch/axios)

        // Retrieve a stored receipt by orderId (used by order detail page)
        app.MapGet("/api/receipts/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return Results.Unauthorized();

            var receipt = await cosmos.GetAsync<Receipt>("receipts", orderId, orderId);
            return receipt is null
                ? Results.NotFound()
                : Results.Ok(receipt);
        });
    }
}