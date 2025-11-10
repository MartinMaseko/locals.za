import React, { useState, useRef, useEffect } from 'react';
import './cartstyle.css';
import { useFavorites } from '../../../contexts/FavoritesContext';
import type { Product } from '../../../contexts/FavoritesContext';
import ProductCard from '../productview/productsCard';
import { useCart } from '../../../contexts/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { Analytics } from '../../../../utils/analytics';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [shareLink, setShareLink] = useState<string>('');
  const [generatingShare, setGeneratingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement | null>(null);

  // favorites functionality
  const { favorites, removeFavorite } = useFavorites();

  // cart functionality
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();

  const total = cart.reduce((sum, it) => {
    const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
    return sum + (isNaN(price) ? 0 : price * it.qty);
  }, 0);

  // Track cart abandonment
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cart.length > 0) {
        Analytics.trackCartAbandonment(cart, total);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart, total]);

  const generateShareLink = () => {
    if (!cart || cart.length === 0) return;
    setGeneratingShare(true);
    try {
      const payload = cart.map(it => ({ id: it.product.id || it.product.product_id, qty: it.qty }));
      const json = JSON.stringify({ items: payload, createdAt: new Date().toISOString() });
      // safe base64 for unicode
      const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
      const link = `${window.location.origin}/shared-cart?d=${encodeURIComponent(b64)}`;
      setShareLink(link);
      setCopied(false);
    } catch (err) {
      console.error('Failed to generate share link', err);
    } finally {
      setGeneratingShare(false);
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
      console.error('Copy failed', err);
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareLink) return;
    const message = `Please complete this cart: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCheckout = () => {
    Analytics.trackCheckoutStep(1, 'begin_checkout');
    Analytics.trackUserPath('cart', 'checkout', 'checkout_button');
    navigate('/checkout');
  };

  const handleShareCart = () => {
    generateShareLink();
    Analytics.trackUserPath('cart', 'share_cart', 'share_button');
  };

  return (
    <div className="cart-container">
      {/* CART SECTION */}
      <section className="cart-section">
        <h2>Cart</h2>
        {cart.length === 0 ? (
          <>
          <div className='empty-cart-wrapper'>
            <img width="100" height="100" src="https://img.icons8.com/bubbles/100/shopping-cart.png" alt="shopping-cart"/>
            <p>Your cart is empty.</p>
            <Link to="/" className="shop-link">Go to Store</Link>
          </div>
          </>
        ) : (
          <>
            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.product.id} className="cart-item">
                  <ProductCard product={item.product} />
                  <div className='cart-item-details'>
                    <div className='cart-item-qty'>
                      <div>Quantity: {item.qty}</div>
                    </div>
                    <div className='cart-item-actions'>
                      <button className='cart-item-action' onClick={() => decreaseQty(item.product.id)} type="button" aria-label="Decrease quantity">−</button>
                      <button className='cart-item-action' onClick={() => increaseQty(item.product.id)} type="button" aria-label="Increase quantity">+</button>
                      <button className='cart-item-action' onClick={() => removeFromCart(item.product.id)} type="button">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className='cart-summary'>
              <div className='cart-summary-total'><strong>Total:</strong> R {Number.isFinite(total) ? total.toFixed(2) : '0.00'}</div>
              <button className='checkout-btn' onClick={handleCheckout}>Checkout</button>
              <button className='clearcart-btn' onClick={() => clearCart()} type="button">Clear cart</button>
              <button className='sharecart-btn' onClick={handleShareCart} disabled={cart.length===0 || generatingShare}>
                {generatingShare ? 'Generating…' : 'Share Cart'}
              </button>

              {shareLink && (
                <div className="share-link-block">
                  <input ref={shareInputRef} readOnly value={shareLink} className="share-link-input" onFocus={(e)=> (e.target as HTMLInputElement).select()} />
                  <div className="share-link-btns">
                    <button className="share-button" onClick={copyLink}>{copied ? 'Copied' : 'Copy'}</button>
                    <button className="share-button" onClick={shareViaWhatsApp}>WhatsApp</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* FAVORITES SECTION*/}
      <section className='favorites-section'>
        <h2>Favorites</h2>
        {favorites.length === 0 ? (
          <p>No favorites yet. Tap the heart on a product to add it here.</p>
        ) : (
          <ul className="favorites-list">
            {favorites.map((p: Product) => (
              <li key={p.id} className="favorites-item">
                <ProductCard product={p} />
                <button
                  className="favorites-remove"
                  onClick={() => removeFavorite(p.id)}
                  aria-label={`Remove ${p.name} from favorites`}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CartPage;