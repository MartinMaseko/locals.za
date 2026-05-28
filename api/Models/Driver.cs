using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

// Cosmos container: "drivers", partition key: /id
// Cosmos SDK uses Newtonsoft (CamelCase) → all fields stored as camelCase.
// STJ [JsonPropertyName] attributes only affect HTTP responses, NOT Cosmos storage.
// Partition key = Id (always present, always "id" in Cosmos) — simple and reliable.
public class Driver
{
    public string  Id          { get; set; } = "";

    [JsonPropertyName("driver_id")]
    public string  DriverId    { get; set; } = "";

    [JsonPropertyName("firebase_uid")]
    public string? FirebaseUid { get; set; }

    [JsonPropertyName("full_name")]
    public string  FullName    { get; set; } = "";

    public string  Email       { get; set; } = "";

    [JsonPropertyName("phone_number")]
    public string  PhoneNumber { get; set; } = "";

    [JsonPropertyName("vehicle_type")]
    public string  VehicleType { get; set; } = "bakkie";

    [JsonPropertyName("vehicle_model")]
    public string  VehicleModel { get; set; } = "";

    // "offline" | "available" | "on_delivery"
    public string  Status      { get; set; } = "offline";

    // SHA-256 hex of "{driverId}:{pin}". Never returned in API responses.
    [JsonPropertyName("pin_hash")]
    public string  PinHash     { get; set; } = "";

    [JsonPropertyName("current_location")]
    public DriverLocation? CurrentLocation { get; set; }

    [JsonPropertyName("created_at")]
    public string  CreatedAt   { get; set; } = DateTime.UtcNow.ToString("o");
}

public class DriverLocation
{
    public double Lat { get; set; }
    public double Lng { get; set; }
}
