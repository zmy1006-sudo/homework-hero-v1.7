import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, BookOpen, Trophy, Play, Plus, Trash2, Star, LogOut, Gift, History, Award, Check, Edit2, Pause, RotateCcw, X, ChevronRight, Users, Clock, Calendar, TrendingUp, User, UserPlus, BarChart3, BookMarked, Timer } from 'lucide-react'
import { getCurrentUser, logout, UserInfo } from './lib/auth'
import PomodoroTimerPage from './PomodoroTimerPage'
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
interface AppRecord { id: number; type: string; title: string; detail: string; points?: number; timestamp: string }
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

interface Assignment {
  id: number
  title: string
  subject: string
  description?: string
  dueDate?: string
  createdAt: string
}

interface AssignmentProgress {
  assignmentId: number
  status: 'pending' | 'submitted' | 'graded'
  submittedAt?: string
  remark?: string
  photo?: string
  grade?: number
  pointsEarned?: number
}

interface ClassStudent {
  id: string
  nickname: string
  grade?: string
  stars: number
  joinedAt: string
}

interface JoinRequest {
  id: number
  studentId: string
  nickname: string
  grade?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

interface Announcement {
  id: number
  title: string
  content: string
  createdAt: string
}

interface ClassInfo {
  id: string
  name: string
  code: string
  school?: string
  students: ClassStudent[]
  joinRequests: JoinRequest[]
  assignments: Assignment[]
  announcements: Announcement[]
}

const CHILDREN_KEY = 'homework-hero-children'
const CLASS_KEY = 'homework-hero-class'

const SUBJECTS = [
  { 
    name: '语文', 
    emoji: '📝', 
    color: 'bg-yellow-100 text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    accentColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    lightBg: 'bg-yellow-100/50',
    hoverBg: 'hover:bg-yellow-100/70'
  },
  { 
    name: '数学', 
    emoji: '🔢', 
    color: 'bg-blue-100 text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    lightBg: 'bg-blue-100/50',
    hoverBg: 'hover:bg-blue-100/70'
  },
  { 
    name: '英语', 
    emoji: '📚', 
    color: 'bg-purple-100 text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    accentColor: 'bg-purple-500',
    textColor: 'text-purple-700',
    lightBg: 'bg-purple-100/50',
    hoverBg: 'hover:bg-purple-100/70'
  },
  { 
    name: '科学', 
    emoji: '🔬', 
    color: 'bg-green-100 text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    accentColor: 'bg-green-500',
    textColor: 'text-green-700',
    lightBg: 'bg-green-100/50',
    hoverBg: 'hover:bg-green-100/70'
  },
  { 
    name: '历史', 
    emoji: '🏛️', 
    color: 'bg-orange-100 text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    accentColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    lightBg: 'bg-orange-100/50',
    hoverBg: 'hover:bg-orange-100/70'
  },
  { 
    name: '地理', 
    emoji: '🌍', 
    color: 'bg-teal-100 text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    accentColor: 'bg-teal-500',
    textColor: 'text-teal-700',
    lightBg: 'bg-teal-100/50',
    hoverBg: 'hover:bg-teal-100/70'
  },
  { 
    name: '政治', 
    emoji: '⚖️', 
    color: 'bg-indigo-100 text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    accentColor: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    lightBg: 'bg-indigo-100/50',
    hoverBg: 'hover:bg-indigo-100/70'
  },
  { 
    name: '物理', 
    emoji: '⚛️', 
    color: 'bg-cyan-100 text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    accentColor: 'bg-cyan-500',
    textColor: 'text-cyan-700',
    lightBg: 'bg-cyan-100/50',
    hoverBg: 'hover:bg-cyan-100/70'
  },
  { 
    name: '化学', 
    emoji: '🧪', 
    color: 'bg-lime-100 text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200',
    accentColor: 'bg-lime-500',
    textColor: 'text-lime-700',
    lightBg: 'bg-lime-100/50',
    hoverBg: 'hover:bg-lime-100/70'
  },
  { 
    name: '生物', 
    emoji: '🧬', 
    color: 'bg-emerald-100 text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    lightBg: 'bg-emerald-100/50',
    hoverBg: 'hover:bg-emerald-100/70'
  },
  { 
    name: '美术', 
    emoji: '🎨', 
    color: 'bg-rose-100 text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    accentColor: 'bg-rose-500',
    textColor: 'text-rose-700',
    lightBg: 'bg-rose-100/50',
    hoverBg: 'hover:bg-rose-100/70'
  },
  { 
    name: '音乐', 
    emoji: '🎵', 
    color: 'bg-violet-100 text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    accentColor: 'bg-violet-500',
    textColor: 'text-violet-700',
    lightBg: 'bg-violet-100/50',
    hoverBg: 'hover:bg-violet-100/70'
  },
  { 
    name: '体育', 
    emoji: '⚽', 
    color: 'bg-red-100 text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'bg-red-500',
    textColor: 'text-red-700',
    lightBg: 'bg-red-100/50',
    hoverBg: 'hover:bg-red-100/70'
  },
  { 
    name: '其他', 
    emoji: '⭐', 
    color: 'bg-pink-100 text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    accentColor: 'bg-pink-500',
    textColor: 'text-pink-700',
    lightBg: 'bg-pink-100/50',
    hoverBg: 'hover:bg-pink-100/70'
  }
]

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

function LoginPage({ onLogin }: { onLogin: (user: UserInfo) => void }) {
  const [role, setRole] = useState<'child' | 'parent' | 'teacher'>('child')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState('')
  const [childName, setChildName] = useState('')
  const [school, setSchool] = useState('')
  const [className, setClassName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [showRoleSelect, setShowRoleSelect] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (role === 'child' && (!nickname.trim() || !classCode.trim())) return
    if (role === 'parent' && !childName.trim()) return
    if (role === 'teacher' && (!nickname.trim() || !school.trim() || !className.trim())) return

    const userId = phone.trim() ? `child-${phone.trim()}` : `child-${nickname.trim()}`

    const user: UserInfo = {
      id: userId,
      nickname: role === 'child' ? nickname : role === 'parent' ? `${childName}的家长` : nickname,
      role,
      phone,
      grade: role === 'child' ? grade : undefined,
      school: role === 'teacher' ? school : undefined,
      className: role === 'teacher' ? className : undefined,
      classCode: role === 'child' ? classCode : undefined
    }

    if (role === 'teacher') {
      const newClass: ClassInfo = {
        id: Date.now().toString(),
        name: className,
        school,
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        students: [],
        joinRequests: [],
        assignments: [],
        announcements: []
      }
      localStorage.setItem(CLASS_KEY, JSON.stringify(newClass))
    }

    if (role === 'child') {
      const savedClass = localStorage.getItem(CLASS_KEY)
      if (!savedClass) {
        alert('当前没有可加入的班级，请让老师先创建班级编码。')
        return
      }
      const classInfo: ClassInfo = JSON.parse(savedClass)
      if (classInfo.code !== classCode.trim()) {
        alert('班级码不正确，请检查后重试。')
        return
      }

      const existingRequest = classInfo.joinRequests.find(r => r.studentId === userId)
      const alreadyInClass = classInfo.students.some(s => s.id === userId)

      if (!alreadyInClass && !existingRequest) {
        classInfo.joinRequests.push({
          id: Date.now(),
          studentId: userId,
          nickname,
          grade,
          status: 'pending',
          requestedAt: new Date().toISOString()
        })
        localStorage.setItem(CLASS_KEY, JSON.stringify(classInfo))
      }
    }

    onLogin(user)
  }

  const roles = [
    { id: 'child' as const, icon: '🎒', title: '学生', desc: '做作业、赚积分、兑奖励' },
    { id: 'parent' as const, icon: '👨‍👩‍👧', title: '家长', desc: '查看进度、管理奖励' },
    { id: 'teacher' as const, icon: '👨‍🏫', title: '老师', desc: '发布作业、班级管理' }
  ]

  if (showRoleSelect) {
    return (<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full"><div className="text-center mb-8"><div className="w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><span className="text-xl">🦸</span></div><h1 className="text-2xl font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">作业闯关小英雄</h1><p className="text-gray-500 mt-2">让学习更有趣</p></div><div className="space-y-3">{roles.map((r) => (<button key={r.id} onClick={() => { setRole(r.id); setShowRoleSelect(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#FFE66D]/20 to-[#FF6B6B]/10 hover:from-[#FFE66D]/40 hover:to-[#FF6B6B]/20 transition-all border-2 border-transparent hover:border-[#FF6B6B]"><span className="text-3xl">{r.icon}</span><div className="text-left"><div className="font-bold text-gray-800">{r.title}</div><div className="text-xs text-gray-500">{r.desc}</div></div><ChevronRight className="w-5 h-5 text-gray-400 ml-auto" /></button>))}</div></div></div>)
  }

  return (<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full"><button onClick={() => setShowRoleSelect(true)} className="flex items-center gap-1 text-gray-500 mb-4"><ChevronRight className="w-4 h-4 rotate-180" /> 返回</button><div className="text-center mb-6"><div className="w-16 h-16 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"><span className="text-2xl">{roles.find(r => r.id === role)?.icon}</span></div><h2 className="text-xl font-bold text-gray-800">{roles.find(r => r.id === role)?.title}登录</h2></div><form onSubmit={handleSubmit} className="space-y-4">{role === 'child' && (<><div><label className="block text-sm font-medium text-gray-700 mb-2">手机号</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">昵称</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="请输入昵称" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" required /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">年级</label><select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none"><option value="">选择年级</option><option value="一年级">一年级</option><option value="二年级">二年级</option><option value="三年级">三年级</option><option value="四年级">四年级</option><option value="五年级">五年级</option><option value="六年级">六年级</option><option value="初一">初一</option><option value="初二">初二</option><option value="初三">初三</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-2">班级码</label><input type="text" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="请输入班级码" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" required /></div></>)}{role === 'parent' && (<><div><label className="block text-sm font-medium text-gray-700 mb-2">手机号</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">绑定孩子昵称</label><input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="请输入孩子昵称" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" required /></div></>)}{role === 'teacher' && (<><div><label className="block text-sm font-medium text-gray-700 mb-2">手机号</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">学校</label><input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="请输入学校名称" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" required /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">班级</label><input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="请输入班级名称（如：三年级一班）" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" required /></div></>)}<button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform">登录 ✨</button></form></div></div>)
}

function StudentHomePage({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [currentSection, setCurrentSection] = useState<'home' | 'points' | 'achievements' | 'records' | 'pomodoro'>('home')
  const [tasks, setTasks] = useState<HomeworkTask[]>([])
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskSubject, setNewTaskSubject] = useState('数学')
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
  const [records, setRecords] = useState<AppRecord[]>([])
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [joinCode, setJoinCode] = useState(user.classCode || '')
  const [assignmentProgress, setAssignmentProgress] = useState<AssignmentProgress[]>([])
  const [activeTimer, setActiveTimer] = useState<HomeworkTask | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitRemark, setSubmitRemark] = useState('')
  const [submitPhoto, setSubmitPhoto] = useState('')

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

    const savedClass = localStorage.getItem(CLASS_KEY)
    if (savedClass) {
      const parsed = JSON.parse(savedClass) as ClassInfo
      const normalized: ClassInfo = {
        ...parsed,
        students: parsed.students || [],
        joinRequests: parsed.joinRequests || [],
        assignments: parsed.assignments || [],
        announcements: parsed.announcements || []
      }
      setClassInfo(normalized)
      setJoinCode(normalized.code)
      const isMember = normalized.students.some(s => s.id === user.id)
      const request = normalized.joinRequests.find(r => r.studentId === user.id)
      if (isMember) setJoinStatus('approved')
      else if (request?.status === 'pending') setJoinStatus('pending')
      else if (request?.status === 'rejected') setJoinStatus('rejected')
      else setJoinStatus('none')
    }

    const savedProgress = localStorage.getItem(`homework-hero-assignment-progress-${user.id}`)
    if (savedProgress) setAssignmentProgress(JSON.parse(savedProgress))
  }, [user.id])

  const saveData = useCallback(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    localStorage.setItem(STARS_KEY, stars.toString())
    localStorage.setItem(STATS_KEY, JSON.stringify(userStats))
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards.filter(r => r.isCustom)))
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedAchievements))
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  }, [tasks, stars, userStats, rewards, unlockedAchievements, records])

  const saveAssignmentProgress = useCallback(() => {
    localStorage.setItem(`homework-hero-assignment-progress-${user.id}`, JSON.stringify(assignmentProgress))
  }, [assignmentProgress, user.id])

  const getAssignmentProgress = (assignmentId: number) => assignmentProgress.find(p => p.assignmentId === assignmentId)

  const submitAssignment = (assignment: Assignment, remark: string, photo?: string) => {
    const points = 10
    const newProgress: AssignmentProgress = {
      assignmentId: assignment.id,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      remark: remark.trim(),
      photo,
      grade: undefined,
      pointsEarned: points
    }
    setAssignmentProgress(prev => [newProgress, ...prev.filter(p => p.assignmentId !== assignment.id)])
    setStars(s => s + points)
    setUserStats(prev => ({ ...prev, totalPoints: prev.totalPoints + points, completedTasks: prev.completedTasks + 1 }))
    addRecord('assignment_submitted', '✅ 提交作业', `提交 ${assignment.title} +${points} 积分`, points)
    checkAchievements()
    saveAssignmentProgress()
    saveData()
  }

  const addRecord = useCallback((type: string, title: string, detail: string, points?: number) => {
    const newRecord: AppRecord = { id: Date.now(), type, title, detail, points, timestamp: new Date().toISOString() }
    setRecords(prev => [newRecord, ...prev].slice(0, 100))
    saveData()
  }, [saveData])

  const checkAchievements = useCallback(() => {
    const newUnlocked: string[] = []
    ACHIEVEMENTS.forEach(a => { if (!unlockedAchievements.includes(a.id) && a.condition(userStats)) newUnlocked.push(a.id) })
    if (newUnlocked.length > 0) { setUnlockedAchievements(prev => [...prev, ...newUnlocked]); addRecord('achievement_unlock', '🏆 解锁新成就', `解锁了 ${newUnlocked.length} 个成就`) }
  }, [userStats, unlockedAchievements, addRecord])

  const addTask = () => {
    if (!newTaskName.trim()) return
    const newTask: HomeworkTask = { id: Date.now(), name: newTaskName, subject: newTaskSubject, completed: false, cancelled: false, pomodorosCompleted: 0, plannedDuration: newTaskDuration, status: 'pending' }
    setTasks([...tasks, newTask])
    setNewTaskName('')
    setNewTaskDuration(25)
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

    // If this timer is tied to a class assignment, record accordingly
    const assignment = classInfo?.assignments?.find(a => a.id === activeTimer.id)
    if (assignment) {
      const existingProgress = getAssignmentProgress(assignment.id)
      const earned = isOvertime ? Math.max(0, points) : points
      const updatedProgress: AssignmentProgress = {
        assignmentId: assignment.id,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        remark: existingProgress?.remark || '',
        photo: existingProgress?.photo,
        pointsEarned: earned
      }
      setAssignmentProgress(prev => [updatedProgress, ...prev.filter(p => p.assignmentId !== assignment.id)])
      saveAssignmentProgress()

      setStars(s => s + earned)
      setUserStats(prev => ({ ...prev, totalPomodoros: prev.totalPomodoros + 1, totalPoints: prev.totalPoints + earned, earlyCompletions: !isOvertime ? prev.earlyCompletions + 1 : prev.earlyCompletions, overtimeCompletions: isOvertime ? prev.overtimeCompletions + 1 : prev.overtimeCompletions }))
      addRecord('assignment_pomodoro', '🍅 作业番茄完成', `完成 ${assignment.title}，获得 ${earned} 积分`, earned)
      checkAchievements()
      saveData()
      setActiveTimer(null)
      return
    }

    setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t))
    setStars(s => s + points)
    setUserStats(prev => ({ ...prev, totalPomodoros: prev.totalPomodoros + 1, totalPoints: prev.totalPoints + points, earlyCompletions: !isOvertime ? prev.earlyCompletions + 1 : prev.earlyCompletions, overtimeCompletions: isOvertime ? prev.overtimeCompletions + 1 : prev.overtimeCompletions }))
    if (isOvertime) { addRecord('points_deducted', '⏰ 超时扣分', `任务 "${activeTimer.name}" 超时，扣除 ${points} 分`, points); setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, status: 'cancelled' as const } : t)) }
    else { addRecord('points_earned', '⭐ 获得积分', `完成 "${activeTimer.name}" +${points} 积分`, points); setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, completed: true, completedAt: new Date().toISOString(), status: 'completed' as const } : t)) }
    checkAchievements()
    saveData()
    setActiveTimer(null)
  }

  const startPomodoroForAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setActiveTimer({
      id: assignment.id,
      name: assignment.title,
      subject: assignment.subject,
      completed: false,
      cancelled: false,
      pomodorosCompleted: 0,
      plannedDuration: 25,
      status: 'in_progress'
    })
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

      {/* 学科任务统计 */}
      {pendingTasks.length + inProgressTasks.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-white">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-[#4ECDC4]" />
            <h3 className="font-bold text-gray-700">学科任务分布</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(() => {
              const activeTasks = [...pendingTasks, ...inProgressTasks]
              const subjectStats = activeTasks.reduce((acc, task) => {
                acc[task.subject] = (acc[task.subject] || 0) + 1
                return acc
              }, {} as Record<string, number>)

              return Object.entries(subjectStats)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([subject, count]) => {
                  const subjectInfo = SUBJECTS.find(s => s.name === subject)
                  return (
                    <div key={subject} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${subjectInfo?.lightBg || 'bg-white/50'} ${subjectInfo?.hoverBg || 'hover:bg-white/70'}`}>
                      <span className="text-lg">{subjectInfo?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{subject}</div>
                        <div className="text-xs text-gray-500">{count} 项任务</div>
                      </div>
                    </div>
                  )
                })
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setShowAddTask(true)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white shadow-md hover:scale-105"><Plus className="w-5 h-5" /><span className="text-[10px] font-medium">添加</span></button>
        <button onClick={() => setCurrentSection('points')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-white shadow-md hover:scale-105"><Star className="w-5 h-5" /><span className="text-[10px] font-medium">积分</span></button>
        <button onClick={() => setCurrentSection('achievements')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#A8E6CF] to-[#4ECDC4] text-white shadow-md hover:scale-105 relative"><Trophy className="w-5 h-5" /><span className="text-[10px] font-medium">成就</span>{unlockedAchievements.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#FF6B6B] text-xs rounded-full font-bold">{unlockedAchievements.length}</span>}</button>
        <button onClick={() => setCurrentSection('records')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white shadow-md hover:scale-105"><History className="w-5 h-5" /><span className="text-[10px] font-medium">记录</span></button>
      </div>

      {classInfo ? (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#4ECDC4]" />
              <h3 className="font-bold text-gray-700">班级作业</h3>
            </div>
            {joinStatus === 'pending' && <span className="text-xs text-orange-500">等待老师审批中</span>}
            {joinStatus === 'rejected' && <span className="text-xs text-red-500">已被拒绝，请联系老师</span>}
          </div>

          {joinStatus === 'approved' ? (
            classInfo.assignments.length === 0 ? (
              <p className="text-sm text-gray-500">老师还未发布作业，敬请期待~</p>
            ) : (
              <div className="space-y-3">
                {classInfo.assignments.map(assign => {
                  const progress = getAssignmentProgress(assign.id)
                  const statusTag = progress?.status === 'submitted' ? '已提交' : '待完成'
                  return (
                    <div key={assign.id} className="border rounded-2xl p-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-800 truncate">{assign.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{assign.subject} {assign.dueDate ? `· 截止 ${assign.dueDate}` : ''}</div>
                        </div>
                        <div className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">{statusTag}</div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => startPomodoroForAssignment(assign)} className="px-3 py-1 rounded-full bg-[#4ECDC4] text-white text-xs">番茄钟</button>
                        <button onClick={() => { setSelectedAssignment(assign); setShowSubmitModal(true); }} className="px-3 py-1 rounded-full bg-[#FF6B6B] text-white text-xs">打卡提交</button>
                        {progress?.pointsEarned != null && <span className="text-xs text-green-600">+{progress.pointsEarned} 积分</span>}
                      </div>
                      {progress?.remark && <div className="mt-2 text-xs text-gray-600">备注：{progress.remark}</div>}
                      {progress?.photo && <img src={progress.photo} alt="提交" className="mt-2 w-full h-24 object-cover rounded-xl" />}
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="text-sm text-gray-500">
              {joinStatus === 'none' ? (
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <span>请输入班级码加入班级查看作业：</span>
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="班级码" className="px-3 py-2 border-2 border-[#FFE66D] rounded-xl text-sm" />
                  <button onClick={() => {
                    const saved = localStorage.getItem(CLASS_KEY)
                    if (!saved) { alert('尚未创建班级，请联系老师'); return }
                    const info = JSON.parse(saved) as ClassInfo
                    if (info.code !== joinCode.trim()) { alert('班级码不正确'); return }
                    if (info.students.some(s => s.id === user.id)) { setJoinStatus('approved'); return }
                    const existing = info.joinRequests.find(r => r.studentId === user.id)
                    if (!existing) {
                      info.joinRequests.push({ id: Date.now(), studentId: user.id, nickname: user.nickname, grade: user.grade, status: 'pending', requestedAt: new Date().toISOString() })
                      localStorage.setItem(CLASS_KEY, JSON.stringify(info))
                    }
                    setJoinStatus('pending')
                    setClassInfo(info)
                  }} className="px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl text-sm">申请加入</button>
                </div>
              ) : (
                <span>请等待老师审批加入班级。</span>
              )}
            </div>
          )}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#4ECDC4]" />作业清单</h3>
          <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-full text-sm font-medium"><Plus className="w-4 h-4" />添加</button>
        </div>
        
        {showAddTask && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-3 border-2 border-[#4ECDC4]/30">
            <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="输入作业名称..." className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none mb-3 text-sm" autoFocus />
            <div className="flex gap-1.5 mb-3 overflow-x-auto">{SUBJECTS.map(s => (<button key={s.name} onClick={() => setNewTaskSubject(s.name)} className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${newTaskSubject === s.name ? s.color + ' ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>{s.emoji} {s.name}</button>))}</div>
            <div className="mb-3"><label className="block text-xs text-gray-500 mb-1">计划时长 (1-120分钟)</label><input type="number" min="1" max="120" value={newTaskDuration} onChange={(e) => { const val = Number(e.target.value); if (val >= 1 && val <= 120) setNewTaskDuration(val); else if (val > 120) setNewTaskDuration(120); else if (val < 1) setNewTaskDuration(1); }} className="w-full px-2 py-1.5 border-2 border-[#FF6B6B] rounded-xl text-sm" placeholder="输入1-120之间的分钟数" /></div>
            <div className="flex gap-2"><button onClick={addTask} className="flex-1 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-medium text-sm">添加</button><button onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium text-sm">取消</button></div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-white/60 rounded-2xl border-2 border-white"><div className="text-4xl mb-2">📚</div><p className="text-gray-500 text-sm">还没有作业任务</p></div>
        ) : (
          <div className="space-y-4">
            {/* 按学科分组显示作业 */}
            {(() => {
              const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
              const groupedTasks = pendingTasks.reduce((acc, task) => {
                if (!acc[task.subject]) acc[task.subject] = []
                acc[task.subject].push(task)
                return acc
              }, {} as Record<string, HomeworkTask[]>)

              return Object.entries(groupedTasks).map(([subject, subjectTasks]) => {
                const subjectInfo = SUBJECTS.find(s => s.name === subject)
                return (
                  <div key={subject} className={`rounded-2xl p-4 shadow-md border-2 transition-all hover:shadow-lg ${subjectInfo?.borderColor || 'border-gray-200'} ${subjectInfo?.bgColor || 'bg-white'} hover:scale-[1.02]`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{subjectInfo?.emoji}</span>
                      <h4 className="font-bold text-gray-700">{subject}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${subjectInfo?.color || 'bg-gray-100'}`}>
                        {(subjectTasks as HomeworkTask[]).length} 项
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(subjectTasks as HomeworkTask[]).slice(0, 5).map(task => (
                        <div key={task.id} className={`rounded-xl p-3 border-2 hover:border-[#A8E6CF] transition-colors ${task.status === 'in_progress' ? 'border-[#4ECDC4] bg-[#4ECDC4]/5' : 'border-gray-100 bg-gray-50/50'}`}>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => !task.completed && completeTask(task.id)} 
                              disabled={task.status === 'in_progress'} 
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                task.completed 
                                  ? 'bg-[#4ECDC4] border-[#4ECDC4]' 
                                  : task.status === 'in_progress' 
                                    ? 'bg-[#FFE66D] border-[#FFE66D] animate-pulse' 
                                    : 'border-[#FFE66D] hover:border-[#4ECDC4]'
                              }`}
                            >
                              {task.completed && <Check className="w-4 h-4 text-white" />}
                              {task.status === 'in_progress' && <Play className="w-3 h-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-800 truncate">{task.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {task.plannedDuration}分钟 
                                {task.pomodorosCompleted > 0 && <span className="text-[#4ECDC4]">• 🍅 {task.pomodorosCompleted}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {task.status === 'pending' && (
                                <button 
                                  onClick={() => { startTask(task.id); setActiveTimer(task); }} 
                                  className="p-1.5 bg-[#4ECDC4] text-white rounded-lg hover:bg-[#3dbdb5] transition-colors"
                                  title="开始番茄钟"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <button 
                                  onClick={() => setActiveTimer(task)} 
                                  className="p-1.5 bg-[#FFE66D] text-white rounded-lg hover:bg-[#ffd43b] transition-colors animate-pulse"
                                  title="继续番茄钟"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => cancelTask(task.id)} 
                                className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                                title="取消任务"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteTask(task.id)} 
                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                title="删除任务"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(subjectTasks as HomeworkTask[]).length > 5 && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-400">还有 {(subjectTasks as HomeworkTask[]).length - 5} 项...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}

            {/* 已完成任务汇总 */}
            {completedTasks.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-white">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-[#4ECDC4]" />
                  <h4 className="font-bold text-gray-700">已完成</h4>
                  <span className="px-2 py-1 bg-[#4ECDC4] text-white rounded-full text-xs font-medium">
                    {completedTasks.length} 项
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {completedTasks.slice(0, 10).map(task => {
                    const subjectInfo = SUBJECTS.find(s => s.name === task.subject)
                    return (
                      <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg opacity-75 ${subjectInfo?.lightBg || 'bg-gray-50'}`}>
                        <span className="text-sm">{subjectInfo?.emoji}</span>
                        <span className="text-sm text-gray-600 line-through flex-1 truncate">{task.name}</span>
                        <span className="text-xs text-gray-400">
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    )
                  })}
                  {completedTasks.length > 10 && (
                    <div className="text-center py-1">
                      <span className="text-xs text-gray-400">还有 {completedTasks.length - 10} 项...</span>
                    </div>
                  )}
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

      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">提交作业</h3>
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">{selectedAssignment.title}</div>
              <textarea value={submitRemark} onChange={(e) => setSubmitRemark(e.target.value)} placeholder="填写完成说明（可选）" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" rows={3} />
              <div className="text-sm text-gray-600 mb-1">上传照片（可选）</div>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  setSubmitPhoto(reader.result as string)
                }
                reader.readAsDataURL(file)
              }} className="w-full" />
              {submitPhoto && <img src={submitPhoto} alt="提交图片" className="mt-3 w-full h-32 object-cover rounded-xl" />}
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                if (!selectedAssignment) return
                submitAssignment(selectedAssignment, submitRemark, submitPhoto)
                setShowSubmitModal(false)
                setSubmitRemark('')
                setSubmitPhoto('')
              }} className="flex-1 py-2 bg-[#4ECDC4] text-white rounded-xl font-medium">提交</button>
              <button onClick={() => {
                setShowSubmitModal(false)
                setSubmitRemark('')
                setSubmitPhoto('')
              }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium">取消</button>
            </div>
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

  useEffect(() => {
    const savedChildren = localStorage.getItem(CHILDREN_KEY)
    if (savedChildren) setChildren(JSON.parse(savedChildren))
  }, [])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center shadow-lg"><span className="text-xl">👨‍👩‍👧</span></div>
              <div><h1 className="text-lg font-black text-gray-800">家长中心</h1><p className="text-xs text-gray-500">管理孩子学习</p></div>
            </div>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
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
  const [newClassSchool, setNewClassSchool] = useState(user.school || '')
  const [newClassName, setNewClassName] = useState(user.className || '')
  const [homeworkName, setHomeworkName] = useState('')
  const [homeworkSubject, setHomeworkSubject] = useState('数学')
  const [homeworkDesc, setHomeworkDesc] = useState('')
  const [homeworkDue, setHomeworkDue] = useState('')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')

  useEffect(() => {
    const savedClass = localStorage.getItem(CLASS_KEY)
    if (savedClass) {
      const parsed = JSON.parse(savedClass) as ClassInfo
      const normalized: ClassInfo = {
        ...parsed,
        students: parsed.students || [],
        joinRequests: parsed.joinRequests || [],
        assignments: parsed.assignments || [],
        announcements: parsed.announcements || []
      }
      setClassInfo(normalized)
      setNewClassSchool(normalized.school || user.school || '')
      setNewClassName(normalized.name || user.className || '')
    }
  }, [user.school, user.className])

  const createClass = () => {
    if (!newClassSchool.trim() || !newClassName.trim()) return
    const newClass: ClassInfo = {
      id: Date.now().toString(),
      name: newClassName,
      school: newClassSchool,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      students: [],
      joinRequests: [],
      assignments: [],
      announcements: []
    }
    setClassInfo(newClass)
    localStorage.setItem(CLASS_KEY, JSON.stringify(newClass))
  }

  const publishHomework = () => {
    if (!homeworkName.trim() || !classInfo) return
    const newAssignment: Assignment = {
      id: Date.now(),
      title: homeworkName.trim(),
      subject: homeworkSubject,
      description: homeworkDesc.trim(),
      dueDate: homeworkDue || undefined,
      createdAt: new Date().toISOString()
    }
    const updatedClass = { ...classInfo, assignments: [newAssignment, ...(classInfo.assignments || [])] }
    setClassInfo(updatedClass)
    localStorage.setItem(CLASS_KEY, JSON.stringify(updatedClass))

    alert(`作业 "${homeworkName}" 已发布到班级 ${classInfo.name}！`)
    setHomeworkName(''); setHomeworkDesc(''); setHomeworkDue('')
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
            <p className="text-gray-500 text-sm mb-4">输入学校和班级信息以完成注册</p>
            <input type="text" value={newClassSchool} onChange={(e) => setNewClassSchool(e.target.value)} placeholder="学校名称" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl mb-3" />
            <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称（如：三年级一班）" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl mb-4" />
            <button onClick={createClass} disabled={!newClassSchool.trim() || !newClassName.trim()} className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold disabled:opacity-50">创建班级</button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-[#4ECDC4]" />{classInfo.name}</h3>
                  <p className="text-xs text-gray-500">学校：{classInfo.school || user.school || '未知'}</p>
                </div>
                <div className="px-3 py-1 bg-[#FFE66D] rounded-full text-sm font-bold">{classInfo.code}</div>
              </div>
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-[#4ECDC4]">{classInfo.students.length}</div>
                <div className="text-sm text-gray-500">名学生</div>
              </div>
            </div>

            {classInfo.joinRequests && classInfo.joinRequests.some(r => r.status === 'pending') && (
              <div className="bg-white rounded-2xl p-4 shadow-lg">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-[#FF6B6B]" />入班申请</h3>
                {classInfo.joinRequests.filter(r => r.status === 'pending').map(r => (
                  <div key={r.id} className="flex items-center justify-between border-b last:border-b-0 border-gray-200 py-2">
                    <div>
                      <div className="font-medium">{r.nickname}</div>
                      <div className="text-xs text-gray-500">{r.grade || '暂无年级'} · {new Date(r.requestedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const updated = { ...classInfo } as ClassInfo
                        updated.joinRequests = updated.joinRequests.map(j => j.id === r.id ? { ...j, status: 'approved' } : j)
                        updated.students = [...updated.students, { id: r.studentId, nickname: r.nickname, grade: r.grade, stars: 0, joinedAt: new Date().toISOString() }]
                        setClassInfo(updated)
                        localStorage.setItem(CLASS_KEY, JSON.stringify(updated))
                      }} className="px-3 py-1 bg-[#4ECDC4] text-white rounded-full text-xs">通过</button>
                      <button onClick={() => {
                        const updated = { ...classInfo } as ClassInfo
                        updated.joinRequests = updated.joinRequests.map(j => j.id === r.id ? { ...j, status: 'rejected' } : j)
                        setClassInfo(updated)
                        localStorage.setItem(CLASS_KEY, JSON.stringify(updated))
                      }} className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">拒绝</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookMarked className="w-5 h-5 text-[#FF6B6B]" />发布作业</h3>
              <input type="text" value={homeworkName} onChange={(e) => setHomeworkName(e.target.value)} placeholder="作业标题" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" />
              <div className="flex gap-2 mb-3 overflow-x-auto">{SUBJECTS.map(s => (<button key={s.name} onClick={() => setHomeworkSubject(s.name)} className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${homeworkSubject === s.name ? s.color + ' ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>{s.emoji} {s.name}</button>))}</div>
              <textarea value={homeworkDesc} onChange={(e) => setHomeworkDesc(e.target.value)} placeholder="作业描述（可选）" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-3" rows={3} />
              <input type="date" value={homeworkDue} onChange={(e) => setHomeworkDue(e.target.value)} className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-4" />
              <button onClick={publishHomework} disabled={!homeworkName.trim()} className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold disabled:opacity-50">发布作业</button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#A8E6CF]" />数据统计</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FFE66D]">{classInfo.students.length}</div><div className="text-xs text-gray-500">学生数</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#4ECDC4]">{classInfo.assignments.length}</div><div className="text-xs text-gray-500">发布作业</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#FF6B6B]">{classInfo.joinRequests.filter(r => r.status === 'pending').length}</div><div className="text-xs text-gray-500">待审批</div></div>
                <div className="bg-gray-50 p-3 rounded-xl"><div className="text-2xl font-bold text-[#A8E6CF]">{classInfo.announcements.length}</div><div className="text-xs text-gray-500">公告数量</div></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#4ECDC4]" />学生列表</h3>
              {classInfo.students.length === 0 ? (
                <p className="text-sm text-gray-500">当前暂无学生加入，学生通过班级码申请加入后会显示在这里。</p>
              ) : (
                <div className="space-y-2">
                  {classInfo.students.map(s => (
                    <div key={s.id} className="flex items-center justify-between border rounded-xl p-3">
                      <div>
                        <div className="font-medium">{s.nickname}</div>
                        <div className="text-xs text-gray-500">{s.grade || '未知'} • {s.stars} 积分</div>
                      </div>
                      <button onClick={() => {
                        const points = parseInt(prompt('输入要奖励的积分数量（正数为加分，负数为扣分）', '10') || '0', 10)
                        if (!Number.isFinite(points)) return
                        const updated = { ...classInfo }
                        updated.students = updated.students.map(st => st.id === s.id ? { ...st, stars: Math.max(0, st.stars + points) } : st)
                        setClassInfo(updated)
                        localStorage.setItem(CLASS_KEY, JSON.stringify(updated))
                      }} className="text-xs px-3 py-1 bg-[#4ECDC4] text-white rounded-full">奖励积分</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#FFB347]" />班级公告</h3>
              <div className="mb-3">
                <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="公告标题" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-2" />
                <textarea value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} placeholder="公告内容" className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl mb-2" rows={3} />
                <button onClick={() => {
                  if (!announcementTitle.trim() || !announcementContent.trim() || !classInfo) return
                  const updated = { ...classInfo }
                  updated.announcements = [{ id: Date.now(), title: announcementTitle.trim(), content: announcementContent.trim(), createdAt: new Date().toISOString() }, ...(updated.announcements || [])]
                  setClassInfo(updated)
                  localStorage.setItem(CLASS_KEY, JSON.stringify(updated))
                  setAnnouncementTitle(''); setAnnouncementContent('')
                }} className="w-full py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold">发布公告</button>
              </div>
              <div className="space-y-2">
                {classInfo.announcements.length === 0 ? <p className="text-xs text-gray-500">暂无公告</p> : classInfo.announcements.map(a => (
                  <div key={a.id} className="border p-3 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{a.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)

  useEffect(() => { const user = getCurrentUser(); if (user) { setIsLoggedIn(true); setCurrentUser(user) } }, [])

  const handleLogin = (user: UserInfo) => { setCurrentUser(user); localStorage.setItem('homework-hero-user', JSON.stringify(user)); setIsLoggedIn(true) }
  const handleLogout = () => { logout(); setIsLoggedIn(false); setCurrentUser(null) }

  if (!isLoggedIn || !currentUser) return <LoginPage onLogin={handleLogin} />

  if (currentUser.role === 'parent') return <ParentHomePage user={currentUser} onLogout={handleLogout} />
  if (currentUser.role === 'teacher') return <TeacherHomePage user={currentUser} onLogout={handleLogout} />
  return <StudentHomePage user={currentUser} onLogout={handleLogout} />
}
