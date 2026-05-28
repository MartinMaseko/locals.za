using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this WebApplication app)
    {
        // POST /api/payment/initiate/{orderId}
        // Returns the URL + hidden form fields the frontend POSTs to Ozow.
        // Auth optional — guests can pay too.
        app.MapPost("/api/payment/initiate/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos,
            OzowService ozow,
            IConfiguration config) =>
        {
            var uid = AuthHelpers.GetUid(ctx); // null = guest, that's fine

            // Load the order. For authed users we know the partition key (uid);
            // for guests we have to query by id across partitions.
            Order? order;
            if (uid is not null)
            {
                order = await cosmos.GetAsync<Order>("orders", orderId, uid);
            }
            else
            {
                var rows = await cosmos.QueryAsync<Order>("orders",
                    "SELECT * FROM c WHERE c.id = @id",
                    new() { ["@id"] = orderId });
                order = rows.FirstOrDefault();
            }

            if (order is null)
                return Results.NotFound(new { error = "Order not found" });

            if (order.Total <= 0)
                return Results.BadRequest(new { error = "Order has no payable amount" });

            // Email comes from Firebase claims for authed users.
            // Guests can pass it on the order if needed — fall back to empty.
            var customerEmail = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            var baseAppUrl = config["AppBaseUrl"] ?? "http://localhost:5173";

            OzowInitiateResult result;
            try
            {
                result = ozow.Initiate(order, customerEmail, baseAppUrl);
            }
            catch (Exception ex)
            {
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }

            // Persist a pending Payment doc so the webhook can correlate later.
            var payment = new Payment
            {
                Id          = orderId,
                OrderId     = orderId,
                UserId      = order.UserId,
                Amount      = order.Total,
                Status      = "pending",
                RequestHash = result.Hash
            };
            await cosmos.UpsertAsync("payments", payment, orderId);

            return Results.Ok(new
            {
                postUrl = result.PostUrl,
                fields  = result.Fields
            });
        });

        // POST /api/payment/notify
        // Ozow's webhook (form-urlencoded). MUST be anonymous —
        // already in FirebaseAuthMiddleware skip list.
        app.MapPost("/api/payment/notify", async (
            HttpContext ctx,
            CosmosService cosmos,
            OzowService ozow,
            ILogger<Program> log) =>
        {
            var form = await ctx.Request.ReadFormAsync();
            var dict = form.ToDictionary(kv => kv.Key, kv => kv.Value.ToString());

            // Step 1: hash check
            if (!ozow.VerifyNotification(dict))
                return Results.BadRequest(new { error = "Invalid hash" });

            var orderId   = dict.GetValueOrDefault("TransactionReference") ?? "";
            var txnId     = dict.GetValueOrDefault("TransactionId");
            var status    = dict.GetValueOrDefault("Status")?.ToLowerInvariant() ?? "error";
            var statusMsg = dict.GetValueOrDefault("StatusMessage");

            if (string.IsNullOrEmpty(orderId))
                return Results.BadRequest(new { error = "Missing TransactionReference" });

            // Step 2: API cross-check (defends against spoofed callbacks
            // even if hash somehow passes)
            var apiStatus = await ozow.CheckTransactionStatusAsync(orderId);
            if (apiStatus is not null &&
                !string.Equals(apiStatus.Status, status, StringComparison.OrdinalIgnoreCase))
            {
                log.LogWarning("Ozow notify: status mismatch — notify={NotifyStatus} api={ApiStatus}",
                    status, apiStatus.Status);
                return Results.BadRequest(new { error = "Status mismatch with API" });
            }

            // Step 3: update the Payment doc
            var payment = await cosmos.GetAsync<Payment>("payments", orderId, orderId);
            if (payment is null)
            {
                log.LogWarning("Ozow notify: no Payment doc for order {OrderId} — acking anyway", orderId);
                return Results.Ok(); // ack to stop Ozow's retry loop
            }

            payment.OzowTransactionId = txnId;
            payment.Status            = status;
            payment.StatusMessage     = statusMsg;
            payment.UpdatedAt         = DateTime.UtcNow.ToString("o");
            await cosmos.UpsertAsync("payments", payment, orderId);

            // Step 4: flip the Order status based on Ozow's status code
            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });
            var order = orders.FirstOrDefault();
            if (order is not null)
            {
                order.Status = status switch
                {
                    "complete"             => "paid",
                    "cancelled"            => "cancelled",
                    "abandoned"            => "cancelled",
                    "error"                => "pending", // user can retry payment
                    "pendinginvestigation" => "pending",
                    _                      => order.Status
                };
                order.UpdatedAt = DateTime.UtcNow.ToString("o");
                var pk = order.UserId ?? order.GuestId!;
                await cosmos.UpsertAsync("orders", order, pk);
            }

            log.LogInformation("Ozow notify processed: order={OrderId} status={Status}", orderId, status);
            return Results.Ok();
        });

        // GET /api/payment/status/{orderId}
        // Frontend polls this after Ozow redirects back to /order/payment/success
        // because the SuccessUrl redirect can arrive before the notify webhook.
        app.MapGet("/api/payment/status/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos) =>
        {
            var payment = await cosmos.GetAsync<Payment>("payments", orderId, orderId);
            return payment is null
                ? Results.NotFound()
                : Results.Ok(payment);
        });
    }
}