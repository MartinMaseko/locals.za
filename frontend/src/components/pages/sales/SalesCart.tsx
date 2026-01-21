import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './salesStyles.css';

const SalesCart: React.FC = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [shareLink, setShareLink] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load cart from localStorage
  React.useEffect(() => {
    const savedCart = localStorage.getItem('salesRepCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Failed to parse cart:', err);
      }
    }
  }, []);

  const updateQuantity = (productId: string, change: number) => {
    const updatedCart = cart.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.qty + change);
        return { ...item, qty: newQty };
      }
      return item;
    });
    setCart(updatedCart);
    localStorage.setItem('salesRepCart', JSON.stringify(updatedCart));
  };

  const removeItem = (productId: string) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    setCart(updatedCart);
    localStorage.setItem('salesRepCart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('salesRepCart');
  };

  const generateShareLink = () => {
    if (cart.length === 0) return;

    try {
      // Create payload matching CartPage format
      const payload = cart.map(item => ({ 
        id: item.id, 
        qty: item.qty 
      }));
      
      const json = JSON.stringify({ 
        items: payload, 
        createdAt: new Date().toISOString(),
        sharedBy: 'sales_rep' // Identifier for analytics
      });

      // Use same base64 encoding as CartPage
      const b64 = window.btoa(unescape(encodeURIComponent(json)));
      
      // Use same URL format as CartPage (query parameter)
      const link = `${window.location.origin}/shared-cart?d=${encodeURIComponent(b64)}`;
      
      setShareLink(link);
      setShowModal(true);
      setCopied(false);
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else if (shareInputRef.current) {
        shareInputRef.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareLink) return;
    const message = `Check out this cart I prepared for you: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <div className="sales-cart-container">
      <div className="sales-cart-header">
        <h2>Sales Cart</h2>
        <button onClick={() => navigate('/sales/shop')} className="continue-shopping-btn">
          ← Continue Shopping
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <button onClick={() => navigate('/sales/shop')} className="shop-btn">
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="sales-cart-items">
            {cart.map(item => (
              <div key={item.id} className="sales-cart-item">
                <img src={item.image} alt={item.name} className="sales-cart-item-image" />
                <div className="sales-cart-item-details">
                  <h3>{item.name}</h3>
                  <p className="sales-cart-item-price">R{item.price.toFixed(2)}</p>
                  <div className="sales-cart-item-qty">
                    <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <p className="sales-cart-item-subtotal">
                    Subtotal: R{(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
                <button onClick={() => removeItem(item.id)} className="sales-remove-btn">
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="sales-cart-summary">
            <h3>Cart Summary</h3>
            <div className="sales-summary-row">
              <span>Items:</span>
              <span>{cart.length}</span>
            </div>
            <div className="sales-summary-row">
              <span>Total Quantity:</span>
              <span>{cart.reduce((sum, item) => sum + item.qty, 0)}</span>
            </div>
            <div className="sales-summary-row total">
              <span>Total:</span>
              <span>R{total.toFixed(2)}</span>
            </div>

            <div className="sales-cart-actions">
              <button onClick={generateShareLink} className="sales-share-link-btn">
                Generate Shareable Link
              </button>
              <button onClick={clearCart} className="sales-clear-cart-btn">
                Clear Cart
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Share Cart Link</h3>
            <p>Share this link with your customer:</p>
            <input
              ref={shareInputRef}
              type="text"
              value={shareLink}
              readOnly
              className="share-link-input"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="modal-actions">
              <button onClick={copyLink} className="copy-btn">
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <button onClick={shareViaWhatsApp} className="whatsapp-btn">
                Share on WhatsApp
              </button>
              <button onClick={() => setShowModal(false)} className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCart;