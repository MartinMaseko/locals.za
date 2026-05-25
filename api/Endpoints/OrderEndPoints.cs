using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this WebApplication app)
    {
        // Create order — works for authenticated users AND guests
        app.MapPost("/api/orders", async (HttpContext ctx, Order order, CosmosService cosmos,
            NotificationService notifications) =>
        {
            var uid = AuthHelpers.GetUid(ctx);  // null = guest, that's fine

            order.Id        = Guid.NewGuid().ToString();
            order.UserId    = uid;
            order.GuestId   = uid is null ? Guid.NewGuid().ToString() : null;
            order.CreatedAt = DateTime.UtcNow.ToString("o");
            order.UpdatedAt = order.CreatedAt;
            order.Status    = "pending";

            // Partition key: authenticated → userId, guest → guestId
            var partitionKey = uid ?? order.GuestId!;
            order.UserId ??= partitionKey;   // keep partition key consistent

            var saved = await cosmos.UpsertAsync("orders", order, partitionKey);

            // Notify authenticated users (guests have no inbox)
            if (uid is not null)
                _ = notifications.SendOrderConfirmationAsync(uid, saved.Id, saved.Total);

            return Results.Created($"/api/orders/{saved.Id}", saved);
        });

        // Get single order
        app.MapGet("/api/orders/{id}", async (HttpContext ctx, string id, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id AND c.userId = @uid",
                new() { ["@id"] = id, ["@uid"] = uid });

            var order = orders.FirstOrDefault();
            if (order is null) { ctx.Response.StatusCode = 404; return; }
            await ctx.Response.WriteAsJsonAsync(order);
        });

        // List orders for current user
        app.MapGet("/api/orders", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.userId = @uid ORDER BY c.createdAt DESC",
                new() { ["@uid"] = uid });

            await ctx.Response.WriteAsJsonAsync(new { orders });
        });

        // Update order status (driver or admin)
        app.MapPatch("/api/orders/{id}/status", async (HttpContext ctx, string id,
            CosmosService cosmos, NotificationService notifications) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var body = await ctx.Request.ReadFromJsonAsync<StatusPatch>();
            if (body is null) { ctx.Response.StatusCode = 400; return; }

            // Find the order regardless of partition (admin/driver use case)
            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = id });

            var order = orders.FirstOrDefault();
            if (order is null) { ctx.Response.StatusCode = 404; return; }

            order.Status    = body.Status;
            order.UpdatedAt = DateTime.UtcNow.ToString("o");

            if (body.DriverId is not null) order.DriverId = body.DriverId;

            // Compute revenue split when delivered
            if (body.Status == "delivered")
            {
                order.PlatformFee  = Math.Round(order.DeliveryFee * 0.20m, 2);
                order.DriverPayout = Math.Round(order.DeliveryFee * 0.80m, 2);
            }

            var partitionKey = order.UserId ?? order.GuestId ?? order.Id;
            var updated = await cosmos.UpsertAsync("orders", order, partitionKey);

            // Notify the customer about the status change (fire-and-forget)
            var customerId = order.UserId;
            if (customerId is not null)
                _ = notifications.SendOrderStatusAsync(customerId, order.Id, body.Status);

            await ctx.Response.WriteAsJsonAsync(updated);
        });
    }
}

record StatusPatch(string Status, string? DriverId);