import React from 'react';
import './productstyle.css';

type Product = {
  id: string;
  name: string;
  price?: number | string;
  image_url?: string;
};

type Props = {
  product: Product;
  onClick: (product: Product) => void;
};

const ProductCard: React.FC<Props> = ({ product, onClick }) => {
  return (
    <button
      className="product-card"
      onClick={() => onClick(product)}
      aria-label={`View ${product.name}`}
    >
      {product.image_url && <img src={product.image_url} alt={product.name} className="product-thumb" />}
      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>
        <div className="product-card-price">R {product.price}</div>
      </div>
    </button>
  );
};

export default ProductCard;