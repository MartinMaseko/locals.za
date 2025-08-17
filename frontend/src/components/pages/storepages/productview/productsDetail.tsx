import React from 'react';
import './productstyle.css';

type Product = {
  id: string;
  name: string;
  price?: number | string;
  description?: string;
  brand?: string;
  category?: string;
  image_url?: string;
};

type Props = {
  product: Product | null;
  onClose: () => void;
};

const ProductDetailModal: React.FC<Props> = ({ product, onClose }) => {
  if (!product) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="product-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="product-modal-content">
          {product.image_url && <img src={product.image_url} alt={product.name} className="product-modal-image" />}
          <div className="product-modal-info">
            <h2 className="product-modal-title">{product.name}</h2>
            <p className="product-modal-price">R {product.price}</p>
            {product.brand && <p><strong>Brand:</strong> {product.brand}</p>}
            {product.category && <p><strong>Category:</strong> {product.category}</p>}
            {product.description && <p className="product-modal-desc">{product.description}</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetailModal;