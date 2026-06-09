using LocalsZaApi.Models;
using LocalsZaApi.Services;

namespace LocalsZaApi.Endpoints;

public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this WebApplication app)
    {
        // POST /api/payment/initiate/{orderId}
        // Returns the URL + hidden form fields the frontend POSTs to PayFast.
        // Auth optional — guests can pay too.
        app.MapPost("/api/payment/initiate/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos,
            PayfastService payfast,
            IConfiguration config) =>
        {
            var uid = AuthHelpers.GetUid(ctx); // null = guest, that's fine

            // Load the order. For authed users we know the partition key (uid);
            // for guests we have to query by id across partitions.
            Order? order;
            if (uid is not null)
            {
                order = await cosmos.GetAsync<Order>("orders", orderId, uid);
            }
            else
            {
                var rows = await cosmos.QueryAsync<Order>("orders",
                    "SELECT * FROM c WHERE c.id = @id",
                    new() { ["@id"] = orderId });
                order = rows.FirstOrDefault();
            }

            if (order is null)
                return Results.NotFound(new { error = "Order not found" });

            if (order.Total <= 0)
                return Results.BadRequest(new { error = "Order has no payable amount" });

            // Email comes from Firebase claims for authed users.
            var customerEmail = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            var baseAppUrl = config["AppBaseUrl"] ?? "http://localhost:5173";

            PayfastInitiateResult result;
            try
            {
                result = payfast.Initiate(order, customerEmail, baseAppUrl);
            }
            catch (Exception ex)
            {
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }

            // Persist a pending Payment doc so the ITN webhook can correlate later.
            var payment = new Payment
            {
                Id          = orderId,
                OrderId     = orderId,
                UserId      = order.UserId,
                Amount      = order.Total,
                Status      = "pending",
                RequestHash = result.Signature
            };
            await cosmos.UpsertAsync("payments", payment, orderId);

            return Results.Ok(new
            {
                postUrl = result.PostUrl,
                fields  = result.Fields
            });
        });

        // POST /api/payment/notify
        // PayFast ITN (Instant Transaction Notification) — form-urlencoded POST.
        // MUST be anonymous — already in FirebaseAuthMiddleware skip list.
        app.MapPost("/api/payment/notify", async (
            HttpContext ctx,
            CosmosService cosmos,
            PayfastService payfast,
            ILogger<Program> log) =>
        {
            var form = await ctx.Request.ReadFormAsync();
            var dict = form.ToDictionary(kv => kv.Key, kv => kv.Value.ToString());

            // Step 1: verify ITN signature
            if (!payfast.VerifyItn(dict))
                return Results.BadRequest(new { error = "Invalid signature" });

            var orderId       = dict.GetValueOrDefault("m_payment_id") ?? "";
            var pfPaymentId   = dict.GetValueOrDefault("pf_payment_id");
            var paymentStatus = dict.GetValueOrDefault("payment_status")?.ToUpperInvariant() ?? "";

            if (string.IsNullOrEmpty(orderId))
                return Results.BadRequest(new { error = "Missing m_payment_id" });

            // Step 2: update the Payment doc
            var payment = await cosmos.GetAsync<Payment>("payments", orderId, orderId);
            if (payment is null)
            {
                log.LogWarning("PayFast ITN: no Payment doc for order {OrderId} — acking anyway", orderId);
                return Results.Ok(); // ack to stop PayFast's retry loop
            }

            payment.PfPaymentId = pfPaymentId;
            payment.Status      = paymentStatus switch
            {
                "COMPLETE"  => "complete",
                "FAILED"    => "failed",
                "CANCELLED" => "cancelled",
                _           => payment.Status
            };
            payment.UpdatedAt = DateTime.UtcNow.ToString("o");
            await cosmos.UpsertAsync("payments", payment, orderId);

            // Step 3: flip the Order status
            var orders = await cosmos.QueryAsync<Order>("orders",
                "SELECT * FROM c WHERE c.id = @id",
                new() { ["@id"] = orderId });
            var order = orders.FirstOrDefault();
            if (order is not null)
            {
                order.Status = paymentStatus switch
                {
                    "COMPLETE"  => "paid",
                    "CANCELLED" => "cancelled",
                    "FAILED"    => "pending", // user can retry payment
                    _           => order.Status
                };
                order.UpdatedAt = DateTime.UtcNow.ToString("o");
                var pk = order.UserId ?? order.GuestId!;
                await cosmos.UpsertAsync("orders", order, pk);
            }

            log.LogInformation("PayFast ITN processed: order={OrderId} status={Status}", orderId, paymentStatus);
            return Results.Ok();
        });

        // GET /api/payment/redirect/{orderId}
        // Returns a self-submitting HTML page that POSTs to PayFast.
        // Served by the API (no CSP headers) so GTM/form-action CSP never applies.
        app.MapGet("/api/payment/redirect/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos,
            PayfastService payfast,
            IConfiguration config) =>
        {
            var uid = AuthHelpers.GetUid(ctx);
            Order? order;
            if (uid is not null)
            {
                order = await cosmos.GetAsync<Order>("orders", orderId, uid);
            }
            else
            {
                var rows = await cosmos.QueryAsync<Order>("orders",
                    "SELECT * FROM c WHERE c.id = @id",
                    new() { ["@id"] = orderId });
                order = rows.FirstOrDefault();
            }

            if (order is null)
                return Results.NotFound("Order not found");

            if (order.Total <= 0)
                return Results.BadRequest("Order has no payable amount");

            var customerEmail = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            var baseAppUrl = config["AppBaseUrl"] ?? "http://localhost:5173";

            PayfastInitiateResult result;
            try { result = payfast.Initiate(order, customerEmail, baseAppUrl); }
            catch (Exception ex) { return Results.Problem(detail: ex.Message, statusCode: 500); }

            var payment = new Payment
            {
                Id          = orderId,
                OrderId     = orderId,
                UserId      = order.UserId,
                Amount      = order.Total,
                Status      = "pending",
                RequestHash = result.Signature
            };
            await cosmos.UpsertAsync("payments", payment, orderId);

            var inputs = string.Concat(result.Fields.Select(kv =>
                $"<input type=\"hidden\" name=\"{System.Net.WebUtility.HtmlEncode(kv.Key)}\" value=\"{System.Net.WebUtility.HtmlEncode(kv.Value)}\"/>\n"));

            var html = $"""
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Redirecting to PayFast…</title></head>
                <body style="font-family:sans-serif;text-align:center;padding-top:20vh">
                <p>Redirecting to PayFast, please wait…</p>
                <form id="pf" method="POST" action="{System.Net.WebUtility.HtmlEncode(result.PostUrl)}">
                {inputs}</form>
                <script>document.getElementById('pf').submit();</script>
                </body>
                </html>
                """;

            return Results.Content(html, "text/html; charset=utf-8");
        });

        // GET /api/payment/status/{orderId}
        // Frontend polls this after PayFast redirects back to /order/payment/success
        // because the return_url redirect can arrive before the ITN webhook.
        app.MapGet("/api/payment/status/{orderId}", async (
            HttpContext ctx,
            string orderId,
            CosmosService cosmos) =>
        {
            var payment = await cosmos.GetAsync<Payment>("payments", orderId, orderId);
            return payment is null
                ? Results.NotFound()
                : Results.Ok(payment);
        });
    }
}
