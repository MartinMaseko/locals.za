using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class OrderItem
{
    public string Description  { get; set; } = "";
    public int    Qty          { get; set; }

    [JsonPropertyName("unit_price")]
    public decimal UnitPrice   { get; set; }

    [JsonPropertyName("line_total")]
    public decimal LineTotal   { get; set; }

    [JsonPropertyName("estimated_kg")]
    public double EstimatedKg  { get; set; }
}