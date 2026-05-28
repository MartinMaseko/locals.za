using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

/// <summary>
/// Pricing variables stored in the Cosmos "config" container (id = "pricing").
/// PricingService falls back to the hardcoded defaults below if the document
/// hasn't been created yet — safe to deploy before the admin configures it.
/// The Command Center's PricingConfig page writes here via the admin endpoints.
/// </summary>
public class PricingConfig
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "pricing";

    // ── Base fare ──────────────────────────────────────────────────────────────
    /// <summary>Fixed charge applied to every delivery regardless of distance (ZAR).</summary>
    [JsonPropertyName("baseFare")]
    public decimal BaseFare { get; set; } = 45m;

    // ── Per-km rates by weight class (ZAR) ────────────────────────────────────
    // These already factor in the petrol cost component. When petrol prices
    // change, the admin updates these rates in the Command Center.

    [JsonPropertyName("lightRatePerKm")]
    public decimal LightRatePerKm { get; set; } = 4.50m;

    [JsonPropertyName("mediumRatePerKm")]
    public decimal MediumRatePerKm { get; set; } = 7.50m;

    [JsonPropertyName("heavyRatePerKm")]
    public decimal HeavyRatePerKm { get; set; } = 8.50m;

    [JsonPropertyName("bulkRatePerKm")]
    public decimal BulkRatePerKm { get; set; } = 12.00m;

    // ── Fixed weight handling fees (ZAR) ──────────────────────────────────────

    [JsonPropertyName("lightWeightFee")]
    public decimal LightWeightFee { get; set; } = 0m;

    [JsonPropertyName("mediumWeightFee")]
    public decimal MediumWeightFee { get; set; } = 15m;

    [JsonPropertyName("heavyWeightFee")]
    public decimal HeavyWeightFee { get; set; } = 55m;

    [JsonPropertyName("bulkWeightFee")]
    public decimal BulkWeightFee { get; set; } = 110m;

    // ── Modifiers ─────────────────────────────────────────────────────────────

    /// <summary>Multiplier applied when order is marked as rush (e.g. 1.35 = +35%).</summary>
    [JsonPropertyName("rushMultiplier")]
    public decimal RushMultiplier { get; set; } = 1.35m;

    /// <summary>Multiplier for pool (shared-ride) orders (e.g. 0.80 = 20% off).</summary>
    [JsonPropertyName("poolDiscount")]
    public decimal PoolDiscount { get; set; } = 0.80m;

    /// <summary>Minimum delivery fee floor regardless of formula result (ZAR).</summary>
    [JsonPropertyName("minimumFare")]
    public decimal MinimumFare { get; set; } = 80m;

    // ── Fuel levy ─────────────────────────────────────────────────────────────
    /// <summary>
    /// Flat fuel levy added to every delivery (ZAR). Set to 0 to disable.
    /// Admin updates this when petrol prices change — it's added on top of the
    /// per-km rate so drivers are immediately compensated without recalculating
    /// all rate bands.
    /// </summary>
    [JsonPropertyName("fuelLevy")]
    public decimal FuelLevy { get; set; } = 10m;

    // ── Weight overrides ──────────────────────────────────────────────────────
    /// <summary>
    /// Admin-managed keyword → kg/unit lookup. Entries here take priority over
    /// the built-in weights table in the OCR service, so new product categories
    /// or corrected weights can be added without redeploying the ai-service.
    /// Key: lowercase product keyword (e.g. "energy drink").
    /// Value: estimated kg per unit.
    /// </summary>
    [JsonPropertyName("weightOverrides")]
    public Dictionary<string, double> WeightOverrides { get; set; } = new();

    /// <summary>Informational note for the admin UI to explain petrol factoring.</summary>
    [JsonPropertyName("petrolNote")]
    public string PetrolNote { get; set; } = "Petrol cost is factored into the per-km rates above.";

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = "";
}
