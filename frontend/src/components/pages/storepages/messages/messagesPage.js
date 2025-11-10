import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import OrderRating from './OrderRating';
import './msgStyle.css';
const Messages = () => {
    const [activeTab, setActiveTab] = useState('inbox');
    const [isLoggedIn, setIsLoggedIn] = useState(null);
    const [messages, setMessages] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const navigate = useNavigate();
    useEffect(() => {
        // Check authentication state
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setIsLoggedIn(!!user);
            setLoading(false);
            // If user is logged in, fetch messages and notifications
            if (user) {
                // Set up real-time listeners to Firestore collections
                const inboxQuery = query(collection(db, 'users', user.uid, 'inbox'), orderBy('createdAt', 'desc'));
                const notifQuery = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
                // Listen for inbox messages
                const unsubInbox = onSnapshot(inboxQuery, (snapshot) => {
                    const inboxMessages = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        inboxMessages.push({
                            id: doc.id,
                            title: data.title || 'Message',
                            body: data.body || '',
                            imageUrl: data.imageUrl,
                            read: data.read || false,
                            createdAt: data.createdAt,
                            from: data.from,
                            fromRole: data.fromRole,
                            type: data.type,
                            orderId: data.orderId,
                            status: data.status,
                            includeRating: data.includeRating === true
                        });
                    });
                    setMessages(inboxMessages);
                }, (error) => {
                    console.error("Error fetching inbox:", error);
                });
                // Listen for notifications
                const unsubNotif = onSnapshot(notifQuery, (snapshot) => {
                    const notificationItems = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        notificationItems.push({
                            id: doc.id,
                            title: data.title || 'Notification',
                            body: data.body || '',
                            imageUrl: data.imageUrl,
                            read: data.read || false,
                            createdAt: data.createdAt,
                            from: data.from,
                            type: data.type
                        });
                    });
                    setNotifications(notificationItems);
                }, (error) => {
                    console.error("Error fetching notifications:", error);
                });
                return () => {
                    unsubInbox();
                    unsubNotif();
                };
            }
        });
        return () => unsubscribe();
    }, [auth, db]);
    // Mark a message as read
    const markAsRead = async (collectionName, messageId) => {
        if (!auth.currentUser)
            return;
        try {
            const messageRef = doc(db, 'users', auth.currentUser.uid, collectionName, messageId);
            await updateDoc(messageRef, { read: true });
        }
        catch (error) {
            console.error("Error marking message as read:", error);
        }
    };
    // Format date for display
    const formatDate = (timestamp) => {
        if (!timestamp)
            return '';
        try {
            // Handle Firebase Timestamp
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString();
        }
        catch (e) {
            return '';
        }
    };
    const renderMessage = (message) => {
        return (_jsxs("div", { className: `message-item ${message.read ? 'read' : 'unread'}`, children: [_jsxs("div", { className: "message-header", children: [_jsx("span", { className: "message-title", children: message.title }), _jsx("span", { className: "message-date", children: formatDate(message.createdAt) })] }), _jsxs("div", { className: "message-body", children: [message.imageUrl && (_jsx("img", { src: message.imageUrl, alt: "", className: "message-image" })), _jsx("p", { children: message.body }), message.type === 'order_status' &&
                            message.status === 'completed' && (_jsxs("div", { className: "rating-section", children: [_jsx("h4", { children: "Order Completed" }), message.orderId && (_jsx(OrderRating, { orderId: message.orderId, onRatingSubmit: (rating, comment) => {
                                        console.log(`Order ${message.orderId} rated: ${rating}, comment: ${comment}`);
                                        markAsRead('inbox', message.id);
                                    } }))] })), message.type === 'order' && message.orderId && (_jsx("button", { className: "view-order-btn", onClick: () => navigate(`/userorders?highlight=${message.orderId}`), children: "View Order" }))] })] }, message.id));
    };
    if (loading) {
        return (_jsx("div", { className: "messages-page", children: _jsxs("div", { className: "messages-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading..." })] }) }));
    }
    if (isLoggedIn === false) {
        return (_jsx("div", { className: "messages-page", children: _jsxs("div", { className: "messages-login-prompt", children: [_jsx("img", { width: "100", height: "100", src: "https://img.icons8.com/bubbles/100/man-with-key.png", alt: "man-with-key" }), _jsx("h2", { children: "Login Required" }), _jsx("p", { children: "You need to be logged in to view your messages and notifications" }), _jsx(Link, { to: "/login", className: "login-button", children: "Login Now" })] }) }));
    }
    return (_jsxs("div", { className: "messages-page", children: [_jsxs("div", { className: "messages-header", children: [_jsxs("button", { className: `tab-button ${activeTab === 'inbox' ? 'active' : ''}`, onClick: () => setActiveTab('inbox'), children: ["Inbox ", messages.filter(m => !m.read).length > 0 &&
                                _jsx("span", { className: "unread-badge", children: messages.filter(m => !m.read).length })] }), _jsxs("button", { className: `tab-button ${activeTab === 'notifications' ? 'active' : ''}`, onClick: () => setActiveTab('notifications'), children: ["Notifications ", notifications.filter(n => !n.read).length > 0 &&
                                _jsx("span", { className: "unread-badge", children: notifications.filter(n => !n.read).length })] })] }), _jsxs("div", { className: "messages-content", children: [activeTab === 'inbox' && (_jsx("div", { className: "inbox-container", children: messages.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("img", { width: "50", height: "50", src: "https://img.icons8.com/ios-filled/50/ffb803/inbox-1--v1.png", alt: "inbox-empty" }), _jsx("h3", { children: "No messages" }), _jsx("p", { children: "You don't have any messages in your inbox" })] })) : (_jsx("div", { className: "messages-list", children: messages.map((message) => (renderMessage(message))) })) })), activeTab === 'notifications' && (_jsx("div", { className: "notifications-container", children: notifications.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("img", { width: "50", height: "50", src: "https://img.icons8.com/ios/50/ffb803/alarms.png", alt: "notifications-empty" }), _jsx("h3", { children: "No notifications" }), _jsx("p", { children: "You don't have any notifications" })] })) : (_jsx("div", { className: "notifications-list", children: notifications.map((notification) => (_jsxs("div", { className: `notification-item ${!notification.read ? 'unread' : ''}`, onClick: () => markAsRead('notifications', notification.id), children: [_jsx("div", { className: "notification-date", children: formatDate(notification.createdAt) }), _jsx("div", { className: "notification-title", children: notification.title }), notification.imageUrl && (_jsx("div", { className: "notification-image-container", children: _jsx("img", { src: notification.imageUrl, alt: "Notification image", className: "notification-image" }) })), _jsx("div", { className: "notification-body", children: notification.body }), !notification.read && (_jsx("div", { className: "unread-indicator" }))] }, notification.id))) })) }))] })] }));
};
export default Messages;
