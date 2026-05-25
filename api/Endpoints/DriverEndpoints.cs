using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class DriverEndpoints
{
    public static void MapDriverEndpoints(this WebApplication app)
    {
        // Driver registers / updates their own profile
        app.MapPost("/api/drivers/register", async (HttpContext ctx,
            Driver driver, CosmosService cosmos) =>
        {
            driver.Id        = driver.FirebaseUid ?? Guid.NewGuid().ToString();
            driver.DriverId  = driver.DriverId == "" ? driver.Id : driver.DriverId;
            driver.CreatedAt = DateTime.UtcNow.ToString("o");
            var saved = await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            return Results.Created($"/api/drivers/{saved.Id}", saved);
        });

        // Get own profile
        app.MapGet("/api/drivers/me", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebaseUid = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }
            await ctx.Response.WriteAsJsonAsync(driver);
        });

        // Ping current location (called every 30s while on active job)
        app.MapPost("/api/drivers/me/location", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var body = await ctx.Request.ReadFromJsonAsync<LocationPing>();
            if (body is null) { ctx.Response.StatusCode = 400; return; }

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebaseUid = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            driver.CurrentLocation = new DriverLocation
            {
                Lat       = body.Lat,
                Lng       = body.Lng,
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };
            driver.Status = body.Status ?? driver.Status;

            await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            ctx.Response.StatusCode = 204;
        });

        // Accept an available order
        app.MapPost("/api/drivers/me/jobs/{orderId}/accept", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebaseUid = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            var order = orders.FirstOrDefault();
            if (order is null) { ctx.Response.StatusCode = 404; return; }

            if (order.DriverId is not null)
            {
                ctx.Response.StatusCode = 409;
                await ctx.Response.WriteAsJsonAsync(new { error = "Order already claimed" });
                return;
            }

            order.DriverId  = driver.DriverId;
            order.Status    = "accepted";
            order.UpdatedAt = DateTime.UtcNow.ToString("o");
            driver.Status   = "on_delivery";

            var pk = order.UserId ?? order.GuestId ?? order.Id;
            await cosmos.UpsertAsync("orders", order, pk);
            await cosmos.UpsertAsync("drivers", driver, driver.DriverId);

            await ctx.Response.WriteAsJsonAsync(order);
        });

        // Revenue summary for the driver dashboard
        app.MapGet("/api/drivers/me/revenue", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebaseUid = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            var completed = await cosmos.QueryAsync<Order>("orders",
                "SELECT c.driverPayout, c.createdAt FROM c WHERE c.driverId = @did AND c.status = 'delivered'",
                new() { ["@did"] = driver.DriverId });

            var today = DateTime.UtcNow.Date;
            var summary = new
            {
                today   = completed.Where(o => DateTime.Parse(o.CreatedAt).Date == today)
                                   .Sum(o => o.DriverPayout),
                week    = completed.Where(o => DateTime.Parse(o.CreatedAt) >= today.AddDays(-7))
                                   .Sum(o => o.DriverPayout),
                month   = completed.Where(o => DateTime.Parse(o.CreatedAt) >= today.AddDays(-30))
                                   .Sum(o => o.DriverPayout),
                allTime = completed.Sum(o => o.DriverPayout),
            };

            await ctx.Response.WriteAsJsonAsync(summary);
        });

        // Admin — list all drivers
        app.MapGet("/api/drivers", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
            {
                ctx.Response.StatusCode = 403;
                return;
            }
            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c ORDER BY c.fullName");
            await ctx.Response.WriteAsJsonAsync(drivers);
        });
    }
}

record LocationPing(double Lat, double Lng, string? Status);