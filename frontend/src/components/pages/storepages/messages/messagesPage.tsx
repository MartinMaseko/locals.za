import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { notificationApi, type UserNotification } from '../../../pages/commandcentre/services/adminApi';
import OrderRating from './OrderRating';
import './msgStyle.css';

const TYPE_ICON: Record<string, string> = {
  order:        '📦',
  order_status: '🔔',
  driver_alert: '🚗',
  delivery_pin: '🔐',
};

const TYPE_COLOR: Record<string, string> = {
  order:        '#4A90D9',
  order_status: '#FFB803',
  driver_alert: '#2ECC71',
  delivery_pin: '#9B59B6',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

const Messages = () => {
  const [items, setItems]         = useState<UserNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const auth     = getAuth(app);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await notificationApi.getAll();
      setItems(data);
    } catch {
      // silently ignore — user sees stale data rather than error flash
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
      if (user) fetchNotifications();
      else setLoading(false);
    });
    return unsubscribe;
  }, [auth, fetchNotifications]);

  // Auto-refresh every 30 seconds while page is visible
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchNotifications]);

  const handleOpen = async (n: UserNotification) => {
    setExpanded(prev => prev === n.id ? null : n.id);
    if (!n.read) {
      try {
        await notificationApi.markRead(n.id);
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {
        // non-critical
      }
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setItems(prev => prev.map(x => ({ ...x, read: true })));
    } catch {
      // non-critical
    }
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="msg-page">
        <div className="msg-loading">
          <div className="msg-spinner" />
          <p>Loading messages…</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="msg-page">
        <div className="msg-empty-full">
          <span className="msg-empty-icon">🔑</span>
          <h2>Sign in to see your messages</h2>
          <p>Your order updates, delivery alerts and PINs appear here.</p>
          <Link to="/login" className="msg-cta-btn">Sign In</Link>
        </div>
      </div>
    );
  }

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div className="msg-page">
      {/* ── Header ── */}
      <div className="msg-header">
        <div className="msg-header__left">
          <h1 className="msg-header__title">Messages</h1>
          {unreadCount > 0 && (
            <span className="msg-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="msg-header__actions">
          {unreadCount > 0 && (
            <button className="msg-action-btn" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <button
            className={`msg-action-btn${refreshing ? ' msg-action-btn--spinning' : ''}`}
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="msg-feed">
        {items.length === 0 ? (
          <div className="msg-empty">
            <span className="msg-empty-icon">📭</span>
            <h3>No messages yet</h3>
            <p>Order updates and delivery alerts will appear here.</p>
          </div>
        ) : (
          items.map(n => (
            <div
              key={n.id}
              className={`msg-card${n.read ? '' : ' msg-card--unread'}`}
              onClick={() => handleOpen(n)}
            >
              {/* Left accent stripe */}
              <div
                className="msg-card__stripe"
                style={{ background: TYPE_COLOR[n.type] ?? '#ccc' }}
              />

              {/* Icon */}
              <div className="msg-card__icon">
                {TYPE_ICON[n.type] ?? '💬'}
              </div>

              {/* Content */}
              <div className="msg-card__content">
                <div className="msg-card__meta">
                  <span className="msg-card__title">{n.title}</span>
                  <span className="msg-card__time">{relativeTime(n.createdAt)}</span>
                </div>

                {/* Preview or expanded body */}
                <p className={`msg-card__body${expanded === n.id ? ' msg-card__body--expanded' : ''}`}>
                  {n.body}
                </p>

                {/* Banner image (expanded only) */}
                {expanded === n.id && n.imageUrl && (
                  <div className="msg-card__img-wrap">
                    <img src={n.imageUrl} alt="" className="msg-card__img" />
                  </div>
                )}

                {/* Delivery PIN highlight */}
                {expanded === n.id && n.type === 'delivery_pin' && n.pin && (
                  <div className="msg-pin-box">
                    <span className="msg-pin-label">Your PIN</span>
                    <span className="msg-pin-value">{n.pin}</span>
                  </div>
                )}

                {/* Order rating (delivered orders) */}
                {expanded === n.id && n.includeRating && n.orderId && (
                  <div className="msg-rating-wrap">
                    <OrderRating
                      orderId={n.orderId}
                      onRatingSubmit={() => {
                        /* already expanded, no further action needed */
                      }}
                    />
                  </div>
                )}

                {/* View order link */}
                {expanded === n.id && n.orderId && (
                  <button
                    className="msg-view-btn"
                    onClick={e => { e.stopPropagation(); navigate(`/userorders?highlight=${n.orderId}`); }}
                  >
                    View Order
                  </button>
                )}
              </div>

              {/* Unread dot */}
              {!n.read && <div className="msg-card__dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Messages;
