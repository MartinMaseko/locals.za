using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        // Get (or auto-create) the current user's profile
        app.MapGet("/api/auth/me", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var user = await cosmos.GetAsync<User>("users", uid, uid);

            if (user is null)
            {
                // First-time login — seed a user doc from Firebase claims
                user = new User
                {
                    Id        = uid,
                    Uid       = uid,
                    Email     = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "",
                    FullName  = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "",
                    UserType  = ctx.User.FindFirst("role")?.Value == "admin" ? "admin" : "user",
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o"),
                };
                user = await cosmos.UpsertAsync("users", user, uid);
            }

            await ctx.Response.WriteAsJsonAsync(user);
        });

        // Update profile (name, phone, picture)
        app.MapPatch("/api/auth/me", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var patch = await ctx.Request.ReadFromJsonAsync<UserPatch>();
            if (patch is null) { ctx.Response.StatusCode = 400; return; }

            var user = await cosmos.GetAsync<User>("users", uid, uid);
            if (user is null) { ctx.Response.StatusCode = 404; return; }

            if (patch.FullName  is not null) user.FullName   = patch.FullName;
            if (patch.PhoneNumber is not null) user.PhoneNumber = patch.PhoneNumber;
            if (patch.ProfilePictureUrl is not null) user.ProfilePictureUrl = patch.ProfilePictureUrl;
            user.UpdatedAt = DateTime.UtcNow.ToString("o");

            var updated = await cosmos.UpsertAsync("users", user, uid);
            await ctx.Response.WriteAsJsonAsync(updated);
        });

        // ── COMMAND CENTRE LOGIN (no Firebase, simple email + universal password) ──
        app.MapPost("/api/admin/auth", async (HttpContext ctx, IConfiguration config) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<AdminAuthRequest>();
            if (body?.Email is null || body.Password is null)
            {
                ctx.Response.StatusCode = 400;
                await ctx.Response.WriteAsJsonAsync(new { error = "Missing email or password" });
                return;
            }

            // Get allowed emails & password from config
            var allowedEmails = config.GetSection("CommandCenter:AllowedEmails")
                .Get<List<string>>() ?? new();
            var universalPassword = config["CommandCenter:UniversalPassword"];

            // Validate email is in allowed list
            if (!allowedEmails.Contains(body.Email, StringComparer.OrdinalIgnoreCase))
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
                return;
            }

            // Validate password
            if (body.Password != universalPassword)
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
                return;
            }

            // Success — return allowed message
            await ctx.Response.WriteAsJsonAsync(new
            {
                message = "Admin authenticated",
                email = body.Email,
                isAdmin = true
            });
        });

        // Bootstrap admin — only callable by an existing admin (or first time via Node promoteToAdmin)
        app.MapPost("/api/auth/promote", async (HttpContext ctx,
            FirebaseAuthService firebase, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
            {
                ctx.Response.StatusCode = 403;
                await ctx.Response.WriteAsJsonAsync(new { error = "Admin required" });
                return;
            }

            var body = await ctx.Request.ReadFromJsonAsync<PromoteRequest>();
            if (body?.Email is null) { ctx.Response.StatusCode = 400; return; }

            var userRecord = await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance
                .GetUserByEmailAsync(body.Email);

            await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance
                .SetCustomUserClaimsAsync(userRecord.Uid, new Dictionary<string, object>
                {
                    { "role", "admin" }
                });

            // Mirror in Cosmos
            var user = await cosmos.GetAsync<User>("users", userRecord.Uid, userRecord.Uid);
            if (user is not null)
            {
                user.UserType  = "admin";
                user.UpdatedAt = DateTime.UtcNow.ToString("o");
                await cosmos.UpsertAsync("users", user, userRecord.Uid);
            }

            await ctx.Response.WriteAsJsonAsync(new { message = $"{body.Email} promoted to admin" });
        });
    }
}

// Small request models — only used by these endpoints, no need for a separate file
record UserPatch(
    [property: System.Text.Json.Serialization.JsonPropertyName("full_name")]  string? FullName,
    [property: System.Text.Json.Serialization.JsonPropertyName("phone_number")] string? PhoneNumber,
    [property: System.Text.Json.Serialization.JsonPropertyName("profile_picture_url")] string? ProfilePictureUrl);

record PromoteRequest(string Email);
record AdminAuthRequest(string Email, string Password);