import { useState, useEffect } from 'react';
import { useFetchCustomerDetails } from '../hooks/useFetch';
import { formatDate } from '../utils/helpers';
import type { OrderItem } from '../types/index';

interface ManageDriversSectionProps {
  getToken: () => Promise<string>;
  driversList: any[];
  driverOrders: any[];
  fetchDriverOrders: (getToken: () => Promise<string>, driverId: string) => void;
}

const ManageDriversSection = ({
  getToken,
  driversList,
  driverOrders,
  fetchDriverOrders
}: ManageDriversSectionProps) => {
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { customerDetails } = useFetchCustomerDetails();

  useEffect(() => {
    if (selectedDriver) {
      fetchDriverOrders(getToken, selectedDriver.driver_id || selectedDriver.id);
    }
  }, [selectedDriver, fetchDriverOrders, getToken]);

  return (
    <div className="manage-drivers-section">
      <div className="section-header">
        <h2>Manage Drivers</h2>
      </div>
      
      <div className="drivers-table-container">
        <table className="drivers-table">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Assigned Orders</th>
              <th>Accepted Orders</th>
              <th>Delivered Orders</th>
              <th>Revenue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {driversList.map(driver => {
              const driverId = driver.driver_id || driver.id;
              
              // Use driverOrders (same data source as the modal)
              const allDriverOrders = driverOrders.filter((o: any) => o.driver_id === driverId);
              const driverOrderCount = allDriverOrders.length;
              const driverDeliveredCount = allDriverOrders.filter((o: any) => 
                o.status === 'delivered' || o.status === 'completed'
              ).length;
              const driverAcceptedCount = allDriverOrders.filter((o: any) => 
                o.status === 'processing' || o.status === 'in transit' || o.status === 'delivered' || o.status === 'completed'
              ).length;
              const driverRevenue = driverDeliveredCount * 40;
              
              return (
                <tr 
                  key={driverId} 
                  className={selectedDriver?.driver_id === driver.driver_id ? 'selected-row' : ''}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <td>{driver.full_name || 'Unknown'}</td>
                  <td>{driver.phone_number || 'N/A'}</td>
                  <td>{driver.vehicle_type} {driver.vehicle_model}</td>
                  <td>{driverOrderCount}</td>
                  <td>{driverAcceptedCount}</td>
                  <td>{driverDeliveredCount}</td>
                  <td className="revenue-cell">R{driverRevenue.toFixed(2)}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="view-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDriver(driver);
                        }}
                      >
                        View Orders
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selectedDriver && (
        <div className="order-details-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="order-details-modal driver-orders-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDriver(null)} aria-label="Close">&times;</button>
            
            <div className="modal-header">
              <h3>Driver: {selectedDriver.full_name || selectedDriver.email} - Orders</h3>
            </div>
            
            <div className="driver-orders-accordion">
              {driverOrders.map(order => (
                <div key={order.id} className="order-accordion-item">
                  <div 
                    className={`order-accordion-header ${expandedOrderId === order.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >
                    <div className="order-accordion-summary">
                      <div className="order-id">Order #{order.id.substring(0, 8)}</div>
                      <div className="order-date">{formatDate(order.createdAt)}</div>
                      <div className="order-customer">
                        {customerDetails[order.userId]?.name || order.userId.substring(0, 8) + '...'}
                      </div>
                      <div className="order-total">R{Number(order.total).toFixed(2)}</div>
                      <div className={`status-badge ${order.status}`}>{order.status}</div>
                    </div>
                    <div className="accordion-icon">{expandedOrderId === order.id ? '−' : '+'}</div>
                  </div>
                  
                  {expandedOrderId === order.id && (
                    <div className="order-accordion-content">
                      <div className="order-details-grid">
                        <div className="detail-column">
                          <h4>Delivery Address</h4>
                          <p>{order.deliveryAddress?.street || 'N/A'}</p>
                          <p>{order.deliveryAddress?.city}, {order.deliveryAddress?.postalCode}</p>
                        </div>
                        
                        <div className="detail-column">
                          <h4>Delivery Status</h4>
                          <div className={`delivery-status ${
                            order.status === 'delivered' ? 'delivered' :
                            order.status === 'in transit' ? 'in-transit' :
                            'not-started'}`}
                          >
                            {order.status === 'delivered' ? 'Delivered' :
                             order.status === 'in transit' ? 'In Transit' :
                             'Not Started'}
                          </div>
                          
                          <div className="payment-status-container">
                            <h4>Payment Status</h4>
                            <div className={`payment-status ${
                              order.status === 'delivered' ? 'paid' : 'unpaid'}`}
                            >
                              {order.status === 'delivered' ? 'R40 Paid' : 'Payment Pending'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="order-items-section">
                        <h4>Order Items</h4>
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
      )}
    </div>
  );
};

export default ManageDriversSection;
