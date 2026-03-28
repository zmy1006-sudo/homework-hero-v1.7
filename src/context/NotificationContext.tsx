import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type NotificationType = 'task_complete' | 'points' | 'achievement' | 'exchange' | 'alert' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: number
  relatedId?: string
  childId?: string
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  getNotificationsByChild: (childId: string) => AppNotification[]
}

const NOTIFY_KEY = 'parent_notifications'
const CTX = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(NOTIFY_KEY)
    if (saved) {
      try { setNotifications(JSON.parse(saved)) } catch { setNotifications([]) }
    }
  }, [])

  const save = useCallback((list: AppNotification[]) => {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(list))
  }, [])

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const item: AppNotification = { ...n, id: Date.now().toString() + Math.random().toString(36).slice(2), createdAt: Date.now(), read: false }
    setNotifications(prev => {
      const next = [item, ...prev].slice(0, 200)
      save(next)
      return next
    })
  }, [save])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      save(next)
      return next
    })
  }, [save])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      save(next)
      return next
    })
  }, [save])

  const clearAll = useCallback(() => {
    setNotifications([])
    save([])
  }, [save])

  const getNotificationsByChild = useCallback((childId: string) => {
    return notifications.filter(n => n.childId === childId)
  }, [notifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <CTX.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll, getNotificationsByChild }}>
      {children}
    </CTX.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(CTX)
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider')
  return ctx
}
