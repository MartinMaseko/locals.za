using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class Order
{
    public string          Id              { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("user_id")]
    public string?         UserId          { get; set; }      // null = guest order

    [JsonPropertyName("guest_id")]
    public string?         GuestId         { get; set; }

    [JsonPropertyName("store_id")]
    public string          StoreId         { get; set; } = "";

    [JsonPropertyName("order_number")]
    public string          OrderNumber     { get; set; } = "";

    public List<OrderItem> Items           { get; set; } = [];
    public decimal         Subtotal        { get; set; }

    [JsonPropertyName("service_fee")]
    public decimal         ServiceFee      { get; set; }

    [JsonPropertyName("delivery_fee")]
    public decimal         DeliveryFee     { get; set; }

    public decimal         Total           { get; set; }

    [JsonPropertyName("platform_fee")]
    public decimal         PlatformFee     { get; set; }      // 20%

    [JsonPropertyName("driver_payout")]
    public decimal         DriverPayout    { get; set; }      // 80%

    [JsonPropertyName("delivery_address")]
    public DeliveryAddress DeliveryAddress { get; set; } = new();

    // "pending" | "confirmed" | "accepted" | "arrivedAtPickup" |
    // "loaded" | "arrivedAtDropoff" | "delivered" | "paid" | "cancelled"
    public string          Status          { get; set; } = "pending";

    [JsonPropertyName("driver_id")]
    public string?         DriverId        { get; set; }

    [JsonPropertyName("receipt_id")]
    public string?         ReceiptId       { get; set; }      // links to Cosmos receipts container

    // Captured during UploadReceipt step — shown to drivers on the delivery screen
    [JsonPropertyName("customer_name")]
    public string          CustomerName    { get; set; } = "";

    [JsonPropertyName("contact_number")]
    public string          ContactNumber   { get; set; } = "";

    [JsonPropertyName("weight_class")]
    public string          WeightClass     { get; set; } = "light"; // light|medium|heavy|bulk

    public bool            Rush            { get; set; }
    public bool            Pooled          { get; set; }

    [JsonPropertyName("distance_km")]
    public double          DistanceKm      { get; set; }

    [JsonPropertyName("created_at")]
    public string          CreatedAt       { get; set; } = DateTime.UtcNow.ToString("o");

    [JsonPropertyName("updated_at")]
    public string          UpdatedAt       { get; set; } = DateTime.UtcNow.ToString("o");
}