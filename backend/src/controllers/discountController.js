const admin = require('firebase-admin');
const db = admin.firestore();

// Save paid price for a product on a specific date
exports.savePaidPrice = async (req, res) => {
  try {
    const { date, productId, paidPrice, unitPrice, totalQty } = req.body;

    if (!date || !productId || paidPrice === undefined || !unitPrice) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const discount = unitPrice - paidPrice;
    if (discount < 0) {
      return res.status(400).json({ message: 'Paid price cannot exceed unit price' });
    }

    const customerDiscount = discount * 0.75; // 75% to customers
    const businessProfit = discount * 0.25; // 25% to business

    // Create or update discount record
    const discountData = {
      date,
      productId,
      paidPrice: Number(paidPrice),
      unitPrice: Number(unitPrice),
      totalQty: Number(totalQty),
      discountPerUnit: Number(discount),
      customerDiscountPerUnit: Number(customerDiscount),
      businessProfitPerUnit: Number(businessProfit),
      totalDiscount: Number(discount * totalQty),
      totalCustomerDiscount: Number(customerDiscount * totalQty),
      totalBusinessProfit: Number(businessProfit * totalQty),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user?.uid || 'admin'
    };

    const discountId = `${date}_${productId}`;
    await db.collection('discounts').doc(discountId).set(discountData, { merge: true });

    // Update customer discounts for orders containing this product on this date
    await distributeDiscountsToCustomers(date, productId, customerDiscount);

    res.status(200).json({ 
      message: 'Discount saved successfully', 
      data: discountData 
    });
  } catch (error) {
    console.error('Error saving paid price:', error);
    res.status(500).json({ message: 'Failed to save discount', error: error.message });
  }
};

// Distribute discounts to customers based on their orders
async function distributeDiscountsToCustomers(date, productId, customerDiscountPerUnit) {
  try {
    console.log(`[distributeDiscountsToCustomers] Starting distribution for product ${productId} on date ${date}`);
    console.log(`[distributeDiscountsToCustomers] Customer discount per unit: R${customerDiscountPerUnit}`);

    // Parse the date string (YYYY-MM-DD format)
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    console.log(`[distributeDiscountsToCustomers] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Get all orders (we'll filter by date manually to handle different timestamp formats)
    const ordersSnapshot = await db.collection('orders').get();

    console.log(`[distributeDiscountsToCustomers] Total orders in database: ${ordersSnapshot.size}`);

    const batch = db.batch();
    let batchCount = 0;
    const maxBatchSize = 500;
    let customersUpdated = 0;
    let ordersProcessed = 0;

    for (const orderDoc of ordersSnapshot.docs) {
      const order = orderDoc.data();
      const orderItems = order.items || [];

      // Convert order createdAt to Date for comparison
      let orderDate;
      if (order.createdAt && order.createdAt.toDate) {
        // Firestore Timestamp
        orderDate = order.createdAt.toDate();
      } else if (order.createdAt && order.createdAt.seconds) {
        // Timestamp-like object
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (typeof order.createdAt === 'string') {
        // ISO string
        orderDate = new Date(order.createdAt);
      } else {
        console.log(`[distributeDiscountsToCustomers] Skipping order ${orderDoc.id} - invalid date format`);
        continue;
      }

      // Check if order is within the date range
      if (orderDate >= startOfDay && orderDate <= endOfDay) {
        ordersProcessed++;
        
        // Find if this order contains the discounted product
        const discountedItem = orderItems.find(item => item.productId === productId);
        
        if (discountedItem) {
          const qty = Number(discountedItem.qty || 0);
          const orderDiscount = customerDiscountPerUnit * qty;

          console.log(`[distributeDiscountsToCustomers] Order ${orderDoc.id} - Distributing R${orderDiscount.toFixed(2)} to user ${order.userId} (${qty} units)`);

          // Get or create customer discount record
          const customerDiscountRef = db.collection('customerDiscounts').doc(order.userId);
          
          batch.set(customerDiscountRef, {
            userId: order.userId,
            email: order.email || '',
            totalDiscountEarned: admin.firestore.FieldValue.increment(orderDiscount),
            totalDiscountUsed: admin.firestore.FieldValue.increment(0),
            availableDiscount: admin.firestore.FieldValue.increment(orderDiscount),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // Create discount transaction record
          const transactionRef = customerDiscountRef.collection('transactions').doc();
          
          batch.set(transactionRef, {
            orderId: orderDoc.id,
            productId,
            date,
            qty,
            discountAmount: orderDiscount,
            type: 'earned',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          batchCount += 2;
          customersUpdated++;

          // Commit batch if reaching limit
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            console.log(`[distributeDiscountsToCustomers] Batch committed (${batchCount} operations)`);
            batchCount = 0;
          }
        }
      }
    }

    // Commit remaining batch operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`[distributeDiscountsToCustomers] Final batch committed (${batchCount} operations)`);
    }

    console.log(`[distributeDiscountsToCustomers] ✅ Distribution complete!`);
    console.log(`[distributeDiscountsToCustomers] - Orders on date: ${ordersProcessed}`);
    console.log(`[distributeDiscountsToCustomers] - Customers updated: ${customersUpdated}`);
    console.log(`[distributeDiscountsToCustomers] - Product: ${productId}`);
    console.log(`[distributeDiscountsToCustomers] - Date: ${date}`);
    
    return { success: true, customersUpdated, ordersProcessed };
  } catch (error) {
    console.error('[distributeDiscountsToCustomers] ❌ Error:', error);
    console.error('[distributeDiscountsToCustomers] Stack:', error.stack);
    throw error;
  }
}

// Get customer's available discount
exports.getCustomerDiscount = async (req, res) => {
  try {
    // Try to get userId from auth, params, or query
    const userId = req.user?.uid || req.params.userId || req.query.userId;

    console.log('[getCustomerDiscount] Request:', {
      hasAuth: !!req.user,
      authUid: req.user?.uid,
      paramsUserId: req.params.userId,
      queryUserId: req.query.userId,
      resolvedUserId: userId
    });

    if (!userId) {
      console.log('[getCustomerDiscount] No user ID found - returning defaults');
      return res.status(200).json({ 
        availableDiscount: 0,
        totalEarned: 0,
        totalUsed: 0
      });
    }

    const customerDiscountDoc = await db.collection('customerDiscounts').doc(userId).get();

    if (!customerDiscountDoc.exists) {
      console.log(`[getCustomerDiscount] No discount record for user ${userId}`);
      return res.status(200).json({ 
        availableDiscount: 0,
        totalEarned: 0,
        totalUsed: 0
      });
    }

    const data = customerDiscountDoc.data();
    console.log(`[getCustomerDiscount] Found discount for user ${userId}:`, {
      available: data.availableDiscount,
      earned: data.totalDiscountEarned,
      used: data.totalDiscountUsed
    });

    res.status(200).json({
      availableDiscount: Number(data.availableDiscount || 0),
      totalEarned: Number(data.totalDiscountEarned || 0),
      totalUsed: Number(data.totalDiscountUsed || 0),
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    console.error('[getCustomerDiscount] Error:', error);
    res.status(500).json({ message: 'Failed to get discount', error: error.message });
  }
};

// Apply discount to order (called during checkout)
exports.applyDiscountToOrder = async (req, res) => {
  try {
    const { orderId, discountAmount } = req.body;
    const userId = req.user?.uid;

    if (!userId || !orderId || discountAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const customerDiscountRef = db.collection('customerDiscounts').doc(userId);
    const customerDiscountDoc = await customerDiscountRef.get();

    if (!customerDiscountDoc.exists) {
      return res.status(400).json({ message: 'No discount available' });
    }

    const availableDiscount = Number(customerDiscountDoc.data().availableDiscount || 0);
    
    if (discountAmount > availableDiscount) {
      return res.status(400).json({ 
        message: 'Insufficient discount balance',
        available: availableDiscount
      });
    }

    // Update customer discount balance
    await customerDiscountRef.update({
      availableDiscount: admin.firestore.FieldValue.increment(-discountAmount),
      totalDiscountUsed: admin.firestore.FieldValue.increment(discountAmount),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Record transaction
    await customerDiscountRef.collection('transactions').add({
      orderId,
      discountAmount,
      type: 'used',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update order with discount applied
    await db.collection('orders').doc(orderId).update({
      discountApplied: discountAmount,
      finalTotal: admin.firestore.FieldValue.increment(-discountAmount)
    });

    res.status(200).json({ 
      message: 'Discount applied successfully',
      remainingDiscount: availableDiscount - discountAmount
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({ message: 'Failed to apply discount', error: error.message });
  }
};

// Get discount analytics
exports.getDiscountAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = db.collection('discounts');
    
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const discountsSnapshot = await query.get();

    let totalBusinessProfit = 0;
    let totalCustomerDiscounts = 0;
    let totalDiscounts = 0;
    const productDiscounts = {};

    discountsSnapshot.forEach(doc => {
      const data = doc.data();
      totalBusinessProfit += Number(data.totalBusinessProfit || 0);
      totalCustomerDiscounts += Number(data.totalCustomerDiscount || 0);
      totalDiscounts += Number(data.totalDiscount || 0);

      if (!productDiscounts[data.productId]) {
        productDiscounts[data.productId] = {
          productId: data.productId,
          totalDiscount: 0,
          businessProfit: 0,
          customerDiscount: 0,
          occurrences: 0
        };
      }

      productDiscounts[data.productId].totalDiscount += Number(data.totalDiscount || 0);
      productDiscounts[data.productId].businessProfit += Number(data.totalBusinessProfit || 0);
      productDiscounts[data.productId].customerDiscount += Number(data.totalCustomerDiscount || 0);
      productDiscounts[data.productId].occurrences += 1;
    });

    // Fetch product names for all products with discounts
    const productIds = Object.keys(productDiscounts);
    const productNames = {};
    
    for (const productId of productIds) {
      try {
        const productDoc = await db.collection('products').doc(productId).get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          productNames[productId] = productData.name || productId;
        } else {
          productNames[productId] = productId;
        }
      } catch (err) {
        console.error(`Error fetching product ${productId}:`, err);
        productNames[productId] = productId;
      }
    }

    // Add product names to the discount data
    Object.keys(productDiscounts).forEach(productId => {
      productDiscounts[productId].productName = productNames[productId];
    });

    // Get top performing products
    const topProducts = Object.values(productDiscounts)
      .sort((a, b) => b.businessProfit - a.businessProfit)
      .slice(0, 10);

    res.status(200).json({
      summary: {
        totalBusinessProfit,
        totalCustomerDiscounts,
        totalDiscounts,
        totalOrders: discountsSnapshot.size
      },
      topProducts,
      allProducts: Object.values(productDiscounts)
    });
  } catch (error) {
    console.error('Error getting discount analytics:', error);
    res.status(500).json({ message: 'Failed to get analytics', error: error.message });
  }
};

// Get discounts for a specific date (for procurement section)
exports.getDiscountsByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ message: 'Date required' });
    }

    const discountsSnapshot = await db.collection('discounts')
      .where('date', '==', date)
      .get();

    const discounts = {};
    discountsSnapshot.forEach(doc => {
      const data = doc.data();
      discounts[data.productId] = data;
    });

    res.status(200).json(discounts);
  } catch (error) {
    console.error('Error getting discounts by date:', error);
    res.status(500).json({ message: 'Failed to get discounts', error: error.message });
  }
};
