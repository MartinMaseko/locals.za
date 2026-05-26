using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

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
        await container.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var blobName = $"{Guid.NewGuid()}-{filename}";
        var blob = container.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });
        return blob.Uri.ToString();
    }
}