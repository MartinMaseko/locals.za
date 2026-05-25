using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class QuoteEndpoints
{
    public static void MapQuoteEndpoints(this WebApplication app)
    {
        // POST /api/quotes/delivery
        // Public — no auth required. Anyone can request a delivery quote before paying.
        app.MapPost("/api/quotes/delivery", async (
            DeliveryQuoteRequest req,
            CosmosService cosmos,
            MapsService maps,
            PricingService pricing) =>
        {
            // ── Resolve pickup origin ────────────────────────────────────────────
            string origin;

            if (!string.IsNullOrWhiteSpace(req.StoreId))
            {
                var store = await cosmos.GetAsync<Store>("stores", req.StoreId, req.StoreId);
                if (store is null)
                    return Results.BadRequest(new { error = "Store not found" });

                // Priority: configured street address → lat,lng pair → store name (Maps can resolve)
                if (!string.IsNullOrWhiteSpace(store.Address))
                    origin = store.Address;
                else if (store.Lat != 0 || store.Lng != 0)
                    origin = $"{store.Lat},{store.Lng}";
                else
                    // Graceful fallback: Google Maps resolves by store name + region
                    origin = $"{store.Name}, Gauteng, South Africa";
            }
            else if (!string.IsNullOrWhiteSpace(req.PickupAddress))
            {
                origin = req.PickupAddress;
            }
            else
            {
                return Results.BadRequest(new { error = "Provide storeId or pickupAddress" });
            }

            if (string.IsNullOrWhiteSpace(req.DropoffAddress))
                return Results.BadRequest(new { error = "dropoffAddress is required" });

            // ── Route (distance + polyline via Azure Maps) ───────────────────────
            RouteResult routeInfo;
            try
            {
                routeInfo = await maps.GetRouteAsync(origin, req.DropoffAddress);
            }
            catch (Exception ex)
            {
                return Results.Problem(detail: $"Maps API error: {ex.Message}", statusCode: 502);
            }

            // ── Pricing formula ──────────────────────────────────────────────────
            var quote = await pricing.CalculateAsync(
                req.WeightClass ?? "medium",
                routeInfo.DistanceKm,
                req.IsRush,
                req.IsPool);

            // Merge route data into the immutable record
            var result = quote with
            {
                EstimatedMinutes = routeInfo.DurationMinutes,
                OriginLat        = routeInfo.OriginLat,
                OriginLng        = routeInfo.OriginLng,
                DestLat          = routeInfo.DestLat,
                DestLng          = routeInfo.DestLng,
                RoutePoints      = routeInfo.RoutePoints,
            };

            return Results.Ok(result);

        }).AllowAnonymous();
    }
}

/// <summary>Request body for POST /api/quotes/delivery.</summary>
public record DeliveryQuoteRequest(
    string? StoreId,
    string? PickupAddress,
    string  DropoffAddress,
    string? WeightClass,
    bool    IsRush = false,
    bool    IsPool = false
);
