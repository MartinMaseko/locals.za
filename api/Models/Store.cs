using System.Text.Json.Serialization;

namespace LocalsZaApi.Models;

public class Store
{
    public string  Id       { get; set; } = "";
    public string  Name     { get; set; } = "";
    public string  Tagline  { get; set; } = "";
    public string  Initials { get; set; } = "";
    public string  Color    { get; set; } = "";

    [JsonPropertyName("logo_url")]
    public string? LogoUrl  { get; set; }

    public string  Address  { get; set; } = "";
    public double  Lat      { get; set; }
    public double  Lng      { get; set; }
    public bool    Active   { get; set; } = true;
}