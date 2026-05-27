using LocalsZaApi.Models;
using LocalsZaApi.Services;
using Azure.Storage.Blobs.Models;

namespace LocalsZaApi.Endpoints;

public static class AdminEndpoints
{
    private static IResult Forbidden()
        => Results.Json(new { error = "Admin access required" }, statusCode: 403);

    public static void MapAdminEndpoints(this WebApplication app)
    {
        // ── Dashboard summary ────────────────────────────────────────────────
        app.MapGet("/api/admin/dashboard", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var since = DateTime.UtcNow.AddDays(-7).ToString("o");

            var orders   = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.createdAt >= @since ORDER BY c.createdAt DESC",
                new() { ["@since"] = since });

            var payments = await cosmos.QueryAsync<Payment>("payments",
                "SELECT * FROM c WHERE c.createdAt >= @since",
                new() { ["@since"] = since });

            var pendingReceipts = await cosmos.QueryAsync<Receipt>("receipts",
                "SELECT * FROM c WHERE c.status = 'pending'");

            var activeStatuses = new HashSet<string> { "confirmed", "accepted", "arrivedAtPickup", "loaded", "assigned" };

            return Results.Ok(new
            {
                ordersThisWeek   = orders.Count,
                activeDeliveries = orders.Count(o => activeStatuses.Contains(o.Status)),
                pendingReceipts  = pendingReceipts.Count,
                weeklyRevenue    = payments.Where(p => p.Status == "complete").Sum(p => p.Amount),
                recentOrders     = orders.Take(10),
            });
        });

        // ── All orders ───────────────────────────────────────────────────────
        app.MapGet("/api/admin/orders", async (HttpContext ctx, CosmosService cosmos,
            string? status, int limit = 100) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var sql = status is not null
                ? $"SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC OFFSET 0 LIMIT {limit}"
                : $"SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT {limit}";

            var parms = status is not null
                ? new Dictionary<string, object> { ["@status"] = status }
                : null;

            var orders = await cosmos.QueryAsync<Order>("orders", sql, parms);
            return Results.Ok(new { orders });
        });

        // ── All payments ─────────────────────────────────────────────────────
        app.MapGet("/api/admin/payments", async (HttpContext ctx, CosmosService cosmos,
            int limit = 100) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var payments = await cosmos.QueryAsync<Payment>("payments",
                $"SELECT * FROM c ORDER BY c.created_at DESC OFFSET 0 LIMIT {limit}");

            return Results.Ok(new { payments });
        });

        // ── All receipts ─────────────────────────────────────────────────────
        app.MapGet("/api/admin/receipts", async (HttpContext ctx, CosmosService cosmos,
            string? status) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var sql = status is not null
                ? "SELECT * FROM c WHERE c.status = @status ORDER BY c.parsedAt DESC"
                : "SELECT * FROM c ORDER BY c.parsedAt DESC";

            var parms = status is not null
                ? new Dictionary<string, object> { ["@status"] = status }
                : null;

            var receipts = await cosmos.QueryAsync<Receipt>("receipts", sql, parms);
            return Results.Ok(new { receipts });
        });

        // ── Confirm / reject a receipt ───────────────────────────────────────
        app.MapPatch("/api/admin/receipts/{id}", async (HttpContext ctx, string id,
            CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var body = await ctx.Request.ReadFromJsonAsync<ReceiptReviewPatch>();
            if (body is null) return Results.BadRequest(new { error = "Missing body" });

            var receipts = await cosmos.QueryAsync<Receipt>("receipts",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = id });

            var receipt = receipts.FirstOrDefault();
            if (receipt is null) return Results.NotFound();

            receipt.Status     = body.Status;
            receipt.AdminNote  = body.Note;
            receipt.ReviewedAt = DateTime.UtcNow.ToString("o");

            if (body.Items is { Count: > 0 })
            {
                receipt.Items             = body.Items;
                receipt.EstimatedWeightKg = receipt.Items.Sum(i => i.EstimatedKg);
            }
            if (!string.IsNullOrEmpty(body.WeightClass))
                receipt.WeightClass = body.WeightClass;

            await cosmos.UpsertAsync("receipts", receipt, receipt.OrderId);
            return Results.Ok(receipt);
        });

        // ── Active deliveries ────────────────────────────────────────────────
        app.MapGet("/api/admin/deliveries", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.status != 'pending' ORDER BY c.updatedAt DESC");

            return Results.Ok(new { deliveries = orders });
        });

        // ── Assign driver to an order ────────────────────────────────────────
        app.MapPatch("/api/admin/deliveries/{orderId}/assign", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var body = await ctx.Request.ReadFromJsonAsync<AssignDriverPatch>();
            if (body is null) return Results.BadRequest(new { error = "Missing body" });

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            var order = orders.FirstOrDefault();
            if (order is null) return Results.NotFound();

            order.DriverId  = body.DriverId;
            order.Status    = "assigned";
            order.UpdatedAt = DateTime.UtcNow.ToString("o");

            var pk = order.UserId ?? order.GuestId ?? orderId;
            await cosmos.UpsertAsync("orders", order, pk);
            return Results.Ok(order);
        });

        // ── Driver revenue summary ───────────────────────────────────────────
        app.MapGet("/api/admin/drivers/revenue", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var drivers  = await cosmos.QueryAsync<Driver>("drivers", "SELECT * FROM c");
            var delivered = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.status = 'delivered'");

            var revenue = drivers.Select(d =>
            {
                var trips = delivered.Where(o => o.DriverId == d.DriverId).ToList();
                return new
                {
                    d.DriverId,
                    name             = d.FullName,
                    phone            = d.PhoneNumber,
                    completedTrips   = trips.Count,
                    estimatedPayout  = trips.Sum(o => o.DriverPayout),
                };
            });

            return Results.Ok(new { drivers = revenue });
        });

        // ── Logistics KPIs ───────────────────────────────────────────────────
        app.MapGet("/api/admin/metrics", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var since  = DateTime.UtcNow.AddDays(-30).ToString("o");
            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.createdAt >= @since",
                new() { ["@since"] = since });

            var delivered  = orders.Count(o => o.Status == "delivered");
            var cancelled  = orders.Count(o => o.Status == "cancelled");
            var total      = orders.Count;

            return Results.Ok(new
            {
                period           = "last30days",
                totalOrders      = total,
                deliveredOrders  = delivered,
                cancelledOrders  = cancelled,
                deliveryRate     = total > 0 ? Math.Round((double)delivered / total * 100, 1) : 0,
                cancellationRate = total > 0 ? Math.Round((double)cancelled / total * 100, 1) : 0,
            });
        });

        // ── Create driver account ────────────────────────────────────────────
        app.MapPost("/api/admin/drivers", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var body = await ctx.Request.ReadFromJsonAsync<CreateDriverBody>();
            if (body is null || string.IsNullOrWhiteSpace(body.FullName))
                return Results.BadRequest(new { error = "fullName is required" });

            var driverId = !string.IsNullOrWhiteSpace(body.DriverId)
                ? body.DriverId
                : $"DRV-{DateTime.UtcNow:yyMMddHHmmss}";

            var driver = new Driver
            {
                Id           = driverId,
                DriverId     = driverId,
                FullName     = body.FullName,
                Email        = body.Email ?? "",
                PhoneNumber  = body.PhoneNumber ?? "",
                VehicleType  = body.VehicleType ?? "bakkie",
                VehicleModel = body.VehicleModel ?? "",
                Status       = "offline",
                CreatedAt    = DateTime.UtcNow.ToString("o"),
            };

            var saved = await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            return Results.Created($"/api/drivers/{driver.DriverId}", saved);
        });

        // ── Upload store logo ────────────────────────────────────────────────
        app.MapPost("/api/admin/upload-logo", async (HttpContext ctx, IFormFile file, BlobService blobs) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            if (file is null || file.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            if (!file.ContentType.StartsWith("image/"))
                return Results.BadRequest(new { error = "File must be an image" });

            if (file.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { error = "Image too large — max 5 MB" });

            using var stream = file.OpenReadStream();
            var url = await blobs.UploadPublicAsync(stream, file.FileName, file.ContentType, "store-logos");
            return Results.Ok(new { url });
        }).DisableAntiforgery();

        // ── Get pricing config ───────────────────────────────────────────────
        app.MapGet("/api/admin/pricing", async (HttpContext ctx, PricingService pricing) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();
            var config = await pricing.GetConfigAsync();
            return Results.Ok(config);
        });

        // ── Save pricing config ──────────────────────────────────────────────
        app.MapPut("/api/admin/pricing", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) return Forbidden();

            var config = await ctx.Request.ReadFromJsonAsync<PricingConfig>();
            if (config is null) return Results.BadRequest(new { error = "Invalid config body" });

            config.Id        = "pricing";
            config.UpdatedAt = DateTime.UtcNow.ToString("o");

            await cosmos.UpsertAsync("config", config, "pricing");
            return Results.Ok(config);
        });
    }
}

// ── Patch / body record types ────────────────────────────────────────────────
record ReceiptReviewPatch(string Status, string? Note, List<ReceiptItem>? Items, string? WeightClass);
record AssignDriverPatch(string DriverId);
record CreateDriverBody(
    string FullName,
    string? DriverId,
    string? Email,
    string? PhoneNumber,
    string? VehicleType,
    string? VehicleModel
);
