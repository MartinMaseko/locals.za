using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class User
{
    // Cosmos requires "id"
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    // uid == id for users — kept for clarity
    public string Uid { get; set; } = "";

    public string Email { get; set; } = "";

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = "";

    [JsonPropertyName("phone_number")]
    public string PhoneNumber { get; set; } = "";

    // "user" | "admin" | "driver"
    [JsonPropertyName("user_type")]
    public string UserType { get; set; } = "user";

    [JsonPropertyName("profile_picture_url")]
    public string ProfilePictureUrl { get; set; } = "";

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = "";

    [JsonPropertyName("updated_at")]
    public string UpdatedAt { get; set; } = "";
}