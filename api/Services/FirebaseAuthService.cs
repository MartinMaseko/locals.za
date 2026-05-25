using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

namespace LocalsZaApi.Services;

public class FirebaseAuthService
{
    public FirebaseAuthService(IConfiguration config)
    {
        if (FirebaseApp.DefaultInstance != null) return;

        // Production: Azure App Service Configuration → Firebase__ServiceAccountJson
        // holds the service-account JSON base64-encoded (never committed to git).
        // Local dev: falls back to firebase-service-account.json on disk (gitignored).
        var b64 = config["Firebase:ServiceAccountJson"];
        GoogleCredential credential;

        if (!string.IsNullOrEmpty(b64))
        {
            // Decode base64 → UTF-8 JSON string → credential.
            // GoogleCredential.FromJson() is the non-deprecated path.
            var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(b64));
            credential = GoogleCredential.FromJson(json);
        }
        else
        {
            var credPath = Path.Combine(AppContext.BaseDirectory, "firebase-service-account.json");
            if (!File.Exists(credPath))
                throw new FileNotFoundException(
                    "Firebase credentials not found. Set Firebase__ServiceAccountJson " +
                    "(base64 JSON) in Azure App Service Configuration, or place " +
                    "firebase-service-account.json in the api/ folder for local dev.",
                    credPath);

            var json = File.ReadAllText(credPath);
            credential = GoogleCredential.FromJson(json);
        }

        FirebaseApp.Create(new AppOptions
        {
            Credential = credential,
            ProjectId = config["Firebase:ProjectId"]
        });
    }

    public async Task<FirebaseToken> VerifyTokenAsync(string idToken)
        => await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
}