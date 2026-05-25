using Microsoft.Azure.Cosmos;
using System.Net;

namespace LocalsZaApi.Services;

public class CosmosService
{
    private readonly CosmosClient _client;
    private readonly string _db;

    public CosmosService(IConfiguration config)
    {
        _client = new CosmosClient(
            config["Cosmos:EndpointUri"],
            config["Cosmos:PrimaryKey"],
            new CosmosClientOptions { SerializerOptions = new() { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase } });
        _db = config["Cosmos:DatabaseName"]!;
    }

    private Container C(string name) => _client.GetContainer(_db, name);

    public async Task<T?> GetAsync<T>(string container, string id, string partitionKey)
    {
        try
        {
            var r = await C(container).ReadItemAsync<T>(id, new PartitionKey(partitionKey));
            return r.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }
    }

    public async Task<T> UpsertAsync<T>(string container, T item, string partitionKey)
    {
        var r = await C(container).UpsertItemAsync(item, new PartitionKey(partitionKey));
        return r.Resource;
    }

    public async Task<List<T>> QueryAsync<T>(string container, string sql,
        Dictionary<string, object>? parameters = null)
    {
        var def = new QueryDefinition(sql);
        if (parameters != null)
            foreach (var p in parameters)
                def = def.WithParameter(p.Key, p.Value);

        var results = new List<T>();
        var iter = C(container).GetItemQueryIterator<T>(def);
        while (iter.HasMoreResults)
            results.AddRange(await iter.ReadNextAsync());
        return results;
    }

    public async Task DeleteAsync(string container, string id, string partitionKey)
        => await C(container).DeleteItemAsync<object>(id, new PartitionKey(partitionKey));
}