import { useState, useEffect } from 'react';
import { useFetchCustomerDetails } from '../hooks/useFetch';
import { driversService } from '../services/driversService';
import { formatDate } from '../utils/helpers';
import type { OrderItem } from '../types/index';

interface ManageDriversSectionProps {
  getToken: () => Promise<string>;
  driversList: any[];
  driverOrders: any[];
  setDriversList?: (drivers: any[]) => void;
  setDriverOrders?: (orders: any[]) => void;
}

const ManageDriversSection = ({
  getToken,
  driversList,
  driverOrders,
  setDriversList,
  setDriverOrders
}: ManageDriversSectionProps) => {
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriverOrders, setSelectedDriverOrders] = useState<any[]>([]);
  const { customerDetails } = useFetchCustomerDetails();

  // Fetch initial data when component loads
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        
        // Fetch drivers if not already loaded
        if (driversList.length === 0 && setDriversList) {
          const drivers = await driversService.fetchAllDrivers(token);
          setDriversList(drivers);
        }
        
        // Fetch all driver orders for statistics
        if (driverOrders.length === 0 && setDriverOrders) {
          const orders = await driversService.fetchAllDriverOrders(token);
          setDriverOrders(orders);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [getToken, driversList.length, driverOrders.length, setDriversList, setDriverOrders]);

  // Fetch orders for selected driver
  useEffect(() => {
    if (selectedDriver) {
      const fetchSelectedDriverOrders = async () => {
        try {
          const token = await getToken();
          const driverId = selectedDriver.driver_id || selectedDriver.id;
          const orders = await driversService.fetchDriverOrders(token, driverId);
          setSelectedDriverOrders(orders);
        } catch (error) {
          setSelectedDriverOrders([]);
        }
      };
      
      fetchSelectedDriverOrders();
    } else {
      setSelectedDriverOrders([]);
    }
  }, [selectedDriver, getToken]);

  return (
    <div className="manage-drivers-section">
      <div className="section-header">
        <h2>Manage Drivers</h2>
        {loading && <div className="loading-indicator">Loading driver data...</div>}
      </div>
      
      {loading ? (
        <div className="loading-container">
          <p>Loading drivers and order data...</p>
        </div>
      ) : driversList.length === 0 ? (
        <div className="no-data-container">
          <p>No drivers found. Please check your connection or try refreshing.</p>
        </div>
      ) : (
        <div className="drivers-table-container">
          <table className="drivers-table">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {driversList.map(driver => {
              const driverId = driver.driver_id || driver.id;
              
              return (
                <tr 
                  key={driverId} 
                  className={selectedDriver?.driver_id === driver.driver_id ? 'selected-row' : ''}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <td>{driver.full_name || 'Unknown'}</td>
                  <td>{driver.phone_number || 'N/A'}</td>
                  <td>{driver.vehicle_type} {driver.vehicle_model}</td>
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
      )}
      
      {selectedDriver && (
        <div className="order-details-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="order-details-modal driver-orders-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDriver(null)} aria-label="Close">&times;</button>
            
            <div className="modal-header">
              <h3>Driver: {selectedDriver.full_name || selectedDriver.email} - Orders</h3>
            </div>
            
            <div className="driver-orders-accordion">
              {selectedDriverOrders.length === 0 ? (
                <div className="no-orders-message">
                  <p>No orders found for this driver.</p>
                </div>
              ) : (
                selectedDriverOrders.map(order => (
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
              ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDriversSection;
