using LocalsZaApi.Models;

namespace LocalsZaApi.Services;

/// <summary>
/// Applies the locals.za delivery pricing formula using runtime variables
/// read from Cosmos (editable via the Command Center).
/// Formula: fee = baseFare + (distanceKm × ratePerKm) + weightFee
///          → rush: × rushMultiplier
///          → pool: × poolDiscount
///          → floor at minimumFare
/// </summary>
public class PricingService
{
    private readonly CosmosService _cosmos;

    public PricingService(CosmosService cosmos) => _cosmos = cosmos;

    /// <summary>
    /// Reads the live pricing config from the Cosmos "config" container.
    /// Silently falls back to hardcoded defaults if the document doesn't exist yet.
    /// </summary>
    public async Task<PricingConfig> GetConfigAsync()
    {
        try
        {
            return await _cosmos.GetAsync<PricingConfig>("config", "pricing", "pricing")
                ?? new PricingConfig();
        }
        catch
        {
            // Container may not exist yet (first deploy) — defaults are safe
            return new PricingConfig();
        }
    }

    /// <summary>
    /// Calculates a delivery quote for the given parameters.
    /// </summary>
    public async Task<QuoteResult> CalculateAsync(
        string weightClass, double distanceKm, bool isRush, bool isPool)
    {
        var cfg = await GetConfigAsync();

        // Select per-km rate and weight handling fee for this weight class
        var (ratePerKm, weightFee) = weightClass.ToLower() switch
        {
            "light" => (cfg.LightRatePerKm, cfg.LightWeightFee),
            "heavy" => (cfg.HeavyRatePerKm, cfg.HeavyWeightFee),
            "bulk"  => (cfg.BulkRatePerKm,  cfg.BulkWeightFee),
            _       => (cfg.MediumRatePerKm, cfg.MediumWeightFee), // default: medium
        };

        var fee = cfg.BaseFare + (decimal)distanceKm * ratePerKm + weightFee + cfg.FuelLevy;

        // Apply optional modifiers
        if (isRush) fee *= cfg.RushMultiplier;
        if (isPool) fee *= cfg.PoolDiscount;

        var total = Math.Max(cfg.MinimumFare, Math.Round(fee, 2));

        return new QuoteResult
        {
            BaseFare        = cfg.BaseFare,
            DistanceKm      = distanceKm,
            RatePerKm       = ratePerKm,
            WeightFee       = weightFee,
            WeightClass     = weightClass,
            IsRush          = isRush,
            IsPool          = isPool,
            RushMultiplier  = isRush ? cfg.RushMultiplier : 1m,
            PoolDiscount    = isPool ? cfg.PoolDiscount   : 1m,
            TotalFee        = total,
        };
    }
}

/// <summary>Response shape returned by POST /api/quotes/delivery.</summary>
public record QuoteResult
{
    public decimal BaseFare         { get; init; }
    public double  DistanceKm       { get; init; }
    public decimal RatePerKm        { get; init; }
    public decimal WeightFee        { get; init; }
    public string  WeightClass      { get; init; } = "medium";
    public bool    IsRush           { get; init; }
    public bool    IsPool           { get; init; }
    public decimal RushMultiplier   { get; init; } = 1m;
    public decimal PoolDiscount     { get; init; } = 1m;
    public decimal TotalFee         { get; init; }
    public int     EstimatedMinutes { get; init; }
    // Azure Maps route data — frontend uses these to render the interactive map
    public double OriginLat         { get; init; }
    public double OriginLng         { get; init; }
    public double DestLat           { get; init; }
    public double DestLng           { get; init; }
    /// <summary>Route polyline as [longitude, latitude] pairs (GeoJSON order).</summary>
    public double[][] RoutePoints   { get; init; } = [];
}
