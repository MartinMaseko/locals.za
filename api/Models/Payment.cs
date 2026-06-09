using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class Payment
{
    // Cosmos id = orderId, so one payment doc per order (re-attempts upsert)
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("order_id")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }   // null for guest payments

    public decimal Amount { get; set; }

    // "pending" | "complete" | "cancelled" | "error" | "abandoned" | "pendinginvestigation"
    public string Status { get; set; } = "pending";

    // PayFast's pf_payment_id (set on /notify ITN)
    [JsonPropertyName("pf_payment_id")]
    public string? PfPaymentId { get; set; }

    // Legacy: Ozow's TransactionId — kept for backward compatibility with old payment docs
    [JsonPropertyName("ozow_transaction_id")]
    public string? OzowTransactionId { get; set; }

    // The signature/hash we computed when initiating — used to verify the webhook
    [JsonPropertyName("request_hash")]
    public string? RequestHash { get; set; }

    [JsonPropertyName("status_message")]
    public string? StatusMessage { get; set; }

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [JsonPropertyName("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}