import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface MissingItem {
  productId: string;
  name: string;
  quantity: number;
  missingQuantity: number;
  price: number;
  reason: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  description?: string;
  [key: string]: any;
}

interface Order {
  id: string;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  deliveryAddress: {
    street?: string;
    city?: string;
    postalCode?: string;
    [key: string]: any;
  };
  products: Product[];
  total: number;
  createdAt: string;
  delivery_fee?: number;
  subtotal?: number;
  supplier?: {
    name?: string;
    address?: string;
    phone?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const DriverDeliveries = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addressCopied, setAddressCopied] = useState(false);
  
  // State variables for item verification
  const [verifyingItems, setVerifyingItems] = useState(false);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [submittingMissingItems, setSubmittingMissingItems] = useState(false);
  const [missingItemSuccess, setMissingItemSuccess] = useState('');
  
  // State for alert customer
  const [alertSent, setAlertSent] = useState(false);
  const [alerting, setAlerting] = useState(false);

  // State for proof of delivery modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [confirmItemsChecked, setConfirmItemsChecked] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [pinSent, setPinSent] = useState(false);
  const [sendingPin, setSendingPin] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  
  const navigate = useNavigate();
  const auth = getAuth(app);

  // Data normalization function
  const normalizeOrderData = (orderData: any): Order => {
    // products array
    if (!orderData.products) {
      orderData.products = [];
      
      // Convert items to products if available
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.products = orderData.items.map((item: any) => {
          // Ensure price is a number
          let price = 0;
          if (typeof item.price === 'number') {
            price = item.price;
          } else if (typeof item.price === 'string') {
            price = parseFloat(item.price) || 0;
          } else if (item.product && typeof item.product.price === 'number') {
            price = item.product.price;
          } else if (item.product && typeof item.product.price === 'string') {
            price = parseFloat(item.product.price) || 0;
          }
          
          return {
            id: item.productId || item.id || 'unknown',
            name: item.product?.name || 'Unknown Product',
            price,
            quantity: typeof item.qty === 'number' ? item.qty : 1,
            image_url: item.product?.image_url || item.image_url
          };
        });
      }
    } else {
      // Make sure existing products have proper format
      orderData.products = orderData.products.map((product: any) => ({
        ...product,
        price: typeof product.price === 'number' 
          ? product.price 
          : typeof product.price === 'string'
            ? parseFloat(product.price) || 0
            : 0,
        quantity: typeof product.quantity === 'number' ? product.quantity : 1
      }));
    }
    
    // Get customer information from various possible locations in the data structure
    // Based on your Firestore screenshot
    const customerInfo = {
      customer_name: orderData.deliveryAddress?.name || 
                     orderData.customer_name || 
                     orderData.customerName || 
                     (orderData.customer ? (orderData.customer.full_name || orderData.customer.name) : null) ||
                     'Not provided',
      customer_phone: orderData.deliveryAddress?.phone || 
                     orderData.customer_phone || 
                     orderData.customerPhone || 
                     (orderData.customer ? orderData.customer.phone : null) ||
                     'Not provided',
      customer_email: orderData.customer_email || 
                     orderData.customerEmail ||
                     (orderData.customer ? orderData.customer.email : null) ||
                     'Not provided',
    };
    
    // Normalize delivery address based on your Firestore structure
    let deliveryAddress = orderData.deliveryAddress || orderData.delivery_address || {};
    
    // Ensure all address components exist based on your Firestore field names
    const normalizedAddress = {
      street: deliveryAddress.addressLine || deliveryAddress.street || deliveryAddress.address_line1 || '',
      suburb: deliveryAddress.suburb || deliveryAddress.address_line2 || '',
      city: deliveryAddress.city || deliveryAddress.town || '',
      province: deliveryAddress.province || deliveryAddress.state || '',
      postalCode: deliveryAddress.postal || deliveryAddress.postalCode || deliveryAddress.postal_code || deliveryAddress.zip || '',
      country: deliveryAddress.country || 'South Africa',
      coordinates: deliveryAddress.coordinates || deliveryAddress.location || null,
      // Store raw address for backup
      fullAddress: deliveryAddress.addressLine ? 
                  `${deliveryAddress.addressLine}, ${deliveryAddress.city || ''} ${deliveryAddress.postal || ''}`.trim() : 
                  deliveryAddress.fullAddress || '',
    };
    
    // Normalize numeric fields
    return {
      ...orderData,
      ...customerInfo,
      deliveryAddress: normalizedAddress,
      total: typeof orderData.total === 'number' ? orderData.total : 0,
      subtotal: typeof orderData.subtotal === 'number' ? orderData.subtotal : 0,
      delivery_fee: typeof orderData.delivery_fee === 'number' ? orderData.delivery_fee : 0
    };
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        
        if (!token) {
          throw new Error('Authentication required');
        }
        
        // Try to get full order details including products
        const response = await axios.get<Order>(`${API_URL}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.id) {
      
          // Normalize the data
          const normalizedOrder = normalizeOrderData(response.data);
          setOrder(normalizedOrder);
        } else {
          throw new Error('Invalid order data received');
        }
      } catch (error: any) {
        console.error('Error fetching order details:', error);
        
        // More detailed error information
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server response:', error.response.data);
          console.error('Status code:', error.response.status);
          
          if (error.response.status === 403) {
            setError('You do not have permission to view this order. Please contact support.');
          } else if (error.response.status === 404) {
            setError('Order not found. It may have been deleted or moved.');
          } else {
            setError(`Failed to load order details: ${error.response.data?.error || error.message}`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setError('No response from server. Please check your connection and try again.');
        } else {
          // Something happened in setting up the request
          setError(`Error setting up request: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, auth]);

  
  const getFormattedDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-ZA', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleBackToOrders = () => {
    navigate('/driversdashboard');
  };

  const handleCopyAddress = async () => {
    if (!order) return;
    const parts = [
      order.deliveryAddress.street,
      order.deliveryAddress.suburb,
      order.deliveryAddress.city,
      order.deliveryAddress.province,
      order.deliveryAddress.postalCode,
    ].filter(Boolean);
    const formatted = parts.length ? parts.join(', ') : 'No address available';
    try {
      await navigator.clipboard.writeText(formatted);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = formatted;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 3000);
    }
  };


  const handleCollectOrder = () => {
    // Instead of immediately updating status, start item verification
    setVerifyingItems(true);
  };

  const handleItemCheck = (productId: string, isAvailable: boolean, availableQty: number, originalQty: number) => {
    if (isAvailable && availableQty >= originalQty) {
      // If item is fully available, remove it from missing items if it exists
      setMissingItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      // If item is missing or partially available
      const product = order?.products.find(p => p.id === productId);
      if (product) {
        const missingQty = originalQty - availableQty;
        
        // Check if item already exists in missing items
        const existingItemIndex = missingItems.findIndex(item => item.productId === productId);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...missingItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            missingQuantity: missingQty,
            quantity: originalQty
          };
          setMissingItems(updatedItems);
        } else {
          // Add new missing item
          setMissingItems(prev => [
            ...prev, 
            {
              productId,
              name: product.name,
              quantity: originalQty,
              missingQuantity: missingQty,
              price: product.price,
              reason: 'Out of stock'
            }
          ]);
        }
      }
    }
  };


  const handleCompleteVerification = async () => {
    try {
      setSubmittingMissingItems(true);
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');
      
      // Calculate refund amount for missing items
      const refundAmount = missingItems.length > 0 ? missingItems.reduce(
        (total, item) => total + (item.price * item.missingQuantity), 
        0
      ) : 0;
      
      // Use the status update endpoint which is already working
      // Include the missing items data there
      await axios.put(
        `${API_URL}/api/orders/${orderId}/status`, 
        { 
          status: 'in transit',
          missingItems: missingItems.length > 0 ? missingItems : [],
          refundAmount,
          driverNote: "Items missing during collection",
          hasRefund: refundAmount > 0,
          refundStatus: 'pending',
          adjustedTotal: order ? order.total - refundAmount : 0
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update local order state
      setOrder(prev => prev ? { 
        ...prev, 
        status: 'in transit',
        missingItems: missingItems.length > 0 ? missingItems : undefined,
        refundAmount,
        adjustedTotal: prev.total - refundAmount
      } : null);
      
      // Show success message if there were missing items
      if (missingItems.length > 0) {
        setMissingItemSuccess(`Reported ${missingItems.length} missing item(s). Customer will be notified.`);
      }
      
      // Close verification mode after a short delay
      setTimeout(() => {
        setVerifyingItems(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error reporting missing items:', error);
      setError('Failed to update order with missing items');
      
      // Fallback approach - try to update just the status without missing items
      try {
        const token = await auth.currentUser?.getIdToken();
        await axios.put(
          `/api/orders/${orderId}/status`, 
          { status: 'in transit' },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        // At least update the local status
        setOrder(prev => prev ? { ...prev, status: 'in transit' } : null);
        
        setVerifyingItems(false);
        // Show limited success but note the missing items weren't reported
        setMissingItemSuccess("Order marked as in transit, but couldn't report missing items.");
      } catch (fallbackError) {
        console.error('Fallback status update also failed:', fallbackError);
      }
    } finally {
      setSubmittingMissingItems(false);
    }
  };

  const handleCancelVerification = () => {
    // Cancel verification mode without changes
    setVerifyingItems(false);
    setMissingItems([]);
  };

  // Alert customer that driver is heading to their address
  const handleAlertCustomer = async () => {
    try {
      setAlerting(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      await axios.post(
        `${API_URL}/api/orders/${orderId}/alert-customer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAlertSent(true);
    } catch (error) {
      console.error('Error alerting customer:', error);
      setError('Failed to alert customer');
    } finally {
      setAlerting(false);
    }
  };

  // Open the delivery confirmation modal and send PIN to customer
  const handleDeliveryComplete = async () => {
    setShowDeliveryModal(true);
    setDeliveryError('');
    setDeliveryPin('');
    setConfirmItemsChecked(false);
    setProofImage(null);
    setProofImagePreview(null);

    // Automatically generate and send PIN to customer
    if (!pinSent) {
      try {
        setSendingPin(true);
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Authentication required');

        await axios.post(
          `${API_URL}/api/orders/${orderId}/generate-delivery-pin`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setPinSent(true);
      } catch (error) {
        console.error('Error sending delivery PIN:', error);
        setDeliveryError('Failed to send PIN to customer. Please try again.');
      } finally {
        setSendingPin(false);
      }
    }
  };

  // Handle proof image selection
  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirm delivery with PIN verification
  const handleConfirmDelivery = async () => {
    if (!deliveryPin || deliveryPin.length !== 4) {
      setDeliveryError('Please enter the 4-digit PIN from the customer');
      return;
    }

    if (!confirmItemsChecked) {
      setDeliveryError('Please confirm that all items have been delivered');
      return;
    }

    try {
      setConfirmingDelivery(true);
      setDeliveryError('');
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      await axios.post(
        `${API_URL}/api/orders/${orderId}/confirm-delivery`,
        {
          pin: deliveryPin,
          confirmItems: confirmItemsChecked,
          hasProofImage: !!proofImage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setOrder(prev => prev ? { ...prev, status: 'completed' } : null);
      setShowDeliveryModal(false);
      setPinSent(false);
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      if (error.response?.data?.error === 'Invalid delivery PIN') {
        setDeliveryError('Incorrect PIN. Please ask the customer for the correct PIN.');
      } else {
        setDeliveryError('Failed to confirm delivery. Please try again.');
      }
    } finally {
      setConfirmingDelivery(false);
    }
  };



  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Failed to load order'}</p>
        <button className="app-btn" onClick={handleBackToOrders}>
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="driver-delivery-page">
      <div className="delivery-header">
        <button className="back-btn" onClick={handleBackToOrders}>
          <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffb803/back.png" alt="back"/> 
           Back to orders
        </button>
        <h1>Order #{order?.id?.slice(-6)}</h1>
        <div className='driver-order-status2'>
          {order?.status.charAt(0).toUpperCase() + order?.status.slice(1)}
        </div>
      </div>

      <div className="delivery-sections">
        <div className="delivery-section customer-info">
          <h2>Customer Information</h2>
          <div className="info-card">
            <div className="info-row">
              <span className="info-label">Name: </span>
              <span className="info-value">{order?.customer_name || 'Not provided'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone: </span>
              <span className="info-value">
                <a href={`tel:${order?.customer_phone}`} className="phone-link">
                  {order?.customer_phone || 'Not provided'}
                </a>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Address: </span>
              <span className="info-value address-value">
                {order?.deliveryAddress.street ? order.deliveryAddress.street : 'No street provided'}<br/>
                {order?.deliveryAddress.city ? order.deliveryAddress.city : 'No city provided'}<br/>
                {order?.deliveryAddress.postalCode ? order.deliveryAddress.postalCode : 'No postal code provided'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Order Date: </span>
              <span className="info-value">{order ? getFormattedDate(order.createdAt) : ''}</span>
            </div>
          </div>
          
          <div className="address-buttons">
            <button 
              className={`add-address-btn ${addressCopied ? 'added' : ''}`}
              onClick={handleCopyAddress}
            >
              {addressCopied ? (
                <>
                  <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/checkmark.png" alt="copied"/>
                  Address Copied!
                </>
              ) : (
                <>
                  <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/copy.png" alt="copy"/>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="delivery-section order-items">
          <h2>Customer's Order</h2>
          
          {/* Display verification UI or normal product list */}
          {verifyingItems ? (
            <div className="item-verification-container">
              <div className="verification-header">
                <h3>Verify Available Items</h3>
                <p className="verification-instructions">
                  Please check which items are available for delivery. If an item is out of stock or only partially available,
                  adjust the quantity and select a reason.
                </p>
              </div>
              
              <div className="verification-items-list">
                {order?.products && order.products.map((product, index) => {
                  const missingItem = missingItems.find(item => item.productId === product.id);
                  
                  return (
                    <div key={product.id || index} className="verification-item">
                      <div className="verification-item-details">
                        <div className="verification-item-image">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; 
                                target.src = 'https://img.icons8.com/ios-filled/100/999999/no-image.png';
                              }}
                            />
                          ) : (
                            <div className="no-image">No Image</div>
                          )}
                        </div>
                        
                        <div className="verification-item-info">
                          <h4>{product.name || 'Unknown Product'}</h4>
                          <p className="verification-item-quantity">Ordered Quantity: {product.quantity}</p>
                          <p className="verification-item-price">R{product.price.toFixed(2)} each</p>
                        </div>
                      </div>
                      
                      <div className="verification-item-controls">
                        <div className="verification-status-toggle">
                          <button 
                            className={`status-btn ${!missingItem ? 'active' : ''}`}
                            onClick={() => handleItemCheck(product.id, true, product.quantity, product.quantity)}
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="verification-actions">
                <button 
                  className="confirm-collection-btn"
                  onClick={handleCompleteVerification}
                  disabled={submittingMissingItems}
                >
                  {submittingMissingItems ? 'Submitting...' : 'Confirm Collection'}
                </button>
                <button 
                  className="cancel-verification-btn"
                  onClick={handleCancelVerification}
                >
                  Cancel
                </button>
              </div>
              
              {missingItemSuccess && (
                <div className="success-message">
                  {missingItemSuccess}
                </div>
              )}
            </div>
          ) : (
            <div className="delivery-products-list">
              {order.products.map((product, index) => (
                <div key={product.id || index} className="driver-product-card">
                  <div className="driver-product-image-container">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="driver-product-image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; 
                          target.src = 'https://img.icons8.com/ios-filled/100/999999/no-image.png';
                        }}
                      />
                    ) : (
                      <div className="no-image">
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="product-info">
                    <h3>{product.name || 'Unknown Product'}</h3>
                    <p className="product-description">{product.description || 'No description available'}</p>
                    
                    <div className="product-meta">
                      <span className="product-quantity">Qty: {product.quantity || 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="delivery-actions">
            {!verifyingItems && (
              <button className="collect-order-btn" onClick={handleCollectOrder} disabled={loading}>
                Collect Order
              </button>
            )}

            <button 
              className={`alert-customer-btn ${alertSent ? 'sent' : ''}`}
              onClick={handleAlertCustomer}
              disabled={alerting || alertSent || order.status === 'completed'}
            >
              {alertSent ? (
                <>
                  <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/checkmark.png" alt="sent"/>
                  Customer Alerted
                </>
              ) : alerting ? (
                'Alerting...'
              ) : (
                <>
                  <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/alarm.png" alt="alert"/>
                  Alert Customer
                </>
              )}
            </button>

            <button 
              className={`complete-order-btn ${order.status === 'completed' ? 'delivered' : ''}`}
              onClick={handleDeliveryComplete} 
              disabled={loading || order.status === 'completed'}
            >
              {order.status === 'completed' ? (
                <>
                  <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/checkmark.png" alt="delivered"/>
                  Delivered
                </>
              ) : (
                'Delivery Complete'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Proof of Delivery Modal */}
      {showDeliveryModal && (
        <div className="delivery-modal-overlay" onClick={() => setShowDeliveryModal(false)}>
          <div className="delivery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delivery-modal-header">
              <h2>Confirm Delivery</h2>
              <button className="modal-close-btn" onClick={() => setShowDeliveryModal(false)}>&times;</button>
            </div>

            <div className="delivery-modal-body">
              {sendingPin && (
                <div className="pin-sending-status">
                  <div className="loading-spinner"></div>
                  <p>Sending delivery PIN to customer...</p>
                </div>
              )}

              {pinSent && (
                <div className="pin-sent-status">
                  <img width="24" height="24" src="https://img.icons8.com/ios-filled/24/4CAF50/checkmark.png" alt="sent"/>
                  <p>PIN sent to customer's inbox. Ask the customer for their 4-digit PIN.</p>
                </div>
              )}

              {/* 1. Confirm delivery items checkbox */}
              <div className="modal-field">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={confirmItemsChecked}
                    onChange={(e) => setConfirmItemsChecked(e.target.checked)}
                  />
                  <span>I confirm all delivery items have been handed to the customer</span>
                </label>
              </div>

              {/* 2. Upload delivery proof image */}
              <div className="modal-field">
                <label className="field-label">Upload Delivery Proof (optional)</label>
                <div className="proof-image-upload">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleProofImageChange}
                    id="proof-image-input"
                    className="file-input-hidden"
                  />
                  <label htmlFor="proof-image-input" className="upload-btn">
                    <img width="20" height="20" src="https://img.icons8.com/ios-filled/20/ffffff/camera.png" alt="camera"/>
                    {proofImage ? 'Change Photo' : 'Take Photo'}
                  </label>
                  {proofImagePreview && (
                    <div className="proof-image-preview">
                      <img src={proofImagePreview} alt="Delivery proof" />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Customer PIN input */}
              <div className="modal-field">
                <label className="field-label">Customer Delivery PIN</label>
                <p className="field-hint">Ask the customer for the 4-digit PIN sent to their messages</p>
                <div className="pin-input-container">
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="pin-digit-input"
                      value={deliveryPin[index] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newPin = deliveryPin.split('');
                        newPin[index] = val;
                        setDeliveryPin(newPin.join(''));
                        // Auto-focus next input
                        if (val && index < 3) {
                          const next = e.target.nextElementSibling as HTMLInputElement;
                          if (next) next.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !deliveryPin[index] && index > 0) {
                          const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                          if (prev) prev.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {deliveryError && (
                <div className="delivery-error-message">
                  {deliveryError}
                </div>
              )}
            </div>

            <div className="delivery-modal-footer">
              <button 
                className="cancel-delivery-btn"
                onClick={() => setShowDeliveryModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-delivery-btn"
                onClick={handleConfirmDelivery}
                disabled={confirmingDelivery || !pinSent}
              >
                {confirmingDelivery ? 'Confirming...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverDeliveries;