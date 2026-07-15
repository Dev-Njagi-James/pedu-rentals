'use client'
import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import styles from '../css/accountSettings.module.css'

const supabase = createBrowserSupabaseClient()

const POSITIVE_TYPES = ['new_account', 'new_listing', 'slots_purchase']

function isPositive(type) {
  return POSITIVE_TYPES.includes(type)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByThreeDays(notifications) {
  const groups = {}
  notifications.forEach(n => {
    const date = new Date(n.created_at)
    const bucket = Math.floor(date.getTime() / (3 * 24 * 60 * 60 * 1000))
    if (!groups[bucket]) groups[bucket] = []
    groups[bucket].push(n)
  })
  return Object.entries(groups)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, items]) => items)
}

function bucketLabel(items) {
  const oldest = new Date(items[items.length - 1].created_at)
  const newest = new Date(items[0].created_at)
  const fmt = d => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  if (fmt(oldest) === fmt(newest)) return fmt(newest)
  return `${fmt(oldest)} — ${fmt(newest)}`
}

function GreenTick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function RedX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function NotificationRow({ notification, onMarkRead }) {
  const { type, title, body, read } = notification
  const positive = isPositive(type)

  const renderBody = () => {
    if (type === 'new_account' || type === 'account_deleted') {
      return (
        <div className={styles.notifBody}>
          <span><strong>Username:</strong> {body.username}</span>
          <span><strong>Organization:</strong> {body.organization}</span>
          <span><strong>Phone:</strong> {body.phone}</span>
          <span><strong>Date:</strong> {formatDate(body.date)}</span>
        </div>
      )
    }
    if (type === 'new_listing' || type === 'listing_deleted') {
      return (
        <div className={styles.notifBody}>
          <span><strong>Property:</strong> {body.property_name}</span>
          <span><strong>Price:</strong> KSH {Number(body.price).toLocaleString()}</span>
          <span><strong>Date:</strong> {formatDate(body.date)}</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`${styles.notifRow} ${read ? styles.notifRowRead : styles.notifRowUnread}`}>
      <div className={styles.notifRowMain}>
        <div className={styles.notifRowContent}>
          <span className={styles.notifTitle}>{title}</span>
          {renderBody()}
        </div>
        <div className={styles.notifRowEnd}>
          {positive ? <GreenTick /> : <RedX />}
          {!read && (
            <button
              className={styles.notifMarkBtn}
              onClick={() => onMarkRead([notification.id])}
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupedBanner({ items, onMarkRead }) {
  const [expanded, setExpanded] = useState(false)
  const unread = items.filter(n => !n.read).length
  const ids = items.map(n => n.id)

  return (
    <div className={styles.notifGroup}>
      <div className={styles.notifGroupHeader}>
        <div className={styles.notifGroupMeta}>
          <span className={styles.notifGroupLabel}>{bucketLabel(items)}</span>
          <span className={styles.notifGroupCount}>
            {items.length} notification{items.length !== 1 ? 's' : ''}
            {unread > 0 && ` · ${unread} unread`}
          </span>
        </div>
        <div className={styles.notifGroupActions}>
          {unread > 0 && (
            <button className={styles.notifMarkBtn} onClick={() => onMarkRead(ids)}>
              Mark all read
            </button>
          )}
          <button
            className={styles.notifExpandBtn}
            onClick={() => setExpanded(p => !p)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {expanded && (
        <div className={styles.notifGroupItems}>
          {items.map(n => (
            <NotificationRow key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── History modal ─────────────────────────────────────────────

function HistoryModal({ notifications, onClose }) {
  const groups = groupByThreeDays(notifications)

  return (
    <div className={styles.notifModalOverlay} onClick={onClose}>
      <div className={styles.notifModal} onClick={e => e.stopPropagation()}>
        <div className={styles.notifModalHeader}>
          <span className={styles.notifModalTitle}>Notification History</span>
          <button className={styles.notifModalClose} onClick={onClose}>&#x2715;</button>
        </div>
        <div className={styles.notifModalBody}>
          {notifications.length === 0 && (
            <p className={styles.notifEmpty}>No read notifications yet</p>
          )}
          {groups.map((items, i) => (
            <div key={i} className={styles.notifHistoryGroup}>
              <div className={styles.notifDivider}>{bucketLabel(items)}</div>
              {items.map(n => (
                <NotificationRow key={n.id} notification={n} onMarkRead={() => {}} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)
  const unreadCount = unreadNotifications.length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/adminRo/notifications')
      const json = await res.json()
      if (json.data) setNotifications(json.data)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { fetchNotifications() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const handleMarkRead = useCallback(async (ids) => {
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
    )
    try {
      await fetch('/api/adminRo/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } catch (err) {
      console.error('Failed to mark read:', err)
      fetchNotifications()
    }
  }, [fetchNotifications])

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await fetch('/api/adminRo/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch (err) {
      console.error('Failed to mark all read:', err)
      fetchNotifications()
    }
  }, [fetchNotifications])

  const showGrouped = unreadCount > 5
  const groups = showGrouped ? groupByThreeDays(unreadNotifications) : []

  return (
    <>
      <div className={styles.adminSection}>
        <div className={styles.adminSectionHeader}>
          <span className={styles.adminSectionTitle}>
            Notifications
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>{unreadCount}</span>
            )}
          </span>
          <div className={styles.adminHeaderActions}>
            {readNotifications.length > 0 && (
              <button className={styles.adminEditBtn} onClick={() => setShowHistory(true)}>
                View history
              </button>
            )}
            {unreadCount > 0 && !collapsed && (
              <button className={styles.adminEditBtn} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            <button
              className={styles.adminEditBtn}
              onClick={() => setCollapsed(p => !p)}
            >
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className={styles.adminSectionBody}>
            {loading && (
              <p className={styles.adminLoading}>Loading notifications…</p>
            )}

            {!loading && unreadCount === 0 && (
              <p className={styles.notifEmpty}>No new notifications yet</p>
            )}

            {!loading && unreadCount > 0 && (
              <div className={styles.notifList}>
                {showGrouped ? (
                  groups.map((items, i) => (
                    <GroupedBanner key={i} items={items} onMarkRead={handleMarkRead} />
                  ))
                ) : (
                  unreadNotifications.map(n => (
                    <NotificationRow key={n.id} notification={n} onMarkRead={handleMarkRead} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showHistory && (
        <HistoryModal
          notifications={readNotifications}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  )
}