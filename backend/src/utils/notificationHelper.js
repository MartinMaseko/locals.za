const admin = require('../../firebase');

/**
 * Send message to user's inbox and notifications collections
 * @param {string} userId - User ID to receive the message
 * @param {Object} inboxMessage - Message for the inbox collection
 * @param {Object} notificationMessage - Message for the notifications collection
 * @returns {Promise<boolean>} - Success status
 */
const sendUserMessages = async (userId, inboxMessage, notificationMessage) => {
  try {
    if (!userId) return false;
    
    const batch = admin.firestore().batch();
    
    // Add inbox message
    if (inboxMessage) {
      const inboxRef = admin.firestore().collection('users').doc(userId).collection('inbox').doc();
      batch.set(inboxRef, {
        ...inboxMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    }
    
    // Add notification
    if (notificationMessage) {
      const notifRef = admin.firestore().collection('users').doc(userId).collection('notifications').doc();
      batch.set(notifRef, {
        ...notificationMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error sending user messages:", error);
    return false;
  }
};

/**
 * Send order confirmation message after order placement
 */
const sendOrderConfirmationMessage = async (userId, orderId, orderData) => {
  try {
    // Format the total properly
    const total = Number(orderData.total).toFixed(2);
    const shortOrderId = orderId.slice(-6);
    
    // Create inbox message
    const inboxMessage = {
      title: `Order #${shortOrderId} Confirmed`,
      body: `Thank you for your order! Your order for R${total} has been received and is being processed. We'll update you when your order status changes. You can track your order at any time on the Orders page.`,
      fromRole: "LocalsZA Support",
      type: "order",
      orderId: orderId,
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Thank%20You%20Banner.png?alt=media&token=81d2147b-f5ca-45e3-82ca-6e87dd4a0a4f"
    };
    
    // Create notification
    const notificationMessage = {
      title: `New Order Placed`,
      body: `Your order #${shortOrderId} has been received and is being processed.`,
      type: "order",
      orderId: orderId
    };
    
    return await sendUserMessages(userId, inboxMessage, notificationMessage);
  } catch (error) {
    console.error("Error sending order confirmation message:", error);
    return false;
  }
};

/**
 * Send order status update message
 */
const sendOrderStatusMessage = async (userId, orderId, status) => {
  // Set appropriate message based on status
  let statusMessage = '';
  let statusTitle = '';
  let statusImage = '';
  const shortOrderId = orderId.slice(-6);
  
  switch(status) {
    case 'processing':
      statusTitle = `Your Order #${shortOrderId} is Being Processed`;
      statusMessage = `Great news! Your order is now being prepared. We'll update you when it's ready for delivery.`;
      statusImage = "https://img.icons8.com/ios-filled/50/ffb803/in-progress.png";
      break;
    case 'in transit':
      statusTitle = `Your Order #${shortOrderId} is On the Way`;
      statusMessage = `Your order is now on its way to you! Your driver is en route to your delivery address.`;
      statusImage = "https://img.icons8.com/ios-filled/50/ffb803/in-transit--v1.png";
      break;
    case 'completed':
      statusTitle = `Your Order #${shortOrderId} has been Delivered`;
      statusMessage = `Your order has been delivered. Enjoy! Thank you for shopping with LocalsZA.`;
      statusImage = "https://img.icons8.com/ios-filled/50/ffb803/shipped.png";
      break;
    case 'cancelled':
      statusTitle = `Your Order #${shortOrderId} has been Cancelled`;
      statusMessage = `Your order has been cancelled. If you have any questions, please contact our support team.`;
      statusImage = "https://img.icons8.com/ios-filled/50/ffb803/cancel.png";
      break;
    default:
      statusTitle = `Order #${shortOrderId} Status Update`;
      statusMessage = `Your order status has been updated to: ${status}`;
      statusImage = "https://img.icons8.com/ios-filled/50/ffb803/purchase-order.png";
  }

  // Create messages
  const inboxMessage = {
    title: statusTitle,
    body: statusMessage,
    fromRole: "LocalsZA Team",
    type: "order_status",
    orderId: orderId,
    status: status,
    imageUrl: statusImage
  };
  
  const notificationMessage = {
    title: `Order Status Update`,
    body: `Order #${shortOrderId}: ${status}`,
    type: "order_status",
    orderId: orderId,
    status: status
  };
  
  return await sendUserMessages(userId, inboxMessage, notificationMessage);
};

module.exports = {
  sendUserMessages,
  sendOrderConfirmationMessage,
  sendOrderStatusMessage
};