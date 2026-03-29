import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, BookOpen, Trophy, Play, Plus, Trash2, Star, LogOut, Gift, History, Award, Check, Edit2, Pause, RotateCcw, X, ChevronRight, Users, Clock, Calendar, TrendingUp, User, UserPlus, BarChart3, BookMarked, Timer, Bell, Lock, KeyRound } from 'lucide-react'
import { getCurrentUser, logout, UserInfo, registerAccount, verifyAccount } from './lib/auth'
import PomodoroTimerPage from './PomodoroTimerPage'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import NotificationsPage from './pages/NotificationsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import { registerParentAccount } from './lib/parentAccounts'
import './App.css'

// Types
interface HomeworkTask {
  id: number
  name: string
  subject: string
  completed: boolean
  cancelled: boolean
  pomodorosCompleted: number
  plannedDuration: number
  completedAt?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

interface Reward { id: number; name: string; points: number; icon: string; isCustom: boolean }
interface Achievement { id: string; name: string; description: string; icon: string; condition: (stats: UserStats) => boolean; category: string }
interface Record { id: number; type: string; title: string; detail: string; points?: number; timestamp: string }
interface UserStats { totalPomodoros: number; totalPoints: number; completedTasks: number; currentStreak: number; totalRewardsRedeemed: number; earlyCompletions: number; overtimeCompletions: number; perfectDays: number; longestStreak: number }
interface Distraction { id: number; type: string; timestamp: number }

interface Child {
  id: string
  nickname: string
  phone: string
  grade?: string
  stars: number
  tasks: HomeworkTask[]
  stats: UserStats
}

interface ClassInfo {
  id: string
  name: string
  code: string
  students: string[]
}

const CHILDREN_KEY = 'homework-hero-children'
const CLASS_KEY = 'homework-hero-class'
const ACCOUNTS_KEY = 'homework-hero-accounts'

/** 预设科目（自定义科目运行时动态生成） */
const PRESET_SUBJECTS = [
  { name: '语文', emoji: '📝', color: 'bg-yellow-100 text-yellow-700' },
  { name: '数学', emoji: '🔢', color: 'bg-blue-100 text-blue-700' },
  { name: '英语', emoji: '📚', color: 'bg-purple-100 text-purple-700' },
  { name: '科学', emoji: '🔬', color: 'bg-green-100 text-green-700' },
  { name: '历史', emoji: '🏛️', color: 'bg-orange-100 text-orange-700' },
]

function getSubjectStyle(subjectName: string) {
  const preset = PRESET_SUBJECTS.find(s => s.name === subjectName)
  if (preset) return preset
  // 自定义科目：按名字生成固定颜色
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-cyan-100 text-cyan-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700']
  const idx = [...subjectName].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  const emojis = ['📖', '🎯', '💡', '🎨', '🔭', '🌏', '📐']
  const emojiIdx = [...subjectName].reduce((acc, c) => acc + c.charCodeAt(0), 0) % emojis.length
  return { name: subjectName, emoji: emojis[emojiIdx], color: colors[idx] }
}

const SUBJECTS = PRESET_SUBJECTS

const DISTRACTIONS = [
  { type: '看手机', emoji: '📱' }, { type: '看电视', emoji: '📺' }, { type: '吃东西', emoji: '🍪' },
  { type: '聊天', emoji: '💬' }, { type: '发呆', emoji: '😴' }, { type: '玩玩具', emoji: '🧸' },
  { type: '听音乐', emoji: '🎵' }, { type: '其他', emoji: '🤔' }
]

const RANKS = [
  { name: '🌱初心学者', minPoints: 0, maxPoints: 100, color: '#A8E6CF' },
  { name: '📚勤学少年', minPoints: 100, maxPoints: 500, color: '#FFE66D' },
  { name: '⭐学霸之星', minPoints: 500, maxPoints: 1500, color: '#FFB347' },
  { name: '🎓学神降临', minPoints: 1500, maxPoints: 5000, color: '#FF6B6B' },
  { name: '👑传奇学神', minPoints: 5000, maxPoints: Infinity, color: '#9B59B6' }
]

const DEFAULT_REWARDS: Reward[] = [
  { id: 1, name: '看动画片30分钟', points: 50, icon: '📺', isCustom: false },
  { id: 2, name: '玩电子游戏1小时', points: 80, icon: '🎮', isCustom: false },
  { id: 3, name: '买玩具', points: 200, icon: '🧸', isCustom: false },
  { id: 4, name: '去游乐场', points: 300, icon: '🎢', isCustom: false },
  { id: 5, name: '吃冰淇淋', points: 30, icon: '🍦', isCustom: false },
  { id: 6, name: '周末外出', points: 150, icon: '🌳', isCustom: false }
]

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_task', name: '初战告捷', description: '完成第一个作业任务', icon: '🌟', condition: (s) => s.completedTasks >= 1, category: 'task' },
  { id: 'pomodoro_1', name: '番茄新手', description: '完成1个番茄钟', icon: '🍅', condition: (s) => s.totalPomodoros >= 1, category: 'pomodoro' },
  { id: 'pomodoro_10', name: '番茄达人', description: '完成10个番茄钟', icon: '🥫', condition: (s) => s.totalPomodoros >= 10, category: 'pomodoro' },
  { id: 'pomodoro_50', name: '番茄大师', description: '完成50个番茄钟', icon: '🏆', condition: (s) => s.totalPomodoros >= 50, category: 'pomodoro' },
  { id: 'points_100', name: '百分英雄', description: '累计获得100积分', icon: '💯', condition: (s) => s.totalPoints >= 100, category: 'points' },
  { id: 'points_500', name: '五百达人', description: '累计获得500积分', icon: '💰', condition: (s) => s.totalPoints >= 500, category: 'points' },
  { id: 'points_2000', name: '两千巨星', description: '累计获得2000积分', icon: '🌈', condition: (s) => s.totalPoints >= 2000, category: 'points' },
  { id: 'early_bird', name: '先驱者', description: '提前完成5次任务', icon: '🚀', condition: (s) => s.earlyCompletions >= 5, category: 'task' },
  { id: 'streak_3', name: '三天连续', description: '连续3天完成任务', icon: '🔥', condition: (s) => s.currentStreak >= 3, category: 'streak' },
  { id: 'streak_7', name: '一周打卡', description: '连续7天完成任务', icon: '💪', condition: (s) => s.currentStreak >= 7, category: 'streak' },
  { id: 'streak_30', name: '月度坚持', description: '连续30天完成任务', icon: '👑', condition: (s) => s.currentStreak >= 30, category: 'streak' },
  { id: 'reward_1', name: '小有所获', description: '兑换第一个奖励', icon: '🎁', condition: (s) => s.totalRewardsRedeemed >= 1, category: 'reward' },
  { id: 'reward_5', name: '收获满满', description: '兑换5个奖励', icon: '🎊', condition: (s) => s.totalRewardsRedeemed >= 5, category: 'reward' },
  { id: 'task_10', name: '小试牛刀', description: '累计完成10个任务', icon: '📚', condition: (s) => s.completedTasks >= 10, category: 'task' }
]

const TASKS_KEY = 'homework-hero-tasks'
const STARS_KEY = 'homework-hero-stars'
const STATS_KEY = 'homework-hero-stats'
const RECORDS_KEY = 'homework-hero-records'
const ACHIEVEMENTS_KEY = 'homework-hero-achievements'
const REWARDS_KEY = 'homework-hero-rewards'

function getCurrentRank(points: number): typeof RANKS[0] { return RANKS.find(r => points >= r.minPoints && points < r.maxPoints) || RANKS[0] }

function LoginPage({ onLogin, onForgot }: { onLogin: (user: UserInfo) => void; onForgot: () => void }) {
  const [mode, setMode] = useState<'login' | 'register-role' | 'register-form'>('login')
  const [role, setRole] = useState<'child' | 'parent' | 'teacher'>('child')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState('')
  const [childName, setChildName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  /** 快速测试登录：Cindy 账号 */
  const handleQuickTest = () => {
    // Cindy 默认已注册，账号: Cindy，密码: cindy123
    registerAccount('Cindy', 'cindy123')  // 确保存在
    const user: UserInfo = {
      id: 'cindy-test',
      account: 'Cindy',
      nickname: 'Cindy',
      role: 'child',
    }
    onLogin(user)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const account = phone.trim()
    if (!account) { setLoginError('请输入手机号'); return }
    if (!password) { setLoginError('请输入密码'); return }
    if (!verifyAccount(account, password)) { setLoginError('账号或密码错误'); return }
    const user: UserInfo = {
      id: Date.now().toString(),
      account,
      nickname: role === 'child' ? nickname : role === 'parent' ? `${childName}的家长` : '老师',
      role, phone, grade: role === 'child' ? grade : undefined,
    }
    onLogin(user)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const account = phone.trim()
    if (!account) { setLoginError('请输入手机号'); return }
    if (!password) { setLoginError('请设置密码'); return }
    if (password.length < 4) { setLoginError('密码至少4位'); return }
    if (password !== confirmPassword) { setLoginError('两次密码不一致'); return }
    if (role === 'child' && !nickname.trim()) { setLoginError('请输入昵称'); return }
    if (role === 'parent' && !childName.trim()) { setLoginError('请输入孩子昵称'); return }
    if (role === 'teacher' && !classCode.trim()) { setLoginError('请输入班级码'); return }
    const result = registerAccount(account, password)
    if (!result.success) { setLoginError(result.error || '注册失败'); return }
    const user: UserInfo = {
      id: Date.now().toString(),
      account,
      nickname: role === 'child' ? nickname : role === 'parent' ? `${childName}的家长` : '老师',
      role, phone, grade: role === 'child' ? grade : undefined,
      classCode: role === 'teacher' ? classCode : undefined,
      createdAt: Date.now(),
    }
    onLogin(user)
  }

  const roles = [
    { id: 'child' as const, icon: '🎒', title: '学生', desc: '做作业、赚积分、兑奖励' },
    { id: 'parent' as const, icon: '👨‍👩‍👧', title: '家长', desc: '查看进度、管理奖励' },
    { id: 'teacher' as const, icon: '👨‍🏫', title: '老师', desc: '发布作业、班级管理' },
  ]

  const GRADE_OPTIONS = ['一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三']

  /* ── 角色选择（注册第一步）── */
  if (mode === 'register-role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
          <button onClick={() => setMode('login')} className="flex items-center gap-1 text-gray-500 mb-4 text-sm">
            <ChevronRight className="w-4 h-4 rotate-180"/> 返回登录
          </button>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-2xl">🦸</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">选择您的身份</h2>
            <p className="text-xs text-gray-400 mt-1">注册新账户</p>
          </div>
          <div className="space-y-3">
            {roles.map(r => (
              <button key={r.id}
                onClick={() => { setRole(r.id); setMode('register-form') }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-[#FF6B6B] hover:bg-red-50/50 transition-all">
                <span className="text-3xl">{r.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-500">{r.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── 注册表单（注册第二步）── */
  if (mode === 'register-form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
          <button onClick={() => setMode('register-role')} className="flex items-center gap-1 text-gray-500 mb-4 text-sm">
            <ChevronRight className="w-4 h-4 rotate-180"/> 返回选择身份
          </button>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
              <span className="text-2xl">{roles.find(r => r.id === role)?.icon}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">{roles.find(r => r.id === role)?.title}注册</h2>
          </div>
          <form onSubmit={handleRegister} className="space-y-3">
            {loginError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">{loginError}</div>}

            {/* 手机号 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">手机号（作为账号）<span className="text-red-400">*</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号"
                className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
            </div>

            {/* 学生额外字段 */}
            {role === 'child' && <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">昵称 <span className="text-red-400">*</span></label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="给自己取个昵称"
                  className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">年级</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm">
                  <option value="">选择年级</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </>}

            {/* 家长额外字段 */}
            {role === 'parent' && <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">孩子昵称 <span className="text-red-400">*</span></label>
                <input type="text" value={childName} onChange={e => setChildName(e.target.value)} placeholder="请输入孩子昵称"
                  className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
              </div>
            </>}

            {/* 老师额外字段 */}
            {role === 'teacher' && <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">班级码 <span className="text-red-400">*</span></label>
                <input type="text" value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="请输入班级码"
                  className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
              </div>
            </>}

            {/* 密码 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">设置密码 <span className="text-red-400">*</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少4位"
                className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">确认密码 <span className="text-red-400">*</span></label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入密码"
                className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform">
              完成注册 ✨
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* ── 登录页（默认）── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-xl">🦸</span>
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">
            作业闯关小英雄
          </h1>
          <p className="text-gray-500 mt-2">让学习更有趣</p>
        </div>

        {/* 快速测试入口 */}
        <button onClick={handleQuickTest}
          className="w-full py-3 px-4 mb-4 bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-white rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
          🚀 直接进入测试（Cindy账号）
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-xs text-gray-400">或使用账户登录</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="space-y-3">
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">{loginError}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">手机号</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号"
              className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码"
              className="w-full px-3 py-2.5 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-sm"/>
          </div>

          <button type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform">
            登录 ✨
          </button>
        </form>

        <div className="mt-3 text-center">
          <button onClick={() => { setMode('register-role'); setLoginError(''); setPassword(''); }}
            className="text-sm text-[#4ECDC4] hover:text-[#3dbdb5]">
            没有账号？<span className="font-bold">立即注册</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentHomePage({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [currentSection, setCurrentSection] = useState<'home' | 'points' | 'achievements' | 'records' | 'pomodoro'>('home')
  const [tasks, setTasks] = useState<HomeworkTask[]>([])
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskSubject, setNewTaskSubject] = useState('数学')
  const [customSubjectName, setCustomSubjectName] = useState('')
  const [showCustomSubject, setShowCustomSubject] = useState(false)
  const [newTaskDuration, setNewTaskDuration] = useState(25)
  const [showAddTask, setShowAddTask] = useState(false)
  const [stars, setStars] = useState(0)
  const [userStats, setUserStats] = useState<UserStats>({ totalPomodoros: 0, totalPoints: 0, completedTasks: 0, currentStreak: 0, totalRewardsRedeemed: 0, earlyCompletions: 0, overtimeCompletions: 0, perfectDays: 0, longestStreak: 0 })
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS)
  const [showAddReward, setShowAddReward] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardPoints, setNewRewardPoints] = useState(50)
  const [newRewardIcon, setNewRewardIcon] = useState('🎁')
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [activeTimer, setActiveTimer] = useState<HomeworkTask | null>(null)
  const [pointsToast, setPointsToast] = useState<{ pts: number; overtime: boolean; name: string } | null>(null)

  useEffect(() => {
    const savedStars = localStorage.getItem(STARS_KEY)
    if (savedStars) setStars(parseInt(savedStars, 10))
    const savedTasks = localStorage.getItem(TASKS_KEY)
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    const savedStats = localStorage.getItem(STATS_KEY)
    if (savedStats) setUserStats(JSON.parse(savedStats))
    const savedRewards = localStorage.getItem(REWARDS_KEY)
    if (savedRewards) { const customRewards = JSON.parse(savedRewards); setRewards([...DEFAULT_REWARDS, ...customRewards]) }
    const savedAchievements = localStorage.getItem(ACHIEVEMENTS_KEY)
    if (savedAchievements) setUnlockedAchievements(JSON.parse(savedAchievements))
    const savedRecords = localStorage.getItem(RECORDS_KEY)
    if (savedRecords) setRecords(JSON.parse(savedRecords))
  }, [])

  const saveData = useCallback(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    localStorage.setItem(STARS_KEY, stars.toString())
    localStorage.setItem(STATS_KEY, JSON.stringify(userStats))
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards.filter(r => r.isCustom)))
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedAchievements))
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  }, [tasks, stars, userStats, rewards, unlockedAchievements, records])

  const addRecord = (type: string, title: string, detail: string, points?: number) => {
    const newRecord: Record = { id: Date.now(), type, title, detail, points, timestamp: new Date().toISOString() }
    setRecords(prev => [newRecord, ...prev].slice(0, 100))
    saveData()
  }

  const checkAchievements = useCallback(() => {
    const newUnlocked: string[] = []
    ACHIEVEMENTS.forEach(a => { if (!unlockedAchievements.includes(a.id) && a.condition(userStats)) newUnlocked.push(a.id) })
    if (newUnlocked.length > 0) { setUnlockedAchievements(prev => [...prev, ...newUnlocked]); addRecord('achievement_unlock', '🏆 解锁新成就', `解锁了 ${newUnlocked.length} 个成就`) }
  }, [userStats, unlockedAchievements])

  const addTask = () => {
    if (!newTaskName.trim()) return
    const subjectName = newTaskSubject === '__custom__' ? customSubjectName.trim() || '自定义' : newTaskSubject
    const newTask: HomeworkTask = { id: Date.now(), name: newTaskName, subject: subjectName, completed: false, cancelled: false, pomodorosCompleted: 0, plannedDuration: newTaskDuration, status: 'pending' }
    setTasks([...tasks, newTask])
    setNewTaskName('')
    setNewTaskDuration(25)
    setCustomSubjectName('')
    setShowCustomSubject(false)
    setShowAddTask(false)
    saveData()
  }

  const deleteTask = (id: number) => { setTasks(tasks.filter(t => t.id !== id)); saveData() }
  const completeTask = (id: number) => { setTasks(tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString(), status: 'completed' as const } : t)); setUserStats(prev => ({ ...prev, completedTasks: prev.completedTasks + 1 })); saveData() }
  const cancelTask = (id: number) => { setTasks(tasks.map(t => t.id === id ? { ...t, cancelled: true, status: 'cancelled' as const } : t)); saveData() }
  const startTask = (id: number) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'in_progress' as const } : t)); saveData() }

  const addReward = () => {
    if (!newRewardName.trim()) return
    const newReward: Reward = { id: Date.now(), name: newRewardName, points: newRewardPoints, icon: newRewardIcon, isCustom: true }
    const customRewards = rewards.filter(r => r.isCustom)
    setRewards([...DEFAULT_REWARDS, ...customRewards, newReward])
    setNewRewardName(''); setNewRewardPoints(50); setNewRewardIcon('🎁'); setShowAddReward(false); saveData()
  }

  const updateReward = () => {
    if (!editingReward || !newRewardName.trim()) return
    const customRewards = rewards.filter(r => r.isCustom).map(r => r.id === editingReward.id ? { ...r, name: newRewardName, points: newRewardPoints, icon: newRewardIcon } : r)
    setRewards([...DEFAULT_REWARDS, ...customRewards])
    setEditingReward(null); setNewRewardName(''); setNewRewardPoints(50); setNewRewardIcon('🎁'); saveData()
  }

  const deleteReward = (id: number) => { setRewards([...DEFAULT_REWARDS, ...rewards.filter(r => r.isCustom && r.id !== id)]); saveData() }

  const redeemReward = (reward: Reward) => {
    if (stars >= reward.points) {
      if (confirm(`确认用 ${reward.points} 积分兑换 "${reward.name}" 吗？`)) { 
        setStars(s => s - reward.points); 
        setUserStats(prev => ({ ...prev, totalRewardsRedeemed: prev.totalRewardsRedeemed + 1 })); 
        addRecord('reward_redeemed', '🎁 兑换奖励', `兑换 "${reward.name}" -${reward.points} 积分`, -reward.points); 
        checkAchievements(); 
        alert(`恭喜！你已成功兑换 "${reward.name}"！`); 
        saveData() 
      } 
    } else { alert(`积分不足！需要 ${reward.points} 积分，你当前有 ${stars} 积分`) }
  }

  const handleTimerComplete = (points: number, isOvertime: boolean, distractions: Distraction[]) => {
    if (!activeTimer) return
    setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t))
    setStars(s => s + points)
    const newStats = { totalPomodoros: userStats.totalPomodoros + 1, totalPoints: userStats.totalPoints + points, completedTasks: isOvertime ? userStats.completedTasks : userStats.completedTasks + 1, earlyCompletions: !isOvertime ? userStats.earlyCompletions + 1 : userStats.earlyCompletions, overtimeCompletions: isOvertime ? userStats.overtimeCompletions + 1 : userStats.overtimeCompletions, perfectDays: userStats.perfectDays, currentStreak: userStats.currentStreak, totalRewardsRedeemed: userStats.totalRewardsRedeemed, longestStreak: userStats.longestStreak }
    setUserStats(newStats)
    if (isOvertime) {
      addRecord('points_deducted', '⏰ 超时扣分', `任务 "${activeTimer.name}" 超时，扣除 ${points} 分`, points)
      setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, status: 'cancelled' as const } : t))
    } else {
      addRecord('points_earned', '⭐ 获得积分', `完成 "${activeTimer.name}" +${points} 积分`, points)
      setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, completed: true, completedAt: new Date().toISOString(), status: 'completed' as const } : t))
    }
    checkAchievements()
    saveData()
    // 积分弹窗提示
    setPointsToast({ pts: points, overtime: isOvertime, name: activeTimer.name })
    setTimeout(() => setPointsToast(null), 3500)

    setActiveTimer(null)

    // ⏰ 通知家长：任务完成/超时
    try {
      const parentNotifs = JSON.parse(localStorage.getItem('pending_parent_notifications') || '[]')
      parentNotifs.push({
        type: isOvertime ? 'alert' : 'task_complete',
        title: isOvertime ? '⚠️ 任务超时' : '🎉 任务完成',
        body: isOvertime ? `"${activeTimer.name}" 超时，扣${points}分` : `"${activeTimer.name}" 完成，获得 +${points} 积分 🎉`,
        childId: user.id,
        createdAt: Date.now(),
      })
      localStorage.setItem('pending_parent_notifications', JSON.stringify(parentNotifs.slice(-50)))
      // 触发 storage 事件让家长页面实时感知
      window.dispatchEvent(new Event('parent-notification'))
    } catch {}
  }

  const formatDate = (dateStr: string) => { const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime(); const m = Math.floor(diff / 60000); const h = Math.floor(diff / 3600000); const d = Math.floor(diff / 86400000); if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`; if (h < 24) return `${h}小时前`; if (d < 7) return `${d}天前`; return date.toLocaleDateString('zh-CN') }

  const currentRank = getCurrentRank(userStats.totalPoints)
  const rankProgress = RANKS.length > 1 ? ((userStats.totalPoints - currentRank.minPoints) / (currentRank.maxPoints - currentRank.minPoints || 1)) * 100 : 100
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1]

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  const renderHome = () => (
    <div className="space-y-4">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-white">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="w-5 h-5 text-[#FFE66D]" /><h2 className="text-lg font-bold text-gray-800">欢迎回来，{user.nickname}！</h2></div>
        <p className="text-gray-600 text-sm">今日目标：完成 {pendingTasks.length + inProgressTasks.length} 项作业</p>
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="text-center"><div className="text-lg font-bold text-[#4ECDC4]">{userStats.totalPomodoros}</div><div className="text-xs text-gray-500">番茄钟</div></div>
          <div className="text-center"><div className="text-lg font-bold text-[#FF6B6B]">{userStats.completedTasks}</div><div className="text-xs text-gray-500">完成任务</div></div>
          <div className="text-center"><div className="text-lg font-bold text-[#FFE66D]">{unlockedAchievements.length}</div><div className="text-xs text-gray-500">成就</div></div>
          <div className="text-center"><div className="text-lg font-bold text-[#A8E6CF]">{userStats.totalPoints}</div><div className="text-xs text-gray-500">总积分</div></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setShowAddTask(true)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white shadow-md hover:scale-105"><Plus className="w-5 h-5" /><span className="text-[10px] font-medium">添加</span></button>
        <button onClick={() => setCurrentSection('points')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-white shadow-md hover:scale-105"><Star className="w-5 h-5" /><span className="text-[10px] font-medium">积分</span></button>
        <button onClick={() => setCurrentSection('achievements')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#A8E6CF] to-[#4ECDC4] text-white shadow-md hover:scale-105 relative"><Trophy className="w-5 h-5" /><span className="text-[10px] font-medium">成就</span>{unlockedAchievements.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#FF6B6B] text-xs rounded-full font-bold">{unlockedAchievements.length}</span>}</button>
        <button onClick={() => setCurrentSection('records')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white shadow-md hover:scale-105"><History className="w-5 h-5" /><span className="text-[10px] font-medium">记录</span></button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#4ECDC4]" />作业清单</h3>
          <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-full text-sm font-medium"><Plus className="w-4 h-4" />添加</button>
        </div>
        
        {showAddTask && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-3 border-2 border-[#4ECDC4]/30">
            <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="输入作业名称..." className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none mb-3 text-sm" autoFocus />
            {/* 科目选择 */}
            <div className="flex gap-1.5 mb-2 flex-wrap">{PRESET_SUBJECTS.map(s => (<button key={s.name} onClick={() => { setNewTaskSubject(s.name); setShowCustomSubject(false); }} className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${newTaskSubject === s.name && !showCustomSubject ? s.color + ' ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>{s.emoji} {s.name}</button>))}<button onClick={() => { setNewTaskSubject('__custom__'); setShowCustomSubject(true); }} className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${showCustomSubject ? 'bg-indigo-100 text-indigo-700 ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>✏️ 自定义</button></div>
            {showCustomSubject && (<input type="text" value={customSubjectName} onChange={(e) => setCustomSubjectName(e.target.value)} placeholder="输入科目名称，如：体育、编程..." className="w-full px-3 py-2 border-2 border-indigo-200 rounded-xl focus:border-indigo-400 focus:outline-none mb-3 text-sm" autoFocus />)}
            {/* 时长选择 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">计划时长</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[15, 25, 45].map(d => (<button key={d} onClick={() => setNewTaskDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${newTaskDuration === d ? 'bg-[#FF6B6B] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-red-50'}`}>
                  {d}分钟
                </button>))}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">自定义：</span>
                <input type="number" min="1" max="180"
                  value={![15,25,45].includes(newTaskDuration) ? newTaskDuration : ''}
                  placeholder="输入任意分钟"
                  onChange={(e) => { const val = Number(e.target.value); if(val>=1&&val<=180) setNewTaskDuration(val) }}
                  className="flex-1 px-2 py-1.5 border-2 border-[#FF6B6B] rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-200"/>
                <span className="text-xs text-gray-400 whitespace-nowrap">分钟</span>
              </div>
            </div>
            <div className="flex gap-2"><button onClick={addTask} className="flex-1 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-medium text-sm">添加</button><button onClick={() => { setShowAddTask(false); setShowCustomSubject(false); setCustomSubjectName(''); }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium text-sm">取消</button></div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-white/60 rounded-2xl border-2 border-white"><div className="text-4xl mb-2">📚</div><p className="text-gray-500 text-sm">还没有作业任务</p></div>
        ) : (
          <div className="space-y-2">
            {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 10).map(task => (
              <div key={task.id} className={`bg-white rounded-2xl p-3 shadow-md hover:shadow-lg border-2 hover:border-[#A8E6CF] ${task.status === 'in_progress' ? 'border-[#4ECDC4]' : ''}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => !task.completed && completeTask(task.id)} disabled={task.status === 'in_progress'} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-[#4ECDC4] border-[#4ECDC4]' : task.status === 'in_progress' ? 'bg-[#FFE66D] border-[#FFE66D] animate-pulse' : 'border-[#FFE66D] hover:border-[#4ECDC4]'}`}>{task.completed && <Check className="w-4 h-4 text-white" />}{task.status === 'in_progress' && <Play className="w-3 h-3 text-white" />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSubjectStyle(task.subject).color}`}>{getSubjectStyle(task.subject).emoji} {task.subject}</span><span className={`font-medium text-sm truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.name}</span></div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5"><Clock className="w-3 h-3" />{task.plannedDuration}分钟 {task.pomodorosCompleted > 0 && <span className="text-[#4ECDC4]">• 🍅 {task.pomodorosCompleted}</span>}</div>
                  </div>
                  
          {/* ── 按学科分组显示作业 ── */}
          {(() => {
            const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
            const SUBJECT_ORDER = ['语文','数学','英语','科学','历史']
            // Group by subject, keeping custom subjects at the end
            const groups: { [key: string]: HomeworkTask[] } = {}
            activeTasks.forEach(t => {
              if (!groups[t.subject]) groups[t.subject] = []
              groups[t.subject].push(t)
            })
            const sortedSubjects = Object.keys(groups).sort((a, b) => {
              const ai = SUBJECT_ORDER.indexOf(a), bi = SUBJECT_ORDER.indexOf(b)
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
            })
            return sortedSubjects.map(subject => {
              const subjectTasks = groups[subject]
              const style = getSubjectStyle(subject)
              return (
                <div key={subject} className="mb-4">
                  {/* 学科标题栏 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.color}`}>
                      {style.emoji} {subject}
                    </span>
                    <div className="flex-1 h-px bg-gray-200"/>
                    <span className="text-xs text-gray-400">{subjectTasks.length}项</span>
                  </div>
                  {/* 该学科下的作业 */}
                  <div className="space-y-2">
                    {subjectTasks.map(task => (
                      <div key={task.id}
                        className={`bg-white rounded-2xl p-3 shadow-sm border-2 hover:shadow-md transition-all ${task.status === 'in_progress' ? 'border-[#4ECDC4]' : 'border-transparent hover:border-[#A8E6CF]'}`}>
                        <div className="flex items-center gap-3">
                          <button onClick={() => !task.completed && completeTask(task.id)}
                            disabled={task.status === 'in_progress'}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'in_progress' ? 'bg-[#FFE66D] border-[#FFE66D] animate-pulse' : 'border-[#FFE66D] hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10'}`}>
                            {task.status === 'in_progress' && <Play className="w-3 h-3 text-white"/>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm truncate ${task.status === 'in_progress' ? 'text-gray-800' : 'text-gray-700'}`}>{task.name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3"/>{task.plannedDuration}分钟
                              {task.pomodorosCompleted > 0 && <span className="text-[#4ECDC4]">🍅×{task.pomodorosCompleted}</span>}
                              {task.status === 'in_progress' && <span className="text-[#FFE66D] font-bold">进行中</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {task.status === 'pending' && <button onClick={() => { startTask(task.id); setActiveTimer(task); }}
                              className="p-1.5 bg-[#4ECDC4] text-white rounded-lg hover:bg-[#3dbdb5]"><Play className="w-4 h-4"/></button>}
                            {task.status === 'in_progress' && <button onClick={() => setActiveTimer(task)}
                              className="p-1.5 bg-[#FFE66D] text-white rounded-lg hover:bg-[#ffd43b]"><Play className="w-4 h-4"/></button>}
                            <button onClick={() => cancelTask(task.id)}
                              className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X className="w-4 h-4"/></button>
                            <button onClick={() => deleteTask(task.id)}
                              className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          })()}
          <div className="flex gap-1">
                    {task.status === 'pending' && <button onClick={() => { startTask(task.id); setActiveTimer(task); }} className="p-1.5 bg-[#4ECDC4] text-white rounded-lg hover:bg-[#3dbdb5]"><Play className="w-4 h-4" /></button>}
                    {task.status === 'in_progress' && <button onClick={() => setActiveTimer(task)} className="p-1.5 bg-[#FFE66D] text-white rounded-lg hover:bg-[#ffd43b]"><Play className="w-4 h-4" /></button>}
                    <button onClick={() => cancelTask(task.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {completedTasks.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">已完成 ({completedTasks.length})</h4>
                <div className="space-y-1 opacity-60">
                  {completedTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                      <Check className="w-4 h-4 text-[#4ECDC4]" />
                      <span className="text-sm text-gray-500 line-through">{task.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const renderPoints = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] rounded-2xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-sm opacity-80">当前积分</div>
          <div className="text-5xl font-black my-2">{stars}</div>
          <div className="text-lg font-bold">{currentRank.name}</div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1"><span>{currentRank.name}</span>{nextRank && <span>{nextRank.name}</span>}</div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${rankProgress}%` }} /></div>
          {nextRank && <div className="text-center text-xs mt-1 opacity-80">还需 {nextRank.minPoints - userStats.totalPoints} 分升级</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-[#FFE66D]" />段位等级</h3>
        <div className="space-y-2">
          {RANKS.map((rank, idx) => (
            <div key={rank.name} className={`flex items-center gap-3 p-2 rounded-xl ${userStats.totalPoints >= rank.minPoints ? 'bg-gradient-to-r from-[#FFE66D]/20 to-transparent' : ''}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: rank.color + '40' }}>{rank.name.charAt(0)}</div>
              <div className="flex-1"><div className="font-medium text-sm">{rank.name}</div><div className="text-xs text-gray-500">{rank.minPoints}+ 积分</div></div>
              {userStats.totalPoints >= rank.minPoints && <Check className="w-5 h-5 text-[#4ECDC4]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Gift className="w-5 h-5 text-[#FF6B6B]" />兑换奖励</h3>
        <div className="space-y-2">
          {rewards.map(reward => (
            <div key={reward.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1"><div className="font-medium text-sm">{reward.name}</div><div className="text-xs text-gray-500">{reward.points} 积分</div></div>
              <button onClick={() => redeemReward(reward)} disabled={stars < reward.points} className={`px-3 py-1 rounded-full text-sm font-medium ${stars >= reward.points ? 'bg-[#4ECDC4] text-white hover:bg-[#3dbdb5]' : 'bg-gray-200 text-gray-400'}`}>兑换</button>
            </div>
          ))}
          <button onClick={() => setShowAddReward(true)} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm hover:border-[#FF6B6B] hover:text-[#FF6B6B]">+ 添加自定义奖励</button>
        </div>
      </div>

      {showAddReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">添加自定义奖励</h3>
            <input type="text" value={newRewardName} onChange={(e) => setNewRewardName(e.target.value)} placeholder="奖励名称" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" />
            <input type="number" value={newRewardPoints} onChange={(e) => setNewRewardPoints(Number(e.target.value))} placeholder="所需积分" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" />
            <div className="flex gap-2 mb-4"><input type="text" value={newRewardIcon} onChange={(e) => setNewRewardIcon(e.target.value)} placeholder="图标" className="w-16 px-3 py-2 border-2 border-[#FFE66D] rounded-xl text-center" /><span className="text-2xl self-center">{newRewardIcon}</span></div>
            <div className="flex gap-2"><button onClick={addReward} className="flex-1 py-2 bg-[#FF6B6B] text-white rounded-xl font-medium">添加</button><button onClick={() => setShowAddReward(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium">取消</button></div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAchievements = () => {
    const today = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0] })
    const completedDates = records.filter(r => r.type === 'points_earned').map(r => r.timestamp.split('T')[0])
    
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-[#FFE66D]" />成就徽章 ({unlockedAchievements.length}/14)</h3>
          <div className="grid grid-cols-4 gap-2">
            {ACHIEVEMENTS.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id)
              return (
                <div key={achievement.id} className={`flex flex-col items-center p-2 rounded-xl ${isUnlocked ? 'bg-gradient-to-br from-[#FFE66D]/30 to-[#FF6B6B]/10' : 'bg-gray-50 opacity-50'}`}>
                  <span className="text-2xl">{achievement.icon}</span>
                  <span className="text-xs font-medium text-center mt-1">{achievement.name}</span>
                  {isUnlocked && <Check className="w-3 h-3 text-[#4ECDC4] mt-1" />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-[#4ECDC4]" />连续打卡</h3>
          <div className="flex justify-between">
            {last7Days.map(date => {
              const hasRecord = completedDates.includes(date)
              const dayName = new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' })
              return (
                <div key={date} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasRecord ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-400'}`}>{hasRecord ? '✓' : '×'}</div>
                  <span className="text-xs text-gray-500 mt-1">{dayName}</span>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-3 text-sm text-gray-500">连续 {userStats.currentStreak} 天</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#FF6B6B]" />统计</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#4ECDC4]">{userStats.totalPomodoros}</div><div className="text-xs text-gray-500">总番茄钟</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FF6B6B]">{userStats.completedTasks}</div><div className="text-xs text-gray-500">完成任务</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FFE66D]">{userStats.earlyCompletions}</div><div className="text-xs text-gray-500">提前完成</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#A8E6CF]">{userStats.longestStreak}</div><div className="text-xs text-gray-500">最长连续</div></div>
          </div>
        </div>
      </div>
    )
  }

  const renderRecords = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><History className="w-5 h-5 text-[#4ECDC4]" />积分记录</h3>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-400"><History className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>暂无记录</p></div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map(record => (
              <div key={record.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                <span className="text-lg">{record.type === 'points_earned' ? '⭐' : record.type === 'points_deducted' ? '⏰' : record.type === 'reward_redeemed' ? '🎁' : '🏆'}</span>
                <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{record.title}</div><div className="text-xs text-gray-500">{formatDate(record.timestamp)}</div></div>
                {record.points && <span className={`font-bold text-sm ${record.points > 0 ? 'text-[#4ECDC4]' : 'text-red-500'}`}>{record.points > 0 ? '+' : ''}{record.points}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderPomodoro = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
        <div className="text-6xl mb-4">🍅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">番茄钟</h2>
        <p className="text-gray-500 mb-6">专注学习，提高效率</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => setActiveTimer({
              id: Date.now(),
              name: '专注学习',
              subject: '自定义',
              completed: false,
              cancelled: false,
              pomodorosCompleted: 0,
              plannedDuration: 25,
              status: 'pending'
            })}
            className="w-full py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform"
          >
            <Timer className="w-6 h-6 inline mr-2" />
            开始25分钟番茄钟
          </button>
          
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 45].map(mins => (
              <button 
                key={mins}
                onClick={() => setActiveTimer({
                  id: Date.now(),
                  name: '专注学习',
                  subject: '自定义',
                  completed: false,
                  cancelled: false,
                  pomodorosCompleted: 0,
                  plannedDuration: mins,
                  status: 'pending'
                })}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                {mins}分钟
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-500" />
          今日统计
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 p-3 rounded-xl">
            <div className="text-2xl font-bold text-green-600">{userStats.totalPomodoros}</div>
            <div className="text-xs text-gray-500">今日番茄钟</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl">
            <div className="text-2xl font-bold text-orange-600">{userStats.earlyCompletions}</div>
            <div className="text-xs text-gray-500">提前完成</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center shadow-lg"><span className="text-xl">🦸</span></div>
              <div><h1 className="text-lg font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">作业闯关小英雄</h1><p className="text-xs text-gray-500">{user.nickname} • {currentRank.name}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-[#FFE66D]/30 rounded-full"><Star className="w-4 h-4 text-[#FF6B6B] fill-[#FF6B6B]" /><span className="font-bold text-[#FF6B6B] text-sm">{stars}</span></div>
              <button onClick={onLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {currentSection === 'home' && renderHome()}
        {currentSection === 'points' && renderPoints()}
        {currentSection === 'achievements' && renderAchievements()}
        {currentSection === 'records' && renderRecords()}
        {currentSection === 'pomodoro' && renderPomodoro()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <button onClick={() => setCurrentSection('home')} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${currentSection === 'home' ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
            <BookOpen className="w-5 h-5" /><span className="text-[10px] font-medium">首页</span>
          </button>
          <button onClick={() => setCurrentSection('pomodoro')} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${currentSection === 'pomodoro' ? 'text-green-500' : 'text-gray-400'}`}>
            <Timer className="w-5 h-5" /><span className="text-[10px] font-medium">番茄钟</span>
          </button>
          <button onClick={() => setCurrentSection('points')} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${currentSection === 'points' ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
            <Star className="w-5 h-5" /><span className="text-[10px] font-medium">积分</span>
          </button>
          <button onClick={() => setCurrentSection('achievements')} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${currentSection === 'achievements' ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
            <Trophy className="w-5 h-5" /><span className="text-[10px] font-medium">成就</span>
          </button>
          <button onClick={() => setCurrentSection('records')} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${currentSection === 'records' ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
            <History className="w-5 h-5" /><span className="text-[10px] font-medium">记录</span>
          </button>
        </div>
      </nav>

      {activeTimer && <PomodoroTimerPage task={activeTimer} onComplete={handleTimerComplete} onCancel={() => setActiveTimer(null)} />}

      {/* 积分提示 Toast */}
      {pointsToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-toast-in">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl text-white text-center min-w-[200px] ${
            pointsToast.pts >= 0
              ? 'bg-gradient-to-r from-[#4ADE80] to-[#22C55E]'
              : 'bg-gradient-to-r from-[#EF4444] to-[#DC2626]'
          }`}>
            <div className="text-3xl mb-1">{pointsToast.pts >= 0 ? '🎉' : '⏰'}</div>
            <div className={`text-xl font-black`}>{pointsToast.pts >= 0 ? `+${pointsToast.pts}` : pointsToast.pts} 积分</div>
            <div className="text-xs opacity-90 mt-1">
              {pointsToast.pts >= 0
                ? `完成 "${pointsToast.name}"，继续加油！`
                : `任务超时，扣了 ${Math.abs(pointsToast.pts)} 分，下次注意！`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ParentHomePage({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showBindModal, setShowBindModal] = useState(false)
  const [childName, setChildName] = useState('')
  const [childPhone, setChildPhone] = useState('')
  const [manualPoints, setManualPoints] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const { addNotification } = useNotifications()

  // 注册家长账号（用于找回密码）
  useEffect(() => {
    if (user.phone) {
      registerParentAccount(user.phone, user.nickname.replace('的家长', ''), user.id)
    }
  }, [user])

  // 监听孩子端任务事件，实时拉取通知
  useEffect(() => {
    const flushPending = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('pending_parent_notifications') || '[]')
        if (pending.length > 0) {
          pending.forEach((n: any) => addNotification(n))
          localStorage.setItem('pending_parent_notifications', '[]')
        }
      } catch {}
    }
    // 初始拉取
    flushPending()
    // 监听孩子端事件
    window.addEventListener('parent-notification', flushPending)
    // 每30秒轮询一次兜底
    const interval = setInterval(flushPending, 30000)
    return () => { window.removeEventListener('parent-notification', flushPending); clearInterval(interval) }
  }, [addNotification])

  const saveChildren = (newChildren: Child[]) => {
    setChildren(newChildren)
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(newChildren))
  }

  const bindChild = () => {
    if (!childName.trim()) return
    const newChild: Child = { id: Date.now().toString(), nickname: childName, phone: childPhone, stars: 0, tasks: [], stats: { totalPomodoros: 0, totalPoints: 0, completedTasks: 0, currentStreak: 0, totalRewardsRedeemed: 0, earlyCompletions: 0, overtimeCompletions: 0, perfectDays: 0, longestStreak: 0 } }
    saveChildren([...children, newChild])
    setChildName(''); setChildPhone(''); setShowBindModal(false)
  }

  const addPoints = (childId: string, points: number) => {
    const newChildren = children.map(c => { if (c.id === childId) { const updated = { ...c, stars: c.stars + points, stats: { ...c.stats, totalPoints: c.stats.totalPoints + points } }; localStorage.setItem(`child-${childId}`, JSON.stringify(updated)); return updated } return c })
    saveChildren(newChildren)
    setManualPoints(0)
  }

  const { unreadCount } = useNotifications()

  if (showNotifications) return <NotificationsPage onBack={() => setShowNotifications(false)} />
  if (showChangePw) return <ChangePasswordPage user={user} onBack={() => setShowChangePw(false)} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center shadow-lg"><span className="text-xl">👨‍👩‍👧</span></div>
              <div><h1 className="text-lg font-black text-gray-800">家长中心</h1><p className="text-xs text-gray-500">管理孩子学习</p></div>
            </div>
            <div className="flex items-center gap-2">
              {/* 通知中心 */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 text-gray-500 hover:text-[#FF6B6B] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF6B6B] text-white text-xs rounded-full font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {/* 设置菜单 */}
              <div className="relative">
                <button onClick={() => setShowChangePw(true)} className="p-2 text-gray-400 hover:text-gray-700">
                  <Lock className="w-4 h-4" />
                </button>
              </div>
              <button onClick={onLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-[#4ECDC4]" />我的孩子</h3>
            <button onClick={() => setShowBindModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#4ECDC4] text-white rounded-full text-sm font-medium"><UserPlus className="w-4 h-4" />绑定</button>
          </div>
          
          {children.length === 0 ? (
            <div className="text-center py-8 text-gray-400"><User className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>还没有绑定孩子</p></div>
          ) : (
            <div className="space-y-2">
              {children.map(child => (
                <div key={child.id} onClick={() => setSelectedChild(child)} className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer ${selectedChild?.id === child.id ? 'ring-2 ring-[#4ECDC4]' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FFE66D] to-[#FFB347] rounded-full flex items-center justify-center text-xl">🎒</div>
                  <div className="flex-1"><div className="font-bold">{child.nickname}</div><div className="text-xs text-gray-500">⭐ {child.stars} 积分 • {child.stats.completedTasks} 个任务</div></div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedChild && (
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{selectedChild.nickname} 的详细数据</h3>
              <button onClick={() => setSelectedChild(null)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FFE66D]">{selectedChild.stars}</div><div className="text-xs text-gray-500">当前积分</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#4ECDC4]">{selectedChild.stats.totalPomodoros}</div><div className="text-xs text-gray-500">番茄钟</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FF6B6B]">{selectedChild.stats.completedTasks}</div><div className="text-xs text-gray-500">完成任务</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#A8E6CF]">{selectedChild.stats.currentStreak}</div><div className="text-xs text-gray-500">连续天数</div></div>
            </div>
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-700 mb-2">手动奖励积分</h4>
              <div className="flex gap-2">
                <input type="number" value={manualPoints} onChange={(e) => setManualPoints(Number(e.target.value))} placeholder="积分数量" className="flex-1 px-3 py-2 border-2 border-[#FFE66D] rounded-xl" />
                <button onClick={() => addPoints(selectedChild.id, manualPoints)} className="px-4 py-2 bg-[#4ECDC4] text-white rounded-xl font-medium">奖励</button>
                <button onClick={() => addPoints(selectedChild.id, -manualPoints)} disabled={selectedChild.stars < manualPoints} className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50">扣除</button>
              </div>
            </div>
          </div>
        )}

        {showBindModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">绑定孩子</h3>
              <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="孩子昵称" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" />
              <input type="tel" value={childPhone} onChange={(e) => setChildPhone(e.target.value)} placeholder="手机号（可选）" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-4" />
              <div className="flex gap-2"><button onClick={bindChild} className="flex-1 py-2 bg-[#4ECDC4] text-white rounded-xl font-medium">绑定</button><button onClick={() => setShowBindModal(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium">取消</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function TeacherHomePage({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [homeworkName, setHomeworkName] = useState('')
  const [homeworkSubject, setHomeworkSubject] = useState('数学')
  const [homeworkDesc, setHomeworkDesc] = useState('')

  useEffect(() => {
    const savedClass = localStorage.getItem(CLASS_KEY)
    if (savedClass) setClassInfo(JSON.parse(savedClass))
  }, [])

  const createClass = () => {
    if (!classInfo) return
    const newClass: ClassInfo = { id: Date.now().toString(), name: classInfo.name, code: Math.random().toString(36).substring(2, 8).toUpperCase(), students: [] }
    setClassInfo(newClass)
    localStorage.setItem(CLASS_KEY, JSON.stringify(newClass))
  }

  const publishHomework = () => {
    if (!homeworkName.trim() || !classInfo) return
    alert(`作业 "${homeworkName}" 已发布到班级 ${classInfo.name}！`)
    setHomeworkName(''); setHomeworkDesc('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center shadow-lg"><span className="text-xl">👨‍🏫</span></div>
              <div><h1 className="text-lg font-black text-gray-800">老师中心</h1><p className="text-xs text-gray-500">班级管理</p></div>
            </div>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {!classInfo ? (
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="text-4xl mb-4">🏫</div>
            <h3 className="text-lg font-bold mb-2">创建班级</h3>
            <p className="text-gray-500 text-sm mb-4">创建您的第一个班级，生成班级码让学生加入</p>
            <input type="text" value={classInfo?.name || ''} onChange={(e) => setClassInfo({ id: '', name: e.target.value, code: '', students: [] })} placeholder="班级名称（如：三年级一班）" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl mb-4" />
            <button onClick={createClass} disabled={!classInfo?.name} className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold disabled:opacity-50">创建班级</button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-[#4ECDC4]" />{classInfo.name}</h3>
                <div className="px-3 py-1 bg-[#FFE66D] rounded-full text-sm font-bold">{classInfo.code}</div>
              </div>
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-[#4ECDC4]">{classInfo.students.length}</div>
                <div className="text-sm text-gray-500">名学生</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookMarked className="w-5 h-5 text-[#FF6B6B]" />发布作业</h3>
              <input type="text" value={homeworkName} onChange={(e) => setHomeworkName(e.target.value)} placeholder="作业标题" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" />
              <div className="flex gap-2 mb-3 overflow-x-auto">{SUBJECTS.map(s => (<button key={s.name} onClick={() => setHomeworkSubject(s.name)} className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${homeworkSubject === s.name ? s.color + ' ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>{s.emoji} {s.name}</button>))}</div>
              <textarea value={homeworkDesc} onChange={(e) => setHomeworkDesc(e.target.value)} placeholder="作业描述（可选）" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-4" rows={3} />
              <button onClick={publishHomework} disabled={!homeworkName.trim()} className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold disabled:opacity-50">发布作业</button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#A8E6CF]" />数据统计</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FFE66D]">{classInfo.students.length}</div><div className="text-xs text-gray-500">学生数</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#4ECDC4]">0</div><div className="text-xs text-gray-500">今日作业</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FF6B6B]">0</div><div className="text-xs text-gray-500">完成率</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#A8E6CF]">0</div><div className="text-xs text-gray-500">平均积分</div></div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function AppInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [showForgot, setShowForgot] = useState(false)

  useEffect(() => { const user = getCurrentUser(); if (user) { setIsLoggedIn(true); setCurrentUser(user) } }, [])

  const handleLogin = (user: UserInfo) => {
    setCurrentUser(user)
    if (user.phone) registerParentAccount(user.phone, user.nickname.replace('的家长', ''), user.id)
    localStorage.setItem('homework-hero-user', JSON.stringify(user))
    setIsLoggedIn(true)
  }
  const handleLogout = () => { logout(); setIsLoggedIn(false); setCurrentUser(null) }

  if (showForgot) return <ForgotPasswordPage onBack={() => setShowForgot(false)} onLogin={() => { setShowForgot(false); handleLogout() }} />

  if (!isLoggedIn || !currentUser) return <LoginPage onLogin={handleLogin} onForgot={() => setShowForgot(true)} />

  if (currentUser.role === 'parent') return <ParentHomePage user={currentUser} onLogout={handleLogout} />
  if (currentUser.role === 'teacher') return <TeacherHomePage user={currentUser} onLogout={handleLogout} />
  return <StudentHomePage user={currentUser} onLogout={handleLogout} />
}

export default function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  )
}
