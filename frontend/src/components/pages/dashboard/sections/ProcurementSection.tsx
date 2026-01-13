import { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../utils/helpers';
import { useDiscounts } from '../hooks/useDiscounts';
// Update this import to include the new function
import { filterOrdersForProcurement } from '../utils/orderStatusUtils';
import type { OrderItem } from '../types/index';

interface ProcurementSectionProps {
  ordersState: any;
}

interface ProductAggregate {
  productId: string;
  productName: string;
  imageUrl: string;
  totalQty: number;
  price: number;
  totalValue: number;
}

interface DateGroup {
  date: string;
  products: ProductAggregate[];
  totalValue: number;
}

const ProcurementSection = ({ ordersState }: ProcurementSectionProps) => {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [paidPrices, setPaidPrices] = useState<Record<string, Record<string, number>>>({});
  const [savingDiscounts, setSavingDiscounts] = useState<Record<string, boolean>>({});
  const { savePaidPrice, fetchDiscountsByDate, discountsByDate } = useDiscounts();

  // Filter orders for procurement - only processing orders:
  const processingOrders = useMemo(() => {
    return filterOrdersForProcurement(ordersState.allOrders || ordersState.orders);
  }, [ordersState.orders, ordersState.allOrders]);

  // Group orders by date and aggregate products
  const groupOrdersByDate = (): DateGroup[] => {
    const dateGroups: { [key: string]: { [productId: string]: ProductAggregate } } = {};

    // Use processingOrders instead of validOrders
    processingOrders?.forEach((order: any) => {
      if (!order.items || !order.createdAt) return;

      // Get date string (YYYY-MM-DD)
      let dateStr: string;
      if (order.createdAt instanceof Date) {
        dateStr = order.createdAt.toISOString().split('T')[0];
      } else if (order.createdAt.seconds) {
        dateStr = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
      } else if (typeof order.createdAt === 'string') {
        dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      } else {
        return;
      }

      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {};
      }

      // Aggregate products for this date
      order.items.forEach((item: OrderItem) => {
        const productId = item.productId;
        const productName = item.product?.name || `Product ${productId}`;
        const imageUrl = item.product?.image_url || '';
        const price = Number(item.product?.price || 0);
        const qty = Number(item.qty || 0);

        if (!dateGroups[dateStr][productId]) {
          dateGroups[dateStr][productId] = {
            productId,
            productName,
            imageUrl,
            totalQty: 0,
            price,
            totalValue: 0
          };
        }

        dateGroups[dateStr][productId].totalQty += qty;
        dateGroups[dateStr][productId].totalValue += price * qty;
      });
    });

    // Convert to array and sort by date (newest first)
    return Object.keys(dateGroups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
        const products = Object.values(dateGroups[date]);
        const totalValue = products.reduce((sum, p) => sum + p.totalValue, 0);
        return { date, products, totalValue };
      });
  };

  const dateGroups = groupOrdersByDate();

  // Load existing discounts when date is expanded
  useEffect(() => {
    if (expandedDate) {
      fetchDiscountsByDate(expandedDate)
        .then((discounts) => {
          // Pre-populate paid prices from existing discounts
          const newPaidPrices: Record<string, number> = {};
          const discountsData = discounts as Record<string, any>;
          Object.keys(discountsData).forEach(productId => {
            newPaidPrices[productId] = discountsData[productId].paidPrice;
          });
          setPaidPrices(prev => ({
            ...prev,
            [expandedDate]: newPaidPrices
          }));
        })
        .catch(() => {
          // Silently handle error - just means no existing discounts for this date
          console.warn('No existing discounts found for date:', expandedDate);
        });
    }
  }, [expandedDate, fetchDiscountsByDate]);

  const handlePaidPriceChange = (date: string, productId: string, value: string) => {
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue) && numValue > 0) {
      setPaidPrices(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [productId]: numValue
        }
      }));
    } else if (value === '' || numValue === 0) {
      // Clear the value if empty or zero
      setPaidPrices(prev => {
        const newState = { ...prev };
        if (newState[date]) {
          delete newState[date][productId];
        }
        return newState;
      });
    }
  };

  const handleSaveDiscount = async (date: string, product: ProductAggregate) => {
    const paidPrice = paidPrices[date]?.[product.productId];
    
    if (paidPrice === undefined || paidPrice <= 0) {
      alert('Please enter a valid paid price');
      return;
    }

    if (paidPrice >= product.price) {
      alert('Paid price must be less than unit price to create a discount');
      return;
    }

    const key = `${date}_${product.productId}`;
    setSavingDiscounts(prev => ({ ...prev, [key]: true }));

    try {
      await savePaidPrice(date, product.productId, paidPrice, product.price, product.totalQty);
      alert(`Discount saved! Customers will receive 75% of the savings on their next order.`);
    } catch (err: any) {
      console.error('Error saving discount:', err);
      alert(`Failed to save discount: ${err.message}`);
    } finally {
      setSavingDiscounts(prev => ({ ...prev, [key]: false }));
    }
  };

  const calculateDiscount = (unitPrice: number, paidPrice: number | undefined) => {
    if (paidPrice === undefined || paidPrice >= unitPrice) return null;
    
    const discount = unitPrice - paidPrice;
    const customerDiscount = discount * 0.75;
    const businessProfit = discount * 0.25;
    
    return { discount, customerDiscount, businessProfit };
  };

  const getExistingDiscount = (date: string, productId: string) => {
    return discountsByDate[date]?.[productId];
  };

  return (
    <div className="procurement-section">
      <div className="section-header">
        <h2>Procurement</h2>
        <p className="section-description">View products from processing orders grouped by date</p>
      </div>

      {dateGroups.length === 0 ? (
        <div className="no-data">No processing orders found</div>
      ) : (
        <div className="procurement-accordion">
          {dateGroups.map(group => (
            <div key={group.date} className="procurement-date-group">
              <div 
                className={`date-group-header ${expandedDate === group.date ? 'expanded' : ''}`}
                onClick={() => setExpandedDate(expandedDate === group.date ? null : group.date)}
              >
                <div className="date-info">
                  <span className="date-label">{formatDate(new Date(group.date))}</span>
                  <span className="products-count">{group.products.length} products</span>
                </div>
                <div className="date-total">
                  <span>Total: R{group.totalValue.toFixed(2)}</span>
                  <div className="accordion-icon">{expandedDate === group.date ? '−' : '+'}</div>
                </div>
              </div>

              {expandedDate === group.date && (
                <div className="date-group-content">
                  <table className="procurement-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Value</th>
                        <th>Paid Price</th>
                        <th>Discount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.products.map(product => {
                        const existingDiscount = getExistingDiscount(group.date, product.productId);
                        const paidPrice = paidPrices[group.date]?.[product.productId];
                        const discountCalc = calculateDiscount(product.price, paidPrice);
                        const key = `${group.date}_${product.productId}`;
                        
                        return (
                          <tr key={product.productId}>
                            <td>
                              <span className="product-name-text">{product.productName}</span>
                            </td>
                            <td className="qty-cell">{product.totalQty}</td>
                            <td>R{product.price.toFixed(2)}</td>
                            <td className="value-cell">R{product.totalValue.toFixed(2)}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={product.price}
                                value={paidPrice !== undefined ? paidPrice.toFixed(2) : (existingDiscount?.paidPrice?.toFixed(2) ?? '')}
                                onChange={(e) => handlePaidPriceChange(group.date, product.productId, e.target.value)}
                                placeholder="0.00"
                                className="paid-price-input"
                                disabled={!!existingDiscount}
                              />
                              {existingDiscount && (
                                <div className="existing-discount-badge">
                                  ✓ Saved
                                </div>
                              )}
                            </td>
                            <td className="discount-cell">
                              {existingDiscount ? (
                                <div className="discount-info">
                                  <div className="discount-row">
                                    <span className="label">Total:</span>
                                    <span className="value">R{existingDiscount.totalDiscount.toFixed(2)}</span>
                                  </div>
                                  <div className="discount-row customer">
                                    <span className="label">Customer (75%):</span>
                                    <span className="value">R{existingDiscount.totalCustomerDiscount.toFixed(2)}</span>
                                  </div>
                                  <div className="discount-row business">
                                    <span className="label">Business (25%):</span>
                                    <span className="value">R{existingDiscount.totalBusinessProfit.toFixed(2)}</span>
                                  </div>
                                </div>
                              ) : discountCalc ? (
                                <div className="discount-preview">
                                  <div className="discount-row">
                                    <span className="label">Total:</span>
                                    <span className="value">R{(discountCalc.discount * product.totalQty).toFixed(2)}</span>
                                  </div>
                                  <div className="discount-row customer">
                                    <span className="label">Customer:</span>
                                    <span className="value">R{(discountCalc.customerDiscount * product.totalQty).toFixed(2)}</span>
                                  </div>
                                  <div className="discount-row business">
                                    <span className="label">Business:</span>
                                    <span className="value">R{(discountCalc.businessProfit * product.totalQty).toFixed(2)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="no-discount">—</span>
                              )}
                            </td>
                            <td>
                              {!existingDiscount && paidPrice !== undefined && paidPrice < product.price && (
                                <button
                                  className="save-discount-btn"
                                  onClick={() => handleSaveDiscount(group.date, product)}
                                  disabled={savingDiscounts[key]}
                                >
                                  {savingDiscounts[key] ? 'Saving...' : 'Save'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}><strong>Date Total</strong></td>
                        <td className="value-cell"><strong>R{group.totalValue.toFixed(2)}</strong></td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="procurement-summary">
        <div className="summary-card">
          <h3>Total Days</h3>
          <p className="summary-value">{dateGroups.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Products</h3>
          <p className="summary-value">
            {dateGroups.reduce((sum, g) => sum + g.products.length, 0)}
          </p>
        </div>
        <div className="summary-card">
          <h3>Total Value</h3>
          <p className="summary-value">
            R{dateGroups.reduce((sum, g) => sum + g.totalValue, 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcurementSection;