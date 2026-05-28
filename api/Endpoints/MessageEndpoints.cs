using System.Text.Json.Serialization;
using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class MessageEndpoints
{
    public static void MapMessageEndpoints(this WebApplication app)
    {
        // ── User notifications (replaces Firestore inbox in Node.js backend) ──

        app.MapGet("/api/notifications", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var notifications = await cosmos.QueryAsync<UserNotification>("notifications",
                "SELECT * FROM c WHERE c.userId = @uid ORDER BY c.createdAt DESC OFFSET 0 LIMIT 50",
                new() { ["@uid"] = uid });

            await ctx.Response.WriteAsJsonAsync(new { notifications });
        });

        app.MapGet("/api/notifications/unread-count", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var unread = await cosmos.QueryAsync<UserNotification>("notifications",
                "SELECT * FROM c WHERE c.userId = @uid AND c.read = false",
                new() { ["@uid"] = uid });

            await ctx.Response.WriteAsJsonAsync(new { count = unread.Count });
        });

        app.MapPatch("/api/notifications/{id}/read", async (HttpContext ctx, string id,
            CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var matches = await cosmos.QueryAsync<UserNotification>("notifications",
                "SELECT * FROM c WHERE c.id = @id AND c.userId = @uid",
                new() { ["@id"] = id, ["@uid"] = uid });

            var n = matches.FirstOrDefault();
            if (n is null) { ctx.Response.StatusCode = 404; return; }

            n.Read = true;
            var saved = await cosmos.UpsertAsync("notifications", n, uid);
            await ctx.Response.WriteAsJsonAsync(saved);
        });

        app.MapPatch("/api/notifications/read-all", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var unread = await cosmos.QueryAsync<UserNotification>("notifications",
                "SELECT * FROM c WHERE c.userId = @uid AND c.read = false",
                new() { ["@uid"] = uid });

            foreach (var n in unread)
            {
                n.Read = true;
                await cosmos.UpsertAsync("notifications", n, uid);
            }

            await ctx.Response.WriteAsJsonAsync(new { updated = unread.Count });
        });

        // ── Support message threads (keep for future support chat) ───────────

        app.MapGet("/api/messages", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var threads = await cosmos.QueryAsync<MessageThread>("messages",
                "SELECT * FROM c WHERE c.participantId = @uid ORDER BY c.updatedAt DESC",
                new() { ["@uid"] = uid });

            await ctx.Response.WriteAsJsonAsync(threads);
        });

        app.MapPost("/api/messages", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var uid = await AuthHelpers.RequireUidAsync(ctx);
            if (uid is null) return;

            var body = await ctx.Request.ReadFromJsonAsync<NewMessage>();
            if (body is null) { ctx.Response.StatusCode = 400; return; }

            var threadId = Guid.NewGuid().ToString();
            var thread = new MessageThread
            {
                Id            = threadId,
                ThreadId      = threadId,
                ParticipantId = uid,
                Subject       = body.Subject,
                Messages      = [new Message { From = uid, Text = body.Text,
                                               SentAt = DateTime.UtcNow.ToString("o") }],
                UpdatedAt     = DateTime.UtcNow.ToString("o")
            };

            var saved = await cosmos.UpsertAsync("messages", thread, threadId);
            await ctx.Response.WriteAsJsonAsync(saved);
        });
    }
}

public class MessageThread
{
    public string        Id            { get; set; } = "";
    [JsonPropertyName("thread_id")]
    public string        ThreadId      { get; set; } = "";
    [JsonPropertyName("participant_id")]
    public string        ParticipantId { get; set; } = "";
    public string        Subject       { get; set; } = "";
    public List<Message> Messages      { get; set; } = [];
    [JsonPropertyName("updated_at")]
    public string        UpdatedAt     { get; set; } = "";
}

public class Message
{
    public string From   { get; set; } = "";
    public string Text   { get; set; } = "";
    [JsonPropertyName("sent_at")]
    public string SentAt { get; set; } = "";
}

record NewMessage(string Subject, string Text);
