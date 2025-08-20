import React from 'react';
import './cartstyle.css';
import { useFavorites } from '../../../contexts/FavoritesContext';
import type { Product } from '../../../contexts/FavoritesContext';
import ProductCard from '../productview/productsCard';
import { useCart } from '../../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  // favorites functionality
  const { favorites, removeFavorite } = useFavorites();

  // cart functionality
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();

  const total = cart.reduce((sum, it) => {
    const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
    return sum + (isNaN(price) ? 0 : price * it.qty);
  }, 0);

  return (
    <div className="cart-container">
      {/* CART SECTION */}
      <section className="cart-section">
        <h2>Cart</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
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
              <button className='checkout-btn' onClick={() => navigate('/checkout')}>Checkout</button>
              <button className='clearcart-btn' onClick={() => clearCart()} type="button">Clear cart</button>
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