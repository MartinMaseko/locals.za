using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class UserNotification
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    /// <summary>Firebase UID — used as Cosmos partition key.</summary>
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = "";

    /// <summary>order | order_status | driver_alert | delivery_pin</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "order";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("body")]
    public string Body { get; set; } = "";

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("orderId")]
    public string? OrderId { get; set; }

    [JsonPropertyName("orderStatus")]
    public string? OrderStatus { get; set; }

    /// <summary>True on delivered orders — frontend renders the star-rating widget.</summary>
    [JsonPropertyName("includeRating")]
    public bool IncludeRating { get; set; }

    /// <summary>4-digit proof-of-delivery PIN (delivery_pin type only).</summary>
    [JsonPropertyName("pin")]
    public string? Pin { get; set; }

    [JsonPropertyName("read")]
    public bool Read { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = "";
}
