import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import './msgStyle.css';
const API_URL = import.meta.env.VITE_API_URL;
const OrderRating = ({ orderId, onRatingSubmit }) => {
    const [rating, setRating] = useState(null);
    const [comment, setComment] = useState('');
    const [hoveredStar, setHoveredStar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
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
                const { data } = await axios.get(`${API_URL}/api/api/orders/${orderId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (data.rating) {
                    setRating(data.rating);
                    setComment(data.ratingComment || '');
                    setSubmitted(true);
                }
            }
            catch (err) {
                // Just ignore errors - we'll assume no rating
                console.log('Error checking existing rating:', err);
            }
        };
        checkExistingRating();
    }, [orderId, auth]);
    const handleSubmitRating = async () => {
        if (rating === null)
            return;
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
            await axios.post(`${API_URL}/api/api/orders/${orderId}/rate`, {
                rating: rating,
                comment: comment
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setSubmitted(true);
            if (onRatingSubmit)
                onRatingSubmit(rating, comment);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to submit rating');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (submitted) {
        return (_jsxs("div", { className: "order-rating-container submitted", children: [_jsx("h4", { children: "Thank You For Your Feedback!" }), _jsx("div", { className: "stars-display", children: [1, 2, 3, 4, 5].map(star => (_jsx("span", { className: `star ${star <= (rating || 0) ? 'filled' : ''}`, children: "\u2605" }, star))) }), comment && _jsx("p", { className: "submitted-comment", children: comment })] }));
    }
    return (_jsxs("div", { className: "order-rating-container", children: [_jsx("h4", { children: "Rate Your Experience" }), _jsx("div", { className: "stars-container", children: [1, 2, 3, 4, 5].map(star => (_jsx("span", { className: `star ${star <= (hoveredStar || rating || 0) ? 'filled' : ''}`, onMouseEnter: () => setHoveredStar(star), onMouseLeave: () => setHoveredStar(null), onClick: () => setRating(star), children: "\u2605" }, star))) }), _jsx("textarea", { className: "rating-comment", placeholder: "Add a comment (optional)", value: comment, onChange: (e) => setComment(e.target.value), rows: 3 }), _jsx("button", { className: "submit-rating", onClick: handleSubmitRating, disabled: rating === null || isSubmitting, children: isSubmitting ? 'Submitting...' : 'Submit Rating' }), error && _jsx("div", { className: "rating-error", children: error })] }));
};
export default OrderRating;
