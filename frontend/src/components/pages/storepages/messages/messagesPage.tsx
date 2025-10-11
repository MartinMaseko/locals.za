import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import OrderRating from './OrderRating';
import './msgStyle.css';

interface MessageItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  createdAt: any;
  from?: string;
  fromRole?: string;
  type?: string;
  orderId?: string;
  status?: string;
  includeRating?: boolean;
}

const Messages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'notifications'>('inbox');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [notifications, setNotifications] = useState<MessageItem[]>([]);
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
        const inboxQuery = query(
          collection(db, 'users', user.uid, 'inbox'),
          orderBy('createdAt', 'desc')
        );
        
        const notifQuery = query(
          collection(db, 'users', user.uid, 'notifications'),
          orderBy('createdAt', 'desc')
        );

        // Listen for inbox messages
        const unsubInbox = onSnapshot(inboxQuery, (snapshot) => {
          const inboxMessages: MessageItem[] = [];
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
          const notificationItems: MessageItem[] = [];
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
  const markAsRead = async (collectionName: 'inbox' | 'notifications', messageId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const messageRef = doc(db, 'users', auth.currentUser.uid, collectionName, messageId);
      await updateDoc(messageRef, { read: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Format date for display
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      // Handle Firebase Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return '';
    }
  };

  const renderMessage = (message: MessageItem) => {
    return (
      <div key={message.id} className={`message-item ${message.read ? 'read' : 'unread'}`}>
        <div className="message-header">
          <span className="message-title">{message.title}</span>
          <span className="message-date">{formatDate(message.createdAt)}</span>
        </div>
        <div className="message-body">
          {message.imageUrl && (
            <img src={message.imageUrl} alt="" className="message-image" />
          )}
          <p>{message.body}</p>
          
          {/* For completed orders */}
          {message.type === 'order_status' && 
           message.status === 'completed' && (
            <div className="rating-section">
              <h4>Order Completed</h4>
              {message.orderId && (
                <OrderRating 
                  orderId={message.orderId} 
                  onRatingSubmit={(rating, comment) => {
                    console.log(`Order ${message.orderId} rated: ${rating}, comment: ${comment}`);
                    markAsRead('inbox', message.id);
                  }}
                />
              )}
            </div>
          )}
          
          {/* For order links */}
          {message.type === 'order' && message.orderId && (
            <button 
              className="view-order-btn"
              onClick={() => navigate(`/userorders?highlight=${message.orderId}`)}
            >
              View Order
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="messages-page">
        <div className="messages-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn === false) {
    return (
      <div className="messages-page">
        <div className="messages-login-prompt">
          <img width="100" height="100" src="https://img.icons8.com/bubbles/100/man-with-key.png" alt="man-with-key"/>
          <h2>Login Required</h2>
          <p>You need to be logged in to view your messages and notifications</p>
          <Link to="/login" className="login-button">Login Now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-header">
        <button 
          className={`tab-button ${activeTab === 'inbox' ? 'active' : ''}`} 
          onClick={() => setActiveTab('inbox')}
        >
          Inbox {messages.filter(m => !m.read).length > 0 && 
            <span className="unread-badge">{messages.filter(m => !m.read).length}</span>
          }
        </button>
        <button 
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications {notifications.filter(n => !n.read).length > 0 && 
            <span className="unread-badge">{notifications.filter(n => !n.read).length}</span>
          }
        </button>
      </div>

      <div className="messages-content">
        {activeTab === 'inbox' && (
          <div className="inbox-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <img width="50" height="50" src="https://img.icons8.com/ios-filled/50/ffb803/inbox-1--v1.png" alt="inbox-empty"/>
                <h3>No messages</h3>
                <p>You don't have any messages in your inbox</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message) => (
                  renderMessage(message)
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-container">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <img width="50" height="50" src="https://img.icons8.com/ios/50/ffb803/alarms.png" alt="notifications-empty"/>
                <h3>No notifications</h3>
                <p>You don't have any notifications</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => markAsRead('notifications', notification.id)}
                  >
                    <div className="notification-date">{formatDate(notification.createdAt)}</div>
                    <div className="notification-title">{notification.title}</div>
                    {notification.imageUrl && (
                      <div className="notification-image-container">
                        <img 
                          src={notification.imageUrl} 
                          alt="Notification image" 
                          className="notification-image" 
                        />
                      </div>
                    )}
                    <div className="notification-body">{notification.body}</div>
                    {!notification.read && (
                      <div className="unread-indicator"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;