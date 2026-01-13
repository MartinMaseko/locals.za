import { useState, useEffect, useMemo } from 'react';
import { discountService } from '../services/discountService';

interface DiscountAnalytics {
  summary: {
    totalBusinessProfit: number;
    totalCustomerDiscounts: number;
    totalDiscounts: number;
    totalOrders: number;
  };
  topProducts: Array<{
    productId: string;
    productName?: string;
    totalDiscount: number;
    businessProfit: number;
    customerDiscount: number;
    occurrences: number;
  }>;
}

const DiscountAnalyticsSection = () => {
  const [analytics, setAnalytics] = useState<DiscountAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Calculate summary from topProducts data
  const calculatedSummary = useMemo(() => {
    if (!analytics?.topProducts || analytics.topProducts.length === 0) {
      return {
        totalBusinessProfit: 0,
        totalCustomerDiscounts: 0,
        totalDiscounts: 0,
        totalOrders: 0
      };
    }

    const summary = analytics.topProducts.reduce((acc, product) => {
      acc.totalBusinessProfit += product.businessProfit;
      acc.totalCustomerDiscounts += product.customerDiscount;
      acc.totalDiscounts += product.totalDiscount;
      acc.totalOrders += product.occurrences;
      return acc;
    }, {
      totalBusinessProfit: 0,
      totalCustomerDiscounts: 0,
      totalDiscounts: 0,
      totalOrders: 0
    });

    return summary;
  }, [analytics?.topProducts]);

  // Use calculated summary if analytics.summary doesn't have data
  const displaySummary = (analytics?.summary && analytics.summary.totalDiscounts > 0)
    ? analytics.summary 
    : calculatedSummary;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await discountService.getDiscountAnalytics(
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
      );
      console.log('Analytics data received:', data); // Debug log
      setAnalytics(data as DiscountAnalytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    fetchAnalytics();
  };

  if (loading) {
    return <div className="loading-container">Loading analytics...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="no-data">No analytics data available</div>;
  }

  return (
    <div className="discount-analytics-section">
      <div className="section-header">
        <h2>Discount Analytics</h2>
        <p className="section-description">Track revenue and savings from bulk procurement discounts</p>
      </div>

      <div className="analytics-filters">
        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
          />
        </div>
        <button onClick={handleApplyFilter} className="apply-filter-btn">
          Apply Filter
        </button>
      </div>

      <div className="analytics-summary">
        <div className="summary-card business-revenue">
          <div className="card-content">
            <h3>Business Revenue</h3>
            <p className="summary-values">R{displaySummary.totalBusinessProfit.toFixed(2)}</p>
            <span className="summary-label">Total profit from discounts</span>
          </div>
        </div>

        <div className="summary-card customer-savings">
          <div className="card-content">
            <h3>Customer Savings</h3>
            <p className="summary-values">R{displaySummary.totalCustomerDiscounts.toFixed(2)}</p>
            <span className="summary-label">Total savings distributed</span>
          </div>
        </div>

        <div className="summary-card total-discounts">
          <div className="card-content">
            <h3>Total Discounts</h3>
            <p className="summary-values">R{displaySummary.totalDiscounts.toFixed(2)}</p>
            <span className="summary-label">Total procurement savings</span>
          </div>
        </div>

        <div className="summary-card discount-orders">
          <div className="card-content">
            <h3>Discounted Products</h3>
            <p className="summary-values">{displaySummary.totalOrders}</p>
            <span className="summary-label">Products with discounts</span>
          </div>
        </div>
      </div>

      <div className="top-products-section">
        <h3>Top 10 Products by Business Revenue</h3>
        {analytics.topProducts && analytics.topProducts.length > 0 ? (
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Total Discount</th>
                <th>Business Revenue</th>
                <th>Customer Savings</th>
                <th>Occurrences</th>
                <th>Avg Discount/Order</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts.map((product) => (
                <tr key={product.productId}>
                  <td>{product.productName || product.productId}</td>
                  <td>R{product.totalDiscount.toFixed(2)}</td>
                  <td className="business-profit">R{product.businessProfit.toFixed(2)}</td>
                  <td className="customer-discount">R{product.customerDiscount.toFixed(2)}</td>
                  <td>{product.occurrences}</td>
                  <td>R{(product.totalDiscount / product.occurrences).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No product data available</div>
        )}
      </div>

      <div className="analytics-insights">
        <h3>Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Profit Margin</h4>
            <p className="insight-value">
              {displaySummary.totalDiscounts > 0
                ? ((displaySummary.totalBusinessProfit / displaySummary.totalDiscounts) * 100).toFixed(1)
                : 0}%
            </p>
            <span className="insight-label">Business share of savings</span>
          </div>
          <div className="insight-card">
            <h4>Customer Value</h4>
            <p className="insight-value">
              {displaySummary.totalDiscounts > 0
                ? ((displaySummary.totalCustomerDiscounts / displaySummary.totalDiscounts) * 100).toFixed(1)
                : 0}%
            </p>
            <span className="insight-label">Customer share of savings</span>
          </div>
          <div className="insight-card">
            <h4>Avg Discount per Product</h4>
            <p className="insight-value">
              R{displaySummary.totalOrders > 0
                ? (displaySummary.totalDiscounts / displaySummary.totalOrders).toFixed(2)
                : '0.00'}
            </p>
            <span className="insight-label">Average savings per product</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountAnalyticsSection;
