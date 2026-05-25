using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class Receipt
{
    // Cosmos document id — we use the orderId so each order has exactly one receipt
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    // URL of the uploaded receipt image in Azure Blob Storage
    [JsonPropertyName("blobUrl")]
    public string BlobUrl { get; set; } = string.Empty;

    // Fields parsed by the Python OCR service
    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("storeName")]
    public string? StoreName { get; set; }

    [JsonPropertyName("date")]
    public string? Date { get; set; }

    [JsonPropertyName("subtotal")]
    public decimal? Subtotal { get; set; }

    [JsonPropertyName("total")]
    public decimal? Total { get; set; }

    [JsonPropertyName("items")]
    public List<ReceiptItem> Items { get; set; } = [];

    [JsonPropertyName("estimatedWeightKg")]
    public decimal EstimatedWeightKg { get; set; }

    // "light" | "medium" | "heavy" | "bulk"
    [JsonPropertyName("weightClass")]
    public string WeightClass { get; set; } = "light";

    // 0..1 — frontend prompts user to re-upload if < 0.6
    [JsonPropertyName("qualityScore")]
    public decimal QualityScore { get; set; }

    [JsonPropertyName("warnings")]
    public List<string> Warnings { get; set; } = [];

    [JsonPropertyName("parsedAt")]
    public DateTime ParsedAt { get; set; } = DateTime.UtcNow;

    // ── Admin review fields ────────────────────────────────────────────
    // "pending" | "confirmed" | "rejected"
    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("adminNote")]
    public string? AdminNote { get; set; }

    [JsonPropertyName("reviewedAt")]
    public string? ReviewedAt { get; set; }
}

public class ReceiptItem
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("qty")]
    public int Qty { get; set; }

    [JsonPropertyName("unitPrice")]
    public decimal UnitPrice { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal LineTotal { get; set; }

    [JsonPropertyName("estimatedKg")]
    public decimal EstimatedKg { get; set; }
}