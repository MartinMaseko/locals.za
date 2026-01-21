import { useState, useEffect } from 'react';
import { useFetchCustomerDetails } from '../hooks/useFetch';
import { formatDate } from '../utils/helpers';
import { filterOrdersForCalculations } from '../utils/orderStatusUtils';
import type { Order, OrderItem } from '../types/index';

interface ManageOrdersSectionProps {
  ordersState: any;
  driversState: any;
}

const ManageOrdersSection = ({ 
  ordersState, 
  driversState 
}: ManageOrdersSectionProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const { customerDetails, fetchCustomerDetails } = useFetchCustomerDetails();

  useEffect(() => {
    if (selectedOrder?.userId) {
      fetchCustomerDetails(selectedOrder.userId);
    }
  }, [selectedOrder, fetchCustomerDetails]);

  // Fetch all orders on initial mount
  useEffect(() => {
    ordersState.fetchOrders('');
  }, []);

  // Fetch orders when filter changes
  useEffect(() => {
    ordersState.fetchOrders(orderStatusFilter);
  }, [orderStatusFilter]);

  useEffect(() => {
    ordersState.filterByQuery(orderSearchQuery);
  }, [orderSearchQuery]);

  return (
    <div className="orders-section">
      <div className="orders-header">
        <h2>Manage Orders</h2>
        <div className="order-search">
          <input 
            type="text" 
            placeholder="Search by Order ID" 
            value={orderSearchQuery} 
            onChange={e => setOrderSearchQuery(e.target.value)} 
            className="order-search-input" 
          />
        </div>
        <div className="orders-controls">
          <div className="orders-filter">
            <select 
              value={orderStatusFilter} 
              onChange={e => setOrderStatusFilter(e.target.value)}
            >
              <option value="">All Valid Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="in transit">In Transit</option>
              <option value="completed">Completed</option>
            </select>
            <button onClick={() => ordersState.fetchOrders(orderStatusFilter)} className="refresh-button">Refresh</button>
          </div>
        </div>
      </div>

      {/* Top Selling Products Section */}
      <div className="top-selling-section">
        <h3>Top Selling Products</h3>
        <div className="top-selling-products">
          {(() => {
            const allOrders = ordersState.allOrders || ordersState.orders;
            const validOrders = filterOrdersForCalculations(allOrders);
            const productsMap: { [key: string]: { name: string; qty: number; revenue: number } } = {};
            
            validOrders.forEach((order: any) => {
              order.items?.forEach((item: any) => {
                const productId = item.productId;
                const productName = item.product?.name || `Product ${productId}`;
                const qty = Number(item.qty || 0);
                const price = Number(item.product?.price || 0);
                
                if (!productsMap[productId]) {
                  productsMap[productId] = { name: productName, qty: 0, revenue: 0 };
                }
                
                productsMap[productId].qty += qty;
                productsMap[productId].revenue += price * qty;
              });
            });

            const topProducts = Object.values(productsMap)
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5);

            return topProducts.length > 0 ? (
              <div className="top-products-grid">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="top-product-card">
                    <div className="top-product-rank">#{idx + 1}</div>
                    <div className="product-info">
                      <div className="top-product-name">{product.name}</div>
                      <div className="top-product-stats">
                        <span className="qty-sold">{product.qty} sold</span>
                        <span className="top-product-revenue">R{product.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No product sales data available</div>
            );
          })()}
        </div>
      </div>

      {ordersState.loading ? <div className="loading-indicator">Loading orders...</div> :
        ordersState.error ? <div className="error-message">{ordersState.error}</div> :
        ordersState.filteredOrders.length === 0 ? <div className="no-orders">{orderSearchQuery ? `No orders match "${orderSearchQuery}"` : 'No orders found'}</div> :
        <div className="orders-grid"><div className="orders-list">
          <table className="orders-table">
            <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              {ordersState.filteredOrders.map((order: any) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order as Order)} className={selectedOrder?.id === order.id ? 'selected' : ''}>
                  <td>{order.id?.substring(0,8)}...</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.userId?.substring(0,8)}...</td>
                  <td>R{Number(order.total || 0).toFixed(2)}</td>
                  <td><div className={`status-badge ${order.status}`}>{order.status}</div></td>
                  <td>
                    {order.status === 'completed' ? (
                      order.rating ? (
                        <div className="table-rating">
                          <div className="table-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                className={`table-star ${star <= (order.rating || 0) ? 'filled' : ''}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="no-table-rating">Not rated</span>
                      )
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td><div className="action-buttons"><button onClick={(e)=>{e.stopPropagation(); setSelectedOrder(order as Order);}} className="view-button">View</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      }

      {selectedOrder && (
        <div className="order-details-overlay" onClick={() => { setSelectedOrder(null); setShowDriverDropdown(false); }}>
          <div className="order-details-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSelectedOrder(null); setShowDriverDropdown(false); }} aria-label="Close">&times;</button>
            <h3>Order Details</h3>
            <div className="order-info">
              <div className="order-header">
                <div><strong>Order ID:</strong> {selectedOrder.id}</div>
                <div><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
              </div>

              <div className="customer-info">
                {customerDetails[selectedOrder.userId] ? (
                  <>
                    <div className="customer-name">
                      <strong>Customer Name:</strong> {customerDetails[selectedOrder.userId].name}
                    </div>
                    <button 
                      className="view-profile-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('=== MANAGE ORDERS - CLICKING VIEW PROFILE ===');
                        console.log('Setting selectedCustomerProfile to:', selectedOrder.userId);
                        console.log('Current order details:', {
                          orderId: selectedOrder.id,
                          userId: selectedOrder.userId,
                          total: selectedOrder.total
                        });
                        console.log('=== END ===');
                        setSelectedCustomerProfile(selectedOrder.userId);
                      }}
                    >
                      View Customer Profile
                    </button>
                  </>
                ) : null}
                <div><strong>Customer ID:</strong> {selectedOrder.userId}</div>
              </div>

              <div className="status-section">
                <div className="current-status">
                  <strong>Status:</strong>
                  <div className={`status-badge ${selectedOrder.status}`}>{selectedOrder.status}</div>
                </div>
                <div className="status-actions">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => ordersState.updateStatus(selectedOrder.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="in transit">In Transit</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button 
                    className="update-status-btn"
                    onClick={() => ordersState.updateStatus(selectedOrder.id, selectedOrder.status)}
                  >
                    Update Status
                  </button>
                </div>
              </div>

              <div className="delivery-info">
                <strong>Delivery Address:</strong>
                <div className="address">
                  {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.postalCode}
                </div>
              </div>

              <div className="driver-section">
                <strong>Driver Assignment:</strong>
                <div className="driver-info">
                  {selectedOrder.driver_id ? (
                    <>
                      <div className="assigned-driver">
                        <span className="driver-label">Assigned to driver:</span>
                        <span className="driver-name">
                          {driversState.drivers.find((d: any) => d.id === selectedOrder.driver_id)?.name || selectedOrder.driver_id}
                        </span>
                      </div>
                      <button onClick={() => setShowDriverDropdown(s => !s)} className="assign-button">Reassign Driver</button>
                    </>
                  ) : (
                    <>
                      <div>No driver assigned</div>
                      <button onClick={() => setShowDriverDropdown(s => !s)} className="assign-button">Assign Driver</button>
                    </>
                  )}

                  {showDriverDropdown && (
                    <div className="driver-dropdown">
                      {driversState.loading ? (
                        <div className="dropdown-loading">Loading drivers...</div>
                      ) : driversState.drivers.length === 0 ? (
                        <div className="dropdown-empty">No drivers available</div>
                      ) : (
                        <div className="dropdown-list">
                          {selectedOrder.driver_id && (
                            <div 
                              className="dropdown-item unassign" 
                              onClick={() => { 
                                ordersState.assignDriver(selectedOrder.id, null); 
                                setShowDriverDropdown(false); 
                              }}
                            >
                              <span className="unassign-icon">❌</span> Remove Driver
                            </div>
                          )}
                          {driversState.drivers.map((d: any) => (
                            <div 
                              key={d.id} 
                              className={`dropdown-item ${selectedOrder.driver_id === d.id ? 'selected' : ''}`} 
                              onClick={() => { 
                                ordersState.assignDriver(selectedOrder.id, d.id); 
                                setShowDriverDropdown(false); 
                              }}
                            >
                              {d.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="items-section">
                <strong>Order Items:</strong>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Status</th> 
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((it, idx) => {
                      const missingItem = selectedOrder.missingItems?.find(
                        (mi: any) => mi.productId === it.productId
                      );
                      const isFullyAvailable = !missingItem;
                      const isPartiallyAvailable = missingItem && typeof missingItem.missingQuantity === 'number' && missingItem.missingQuantity < it.qty;
                      
                      return (
                        <tr key={idx} className={isFullyAvailable ? '' : 'missing-item-row'}>
                          <td>{it.product?.name || `Product ${it.productId}`}</td>
                          <td>
                            {it.qty}
                            {isPartiallyAvailable && typeof missingItem?.missingQuantity === 'number' && (
                              <span className="available-qty-note">
                                ({it.qty - missingItem.missingQuantity} available)
                              </span>
                            )}
                          </td>
                          <td>{it.product?.price ? `R${(it.product.price * it.qty).toFixed(2)}` : 'N/A'}</td>
                          <td className="item-status-cell">
                            {isFullyAvailable ? (
                              <span className="item-status available">Available</span>
                            ) : isPartiallyAvailable ? (
                              <span className="item-status partial">
                                Partially Available
                                <div className="item-status-tooltip">
                                  {missingItem.missingQuantity} out of {it.qty} missing
                                  <br/>
                                  Reason: {missingItem.reason}
                                </div>
                              </span>
                            ) : (
                              <span className="item-status missing">
                                Not Available
                                <div className="item-status-tooltip">
                                  Reason: {missingItem.reason}
                                </div>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Subtotal</td>
                      <td colSpan={2}>R{Number(selectedOrder.subtotal).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>Service Fee</td>
                      <td colSpan={2}>R{Number(selectedOrder.serviceFee).toFixed(2)}</td>
                    </tr>
                    {(selectedOrder.refundAmount || 0) > 0 && (
                      <tr className="refund-row">
                        <td colSpan={2}>Refund for Missing Items</td>
                        <td colSpan={2} className="refund-amount">-R{Number(selectedOrder.refundAmount).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="total-row">
                      <td colSpan={2}>Total</td>
                      <td colSpan={2}>
                        R{Number(selectedOrder.adjustedTotal || selectedOrder.total).toFixed(2)} 
                        {selectedOrder.adjustedTotal && selectedOrder.adjustedTotal !== selectedOrder.total && (
                          <span className="original-price">
                            <br/> was R{Number(selectedOrder.total).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                
                {selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (
                  <div className="missing-items-summary">
                    <h4>Missing Items Summary</h4>
                    <div className="missing-items-info">
                      <p><span className="info-label">Items Affected:</span> <span className="info-value">{selectedOrder.missingItems.length}</span></p>
                      <p><span className="info-label">Refund Amount:</span> <span className="info-value">R{Number(selectedOrder.refundAmount || 0).toFixed(2)}</span></p>
                      <p><span className="info-label">Refund Status:</span> <span className={`info-value refund-status-${selectedOrder.refundStatus || 'pending'}`}>{(selectedOrder.refundStatus || 'pending').toUpperCase()}</span></p>
                      {selectedOrder.driverNote && (<p><span className="info-label">Driver Note:</span> <span className="info-value driver-note">{selectedOrder.driverNote}</span></p>)}
                    </div>
                  </div>
                )}
              </div>
              {selectedOrder?.status === 'completed' && (
                <div className="rating-section">
                  <strong>Customer Rating:</strong>
                  {selectedOrder.rating ? (
                    <div className="order-rating">
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`admin-star ${star <= (selectedOrder.rating || 0) ? 'filled' : ''}`}>★</span>
                        ))}
                        <span className="rating-value">{selectedOrder.rating}/5</span>
                      </div>
                      {selectedOrder.ratingComment && (<div className="rating-comment">"{selectedOrder.ratingComment}"</div>)}
                    </div>
                  ) : (
                    <div className="no-rating">Customer has not rated this order yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Modal */}
      {selectedCustomerProfile && customerDetails[selectedCustomerProfile] && (
        <div className="order-details-overlay" onClick={() => { setSelectedCustomerProfile(null); setExpandedOrderId(null); }}>
          <div className="order-details-modal client-profile-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSelectedCustomerProfile(null); setExpandedOrderId(null); }} aria-label="Close">&times;</button>

            <div className="modal-header">
              <h3>Customer Profile: {customerDetails[selectedCustomerProfile].name}</h3>
              <div className="customer-contact-info">
                <span>{customerDetails[selectedCustomerProfile].email}</span> | <span>{customerDetails[selectedCustomerProfile].phone}</span>
              </div>
            </div>

            <div className="customer-stats-grid">
              <div className="stat-box">
                <h4>Total Orders</h4>
                <p className="stat-number">
                  {filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                    .filter((o: any) => o.userId === selectedCustomerProfile).length}
                </p>
              </div>
              <div className="stat-box">
                <h4>Total Spent</h4>
                <p className="stat-number">
                  R{filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                    .filter((o: any) => o.userId === selectedCustomerProfile)
                    .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="stat-box">
                <h4>Avg Order Value</h4>
                <p className="stat-number">
                  R{(() => {
                    const customerOrders = filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                      .filter((o: any) => o.userId === selectedCustomerProfile);
                    const totalSpent = customerOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
                    return customerOrders.length > 0 ? (totalSpent / customerOrders.length).toFixed(2) : '0.00';
                  })()}
                </p>
              </div>
            </div>

            <div className="top-products-section">
              <h4>Top Products Purchased</h4>
              <div className="top-products-list">
                {(() => {
                  const customerOrders = filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                    .filter((o: any) => o.userId === selectedCustomerProfile);
                  const productsMap: { [key: string]: { name: string; qty: number; spent: number } } = {};
                  
                  customerOrders.forEach((order: any) => {
                    order.items?.forEach((item: OrderItem) => {
                      const productId = item.productId;
                      const productName = item.product?.name || `Product ${productId}`;
                      const qty = Number(item.qty || 0);
                      const price = Number(item.product?.price || 0);

                      if (!productsMap[productId]) {
                        productsMap[productId] = { name: productName, qty: 0, spent: 0 };
                      }

                      productsMap[productId].qty += qty;
                      productsMap[productId].spent += price * qty;
                    });
                  });

                  const topProducts = Object.values(productsMap)
                    .sort((a, b) => b.spent - a.spent)
                    .slice(0, 5);

                  return topProducts.length > 0 ? (
                    topProducts.map((product, idx) => (
                      <div key={idx} className="top-product-item">
                        <span className="product-rank">{idx + 1}.</span>
                        <span className="product-name">{product.name}</span>
                        <span className="product-details">
                          {product.qty} items - R{product.spent.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No products purchased yet</div>
                  );
                })()}
              </div>
            </div>

            <div className="customer-orders-section">
              <h4>Order History ({filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                .filter((o: any) => o.userId === selectedCustomerProfile).length} orders)</h4>
              <div className="driver-orders-accordion">
                {filterOrdersForCalculations((ordersState.allOrders || ordersState.orders))
                  .filter((o: any) => o.userId === selectedCustomerProfile)
                  .sort((a: any, b: any) => {
                    const aDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt);
                    const bDate = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt);
                    return bDate.getTime() - aDate.getTime();
                  })
                  .map((order: any) => (
                  <div key={order.id} className="order-accordion-item">
                    <div
                      className={`order-accordion-header ${expandedOrderId === order.id ? 'expanded' : ''}`}
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                      <div className="order-accordion-summary">
                        <div className="order-id">Order #{order.id.substring(0, 8)}</div>
                        <div className="order-date">{formatDate(order.createdAt)}</div>
                        <div className="order-total">R{Number(order.total).toFixed(2)}</div>
                        <div className={`status-badge ${order.status}`}>{order.status}</div>
                      </div>
                      <div className="accordion-icon">{expandedOrderId === order.id ? '−' : '+'}</div>
                    </div>

                    {expandedOrderId === order.id && (
                      <div className="order-accordion-content">
                        <div className="order-items-section">
                          <table className="items-table driver-items-table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items && order.items.map((item: OrderItem, idx: number) => (
                                <tr key={idx}>
                                  <td>
                                    <div className="item-details">
                                      {item.product?.image_url && (
                                        <img
                                          src={item.product.image_url}
                                          alt={item.product.name}
                                          className="item-thumbnail"
                                        />
                                      )}
                                      <span>{item.product?.name || `Product ${item.productId}`}</span>
                                    </div>
                                  </td>
                                  <td>{item.qty}</td>
                                  <td>R{Number(item.product?.price || 0).toFixed(2)}</td>
                                  <td>R{Number((item.product?.price || 0) * item.qty).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={3}>Subtotal</td>
                                <td>R{Number(order.subtotal || 0).toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td colSpan={3}>Service Fee</td>
                                <td>R{Number(order.serviceFee || 0).toFixed(2)}</td>
                              </tr>
                              <tr className="total-row">
                                <td colSpan={3}>Total</td>
                                <td>R{Number(order.total || 0).toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageOrdersSection;
