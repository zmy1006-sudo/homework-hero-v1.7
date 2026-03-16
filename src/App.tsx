import { useState, useEffect, useRef } from 'react'
import { Sparkles, BookOpen, Trophy, Play, Plus, Trash2, Star, LogOut, Gift, History, Award, Check, Edit2, Pause, RotateCcw, X } from 'lucide-react'
import { getCurrentUser, logout, UserInfo } from './lib/auth'
import './App.css'

interface HomeworkTask { id: number; name: string; subject: string; completed: boolean; pomodorosCompleted: number; plannedDuration: number; completedAt?: string }

// 番茄钟计时器组件 - V1.1优化版本
function PomodoroTimer({ task, onComplete, onCancel }: { task: HomeworkTask; onComplete: (points: number, isOvertime: boolean) => void; onCancel: () => void }) {
  const [timeLeft, setTimeLeft] = useState(task.plannedDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const calculateExpectedPoints = (minutes: number) => Math.floor(minutes / 25) + 1
  
  const calculateCurrentPoints = () => {
    if (isOvertime) {
      const overtimeMinutes = Math.abs(timeLeft) / 60
      const deduction = Math.max(1, Math.floor(overtimeMinutes / 10))
      return -deduction
    }
    return calculateExpectedPoints(task.plannedDuration)
  }

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const sign = seconds < 0 ? '-' : ''
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalSeconds = task.plannedDuration * 60
  const progress = isOvertime ? 100 : Math.max(0, ((totalSeconds - timeLeft) / totalSeconds) * 100)
  const remainingProgress = 100 - progress

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime < 0 && !isOvertime) {
            setIsOvertime(true)
          }
          return newTime
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isOvertime])

  const handleStart = () => setIsRunning(true)
  const handlePause = () => setIsRunning(false)
  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(task.plannedDuration * 60)
    setIsOvertime(false)
  }

  const handleFinishEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const points = calculateExpectedPoints(task.plannedDuration)
    onComplete(points, false)
  }

  const handleOvertimeComplete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const overtimeMinutes = Math.abs(timeLeft) / 60
    const deduction = Math.max(1, Math.floor(overtimeMinutes / 10))
    onComplete(-deduction, true)
  }

  const currentPoints = calculateCurrentPoints()
  const expectedPoints = calculateExpectedPoints(task.plannedDuration)

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOvertime ? 'bg-red-50' : 'bg-white/95'}`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isOvertime ? 'bg-red-100 border-4 border-red-400 animate-pulse' : 'bg-white border-2 border-[#FFE66D]'}`}>
        <div className={`px-6 py-4 ${isOvertime ? 'bg-red-200' : 'bg-gradient-to-r from-[#FFE66D]/30 to-[#FF6B6B]/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${SUBJECTS.find(s => s.name === task.subject)?.color || 'bg-gray-100'}`}>
                {SUBJECTS.find(s => s.name === task.subject)?.emoji} {task.subject}
              </span>
              {isOvertime && <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">超时</span>}
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mt-2">{task.name}</h2>
          <p className="text-sm text-gray-500 mt-1">计划时长: {task.plannedDuration} 分钟</p>
        </div>

        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {!isRunning && timeLeft === task.plannedDuration * 60 && <span>预计可获得: <span className="font-bold text-[#4ECDC4]">+{expectedPoints}分</span></span>}
              {isRunning && !isOvertime && <span>当前可获得: <span className="font-bold text-[#4ECDC4]">+{currentPoints}分</span></span>}
              {isRunning && isOvertime && <span>当前扣除: <span className="font-bold text-red-500">{currentPoints}分</span></span>}
            </div>
            <div className="text-xs text-gray-400">剩余 {Math.ceil(timeLeft / 60)} 分钟</div>
          </div>
        </div>

        <div className="px-6 py-2">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${isOvertime ? 'bg-red-500' : 'bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF]'}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>已完成 {Math.round(progress)}%</span>
            <span>剩余 {Math.round(remainingProgress)}%</span>
          </div>
        </div>

        <div className="px-6 py-8 text-center">
          <div className={`text-7xl font-black mb-6 tracking-wider ${isOvertime ? 'text-red-500' : 'text-gray-800'}`}>
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex justify-center gap-4">
            {!isRunning ? (
              <button onClick={handleStart} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                <Play className="w-6 h-6" /> 开始
              </button>
            ) : (
              <button onClick={handlePause} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                <Pause className="w-6 h-6" /> 暂停
              </button>
            )}
            <button onClick={handleReset} className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
              <RotateCcw className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            {!isOvertime && timeLeft < task.plannedDuration * 60 && (
              <button onClick={handleFinishEarly} className="px-6 py-2 bg-[#4ECDC4] text-white rounded-full font-medium text-sm hover:bg-[#3dbdb5] transition-colors">
                提前完成 +{expectedPoints}分
              </button>
            )}
            {isOvertime && (
              <button onClick={handleOvertimeComplete} className="px-6 py-2 bg-red-500 text-white rounded-full font-medium text-sm hover:bg-red-600 transition-colors animate-pulse">
                确认超时 {currentPoints}分
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Reward { id: number; name: string; points: number; icon: string; isCustom: boolean }
interface Achievement { id: string; name: string; description: string; icon: string; condition: (stats: UserStats) => boolean }
interface Record { id: number; type: string; title: string; detail: string; points?: number; timestamp: string }
interface UserStats { totalPomodoros: number; totalPoints: number; completedTasks: number; currentStreak: number; totalRewardsRedeemed: number; earlyCompletions: number; overtimeCompletions: number; perfectDays: number }

const SUBJECTS = [
  { name: '语文', emoji: '📝', color: 'bg-yellow-100 text-yellow-700' },
  { name: '数学', emoji: '🔢', color: 'bg-blue-100 text-blue-700' },
  { name: '英语', emoji: '📚', color: 'bg-purple-100 text-purple-700' },
  { name: '科学', emoji: '🔬', color: 'bg-green-100 text-green-700' },
  { name: '其他', emoji: '⭐', color: 'bg-pink-100 text-pink-700' }
]

const DEFAULT_REWARDS: Reward[] = [
  { id: 1, name: '看动画片30分钟', points: 50, icon: '📺', isCustom: false },
  { id: 2, name: '玩电子游戏1小时', points: 80, icon: '🎮', isCustom: false },
  { id: 3, name: '买玩具', points: 200, icon: '🧸', isCustom: false },
  { id: 4, name: '去游乐场', points: 300, icon: '🎢', isCustom: false },
  { id: 5, name: '吃冰淇淋', points: 30, icon: '🍦', isCustom: false }
]

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_task', name: '初战告捷', description: '完成第一个作业任务', icon: '🌟', condition: (s) => s.completedTasks >= 1 },
  { id: 'pomodoro_1', name: '番茄新手', description: '完成1个番茄钟', icon: '🍅', condition: (s) => s.totalPomodoros >= 1 },
  { id: 'pomodoro_10', name: '番茄达人', description: '完成10个番茄钟', icon: '🥫', condition: (s) => s.totalPomodoros >= 10 },
  { id: 'points_100', name: '百分英雄', description: '累计获得100积分', icon: '💯', condition: (s) => s.totalPoints >= 100 },
  { id: 'early_bird', name: '先驱者', description: '提前完成5次任务', icon: '🚀', condition: (s) => s.earlyCompletions >= 5 },
  { id: 'streak_3', name: '三天连续', description: '连续3天完成任务', icon: '🔥', condition: (s) => s.currentStreak >= 3 },
  { id: 'reward_1', name: '小有所获', description: '兑换第一个奖励', icon: '🎁', condition: (s) => s.totalRewardsRedeemed >= 1 },
  { id: 'task_10', name: '小试牛刀', description: '累计完成10个任务', icon: '📚', condition: (s) => s.completedTasks >= 10 }
]

const TASKS_KEY = 'homework-hero-tasks'
const STARS_KEY = 'homework-hero-stars'
const STATS_KEY = 'homework-hero-stats'
const RECORDS_KEY = 'homework-hero-records'
const ACHIEVEMENTS_KEY = 'homework-hero-achievements'
const REWARDS_KEY = 'homework-hero-rewards'

type SectionType = 'home' | 'tasks' | 'achievements' | 'rewards' | 'records'

function App() {
  const [currentSection, setCurrentSection] = useState<SectionType>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [tasks, setTasks] = useState<HomeworkTask[]>([])
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskSubject, setNewTaskSubject] = useState('数学')
  const [newTaskDuration, setNewTaskDuration] = useState(25)
  const [showAddTask, setShowAddTask] = useState(false)
  const [stars, setStars] = useState(0)
  const [userStats, setUserStats] = useState<UserStats>({ totalPomodoros: 0, totalPoints: 0, completedTasks: 0, currentStreak: 0, totalRewardsRedeemed: 0, earlyCompletions: 0, overtimeCompletions: 0, perfectDays: 0 })
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS)
  const [showAddReward, setShowAddReward] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardPoints, setNewRewardPoints] = useState(50)
  const [newRewardIcon, setNewRewardIcon] = useState('🎁')
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [activeTimer, setActiveTimer] = useState<HomeworkTask | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')

  const homeRef = useRef<HTMLDivElement>(null)
  const tasksRef = useRef<HTMLDivElement>(null)
  const achievementsRef = useRef<HTMLDivElement>(null)
  const rewardsRef = useRef<HTMLDivElement>(null)
  const recordsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { 
    const user = getCurrentUser(); 
    if (user) { setIsLoggedIn(true); setCurrentUser(user); loadUserData() } 
  }, [])

  const loadUserData = () => { 
    const savedStars = localStorage.getItem(STARS_KEY); 
    if (savedStars) setStars(parseInt(savedStars, 10)); 
    const savedTasks = localStorage.getItem(TASKS_KEY); 
    if (savedTasks) setTasks(JSON.parse(savedTasks)); 
    const savedStats = localStorage.getItem(STATS_KEY); 
    if (savedStats) setUserStats(JSON.parse(savedStats)); 
    const savedRewards = localStorage.getItem(REWARDS_KEY); 
    if (savedRewards) setRewards([...DEFAULT_REWARDS, ...JSON.parse(savedRewards)]); 
    const savedAchievements = localStorage.getItem(ACHIEVEMENTS_KEY); 
    if (savedAchievements) setUnlockedAchievements(JSON.parse(savedAchievements)); 
    const savedRecords = localStorage.getItem(RECORDS_KEY); 
    if (savedRecords) setRecords(JSON.parse(savedRecords)) 
  }

  const saveData = () => { 
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); 
    localStorage.setItem(STARS_KEY, stars.toString()); 
    localStorage.setItem(STATS_KEY, JSON.stringify(userStats)); 
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards.filter(r => r.isCustom))); 
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedAchievements)); 
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records)) 
  }

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!nicknameInput.trim()) return; 
    const user: UserInfo = { id: Date.now().toString(), nickname: nicknameInput.trim(), role: 'child' }; 
    setCurrentUser(user); 
    localStorage.setItem('homework-hero-user', JSON.stringify(user)); 
    setIsLoggedIn(true); 
    loadUserData() 
  }

  const handleLogout = () => { logout(); setIsLoggedIn(false); setCurrentUser(null) }

  const addRecord = (type: string, title: string, detail: string, points?: number) => { 
    const newRecord: Record = { id: Date.now(), type, title, detail, points, timestamp: new Date().toISOString() }; 
    setRecords(prev => [newRecord, ...prev].slice(0, 100)); 
    saveData() 
  }

  const checkAchievements = () => { 
    const newUnlocked: string[] = []; 
    ACHIEVEMENTS.forEach(a => { if (!unlockedAchievements.includes(a.id) && a.condition(userStats)) newUnlocked.push(a.id) }); 
    if (newUnlocked.length > 0) { setUnlockedAchievements(prev => [...prev, ...newUnlocked]); addRecord('achievement_unlock', '🏆 解锁新成就', `解锁了 ${newUnlocked.length} 个成就`) } 
  }

  const addTask = () => { 
    if (!newTaskName.trim()) return; 
    const newTask: HomeworkTask = { id: Date.now(), name: newTaskName, subject: newTaskSubject, completed: false, pomodorosCompleted: 0, plannedDuration: newTaskDuration }; 
    setTasks([...tasks, newTask]); 
    setNewTaskName(''); 
    setNewTaskDuration(25); 
    setShowAddTask(false); 
    saveData() 
  }

  const deleteTask = (id: number) => { setTasks(tasks.filter(t => t.id !== id)); saveData() }
  const completeTask = (id: number) => { setTasks(tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t)); setUserStats(prev => ({ ...prev, completedTasks: prev.completedTasks + 1 })); saveData() }

  const addReward = () => { 
    if (!newRewardName.trim()) return; 
    const newReward: Reward = { id: Date.now(), name: newRewardName, points: newRewardPoints, icon: newRewardIcon, isCustom: true }; 
    const customRewards = rewards.filter(r => r.isCustom)
    setRewards([...DEFAULT_REWARDS, ...customRewards, newReward]); 
    setNewRewardName(''); setNewRewardPoints(50); setNewRewardIcon('🎁'); setShowAddReward(false); saveData() 
  }

  const updateReward = () => { 
    if (!editingReward || !newRewardName.trim()) return; 
    const customRewards = rewards.filter(r => r.isCustom).map(r => r.id === editingReward.id ? { ...r, name: newRewardName, points: newRewardPoints, icon: newRewardIcon } : r); 
    setRewards([...DEFAULT_REWARDS, ...customRewards]); 
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
    } else {
      alert(`积分不足！需要 ${reward.points} 积分，你当前有 ${stars} 积分`)
    }
  }

  const handleTimerComplete = (points: number, isOvertime: boolean) => {
    if (!activeTimer) return
    const pts = points
    setTasks(tasks.map(t => t.id === activeTimer.id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t))
    setStars(s => s + pts)
    setUserStats(prev => ({ ...prev, totalPomodoros: prev.totalPomodoros + 1, totalPoints: prev.totalPoints + pts, earlyCompletions: !isOvertime ? prev.earlyCompletions + 1 : prev.earlyCompletions, overtimeCompletions: isOvertime ? prev.overtimeCompletions + 1 : prev.overtimeCompletions }))
    if (isOvertime) { addRecord('points_deducted', '⏰ 超时扣分', `任务 "${activeTimer.name}" 超时 ${pts} 分`, pts) }
    else { addRecord('points_earned', '⭐ 获得积分', `完成 "${activeTimer.name}" +${pts} 积分`, pts) }
    checkAchievements()
    saveData()
    setActiveTimer(null)
  }

  const formatDate = (dateStr: string) => { 
    const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime(); 
    const m = Math.floor(diff / 60000); const h = Math.floor(diff / 3600000); const d = Math.floor(diff / 86400000); 
    if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`; if (h < 24) return `${h}小时前`; if (d < 7) return `${d}天前`; 
    return date.toLocaleDateString('zh-CN') 
  }

  const scrollToSection = (section: SectionType) => {
    setCurrentSection(section)
    const refMap: Record<SectionType, React.RefObject<HTMLDivElement | null>> = { home: homeRef, tasks: tasksRef, achievements: achievementsRef, rewards: rewardsRef, records: recordsRef }
    refMap[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function NavButton({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; badge?: number }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all relative ${isActive ? 'text-[#FF6B6B]' : 'text-gray-400 hover:text-gray-600'}`}>
        <div className="relative">{icon}{badge !== undefined && badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B6B] text-white text-xs rounded-full flex items-center justify-center">{badge}</span>}</div>
        <span className="text-[10px] font-medium">{label}</span>
        {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF6B6B] rounded-full" />}
      </button>
    )
  }

  const renderAuth = () => (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><span className="text-xl">🦸</span></div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">作业闯关小英雄</h1>
          <p className="text-gray-500 mt-2">单页面版本 - 让学习更有趣</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">你的昵称</label><input type="text" value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder="请输入昵称" className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none" autoFocus /></div>
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02]">开始冒险 ✨</button>
        </form>
      </div>
    </div>
  )

  const renderMainPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-24">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center shadow-lg"><span className="text-xl">🦸</span></div>
              <div><h1 className="text-lg font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">作业闯关小英雄</h1><p className="text-xs text-gray-500">单页面版</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-[#FFE66D]/30 rounded-full"><Star className="w-4 h-4 text-[#FF6B6B] fill-[#FF6B6B]" /><span className="font-bold text-[#FF6B6B] text-sm">{stars}</span></div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* 欢迎区域 */}
        <div ref={homeRef} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-white">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-5 h-5 text-[#FFE66D]" /><h2 className="text-lg font-bold text-gray-800">欢迎回来，{currentUser?.nickname || '小英雄'}！</h2></div>
          <p className="text-gray-600 text-sm">今日目标：完成 {tasks.filter(t => !t.completed).length} 项作业</p>
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="text-center"><div className="text-lg font-bold text-[#4ECDC4]">{userStats.totalPomodoros}</div><div className="text-xs text-gray-500">番茄钟</div></div>
            <div className="text-center"><div className="text-lg font-bold text-[#FF6B6B]">{userStats.completedTasks}</div><div className="text-xs text-gray-500">完成任务</div></div>
            <div className="text-center"><div className="text-lg font-bold text-[#FFE66D]">{unlockedAchievements.length}</div><div className="text-xs text-gray-500">成就</div></div>
            <div className="text-center"><div className="text-lg font-bold text-[#A8E6CF]">{userStats.totalPoints}</div><div className="text-xs text-gray-500">总积分</div></div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setShowAddTask(true)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white shadow-md hover:scale-105"><Plus className="w-5 h-5" /><span className="text-[10px] font-medium">添加</span></button>
          <button onClick={() => scrollToSection('rewards')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-white shadow-md hover:scale-105"><Gift className="w-5 h-5" /><span className="text-[10px] font-medium">奖励</span></button>
          <button onClick={() => scrollToSection('achievements')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#A8E6CF] to-[#4ECDC4] text-white shadow-md hover:scale-105 relative"><Trophy className="w-5 h-5" /><span className="text-[10px] font-medium">成就</span>{unlockedAchievements.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#FF6B6B] text-xs rounded-full font-bold">{unlockedAchievements.length}</span>}</button>
          <button onClick={() => scrollToSection('records')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white shadow-md hover:scale-105"><History className="w-5 h-5" /><span className="text-[10px] font-medium">记录</span></button>
        </div>

        {/* 任务清单区域 */}
        <div ref={tasksRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#4ECDC4]" />作业清单</h3>
            <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-full text-sm font-medium"><Plus className="w-4 h-4" />添加</button>
          </div>
          
          {showAddTask && (
            <div className="bg-white rounded-2xl p-4 shadow-lg mb-3 border-2 border-[#4ECDC4]/30">
              <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="输入作业名称..." className="w-full px-3 py-2 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none mb-3 text-sm" autoFocus />
              <div className="flex gap-1.5 mb-3 overflow-x-auto">{SUBJECTS.map(s => (<button key={s.name} onClick={() => setNewTaskSubject(s.name)} className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${newTaskSubject === s.name ? s.color + ' ring-2 ring-[#FF6B6B]' : 'bg-gray-100'}`}>{s.emoji} {s.name}</button>))}</div>
              <div className="mb-3"><label className="block text-xs text-gray-500 mb-1">计划时长</label><select value={newTaskDuration} onChange={(e) => setNewTaskDuration(Number(e.target.value))} className="w-full px-2 py-1.5 border-2 border-[#FF6B6B] rounded-xl text-sm">{[...Array(120)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}分钟</option>)}</select></div>
              <div className="flex gap-2"><button onClick={addTask} className="flex-1 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-medium text-sm">添加</button><button onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-medium text-sm">取消</button></div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-8 bg-white/60 rounded-2xl border-2 border-white"><div className="text-4xl mb-2">📚</div><p className="text-gray-500 text-sm">还没有作业任务</p></div>
          ) : (
            tasks.slice(0, 5).map(task => (
              <div key={task.id} className={`bg-white rounded-2xl p-3 shadow-md hover:shadow-lg border-2 hover:border-[#A8E6CF] ${task.completed ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => !task.completed && completeTask(task.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-[#4ECDC4] border-[#4ECDC4]' : 'border-[#FFE66D] hover:border-[#4ECDC4]'}`}>{task.completed && <Check className="w-4 h-4 text-white" />}</button>
                  <div className="flex