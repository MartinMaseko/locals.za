using System.Security.Claims;
using LocalsZaApi.Services;

namespace LocalsZaApi.Middleware;

public class FirebaseAuthMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _alwaysAnonymous =
    [
        "/health",
        "/api/payment/notify",   // Ozow webhook — verified by SHA-512, not token
        "/swagger",
    ];

    public async Task InvokeAsync(HttpContext context, FirebaseAuthService authService)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Always skip — no token needed, no blocking
        if (_alwaysAnonymous.Any(p => path.StartsWith(p)))
        {
            await next(context);
            return;
        }

        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

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