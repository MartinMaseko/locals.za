using LocalsZaApi.Models;
using LocalsZaApi.Services;
using System.Security.Cryptography;
using System.Text;

namespace LocalsZaApi.Endpoints;

// ── Design notes ──────────────────────────────────────────────────────────────
// Cosmos container "drivers" uses partition key /id.
// Every document always has "id", so all operations are trivially correct:
//   UpsertAsync("drivers", driver, driver.Id)
//   DeleteAsync("drivers", id, id)
//   GetAsync<Driver>("drivers", id, id)
// Cosmos SDK (Newtonsoft CamelCase) stores fields as: fullName, driverId, pinHash, etc.
// STJ [JsonPropertyName] on Driver model controls HTTP response shape only.
// ─────────────────────────────────────────────────────────────────────────────

public static class DriverEndpoints
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    static string HashPin(string driverId, string pin)
        => Convert.ToHexString(
               SHA256.HashData(Encoding.UTF8.GetBytes($"{driverId}:{pin}"))
           ).ToLower();

    static object SafeDriver(Driver d) => new
    {
        id            = d.Id,
        driver_id     = d.DriverId,
        firebase_uid  = d.FirebaseUid,
        full_name     = d.FullName,
        email         = d.Email,
        phone_number  = d.PhoneNumber,
        vehicle_type  = d.VehicleType,
        vehicle_model = d.VehicleModel,
        status        = d.Status,
        created_at    = d.CreatedAt,
    };

    // Status progression for job workflow
    static readonly Dictionary<string, string> _nextStatus = new()
    {
        ["assigned"]        = "accepted",
        ["accepted"]        = "arrivedAtPickup",
        ["arrivedAtPickup"] = "loaded",
        ["loaded"]          = "delivered",
    };

    // ── Get authenticated driver ──────────────────────────────────────────────
    // After Firebase custom-token login, uid = driver.Id (always).
    // Query by c.id = @uid — the only field that is always present and indexed.
    static async Task<Driver?> GetAuthDriverAsync(HttpContext ctx, CosmosService cosmos)
    {
        var uid = AuthHelpers.GetUid(ctx);
        if (uid is null) return null;

        // With partition key /id, point-read is instant — no cross-partition fan-out.
        return await cosmos.GetAsync<Driver>("drivers", uid, uid);
    }

    // ─────────────────────────────────────────────────────────────────────────

    public static void MapDriverEndpoints(this WebApplication app)
    {
        // ── Driver registration / self-registration ──────────────────────────
        app.MapPost("/api/drivers/register", async (HttpContext ctx,
            Driver driver, CosmosService cosmos) =>
        {
            driver.Id        = driver.FirebaseUid ?? Guid.NewGuid().ToString();
            driver.DriverId  = string.IsNullOrEmpty(driver.DriverId) ? driver.Id : driver.DriverId;
            driver.CreatedAt = DateTime.UtcNow.ToString("o");
            // Partition key = driver.Id — always valid, no field-name confusion.
            var saved = await cosmos.UpsertAsync("drivers", driver, driver.Id);
            return Results.Created($"/api/drivers/{saved.Id}", SafeDriver(saved));
        });

        // ── Own profile ───────────────────────────────────────────────────────
        app.MapGet("/api/drivers/me", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var driver = await cosmos.GetAsync<Driver>("drivers", uid, uid);
            if (driver is null) { ctx.Response.StatusCode = 404; return; }
            await ctx.Response.WriteAsJsonAsync(SafeDriver(driver));
        });

        // ── Toggle online / offline ───────────────────────────────────────────
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

            var driver = await cosmos.GetAsync<Driver>("drivers", uid, uid);
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            driver.Status = body.Status;
            await cosmos.UpsertAsync("drivers", driver, driver.Id);
            await ctx.Response.WriteAsJsonAsync(SafeDriver(driver));
        });

        // ── Jobs assigned to this driver ──────────────────────────────────────
        app.MapGet("/api/drivers/me/jobs", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            // uid = driver.Id = driver.DriverId for all drivers created by admin.
            // Orders store the driver reference as "driverId" (Newtonsoft camelCase).
            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.driverId = @did ORDER BY c.updatedAt DESC",
                new() { ["@did"] = uid });

            await ctx.Response.WriteAsJsonAsync(orders);
        });

        // ── Single job ────────────────────────────────────────────────────────
        app.MapGet("/api/drivers/me/jobs/{orderId}", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            if (orders.Count == 0) { ctx.Response.StatusCode = 404; return; }
            // Prefer the copy that belongs to this driver (seed data may have duplicates)
            var order = orders.FirstOrDefault(o => o.DriverId == uid);
            if (order is null) { ctx.Response.StatusCode = 403; return; }

            await ctx.Response.WriteAsJsonAsync(order);
        });

        // ── Status progression ────────────────────────────────────────────────
        app.MapPatch("/api/drivers/me/jobs/{orderId}/status", async (HttpContext ctx,
            string orderId, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });

            if (orders.Count == 0) { ctx.Response.StatusCode = 404; return; }
            // Prefer the copy that belongs to this driver (seed data may have duplicates)
            var order = orders.FirstOrDefault(o => o.DriverId == uid);
            if (order is null) { ctx.Response.StatusCode = 403; return; }

            if (!_nextStatus.TryGetValue(order.Status, out var next))
            {
                ctx.Response.StatusCode = 409;
                await ctx.Response.WriteAsJsonAsync(new { error = $"No next status from '{order.Status}'" });
                return;
            }

            order.Status    = next;
            order.UpdatedAt = DateTime.UtcNow.ToString("o");

            if (next == "delivered")
            {
                order.DriverPayout = Math.Round(order.DeliveryFee * 0.8m, 2);
                order.PlatformFee  = Math.Round(order.DeliveryFee * 0.2m, 2);

                // Set driver back to available (point-read, no cross-partition query needed)
                var driver = await cosmos.GetAsync<Driver>("drivers", uid, uid);
                if (driver is not null)
                {
                    driver.Status = "available";
                    await cosmos.UpsertAsync("drivers", driver, driver.Id);
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

            var driver = await cosmos.GetAsync<Driver>("drivers", uid, uid);
            if (driver is null) { ctx.Response.StatusCode = 404; return; }

            driver.CurrentLocation = new DriverLocation { Lat = body.Lat, Lng = body.Lng };
            driver.Status = body.Status ?? driver.Status;
            await cosmos.UpsertAsync("drivers", driver, driver.Id);
            ctx.Response.StatusCode = 204;
        });

        // ── Revenue summary ───────────────────────────────────────────────────
        app.MapGet("/api/drivers/me/revenue", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var completed = await cosmos.QueryAsync<Order>("orders",
                "SELECT c.driverPayout, c.createdAt FROM c WHERE c.driverId = @did AND c.status = 'delivered'",
                new() { ["@did"] = uid });

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
                "SELECT * FROM c ORDER BY c.fullName");
            await ctx.Response.WriteAsJsonAsync(drivers.Select(SafeDriver));
        });

        // ── Authentication — anonymous endpoints ─────────────────────────────

        // Step 1: verify Driver ID + PIN
        app.MapPost("/api/drivers/verify-credentials", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<VerifyCredBody>();
            if (body is null
                || string.IsNullOrWhiteSpace(body.DriverId)
                || string.IsNullOrWhiteSpace(body.Pin))
                return Results.BadRequest(new { error = "driver_id and pin are required" });

            // Admin-created drivers: Id = DriverId. Point-read is O(1).
            var driver = await cosmos.GetAsync<Driver>("drivers",
                body.DriverId.Trim(), body.DriverId.Trim());

            if (driver is null)
                return Results.Json(new { error = "Invalid credentials" }, statusCode: 401);

            var expected = HashPin(driver.Id, body.Pin.Trim());
            if (!string.Equals(driver.PinHash, expected, StringComparison.OrdinalIgnoreCase))
                return Results.Json(new { error = "Invalid credentials" }, statusCode: 401);

            return Results.Ok(new
            {
                firebase_uid = driver.FirebaseUid ?? driver.Id,
                driver_id    = driver.Id,
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

            var driver = await cosmos.GetAsync<Driver>("drivers",
                body.DriverId.Trim(), body.DriverId.Trim());

            if (driver is null)
                return Results.Json(new { error = "Driver not found" }, statusCode: 401);

            // uid for the custom token = driver.Id (= driver.DriverId for admin-created drivers).
            // After signInWithCustomToken, auth.currentUser.uid = driver.Id.
            var uid = driver.FirebaseUid ?? driver.Id;
            var claims = new Dictionary<string, object>
            {
                ["role"]      = "driver",
                ["driver_id"] = driver.Id,
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
