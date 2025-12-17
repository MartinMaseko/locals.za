import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import './buyerStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface OrderItem {
  productId: string;
  qty: number;
  product?: {
    id?: string;
    name?: string;
    price?: number;
    image_url?: string;
  };
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  createdAt: any;
  status: string;
  total?: number;
  subtotal?: number;
  serviceFee?: number;
  deliveryAddress?: any;
  driver_id?: string;
}

interface DayItems {
  date: string;
  items: AggregatedItem[];
  dayTotal: number;
}

interface AggregatedItem {
  productId: string;
  name: string;
  totalQty: number;
  price: number;
  itemTotal: number;
}

const BuyerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dayItems, setDayItems] = useState<DayItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const auth = getAuth(app);

  useEffect(() => {
    fetchOrders();
  }, []);

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');
    return await user.getIdToken(true);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await getToken();

      // Fetch all orders
      const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(data)) {
        // Sort by date descending
        const sortedOrders = data.sort((a, b) => {
          const dateA = formatDateForSort(a.createdAt);
          const dateB = formatDateForSort(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        setOrders(sortedOrders);
        aggregateItemsByDay(sortedOrders);
      } else {
        setOrders([]);
        setDayItems([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForSort = (dateValue: any): Date => {
    try {
      if (typeof dateValue === 'object' && dateValue?.toDate) {
        return dateValue.toDate();
      }
      if (typeof dateValue === 'object' && dateValue?.seconds) {
        return new Date(dateValue.seconds * 1000);
      }
      if (typeof dateValue === 'string') return new Date(dateValue);
      if (dateValue instanceof Date) return dateValue;
      return new Date();
    } catch {
      return new Date();
    }
  };

  const aggregateItemsByDay = (ordersList: Order[]) => {
    const grouped: { [key: string]: AggregatedItem[] } = {};
    const dayTotals: { [key: string]: number } = {};

    ordersList.forEach(order => {
      try {
        const date = format(formatDateForSort(order.createdAt), 'yyyy-MM-dd');
        
        if (!grouped[date]) {
          grouped[date] = [];
        }

        // Aggregate items for this day
        order.items.forEach(item => {
          const existingItem = grouped[date].find(i => i.productId === item.productId);
          const itemPrice = Number(item.product?.price || 0);
          const itemLineTotal = itemPrice * item.qty;

          if (existingItem) {
            // Item already exists for this day, add to qty
            existingItem.totalQty += item.qty;
            existingItem.itemTotal += itemLineTotal;
          } else {
            // New item for this day
            grouped[date].push({
              productId: item.productId,
              name: item.product?.name || `Product ${item.productId}`,
              totalQty: item.qty,
              price: itemPrice,
              itemTotal: itemLineTotal
            });
          }

          // Update day total
          dayTotals[date] = (dayTotals[date] || 0) + itemLineTotal;
        });
      } catch (e) {
        console.error('Error processing order:', e);
      }
    });

    // Build result array
    const result: DayItems[] = Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        dayTotal: dayTotals[date] || 0
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDayItems(result);
  };

  const formatDateHeader = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM do, yyyy');
    } catch {
      return dateString;
    }
  };

  // Filter by search query
  const filteredDayItems = dayItems.filter(day =>
    !orderSearchQuery || 
    day.items.some(item => 
      item.name.toLowerCase().includes(orderSearchQuery.toLowerCase())
    )
  ).map(day => ({
    ...day,
    items: day.items.filter(item =>
      !orderSearchQuery ||
      item.name.toLowerCase().includes(orderSearchQuery.toLowerCase())
    )
  }));

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <div className="orders-header">
          <h2>Daily Orders Summary</h2>
          <div className="order-search">
            <input 
              type="text" 
              placeholder="Search by product name" 
              value={orderSearchQuery} 
              onChange={e => setOrderSearchQuery(e.target.value)}
              className="order-search-input" 
            />
            {orderSearchQuery && (
              <button 
                className="clear-search"
                onClick={() => setOrderSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchOrders} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {!error && filteredDayItems.length === 0 ? (
          <div className="no-orders-message">
            <p>{orderSearchQuery ? `No products match "${orderSearchQuery}"` : 'No orders found.'}</p>
          </div>
        ) : (
          <div className="orders-by-date-container">
            {filteredDayItems.map((day) => (
              <div key={day.date} className="date-group">
                <div className="date-header">
                  {formatDateHeader(day.date)}
                </div>

                <div className="order-items-container">
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th className="product-col">Product</th>
                        <th className="qty-col">Qty</th>
                        <th className="price-col">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.items.map((item) => (
                        <tr key={item.productId}>
                          <td className="product-col">{item.name}</td>
                          <td className="qty-col">{item.totalQty}</td>
                          <td className="price-col">R{item.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="day-total-row">
                    <strong>Daily Total:</strong>
                    <strong>R{day.dayTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerOrders;