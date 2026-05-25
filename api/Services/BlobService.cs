using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace LocalsZaApi.Services;

public class BlobService
{
    private readonly BlobContainerClient _container;

    public BlobService(IConfiguration config)
    {
        var connectionString = config["AzureBlob:ConnectionString"]
            ?? throw new InvalidOperationException("AzureBlob:ConnectionString is not configured");
        var containerName = config["AzureBlob:ContainerName"] ?? "receipts";

        var serviceClient = new BlobServiceClient(connectionString);
        _container = serviceClient.GetBlobContainerClient(containerName);

        // Ensure the container exists on first use (no-op if it does).
        _container.CreateIfNotExists(PublicAccessType.None);
    }

    /// <summary>
    /// Upload a stream to blob storage and return its full URL.
    /// </summary>
    public async Task<string> UploadAsync(Stream content, string filename, string contentType)
    {
        // Prefix with a GUID to avoid collisions if two users upload "receipt.jpg"
        var blobName = $"{Guid.NewGuid()}-{filename}";
        var blob = _container.GetBlobClient(blobName);

        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });
        return blob.Uri.ToString();
    }
}