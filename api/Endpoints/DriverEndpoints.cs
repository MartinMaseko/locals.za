using LocalsZaApi.Models;
using LocalsZaApi.Services;
using System.Security.Cryptography;
using System.Text;

namespace LocalsZaApi.Endpoints;

public static class DriverEndpoints
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Produces a salted SHA-256 hex hash of the driver's PIN.
    /// Salt = driver_id so identical PINs produce different hashes.
    /// </summary>
    static string HashPin(string driverId, string pin)
        => Convert.ToHexString(
               SHA256.HashData(Encoding.UTF8.GetBytes($"{driverId}:{pin}"))
           ).ToLower();

    /// <summary>
    /// Returns a copy of the driver document with pin_hash stripped out
    /// so it is never leaked to any client.
    /// </summary>
    static object SafeDriver(Driver d) => new
    {
        id           = d.Id,
        driver_id    = d.DriverId,
        firebase_uid = d.FirebaseUid,
        full_name    = d.FullName,
        email        = d.Email,
        phone_number = d.PhoneNumber,
        vehicle_type = d.VehicleType,
        vehicle_model= d.VehicleModel,
        status       = d.Status,
        created_at   = d.CreatedAt,
    };

    // ── Allowed status transitions for drivers ─────────────────────────────
    static readonly Dictionary<string, string> _nextStatus = new()
    {
        ["assigned"]       = "accepted",
        ["accepted"]       = "arrivedAtPickup",
        ["arrivedAtPickup"]= "loaded",
        ["loaded"]         = "delivered",
    };

    // ─────────────────────────────────────────────────────────────────────────

    public static void MapDriverEndpoints(this WebApplication app)
    {
        // ── Driver registration / profile update ─────────────────────────────
        app.MapPost("/api/drivers/register", async (HttpContext ctx,
            Driver driver, CosmosService cosmos) =>
        {
            driver.Id        = driver.FirebaseUid ?? Guid.NewGuid().ToString();
            driver.DriverId  = string.IsNullOrEmpty(driver.DriverId) ? driver.Id : driver.DriverId;
            driver.CreatedAt = DateTime.UtcNow.ToString("o");
            var saved = await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            return Results.Created($"/api/drivers/{saved.Id}", SafeDriver(saved));
        });

        // ── Own profile ───────────────────────────────────────────────────────
        app.MapGet("/api/drivers/me", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }
            await ctx.Response.WriteAsJsonAsync(SafeDriver(driver));
        });

        // ── Toggle online / offline status ────────────────────────────────────
        app.MapPatch("/api/drivers/me/status", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var body = await ctx.Request.ReadFromJsonAsync<StatusToggleBody>();
            if (body is null || (body.Status != "available" && body.Status != "offline"))
            {
                ctx.Response.StatusCode = 400;
                await ctx.Response.WriteAsJsonAsync(new { error = "status must be 'available' or 'offline'" });
                return;
            }

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            driver.Status = body.Status;
            await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            await ctx.Response.WriteAsJsonAsync(SafeDriver(driver));
        });

        // ── Jobs assigned to this driver ──────────────────────────────────────
        app.MapGet("/api/drivers/me/jobs", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            // Resolve the driver_id from the claims / Cosmos lookup
            var driverId = ctx.Items["driver_id"] as string;
            if (string.IsNullOrEmpty(driverId))
            {
                var drivers = await cosmos.QueryAsync<Driver>("drivers",
                    "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                    new() { ["@uid"] = uid });
                driverId = drivers.FirstOrDefault()?.DriverId ?? uid;
            }

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.driver_id = @did ORDER BY c.updated_at DESC",
                new() { ["@did"] = driverId });

            await ctx.Response.WriteAsJsonAsync(orders);
        });

        // ── Single job details ────────────────────────────────────────────────
        app.MapGet("/api/drivers/me/jobs/{orderId}", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var driverId = ctx.Items["driver_id"] as string;
            if (string.IsNullOrEmpty(driverId))
            {
                var drivers = await cosmos.QueryAsync<Driver>("drivers",
                    "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                    new() { ["@uid"] = uid });
                driverId = drivers.FirstOrDefault()?.DriverId ?? uid;
            }

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            var order = orders.FirstOrDefault();
            if (order is null) { ctx.Response.StatusCode = 404; return; }
            if (order.DriverId != driverId) { ctx.Response.StatusCode = 403; return; }

            await ctx.Response.WriteAsJsonAsync(order);
        });

        // ── Status progression ────────────────────────────────────────────────
        // Allowed chain: assigned → accepted → arrivedAtPickup → loaded → delivered
        app.MapPatch("/api/drivers/me/jobs/{orderId}/status", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var driverId = ctx.Items["driver_id"] as string;
            if (string.IsNullOrEmpty(driverId))
            {
                var drivers = await cosmos.QueryAsync<Driver>("drivers",
                    "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                    new() { ["@uid"] = uid });
                driverId = drivers.FirstOrDefault()?.DriverId ?? uid;
            }

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            var order = orders.FirstOrDefault();
            if (order is null) { ctx.Response.StatusCode = 404; return; }
            if (order.DriverId != driverId) { ctx.Response.StatusCode = 403; return; }

            // Validate the transition
            if (!_nextStatus.TryGetValue(order.Status, out var next))
            {
                ctx.Response.StatusCode = 409;
                await ctx.Response.WriteAsJsonAsync(new { error = $"No next status from '{order.Status}'" });
                return;
            }

            order.Status    = next;
            order.UpdatedAt = DateTime.UtcNow.ToString("o");

            // When delivered: calculate payouts and free up the driver
            if (next == "delivered")
            {
                order.DriverPayout = Math.Round(order.DeliveryFee * 0.8m, 2);
                order.PlatformFee  = Math.Round(order.DeliveryFee * 0.2m, 2);

                // Set driver back to available
                var allDrivers = await cosmos.QueryAsync<Driver>("drivers",
                    "SELECT * FROM c WHERE c.driver_id = @did",
                    new() { ["@did"] = driverId });
                var driver = allDrivers.FirstOrDefault();
                if (driver is not null)
                {
                    driver.Status = "available";
                    await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
                }
            }

            var pk = order.UserId ?? order.GuestId ?? order.Id;
            await cosmos.UpsertAsync("orders", order, pk);
            await ctx.Response.WriteAsJsonAsync(order);
        });

        // ── Location ping ─────────────────────────────────────────────────────
        app.MapPost("/api/drivers/me/location", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var body = await ctx.Request.ReadFromJsonAsync<LocationPing>();
            if (body is null) { ctx.Response.StatusCode = 400; return; }

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                new() { ["@uid"] = uid });

            var driver = drivers.FirstOrDefault();
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            driver.CurrentLocation = new DriverLocation { Lat = body.Lat, Lng = body.Lng };
            driver.Status = body.Status ?? driver.Status;
            await cosmos.UpsertAsync("drivers", driver, driver.DriverId);
            ctx.Response.StatusCode = 204;
        });

        // ── Revenue summary ───────────────────────────────────────────────────
        app.MapGet("/api/drivers/me/revenue", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var driverId = ctx.Items["driver_id"] as string;
            if (string.IsNullOrEmpty(driverId))
            {
                var drivers = await cosmos.QueryAsync<Driver>("drivers",
                    "SELECT * FROM c WHERE c.firebase_uid = @uid OR c.driver_id = @uid",
                    new() { ["@uid"] = uid });
                driverId = drivers.FirstOrDefault()?.DriverId ?? uid;
            }

            var completed = await cosmos.QueryAsync<Order>("orders",
                "SELECT c.driver_payout, c.created_at FROM c WHERE c.driver_id = @did AND c.status = 'delivered'",
                new() { ["@did"] = driverId });

            var now   = DateTime.UtcNow;
            var today = now.Date;

            var summary = new
            {
                today   = completed.Where(o => DateTime.TryParse(o.CreatedAt, out var d) && d.Date == today)
                                   .Sum(o => o.DriverPayout),
                week    = completed.Where(o => DateTime.TryParse(o.CreatedAt, out var d) && d >= now.AddDays(-7))
                                   .Sum(o => o.DriverPayout),
                month   = completed.Where(o => DateTime.TryParse(o.CreatedAt, out var d) && d >= now.AddDays(-30))
                                   .Sum(o => o.DriverPayout),
                allTime = completed.Sum(o => o.DriverPayout),
                trips   = completed.Count,
            };

            await ctx.Response.WriteAsJsonAsync(summary);
        });

        // ── Admin — list all drivers ──────────────────────────────────────────
        app.MapGet("/api/drivers", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx)) { ctx.Response.StatusCode = 403; return; }
            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c ORDER BY c.full_name");
            // Strip pin_hash before returning
            await ctx.Response.WriteAsJsonAsync(drivers.Select(SafeDriver));
        });

        // ─────────────────────────────────────────────────────────────────────
        // Authentication — anonymous endpoints
        // ─────────────────────────────────────────────────────────────────────

        // Step 1: verify driver_id + PIN → return firebase_uid + identity
        app.MapPost("/api/drivers/verify-credentials", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<VerifyCredBody>();
            if (body is null
                || string.IsNullOrWhiteSpace(body.DriverId)
                || string.IsNullOrWhiteSpace(body.Pin))
                return Results.BadRequest(new { error = "driver_id and pin are required" });

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.driver_id = @id",
                new() { ["@id"] = body.DriverId.Trim() });

            var driver = drivers.FirstOrDefault();
            if (driver is null)
                return Results.Json(new { error = "Invalid credentials" }, statusCode: 401);

            // Verify PIN hash
            var expected = HashPin(driver.DriverId, body.Pin.Trim());
            if (!string.Equals(driver.PinHash, expected, StringComparison.OrdinalIgnoreCase))
                return Results.Json(new { error = "Invalid credentials" }, statusCode: 401);

            return Results.Ok(new
            {
                firebase_uid = driver.FirebaseUid ?? driver.DriverId,
                driver_id    = driver.DriverId,
                full_name    = driver.FullName,
            });
        }).AllowAnonymous();

        // Step 2: issue Firebase custom token
        app.MapPost("/api/drivers/login-link", async (HttpContext ctx, CosmosService cosmos,
            FirebaseAuthService firebase) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<LoginLinkBody>();
            if (body is null || string.IsNullOrWhiteSpace(body.DriverId))
                return Results.BadRequest(new { error = "driver_id is required" });

            var drivers = await cosmos.QueryAsync<Driver>("drivers",
                "SELECT * FROM c WHERE c.driver_id = @id",
                new() { ["@id"] = body.DriverId });

            var driver = drivers.FirstOrDefault();
            if (driver is null)
                return Results.Json(new { error = "Driver not found" }, statusCode: 401);

            var uid = driver.FirebaseUid ?? driver.DriverId;
            var claims = new Dictionary<string, object>
            {
                ["role"]      = "driver",
                ["driver_id"] = driver.DriverId,
                ["full_name"] = driver.FullName,
            };
            var customToken = await firebase.CreateCustomTokenAsync(uid, claims);

            return Results.Ok(new { customToken, success = true });
        }).AllowAnonymous();
    }
}

// ── Record types ──────────────────────────────────────────────────────────────
record LocationPing(double Lat, double Lng, string? Status);
record StatusToggleBody(string Status);

record VerifyCredBody(
    [property: System.Text.Json.Serialization.JsonPropertyName("driver_id")] string DriverId,
    [property: System.Text.Json.Serialization.JsonPropertyName("pin")]       string Pin
);
record LoginLinkBody(
    [property: System.Text.Json.Serialization.JsonPropertyName("driver_id")]    string  DriverId,
    [property: System.Text.Json.Serialization.JsonPropertyName("firebase_uid")] string? FirebaseUid
);
