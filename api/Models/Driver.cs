using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class Driver
{
    public string  Id           { get; set; } = "";

    [JsonPropertyName("driver_id")]
    public string  DriverId     { get; set; } = "";

    [JsonPropertyName("firebase_uid")]
    public string? FirebaseUid  { get; set; }

    [JsonPropertyName("full_name")]
    public string  FullName     { get; set; } = "";

    public string  Email        { get; set; } = "";

    [JsonPropertyName("phone_number")]
    public string  PhoneNumber  { get; set; } = "";

    [JsonPropertyName("vehicle_type")]
    public string  VehicleType  { get; set; } = "";   // "bakkie" | "van" | "truck"

    [JsonPropertyName("vehicle_model")]
    public string  VehicleModel { get; set; } = "";

    // "offline" | "available" | "on_delivery"
    public string  Status       { get; set; } = "offline";

    /// <summary>
    /// SHA-256 hex of "{driver_id}:{pin}". Set by admin on creation / PIN reset.
    /// Never returned to the frontend — excluded via projection or omitted from responses.
    /// </summary>
    [JsonPropertyName("pin_hash")]
    public string  PinHash      { get; set; } = "";

    [JsonPropertyName("current_location")]
    public DriverLocation? CurrentLocation { get; set; }

    [JsonPropertyName("created_at")]
    public string  CreatedAt    { get; set; } = DateTime.UtcNow.ToString("o");
}

public class DriverLocation
{
    public double Lat       { get; set; }
    public double Lng       { get; set; }
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}