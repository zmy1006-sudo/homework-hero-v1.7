import { useState } from 'react'
import { Bell, Check, Trash2, X, Filter } from 'lucide-react'
import { useNotifications, NotificationType } from '../context/NotificationContext'

const TYPE_CONFIG: Record<NotificationType, { emoji: string; label: string; color: string }> = {
  task_complete: { emoji: '🎉', label: '任务', color: 'bg-green-100 text-green-700' },
  points:         { emoji: '💰', label: '积分', color: 'bg-yellow-100 text-yellow-700' },
  achievement:    { emoji: '🏆', label: '成就', color: 'bg-purple-100 text-purple-700' },
  exchange:       { emoji: '🎁', label: '兑换', color: 'bg-pink-100 text-pink-700' },
  alert:          { emoji: '⚠️', label: '提醒', color: 'bg-red-100 text-red-700' },
  system:         { emoji: '🔔', label: '系统', color: 'bg-blue-100 text-blue-700' },
}

type TabType = 'all' | NotificationType

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  if (h < 24) return `${h}小时前`
  if (d < 7) return `${d}天前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

interface Props {
  onBack: () => void
}

export default function NotificationsPage({ onBack }: Props) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'task_complete', label: '任务' },
    { id: 'points', label: '积分' },
    { id: 'achievement', label: '成就' },
    { id: 'exchange', label: '兑换' },
    { id: 'alert', label: '提醒' },
  ]

  const filtered = activeTab === 'all' ? notifications : notifications.filter(n => n.type === activeTab)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#FF6B6B]" />
                <h1 className="text-lg font-bold text-gray-800">通知中心</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#FF6B6B] text-white text-xs rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#4ECDC4] hover:bg-[#4ECDC4]/10 rounded-full"
                >
                  <Check className="w-4 h-4" /> 全部已读
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" /> 清空
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-sm sticky top-[73px] z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FF6B6B] text-white shadow'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.id !== 'all' && notifications.filter(n => n.type === tab.id && !n.read).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {notifications.filter(n => n.type === tab.id && !n.read).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">暂无通知</p>
            <p className="text-gray-300 text-sm mt-1">孩子的动态会第一时间通知您</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(notif => {
              const cfg = TYPE_CONFIG[notif.type]
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={`relative rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                    notif.read
                      ? 'bg-white'
                      : 'bg-[#E3F2FD] border-2 border-[#4ECDC4]/30'
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-[#4ECDC4] rounded-full" />
                  )}

                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${notif.read ? 'bg-gray-100' : 'bg-white shadow-sm'}`}>
                      {cfg.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(notif.createdAt)}</span>
                      </div>
                      <div className="font-medium text-sm text-gray-800 leading-snug">{notif.title}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.body}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
