using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using LocalsZaApi.Models;

namespace LocalsZaApi.Services;

public class PayfastService
{
    private readonly IConfiguration _config;
    private readonly ILogger<PayfastService> _log;

    public PayfastService(IConfiguration config, ILogger<PayfastService> log)
    {
        _config = config;
        _log = log;
    }

    private string MerchantId  => _config["Payfast:MerchantId"]  ?? throw new InvalidOperationException("Payfast:MerchantId missing");
    private string MerchantKey => _config["Payfast:MerchantKey"] ?? throw new InvalidOperationException("Payfast:MerchantKey missing");
    private string Passphrase  => _config["Payfast:Passphrase"]  ?? "";
    private bool   IsTest      => bool.Parse(_config["Payfast:IsTest"] ?? "false");
    private string PaymentUrl  => IsTest
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process";

    /// <summary>
    /// Build the payload + URL the frontend should POST to (PayFast consumer checkout).
    /// </summary>
    public PayfastInitiateResult Initiate(Order order, string? customerEmail, string baseAppUrl)
    {
        var amount = order.Total.ToString("F2", CultureInfo.InvariantCulture);

        if (decimal.Parse(amount, CultureInfo.InvariantCulture) <= 0)
            throw new InvalidOperationException("Order amount must be greater than zero");

        var fullName  = (order.CustomerName?.Trim() is { Length: > 0 } n) ? n : "Customer";
        var parts     = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var firstName = parts[0][..Math.Min(100, parts[0].Length)];
        var lastName  = parts.Length > 1
            ? string.Join(" ", parts.Skip(1))[..Math.Min(100, string.Join(" ", parts.Skip(1)).Length)]
            : "User";

        var email    = (customerEmail is { Length: > 0 } e) ? e[..Math.Min(255, e.Length)] : $"guest@locals-za.co.za";
        var tail     = order.Id.Length <= 8 ? order.Id : order.Id[^8..];
        var itemName = $"LocalsZA Order #{tail}";

        // Notify URL points at the API directly, not the SPA base URL
        var notifyUrl = _config["Payfast:NotifyUrl"]
            ?? throw new InvalidOperationException("Payfast:NotifyUrl missing");

        var dataForSignature = new Dictionary<string, string>
        {
            ["merchant_id"]    = MerchantId,
            ["merchant_key"]   = MerchantKey,
            ["return_url"]     = $"{baseAppUrl}/order/payment/success/{order.Id}",
            ["cancel_url"]     = $"{baseAppUrl}/order/payment/cancelled/{order.Id}",
            ["notify_url"]     = notifyUrl,
            ["name_first"]     = firstName,
            ["name_last"]      = lastName,
            ["email_address"]  = email,
            ["m_payment_id"]   = order.Id,
            ["amount"]         = amount,
            ["item_name"]      = itemName,
        };

        var signature = GenerateSignature(dataForSignature, Passphrase);

        var fields = new Dictionary<string, string>(dataForSignature)
        {
            ["signature"] = signature
        };

        _log.LogInformation("PayFast initiate: orderId={OrderId} amount={Amount} isTest={IsTest}",
            order.Id, amount, IsTest);

        return new PayfastInitiateResult(PostUrl: PaymentUrl, Fields: fields, Signature: signature);
    }

    /// <summary>
    /// Verify the signature on a PayFast ITN (Instant Transaction Notification).
    /// </summary>
    public bool VerifyItn(IReadOnlyDictionary<string, string> form)
    {
        if (!form.TryGetValue("signature", out var received))
        {
            _log.LogWarning("PayFast ITN: no signature field present");
            return false;
        }

        var data = form
            .Where(kv => kv.Key != "signature")
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        var computed = GenerateSignature(data, Passphrase);
        var match = string.Equals(computed, received, StringComparison.OrdinalIgnoreCase);

        if (!match)
            _log.LogWarning("PayFast ITN signature mismatch. received={Received} computed={Computed}",
                received, computed);

        return match;
    }

    // ---------- signature ----------

    /// <summary>
    /// PayFast MD5 signature: sort keys alphabetically, URL-encode values,
    /// join with &amp;, optionally append &amp;passphrase=..., then MD5 lowercase hex.
    /// https://developers.payfast.co.za/docs#signature-generation
    /// </summary>
    private static string GenerateSignature(IDictionary<string, string> data, string? passphrase)
    {
        var parts = data
            .OrderBy(kv => kv.Key, StringComparer.Ordinal)
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value.Trim()).Replace("%20", "+")}");

        var pfOutput = string.Join("&", parts);

        if (!string.IsNullOrEmpty(passphrase))
        {
            var encodedPassphrase = Uri.EscapeDataString(passphrase.Trim()).Replace("%20", "+");
            pfOutput += $"&passphrase={encodedPassphrase}";
        }

        var hash = MD5.HashData(Encoding.UTF8.GetBytes(pfOutput));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public record PayfastInitiateResult(string PostUrl, IDictionary<string, string> Fields, string Signature);
