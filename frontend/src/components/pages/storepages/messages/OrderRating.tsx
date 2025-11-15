import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import './msgStyle.css';

const API_URL = import.meta.env.VITE_API_URL;

interface OrderRatingProps {
  orderId: string;
  onRatingSubmit?: (rating: number, comment: string) => void;
}

const OrderRating: React.FC<OrderRatingProps> = ({ orderId, onRatingSubmit }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth(app);
  
  // Check if this order already has a rating
  useEffect(() => {
    const checkExistingRating = async () => {
      try {
        // Get current user's token
        const user = auth.currentUser;
        if (!user) {
          console.log('User not authenticated');
          return;
        }
        
        const token = await user.getIdToken();
        
        interface OrderData {
          rating?: number;
          ratingComment?: string;
        }

        const { data } = await axios.get<OrderData>(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (data.rating) {
          setRating(data.rating);
          setComment(data.ratingComment || '');
          setSubmitted(true);
        }
      } catch (err) {
        // Just ignore errors - we'll assume no rating
        console.log('Error checking existing rating:', err);
      }
    };
    
    checkExistingRating();
  }, [orderId, auth]);
  
  const handleSubmitRating = async () => {
    if (rating === null) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get current user's token
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to submit a rating');
        setIsSubmitting(false);
        return;
      }
      
      const token = await user.getIdToken();

      await axios.post(`${API_URL}/api/orders/${orderId}/rate`, {
        rating: rating,
        comment: comment
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSubmitted(true);
      if (onRatingSubmit) onRatingSubmit(rating, comment);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (submitted) {
    return (
      <div className="order-rating-container submitted">
        <h4>Thank You For Your Feedback!</h4>
        <div className="stars-display">
          {[1, 2, 3, 4, 5].map(star => (
            <span 
              key={star} 
              className={`star ${star <= (rating || 0) ? 'filled' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        {comment && <p className="submitted-comment">{comment}</p>}
      </div>
    );
  }
  
  return (
    <div className="order-rating-container">
      <h4>Rate Your Experience</h4>
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map(star => (
          <span 
            key={star} 
            className={`star ${star <= (hoveredStar || rating || 0) ? 'filled' : ''}`}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => setRating(star)}
          >
            ★
          </span>
        ))}
      </div>
      <textarea 
        className="rating-comment" 
        placeholder="Add a comment (optional)" 
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <button 
        className="submit-rating" 
        onClick={handleSubmitRating} 
        disabled={rating === null || isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
      </button>
      {error && <div className="rating-error">{error}</div>}
    </div>
  );
};

export default OrderRating;