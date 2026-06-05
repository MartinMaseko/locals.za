using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class StoreEndpoints
{
    public static void MapStoreEndpoints(this WebApplication app)
    {
        // Public — guests and logged-in users both browse stores
        app.MapGet("/api/stores", async (CosmosService cosmos) =>
        {
            var stores = await cosmos.QueryAsync<Store>("stores",
                "SELECT * FROM c WHERE c.active = true ORDER BY c.name");
            return Results.Ok(stores);
        });

        app.MapGet("/api/stores/{id}", async (string id, CosmosService cosmos) =>
        {
            var store = await cosmos.GetAsync<Store>("stores", id, id);
            return store is null ? Results.NotFound() : Results.Ok(store);
        });

        // Admin only — create/update partner stores from the command dashboard
        app.MapPost("/api/stores", async (HttpContext ctx, Store store, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            store.Id = store.Id == "" ? Guid.NewGuid().ToString() : store.Id;
            var saved = await cosmos.UpsertAsync("stores", store, store.Id);
            return Results.Created($"/api/stores/{saved.Id}", saved);
        });

        app.MapPut("/api/stores/{id}", async (HttpContext ctx, string id,
            Store store, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            store.Id = id;
            var saved = await cosmos.UpsertAsync("stores", store, id);
            return Results.Ok(saved);
        });

        // Soft deactivate — keeps the store in Cosmos but hides it from the public listing
        app.MapPatch("/api/stores/{id}/deactivate", async (HttpContext ctx, string id,
            CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            var store = await cosmos.GetAsync<Store>("stores", id, id);
            if (store is null) return Results.NotFound();

            store.Active = false;
            var saved = await cosmos.UpsertAsync("stores", store, id);
            return Results.Ok(saved);
        });

        // Reactivate a previously deactivated store
        app.MapPatch("/api/stores/{id}/activate", async (HttpContext ctx, string id,
            CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            var store = await cosmos.GetAsync<Store>("stores", id, id);
            if (store is null) return Results.NotFound();

            store.Active = true;
            var saved = await cosmos.UpsertAsync("stores", store, id);
            return Results.Ok(saved);
        });

        // Hard delete — permanent, use with caution
        app.MapDelete("/api/stores/{id}", async (HttpContext ctx, string id,
            CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            var store = await cosmos.GetAsync<Store>("stores", id, id);
            if (store is null) return Results.NotFound();

            await cosmos.DeleteAsync("stores", id, id);
            return Results.NoContent();
        });

        // Admin listing — includes inactive stores for management view
        app.MapGet("/api/admin/stores", async (HttpContext ctx, CosmosService cosmos) =>
        {
            if (!AuthHelpers.IsAdmin(ctx))
                return Results.Json(new { error = "Admin access required" }, statusCode: 403);

            var stores = await cosmos.QueryAsync<Store>("stores",
                "SELECT * FROM c ORDER BY c.name");
            return Results.Ok(stores);
        });
    }
}