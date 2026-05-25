using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using LocalsZaApi.Models;

namespace LocalsZaApi.Services;

public class OzowService
{
    private readonly IConfiguration _config;
    private readonly ILogger<OzowService> _log;
    private readonly IHttpClientFactory _httpFactory;

    public OzowService(IConfiguration config, ILogger<OzowService> log, IHttpClientFactory httpFactory)
    {
        _config = config;
        _log = log;
        _httpFactory = httpFactory;
    }

    private string SiteCode   => _config["Ozow:SiteCode"]   ?? throw new InvalidOperationException("Ozow:SiteCode missing");
    private string PrivateKey => _config["Ozow:PrivateKey"] ?? throw new InvalidOperationException("Ozow:PrivateKey missing");
    private string ApiKey     => _config["Ozow:ApiKey"]     ?? throw new InvalidOperationException("Ozow:ApiKey missing");
    private bool   IsTest     => bool.Parse(_config["Ozow:IsTest"] ?? "true");
    private string PaymentUrl => _config["Ozow:PaymentUrl"] ?? "https://stagingpay.ozow.com";
    private string ApiUrl     => _config["Ozow:ApiUrl"]     ?? "https://stagingapi.ozow.com";

    /// <summary>
    /// Build the payload + URL the frontend should POST to (Ozow consumer checkout).
    /// </summary>
    public OzowInitiateResult Initiate(Order order, string? customerEmail, string baseAppUrl)
    {
        var amount = order.Total.ToString("F2", CultureInfo.InvariantCulture);

        if (decimal.Parse(amount, CultureInfo.InvariantCulture) <= 0)
            throw new InvalidOperationException("Order amount must be greater than zero");

        // BankReference appears on the customer's bank statement — keep readable, max 20 chars.
        // Mirrors JS: LZA-<last 8 of orderId>
        var tail = order.Id.Length <= 8 ? order.Id : order.Id[^8..];
        var bankRef = $"LZA-{tail}";

        var payload = new Dictionary<string, string>
        {
            ["SiteCode"]             = SiteCode,
            ["CountryCode"]          = "ZA",
            ["CurrencyCode"]         = "ZAR",
            ["Amount"]               = amount,
            ["TransactionReference"] = order.Id,
            ["BankReference"]        = bankRef,
            ["Optional1"]            = order.UserId ?? order.GuestId ?? "",
            ["Optional2"]            = customerEmail ?? "",
            ["Optional3"]            = "",
            ["Optional4"]            = "",
            ["Optional5"]            = "",
            ["CancelUrl"]            = $"{baseAppUrl}/order/payment/cancelled/{order.Id}",
            ["ErrorUrl"]             = $"{baseAppUrl}/order/payment/error/{order.Id}",
            ["SuccessUrl"]           = $"{baseAppUrl}/order/payment/success/{order.Id}",
            ["NotifyUrl"]            = $"{baseAppUrl}/api/payment/notify",
            ["IsTest"]               = IsTest.ToString().ToLowerInvariant(),
        };

        var hash = GenerateRequestHash(payload);
        payload["HashCheck"] = hash;

        _log.LogInformation("Ozow initiate: orderId={OrderId} amount={Amount} bankRef={BankRef}",
            order.Id, amount, bankRef);

        return new OzowInitiateResult(PostUrl: PaymentUrl, Fields: payload, Hash: hash);
    }

    /// <summary>
    /// Verify a notification from Ozow's webhook by recomputing the hash.
    /// </summary>
    public bool VerifyNotification(IReadOnlyDictionary<string, string> form)
    {
        // Ozow may send "Hash" or (rarely) "HashCheck"
        var received = (form.GetValueOrDefault("Hash")
                      ?? form.GetValueOrDefault("HashCheck")
                      ?? "").ToLowerInvariant();

        var computed = GenerateNotificationHash(form);
        var match = string.Equals(computed, received, StringComparison.OrdinalIgnoreCase);

        if (!match)
            _log.LogWarning("Ozow notify hash mismatch. received={Received} computed={Computed}",
                received, computed);

        return match;
    }

    /// <summary>
    /// Step 3 (recommended) — query Ozow's API to confirm the notification's status.
    /// Protects against spoofed webhook requests even if hash somehow passes.
    /// </summary>
    public async Task<OzowApiStatus?> CheckTransactionStatusAsync(string transactionReference)
    {
        try
        {
            var http = _httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(10);

            var url = $"{ApiUrl}/GetTransactionByReference"
                    + $"?siteCode={Uri.EscapeDataString(SiteCode)}"
                    + $"&transactionReference={Uri.EscapeDataString(transactionReference)}";

            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("Accept", "application/json");
            req.Headers.Add("ApiKey", ApiKey);

            var response = await http.SendAsync(req);
            if (!response.IsSuccessStatusCode)
            {
                _log.LogWarning("Ozow status API returned {Code}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            // The endpoint returns an array — newest first
            var result = System.Text.Json.JsonSerializer.Deserialize<OzowApiStatus[]>(json,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Ozow status check failed");
            return null;
        }
    }

    // ---------- hash helpers ----------

    /// <summary>
    /// Request hash field order (matches our working JS impl):
    /// SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference + BankReference +
    /// Optional1..Optional5 + CancelUrl + ErrorUrl + SuccessUrl + NotifyUrl + IsTest + PrivateKey
    /// </summary>
    private string GenerateRequestHash(Dictionary<string, string> p)
    {
        var sb = new StringBuilder();
        sb.Append(p["SiteCode"]);
        sb.Append(p["CountryCode"]);
        sb.Append(p["CurrencyCode"]);
        sb.Append(p["Amount"]);
        sb.Append(p["TransactionReference"]);
        sb.Append(p["BankReference"]);
        sb.Append(p["Optional1"]);
        sb.Append(p["Optional2"]);
        sb.Append(p["Optional3"]);
        sb.Append(p["Optional4"]);
        sb.Append(p["Optional5"]);
        sb.Append(p["CancelUrl"]);
        sb.Append(p["ErrorUrl"]);
        sb.Append(p["SuccessUrl"]);
        sb.Append(p["NotifyUrl"]);
        sb.Append(p["IsTest"]);
        sb.Append(PrivateKey);

        return Sha512(sb.ToString().ToLowerInvariant());
    }

    /// <summary>
    /// Notification hash field order (matches our working JS impl):
    /// SiteCode + TransactionId + TransactionReference + Amount + Status +
    /// Optional1..Optional5 + CurrencyCode + IsTest + StatusMessage + PrivateKey
    /// </summary>
    private string GenerateNotificationHash(IReadOnlyDictionary<string, string> n)
    {
        string V(string k) => n.GetValueOrDefault(k) ?? "";

        var sb = new StringBuilder();
        sb.Append(V("SiteCode"));
        sb.Append(V("TransactionId"));
        sb.Append(V("TransactionReference"));
        sb.Append(V("Amount"));
        sb.Append(V("Status"));
        sb.Append(V("Optional1"));
        sb.Append(V("Optional2"));
        sb.Append(V("Optional3"));
        sb.Append(V("Optional4"));
        sb.Append(V("Optional5"));
        sb.Append(V("CurrencyCode"));
        sb.Append(V("IsTest"));
        sb.Append(V("StatusMessage"));
        sb.Append(PrivateKey);

        return Sha512(sb.ToString().ToLowerInvariant());
    }

    private static string Sha512(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash  = SHA512.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public record OzowInitiateResult(string PostUrl, IDictionary<string, string> Fields, string Hash);

public class OzowApiStatus
{
    public string? TransactionId        { get; set; }
    public string? TransactionReference { get; set; }
    public string? Status               { get; set; }
    public string? StatusMessage        { get; set; }
    public decimal? Amount              { get; set; }
}