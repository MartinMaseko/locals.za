using System.Text.Json;

namespace LocalsZaApi.Services;

/// <summary>
/// Wraps the Azure Maps REST APIs for geocoding and route calculation.
/// The subscription key lives server-side only — route geometry is returned
/// to the frontend so the Azure Maps JS SDK can render the map using its own
/// (domain-restricted) frontend key.
/// </summary>
public class MapsService
{
    private readonly string _subscriptionKey;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<MapsService> _log;

    public MapsService(IConfiguration config, IHttpClientFactory http, ILogger<MapsService> log)
    {
        _subscriptionKey = config["AzureMaps:SubscriptionKey"]
            ?? throw new InvalidOperationException("AzureMaps:SubscriptionKey is not configured");
        _http = http;
        _log = log;
    }

    /// <summary>
    /// Geocodes both address strings, fetches the driving route between them,
    /// and returns the full RouteResult including polyline points.
    /// </summary>
    public async Task<RouteResult> GetRouteAsync(string origin, string destination)
    {
        var (originLat, originLng) = await GeocodeAsync(origin);
        var (destLat, destLng)     = await GeocodeAsync(destination);

        var (distanceKm, durationMinutes, routePoints) =
            await GetDrivingRouteAsync(originLat, originLng, destLat, destLng);

        return new RouteResult(distanceKm, durationMinutes,
            originLat, originLng, destLat, destLng, routePoints);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<(double Lat, double Lng)> GeocodeAsync(string address)
    {
        // Use the newer 2023-06-01 Geocoding API (GeoJSON response)
        var url = "https://atlas.microsoft.com/geocode" +
                  "?api-version=2023-06-01" +
                  $"&query={Uri.EscapeDataString(address)}" +
                  "&countryCode=ZA" +
                  $"&subscription-key={_subscriptionKey}";

        var http = _http.CreateClient();
        var response = await http.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        using var doc    = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        var features = root.GetProperty("features");
        if (features.GetArrayLength() == 0)
        {
            _log.LogWarning("No geocoding results for address: {Address}", address);
            throw new Exception($"Address not found: {address}");
        }

        // GeoJSON: coordinates = [longitude, latitude]
        var coords = features[0].GetProperty("geometry").GetProperty("coordinates");
        return (Lat: coords[1].GetDouble(), Lng: coords[0].GetDouble());
    }

    private async Task<(double DistanceKm, int DurationMinutes, double[][] RoutePoints)>
        GetDrivingRouteAsync(double originLat, double originLng, double destLat, double destLng)
    {
        var url = "https://atlas.microsoft.com/route/directions/json" +
                  "?api-version=1.0" +
                  $"&query={originLat},{originLng}:{destLat},{destLng}" +
                  $"&subscription-key={_subscriptionKey}" +
                  "&routeRepresentation=polyline" +
                  "&computeTravelTimeFor=none";

        var http = _http.CreateClient();
        var response = await http.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        using var doc    = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        var routes = root.GetProperty("routes");
        if (routes.GetArrayLength() == 0)
        {
            _log.LogWarning("No route found between ({OLat},{OLng}) and ({DLat},{DLng})",
                originLat, originLng, destLat, destLng);
            throw new Exception("No driving route found between the two addresses");
        }

        var route   = routes[0];
        var summary = route.GetProperty("summary");
        var metres  = summary.GetProperty("lengthInMeters").GetInt32();
        var seconds = summary.GetProperty("travelTimeInSeconds").GetInt32();

        double distanceKm    = Math.Round(metres / 1000.0, 1);
        int durationMinutes  = (int)Math.Ceiling(seconds / 60.0);

        // Extract polyline from the first leg — stored as [lng, lat] (GeoJSON convention)
        var points     = route.GetProperty("legs")[0].GetProperty("points");
        var count      = points.GetArrayLength();
        var routePoints = new double[count][];
        int i = 0;
        foreach (var pt in points.EnumerateArray())
        {
            routePoints[i++] = [
                pt.GetProperty("longitude").GetDouble(),
                pt.GetProperty("latitude").GetDouble()
            ];
        }

        return (distanceKm, durationMinutes, routePoints);
    }
}

/// <summary>Full route info returned by GetRouteAsync.</summary>
public record RouteResult(
    double DistanceKm,
    int    DurationMinutes,
    double OriginLat,
    double OriginLng,
    double DestLat,
    double DestLng,
    double[][] RoutePoints
);
