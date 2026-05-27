using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LocalsZaApi.Services;

namespace LocalsZaApi.Middleware;

public class FirebaseAuthMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _alwaysAnonymous =
    [
        "/health",
        "/api/payment/notify",              // Ozow webhook — verified by SHA-512, not token
        "/api/admin/auth",                  // Command Centre login — validates email+password itself
        "/api/drivers/verify-credentials",  // Driver login step 1 — no token yet
        "/api/drivers/login-link",          // Driver login step 2 — issues custom token
        "/swagger",
    ];

    public async Task InvokeAsync(HttpContext context, FirebaseAuthService authService, IConfiguration config)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Always skip — no token needed, no blocking
        if (_alwaysAnonymous.Any(p => path.StartsWith(p)))
        {
            await next(context);
            return;
        }

        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

        if (authHeader != null && authHeader.StartsWith("Bearer commandadmin:"))
        {
            // Command Centre simple auth token — validate HMAC signature
            try
            {
                var parts = authHeader["Bearer commandadmin:".Length..].Split(':');
                if (parts.Length == 2)
                {
                    var email    = Encoding.UTF8.GetString(Convert.FromBase64String(parts[0]));
                    var provided = Convert.FromBase64String(parts[1]);
                    var password = config["CommandCenter:UniversalPassword"] ?? "";
                    using var hmac     = new HMACSHA256(Encoding.UTF8.GetBytes(password));
                    var expected = hmac.ComputeHash(Encoding.UTF8.GetBytes(email));

                    if (CryptographicOperations.FixedTimeEquals(provided, expected))
                    {
                        context.User = new ClaimsPrincipal(new ClaimsIdentity(
                        [
                            new Claim("uid",             email),
                            new Claim(ClaimTypes.Email,  email),
                            new Claim("role",            "admin"),
                        ], "CommandAdmin"));
                    }
                }
            }
            catch { /* malformed token — remain anonymous */ }

            await next(context);
            return;
        }

        if (authHeader != null && authHeader.StartsWith("Bearer "))
        {
            var token = authHeader["Bearer ".Length..];
            try
            {
                var firebaseToken = await authService.VerifyTokenAsync(token);

                // Extract role custom claim (set via admin SDK for dashboard access)
                firebaseToken.Claims.TryGetValue("role", out var roleObj);

                var claims = new List<Claim>
                {
                    new("uid",              firebaseToken.Uid),
                    new(ClaimTypes.Email,   firebaseToken.Claims.GetValueOrDefault("email")?.ToString() ?? ""),
                    new(ClaimTypes.Name,    firebaseToken.Claims.GetValueOrDefault("name")?.ToString() ?? ""),
                    new("role",             roleObj?.ToString() ?? "user"),
                };

                context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Firebase"));
            }
            catch
            {
                // Invalid token — continue as anonymous, not a hard 401
                // Endpoints that require auth will catch the missing uid claim
            }
        }

        await next(context);
    }
}