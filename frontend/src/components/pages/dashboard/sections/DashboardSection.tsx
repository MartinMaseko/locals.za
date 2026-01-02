import { useEffect, useState } from 'react';
import { dashboardStatsService } from '../services/dashboardStatsService';

interface DashboardSectionProps {
  admin: any;
  getToken: () => Promise<string>;
  ordersState: any;
  productsState: any;
  driversState: any;
}

const DashboardSection = ({
  admin,
  getToken,
  ordersState,
  productsState,
  driversState
}: DashboardSectionProps) => {
  const [statsPeriod, setStatsPeriod] = useState<'30'|'60'|'90'|'all'>('30');
  const [dashboardStats, setDashboardStats] = useState({
    serviceRevenue: 0,
    orderRevenue: 0,
    topProducts: [] as {name: string, count: number, revenue: number}[]
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all initial data when dashboard loads
  useEffect(() => {
    if (!admin) return;
    initializeDashboardData();
  }, [admin, getToken]);

  // Recalculate stats when period changes
  useEffect(() => {
    if (!admin) return;
    fetchDashboardStats();
  }, [statsPeriod, admin, ordersState.orders]);

  const initializeDashboardData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Fetch all data in parallel
      await Promise.all([
        fetchAllProducts(),
        fetchAllOrders(), 
        fetchAllDrivers(),
        fetchUserCount(token)
      ]);
      
      // Calculate initial stats
      await fetchDashboardStats();
    } catch (error) {
      console.error('Error initializing dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    if (productsState.products.length === 0) {
      await productsState.fetchProducts();
    }
  };

  const fetchAllOrders = async () => {
    if (ordersState.orders.length === 0) {
      await ordersState.fetchOrders();
    }
  };

  const fetchAllDrivers = async () => {
    if (driversState.drivers.length === 0) {
      await driversState.fetchDrivers();
    }
  };

  const fetchUserCount = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/stats/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        console.log('Users fetched:', data.users?.length || 0);
      } else {
        console.error('Failed to fetch user count:', response.status, response.statusText);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching user count:', error);
      setUsers([]);
    }
  };

  const fetchDashboardStats = async () => {
    if (!admin) return;
    
    try {
      const token = await getToken();
      
      const stats = await dashboardStatsService.fetchStats(token, statsPeriod);
      
      if (stats) {
        setDashboardStats({
          serviceRevenue: Number(stats.serviceRevenue || 0),
          orderRevenue: Number(stats.orderRevenue || 0),
          topProducts: Array.isArray(stats.topProducts) ? stats.topProducts : []
        });
        return;
      }
      
      console.log('Calculating stats locally');
      const calculatedStats = dashboardStatsService.calculateStatsLocally(ordersState.allOrders || ordersState.orders, statsPeriod);
      setDashboardStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setDashboardStats({
        serviceRevenue: 0,
        orderRevenue: 0,
        topProducts: []
      });
    }
  };

  return (
    <div className="dashboard-overview">
      <div className='dashboard-overview-header'>
        <div className='dashboard-overview-title'>Dashboard Overview</div>
        <div className="stats-period-filter">
          <label>Period: </label>
          <div className="period-options">
            <button 
              className={`period-option ${statsPeriod === '30' ? 'active' : ''}`}
              onClick={() => setStatsPeriod('30')}
            >
              30 Days
            </button>
            <button 
              className={`period-option ${statsPeriod === '60' ? 'active' : ''}`}
              onClick={() => setStatsPeriod('60')}
            >
              60 Days
            </button>
            <button 
              className={`period-option ${statsPeriod === '90' ? 'active' : ''}`}
              onClick={() => setStatsPeriod('90')}
            >
              90 Days
            </button>
            <button 
              className={`period-option ${statsPeriod === 'all' ? 'active' : ''}`}
              onClick={() => setStatsPeriod('all')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-indicator">Loading dashboard data...</div>
      ) : (
        <div className="dashboard-stats">
          <div className="stat-card"><h3>Products</h3><p className="stat-number">{productsState.products.length}</p></div>
          <div className="stat-card"><h3>Drivers</h3><p className="stat-number">{driversState.drivers.length}</p></div>
          <div className="stat-card"><h3>Orders</h3><p className="stat-number">{(ordersState.allOrders || ordersState.orders).length}</p></div>
          <div className="stat-card">
            <h3>Service Revenue</h3>
            <p className="stat-number">R{dashboardStats.serviceRevenue.toFixed(2)}</p>
            <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
          </div>
          
          <div className="stat-card">
            <h3>Order Revenue</h3>
            <p className="stat-number">R{dashboardStats.orderRevenue.toFixed(2)}</p>
            <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
          </div>
          <div className="stat-card">
            <h3>Users</h3>
            <p className="stat-number">{users.length}</p>
            <p className="stat-period">Total registered users</p>
          </div>
          <div className="stat-card top-products">
            <h3>Top Selling Products</h3>
            {dashboardStats.topProducts.length > 0 ? (
              dashboardStats.topProducts.map((product, idx) => (
                <div key={idx} className="stat-product">
                  <span className="product-name">{product.name}</span>
                  <span className="product-count">{product.count} sold</span>
                </div>
              ))
            ) : (
              <p className="no-data">No product data</p>
            )}
            <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSection;
