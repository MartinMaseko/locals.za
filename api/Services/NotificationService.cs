using LocalsZaApi.Models;

namespace LocalsZaApi.Services;

/// <summary>
/// Creates and persists user notifications in the Cosmos "notifications" container.
/// Called from order/driver endpoints when events happen so customers stay informed.
/// Replaces the Node.js notificationHelper.js in the .NET migration path.
/// </summary>
public class NotificationService
{
    private readonly CosmosService _cosmos;

    private static readonly string ThankYouBanner =
        "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Thank%20You%20Banner.png?alt=media&token=81d2147b-f5ca-45e3-82ca-6e87dd4a0a4f";
    private static readonly string ProcessedImg =
        "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Processed%20Order.jpg?alt=media&token=5f5147d1-cd3a-484f-8358-4657134b6021";
    private static readonly string InTransitImg =
        "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Intransit.jpg?alt=media&token=1cf4cc7f-4bd1-4401-9bd3-973584417fbf";
    private static readonly string DeliveredImg =
        "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/delivered.jpg?alt=media&token=971134c0-55a4-4dba-baa5-0199bf5d6f6e";

    public NotificationService(CosmosService cosmos) => _cosmos = cosmos;

    public Task SendOrderConfirmationAsync(string userId, string orderId, decimal total)
    {
        var shortId = ShortId(orderId);
        return SaveAsync(new UserNotification
        {
            UserId   = userId,
            Type     = "order",
            Title    = $"Order #{shortId} Confirmed",
            Body     = $"Thank you! Your order for R{total:F2} has been received and is being processed. We'll keep you updated every step of the way.",
            ImageUrl = ThankYouBanner,
            OrderId  = orderId,
        });
    }

    public Task SendOrderStatusAsync(string userId, string orderId, string status)
    {
        var shortId = ShortId(orderId);
        var (title, body, image, includeRating) = status switch
        {
            "processing" => (
                $"Order #{shortId} is Being Prepared",
                "Great news — your order is being put together. We'll notify you when it's loaded and on the way.",
                ProcessedImg, false),

            "assigned" or "loaded" or "in_transit" => (
                $"Order #{shortId} is On the Way",
                "Your driver has picked up your order and is heading to you. Keep an eye out!",
                InTransitImg, false),

            "delivered" => (
                $"Order #{shortId} Delivered",
                "Your order has arrived. Enjoy! We'd love to hear how it went — please take a moment to rate your experience.",
                DeliveredImg, true),

            "cancelled" => (
                $"Order #{shortId} Cancelled",
                "Your order has been cancelled. If you have any questions please reach out via the Support page.",
                null, false),

            _ => (
                $"Order #{shortId} Update",
                $"Your order status has changed to: {status}.",
                null, false)
        };

        return SaveAsync(new UserNotification
        {
            UserId        = userId,
            Type          = "order_status",
            Title         = title,
            Body          = body,
            ImageUrl      = image,
            OrderId       = orderId,
            OrderStatus   = status,
            IncludeRating = includeRating,
        });
    }

    public Task SendDriverAlertAsync(string userId, string orderId)
    {
        var shortId = ShortId(orderId);
        return SaveAsync(new UserNotification
        {
            UserId  = userId,
            Type    = "driver_alert",
            Title   = $"Driver On the Way — Order #{shortId}",
            Body    = "Your driver is heading to your address right now! Make sure someone is available to receive the delivery.",
            OrderId = orderId,
        });
    }

    public Task SendDeliveryPinAsync(string userId, string orderId, string pin)
    {
        var shortId = ShortId(orderId);
        return SaveAsync(new UserNotification
        {
            UserId  = userId,
            Type    = "delivery_pin",
            Title   = $"Your Delivery PIN — Order #{shortId}",
            Body    = $"Your delivery PIN is {pin}. Give this to your driver when they arrive to confirm receipt. Keep it private.",
            OrderId = orderId,
            Pin     = pin,
        });
    }

    private async Task SaveAsync(UserNotification n)
    {
        n.Id        = Guid.NewGuid().ToString();
        n.Read      = false;
        n.CreatedAt = DateTime.UtcNow.ToString("o");
        await _cosmos.UpsertAsync("notifications", n, n.UserId);
    }

    private static string ShortId(string id) =>
        id.Length > 6 ? id[^6..] : id;
}
