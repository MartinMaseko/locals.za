using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace LocalsZaApi.Services;

public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendDriverApplicationAsync(DriverApplicationData data)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_config["Email:From"] ?? "noreply@locals-za.co.za"));
            message.To.Add(MailboxAddress.Parse("admin@locals-za.co.za"));
            message.Subject = $"Driver Application — {data.FirstName} {data.Surname}";

            var builder = new BodyBuilder { HtmlBody = BuildHtml(data) };
            message.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(
                _config["Email:SmtpHost"] ?? "smtp.gmail.com",
                int.Parse(_config["Email:Port"] ?? "587"),
                SecureSocketOptions.StartTls
            );
            var smtpUser = _config["Email:Username"] ?? throw new InvalidOperationException("Email:Username is not configured");
            var smtpPass = _config["Email:Password"] ?? throw new InvalidOperationException("Email:Password is not configured");
            await smtp.AuthenticateAsync(smtpUser, smtpPass);
            await smtp.SendAsync(message);
            await smtp.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send driver application email for {Name}", $"{data.FirstName} {data.Surname}");
            throw;
        }
    }

    private static string Esc(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "");

    private static string BuildHtml(DriverApplicationData d) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Driver Application</title></head>
        <body style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f5f5;color:#222">
          <div style="background:#111;padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;color:#FFB803;font-size:1.3rem;letter-spacing:0.06em">LOCALSZA</h1>
            <p style="margin:4px 0 0;color:#aaa;font-size:0.82rem">New Driver Application</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="color:#111;font-size:1.05rem;margin:0 0 20px">Applicant: {Esc($"{d.FirstName} {d.Surname}")}</h2>

            <h3 style="color:#FFB803;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;border-bottom:2px solid #FFB803;padding-bottom:4px">Personal Information</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:16px">
              <tr><td style="padding:5px 0;color:#666;width:42%">First Name</td><td style="padding:5px 0;font-weight:600">{Esc(d.FirstName)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Surname</td><td style="padding:5px 0;font-weight:600">{Esc(d.Surname)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">ID Number</td><td style="padding:5px 0;font-weight:600">{Esc(d.IdNumber)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Phone</td><td style="padding:5px 0;font-weight:600">{Esc(d.PhoneNumber)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Email</td><td style="padding:5px 0;font-weight:600">{Esc(d.Email)}</td></tr>
            </table>

            <h3 style="color:#FFB803;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;border-bottom:2px solid #FFB803;padding-bottom:4px">Vehicle</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:16px">
              <tr><td style="padding:5px 0;color:#666;width:42%">Type</td><td style="padding:5px 0;font-weight:600;text-transform:capitalize">{Esc(d.VehicleType)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Load Capacity</td><td style="padding:5px 0;font-weight:600">{Esc(d.LoadCapacity)}</td></tr>
            </table>

            <h3 style="color:#FFB803;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;border-bottom:2px solid #FFB803;padding-bottom:4px">Banking Details</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:16px">
              <tr><td style="padding:5px 0;color:#666;width:42%">Bank</td><td style="padding:5px 0;font-weight:600">{Esc(d.BankName)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Account Type</td><td style="padding:5px 0;font-weight:600">{Esc(d.AccountType)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Account Number</td><td style="padding:5px 0;font-weight:600">{Esc(d.AccountNumber)}</td></tr>
              <tr><td style="padding:5px 0;color:#666">Branch Code</td><td style="padding:5px 0;font-weight:600">{Esc(d.BranchCode)}</td></tr>
            </table>

            <h3 style="color:#FFB803;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;border-bottom:2px solid #FFB803;padding-bottom:4px">Documents</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:24px">
              <tr>
                <td style="padding:5px 0;color:#666;width:42%">Driver's Licence</td>
                <td style="padding:5px 0"><a href="{d.LicenseUrl}" style="color:#FFB803;font-weight:600;text-decoration:none">View Document &#8599;</a></td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#666">Proof of Residence</td>
                <td style="padding:5px 0"><a href="{d.ProofUrl}" style="color:#FFB803;font-weight:600;text-decoration:none">View Document &#8599;</a></td>
              </tr>
            </table>

            <p style="margin:0;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:0.75rem">
              Submitted {DateTime.UtcNow:f} UTC &middot; LocalsZA Driver Applications
            </p>
          </div>
        </body>
        </html>
        """;
}

public record DriverApplicationData(
    string FirstName,
    string Surname,
    string IdNumber,
    string PhoneNumber,
    string Email,
    string VehicleType,
    string LoadCapacity,
    string BankName,
    string AccountType,
    string AccountNumber,
    string BranchCode,
    string LicenseUrl,
    string ProofUrl
);
