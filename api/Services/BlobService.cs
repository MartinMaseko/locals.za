using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace LocalsZaApi.Services;

public class BlobService
{
    private readonly BlobServiceClient _serviceClient;
    private readonly BlobContainerClient _container;

    public BlobService(IConfiguration config)
    {
        var connectionString = config["AzureBlob:ConnectionString"]
            ?? throw new InvalidOperationException("AzureBlob:ConnectionString is not configured");
        var containerName = config["AzureBlob:ContainerName"] ?? "receipts";

        _serviceClient = new BlobServiceClient(connectionString);
        _container = _serviceClient.GetBlobContainerClient(containerName);
        _container.CreateIfNotExists(PublicAccessType.None);
    }

    /// <summary>Upload to the default (private) receipts container.</summary>
    public async Task<string> UploadAsync(Stream content, string filename, string contentType)
    {
        var blobName = $"{Guid.NewGuid()}-{filename}";
        var blob = _container.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });
        return blob.Uri.ToString();
    }

    /// <summary>Upload to a public-read container (e.g. store-logos).</summary>
    public async Task<string> UploadPublicAsync(Stream content, string filename, string contentType, string containerName)
    {
        var container = _serviceClient.GetBlobContainerClient(containerName);

        try
        {
            await container.CreateIfNotExistsAsync(PublicAccessType.Blob);
        }
        catch (Azure.RequestFailedException ex) when (ex.ErrorCode == "PublicAccessNotPermitted")
        {
            // Storage account has "Allow Blob anonymous access" disabled at account level.
            // Go to Azure Portal → Storage Account → Settings → Configuration →
            // enable "Allow Blob anonymous access", then the container will be made public.
            // For now we create the container private so the upload doesn't fail.
            await container.CreateIfNotExistsAsync(PublicAccessType.None);
        }

        var blobName = $"{Guid.NewGuid()}-{filename}";
        var blob = container.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });

        // Return a SAS URL valid for 10 years — works whether the container is public or private.
        var sasUri = blob.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.AddYears(10));
        return sasUri.ToString();
    }
}