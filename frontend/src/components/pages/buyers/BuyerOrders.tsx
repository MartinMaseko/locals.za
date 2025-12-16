import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import ProductCard from '../storepages/productview/productsCard';
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
    brand?: string;
  };
}

interface Order {
  id: string;
  items: OrderItem[];
  createdAt: string;
  status: string;
}

interface ProductSummary {
  id: string;
  name: string;
  price: number;
  image_url: string;
  brand?: string;
  totalQuantity: number;
}

interface DateGroup {
  date: string;
  products: ProductSummary[];
  totalOrders: number;
}

const BuyerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('7'); // Last 7 days
  const auth = getAuth(app);

  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  useEffect(() => {
    if (orders.length > 0) {
      processOrdersByDate();
    }
  }, [orders, searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(response.data)) {
        // Filter orders based on date filter
        const filteredOrders = filterOrdersByDate(response.data);
        setOrders(filteredOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByDate = (allOrders: Order[]) => {
    if (dateFilter === 'all') return allOrders;

    const daysBack = parseInt(dateFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= cutoffDate;
    });
  };

  const processOrdersByDate = () => {
    const productsByDate: { [date: string]: { [productId: string]: ProductSummary } } = {};

    orders.forEach(order => {
      try {
        const orderDate = format(parseISO(order.createdAt), 'yyyy-MM-dd');
        
        if (!productsByDate[orderDate]) {
          productsByDate[orderDate] = {};
        }

        order.items.forEach(item => {
          const productId = item.productId || item.product?.id || 'unknown';
          
          if (!productsByDate[orderDate][productId]) {
            productsByDate[orderDate][productId] = {
              id: productId,
              name: item.product?.name || 'Unknown Product',
              price: item.product?.price || 0,
              image_url: item.product?.image_url || '',
              brand: item.product?.brand || '',
              totalQuantity: 0
            };
          }
          
          productsByDate[orderDate][productId].totalQuantity += item.qty;
        });
      } catch (e) {
        console.error('Error processing order:', order, e);
      }
    });

    // Convert to array and sort by date (most recent first)
    const groups: DateGroup[] = Object.entries(productsByDate)
      .map(([date, products]) => {
        const productArray = Object.values(products);
        
        // Filter products based on search query
        const filteredProducts = searchQuery
          ? productArray.filter(product => 
              product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.brand?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : productArray;

        return {
          date,
          products: filteredProducts.sort((a, b) => b.totalQuantity - a.totalQuantity),
          totalOrders: orders.filter(o => {
            try {
              return format(parseISO(o.createdAt), 'yyyy-MM-dd') === date;
            } catch {
              return false;
            }
          }).length
        };
      })
      .filter(group => group.products.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDateGroups(groups);
  };

  const formatDateHeader = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM do, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleProductClick = (product: ProductSummary) => {
    // Navigate to product details or handle product selection
    console.log('Product clicked:', product);
  };

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
      <div className="buyer-stats-cards">
        <div className="buyer-section">
          <h2>Orders by Date</h2>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {dateGroups.length === 0 ? (
            <div className="no-orders-message">
              <p>No orders found for the selected period.</p>
            </div>
          ) : (
            <div className="orders-by-date-container">
              {dateGroups.map((group) => (
                <div key={group.date} className="date-group">
                  <div className="date-header">
                    {formatDateHeader(group.date)} ({group.totalOrders} {group.totalOrders === 1 ? 'order' : 'orders'})
                  </div>
                  <div className="products-for-date">
                    {group.products.map((product) => (
                      <div key={product.id} className="product-order-item">
                        <ProductCard
                          product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image_url: product.image_url,
                          }}
                          onClick={() => handleProductClick(product)}
                        />
                        <div className="product-quantity">
                          <span>Total Ordered:</span>
                          <span className="quantity-badge">{product.totalQuantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerOrders;