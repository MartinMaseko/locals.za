using Serilog;
using LocalsZaApi.Middleware;
using LocalsZaApi.Services;
using System.Text.Json;
using LocalsZaApi.Endpoints;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console());

    // CORS — origins driven by config
    var allowedOrigins = builder.Configuration
        .GetSection("AllowedOrigins").Get<string[]>() ?? [];

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()));

    // Swagger — dev only
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    builder.Services.ConfigureHttpJsonOptions(opts =>
        opts.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);

    // Services 
    builder.Services.AddSingleton<FirebaseAuthService>();
    builder.Services.AddSingleton<CosmosService>();
    builder.Services.AddSingleton<BlobService>();
    builder.Services.AddSingleton<OzowService>();
    builder.Services.AddSingleton<MapsService>();
    builder.Services.AddSingleton<PricingService>();
    builder.Services.AddSingleton<NotificationService>();
    builder.Services.AddHttpClient();

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();
    app.UseCors();

    // Global exception handler — placed after UseCors() so CORS headers written
    // by the CORS middleware survive when an endpoint throws an unhandled exception.
    // Without this, the runtime's default error response discards those headers.
    app.Use(async (ctx, next) =>
    {
        try
        {
            await next();
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Unhandled exception on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            if (!ctx.Response.HasStarted)
            {
                ctx.Response.StatusCode = 500;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsJsonAsync(new { error = "Internal server error" });
            }
        }
    });

    app.UseMiddleware<FirebaseAuthMiddleware>();

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
       .AllowAnonymous();

    app.MapAuthEndpoints();
    app.MapStoreEndpoints();
    app.MapOrderEndpoints();
    app.MapDriverEndpoints();
    app.MapMessageEndpoints();
    app.MapReceiptEndpoints();
    app.MapPaymentEndpoints();
    app.MapQuoteEndpoints();
    app.MapAdminEndpoints();
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}
