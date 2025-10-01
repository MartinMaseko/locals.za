import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient'; 
import axios from 'axios';
import './userstyle.css';
import ProductCard from '../storepages/productview/productsCard';
import LoadingContext from '../storepages/LoadingContext';
import LogoAnime from '../../../components/assets/logos/locals-svg.gif';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext'; 

// Missing items
interface MissingItem {
  productId: string;
  productName?: string;
  originalQty?: number;
  availableQty?: number;
  missingQuantity: number;
  reason?: string;
}

type OrderItem = {
  productId?: string;
  qty: number;
  product?: {
    id?: string;
    name?: string;
    price?: number | string;
    image_url?: string;
  };
};

type Order = {
  id: string;
  items: OrderItem[];
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  status?: string;
  createdAt?: string;
  deliveryAddress?: Record<string, any>;
  missingItems?: MissingItem[];
  refundAmount?: number;
  adjustedTotal?: number;
  refundStatus?: 'pending' | 'processed' | 'credited';
  driverNote?: string;
  eta?: string;
  etaArrivalTime?: string;
  etaUpdatedAt?: string;
};

// Frequently purchased products
interface FrequentProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  purchaseCount: number; // Number of times purchased
  lastPurchased: string; // Date of most recent purchase
}

const UserOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([]);
  const auth = getAuth(app);
  const { addToCart } = useCart();
  const navigate = useNavigate(); 
  
  // Access the global loading context
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  
  // Update global loading state whenever local loading changes
  useEffect(() => {
    setGlobalLoading(loading);
    return () => setGlobalLoading(false); // Clean up on unmount
  }, [loading, setGlobalLoading]);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setLoading(true);
      setError('');
      
      if (!user) {
        setOrders([]);
        setError('Please log in to view your orders.');
        setLoading(false);
        return;
      }

      try {
        // Get token for authentication
        const token = await user.getIdToken();
        
        // Use API endpoint
        const response = await axios.get(`/api/orders/user/${user.uid}`, {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        });
        
        // API returns orders directly as an array
        const payload: any[] = Array.isArray(response.data) ? response.data : [];
        
        // Continue with existing normalization code
        const normalized = payload.map((o: any) => {
          // Handle createdAt field which might be a Firestore timestamp or ISO string
          const createdAtRaw = o.createdAt;
          let createdAtIso: string | undefined;
          
          if (createdAtRaw) {
            if (typeof createdAtRaw.toDate === 'function') {
              createdAtIso = createdAtRaw.toDate().toISOString();
            } else if (typeof createdAtRaw === 'object' && 'seconds' in createdAtRaw) {
              createdAtIso = new Date(createdAtRaw.seconds * 1000).toISOString();
            } else {
              createdAtIso = new Date(createdAtRaw).toISOString();
            }
          }
          
          return {
            id: o.id || '',
            items: Array.isArray(o.items) ? o.items : [],
            subtotal: typeof o.subtotal === 'number' ? o.subtotal : Number(o.subtotal || 0),
            serviceFee: typeof o.serviceFee === 'number' ? o.serviceFee : Number(o.serviceFee || 0),
            total: typeof o.total === 'number' ? o.total : Number(o.total || 0),
            status: o.status || 'unknown',
            createdAt: createdAtIso,
            deliveryAddress: o.deliveryAddress || {},
            // Add these new properties
            missingItems: o.missingItems || [],
            refundAmount: typeof o.refundAmount === 'number' ? o.refundAmount : Number(o.refundAmount || 0),
            adjustedTotal: typeof o.adjustedTotal === 'number' ? o.adjustedTotal : Number(o.adjustedTotal || 0),
            refundStatus: o.refundStatus || 'pending',
            driverNote: o.driverNote || '',
            eta: o.eta || null,
            etaArrivalTime: o.etaArrivalTime || null,
            etaUpdatedAt: o.etaUpdatedAt || null,
          };
        });
        
        if (mounted) {
          setOrders(normalized);
          
          // Process orders to find frequently purchased products
          if (normalized.length > 0) {
            generateFrequentlyPurchasedProducts(normalized);
          }
        }
      } catch (err: any) {
        console.error('Fetch orders error:', err?.response?.data || err);
        if (mounted) setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [auth]);

  // Function to generate frequently purchased products from orders
  const generateFrequentlyPurchasedProducts = (orders: Order[]) => {
    // Map to track product purchase frequency
    const productMap: Record<string, FrequentProduct> = {};
    
    // Process all orders to find product purchase patterns
    orders.forEach(order => {
      if (!order.items || !Array.isArray(order.items)) return;
      
      const orderDate = order.createdAt || new Date().toISOString();
      
      order.items.forEach(item => {
        if (!item.productId || !item.product) return;
        
        const productId = item.productId;
        
        if (!productMap[productId]) {
          // First time seeing this product
          productMap[productId] = {
            id: productId,
            name: item.product.name || 'Unknown Product',
            price: typeof item.product.price === 'number' ? item.product.price : 
                  Number(item.product.price || 0),
            image_url: item.product.image_url || '',
            purchaseCount: item.qty,
            lastPurchased: orderDate
          };
        } else {
          // Update existing product data
          productMap[productId].purchaseCount += item.qty;
          
          // Update last purchased date if this order is more recent
          if (orderDate > productMap[productId].lastPurchased) {
            productMap[productId].lastPurchased = orderDate;
          }
        }
      });
    });
    
    // Convert map to array and sort by purchase count (descending)
    const frequentItems = Object.values(productMap).sort((a, b) => 
      b.purchaseCount - a.purchaseCount
    );
    
    setFrequentProducts(frequentItems);
  };


  // Custom handler for when product card is clicked
  const handleProductClick = (product: any) => {
    // You can navigate to product detail or do nothing
    navigate(`/product/${product.id}`, { state: { product } });
  };

  // Loading state and UI
  if (loading) return (
    <div className='loading-container'>
      <img src={LogoAnime} alt="Loading..." className="loading-gif" />
      Loading your orders...
    </div>
  );
  
  if (error) return <div className="user-orders-error">{error}</div>;

  // Add a helper function to check if ETA is recent (less than 30 minutes old)
  const isETARecent = (etaUpdatedAt?: string) => {
    if (!etaUpdatedAt) return false;
    
    const etaTime = new Date(etaUpdatedAt).getTime();
    const now = new Date().getTime();
    
    // ETA is considered recent if less than 30 minutes old
    return (now - etaTime) < 30 * 60 * 1000; // 30 minutes in milliseconds
  };

  return (
    <div className="user-orders-page">
      <h1>Your Orders</h1>
      
      {/* Frequently Purchased Products Section */}
      {frequentProducts.length > 0 && (
        <div className="frequent-products-section">
          <h2>Frequently Purchased Items</h2>
          <p className="frequent-products-description">
            These are items you've purchased before. Add them to your cart with just one click.
          </p>
          <div className="frequent-products-grid">
            {frequentProducts.slice(0, 10).map(product => {
              // Convert FrequentProduct to Product format for ProductCard
              const productCardData = {
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url
              };
              
              return (
                <div key={product.id} className="frequent-product-item">
                  <ProductCard 
                    product={productCardData}
                    onClick={handleProductClick}
                  />
                  <div className="frequent-product-stats">
                    <span className="purchase-count">
                      Purchased {product.purchaseCount} {product.purchaseCount === 1 ? 'time' : 'times'}
                    </span>
                    <button 
                      className="reorder-add-to-cart"
                      onClick={() => addToCart({
                        ...productCardData,
                        quantity: 1
                      })}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {orders.length === 0 ? (
        <><div className='empty-orders-wrapper'>
            <img width="100" height="100" src="https://img.icons8.com/clouds/100/shopping-cart.png" alt="shopping-cart"/>
            <p>You have no orders yet.</p>
            <Link to="/" className="start-shopping-link">Start Shopping</Link>
          </div>
        </>
      ) : (
        <div className="orders-section">
          <h2>Order History</h2>
          <ul className="orders-list">
            {orders.map((o) => (
              <li key={o.id} className="order-card">
                <div className="order-header">
                  <div className='order-no'>
                    Order: #<br />{o.id}
                    {/* Display badge for missing items */}
                    {o.missingItems && o.missingItems.length > 0 && (
                      <span className="missing-items-badge">
                        <br />{o.missingItems.length} item(s) unavailable
                      </span>
                    )}
                  </div>
                  <div className='order-date'>
                    Date: {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                  </div>
                  <div>
                    <span className={`order-status order-status-${(o.status || 'unknown').toLowerCase()}`}>
                      Status: {o.status || 'unknown'}
                    </span>
                    
                    {/* Add ETA display */}
                    {o.status === 'in transit' && o.eta && o.etaArrivalTime && isETARecent(o.etaUpdatedAt) && (
                      <div className="eta-display">
                        <span className="eta-arrival">
                          <img width="16" height="16" src="https://img.icons8.com/ios-filled/16/ffb803/time_2.png" alt="time"/>
                          Expected arrival at {o.etaArrivalTime} ({o.eta} away)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-items">
                  <h3>Items</h3>
                  <div className="order-items-grid">
                    {o.items.map((it, idx) => {
                      // Check if this item has missing quantities
                      const missingItem = o.missingItems?.find((mi: any) => mi.productId === it.productId);
                      
                      // Convert OrderItem to Product format for ProductCard
                      const product = {
                        id: it.productId || `product-${idx}`,
                        name: it.product?.name || `Product #${it.productId}`,
                        price: it.product?.price || 0,
                        image_url: it.product?.image_url || '',
                      };
                      
                      return (
                        <div key={idx} className={`order-item-wrapper ${missingItem ? 'has-missing' : ''}`}>
                          <ProductCard 
                            product={product} 
                            onClick={handleProductClick}
                          />
                          <div className="order-item-quantity">
                            Qty: {it.qty}
                            {/* Show missing status if item is affected */}
                            {missingItem && (
                              <div className="item-availability">
                                {missingItem.missingQuantity === it.qty ? (
                                  <span className="unavailable-status">Unavailable</span>
                                ) : (
                                  <span className="partially-available-status">
                                    {it.qty - missingItem.missingQuantity} of {it.qty} available
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="order-summary">
                  <div className="order-costs">
                    Subtotal: R {typeof o.subtotal === 'number' ? o.subtotal.toFixed(2) : Number(o.subtotal || 0).toFixed(2)}
                    <br />
                    Service fee: R {typeof o.serviceFee === 'number' ? o.serviceFee.toFixed(2) : Number(o.serviceFee || 0).toFixed(2)}
                    
                    {/* Show refund information if there are missing items */}
                    {(o.refundAmount ?? 0) > 0 && (
                      <>
                        <br />
                        <span className="refund-line">
                          Refund for missing items: -R {Number(o.refundAmount).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="order-total">
                    Total: R {
                      o.adjustedTotal 
                        ? Number(o.adjustedTotal).toFixed(2)
                        : typeof o.total === 'number' 
                          ? o.total.toFixed(2) 
                          : Number(o.total || 0).toFixed(2)
                    }
                    
                    {/* Show original price if adjusted */}
                    {o.adjustedTotal && o.adjustedTotal !== o.total && (
                      <span className="original-total">was R{Number(o.total || 0).toFixed(2)}</span>
                    )}
                  </div>
                  
                  {/* Show credit message if refund applied */}
                  {(o.refundAmount ?? 0) > 0 && (
                    <div className="refund-credit-note">
                      A credit of R{Number(o.refundAmount).toFixed(2)} has been added to your account for your next order.
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserOrders;