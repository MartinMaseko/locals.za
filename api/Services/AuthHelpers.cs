namespace LocalsZaApi.Services;

public static class AuthHelpers
{
    /// <summary>Returns uid if authenticated, null if anonymous guest.</summary>
    public static string? GetUid(HttpContext ctx)
        => ctx.User.FindFirst("uid")?.Value;

    /// <summary>Returns uid or writes 401 and returns null — use in protected endpoints.</summary>
    public static async Task<string?> RequireUidAsync(HttpContext ctx)
    {
        var uid = GetUid(ctx);
        if (uid is null)
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { error = "Authentication required" });
        }
        return uid;
    }

    /// <summary>Returns true if user has admin role claim.</summary>
    public static bool IsAdmin(HttpContext ctx)
        => ctx.User.FindFirst("role")?.Value == "admin";
}