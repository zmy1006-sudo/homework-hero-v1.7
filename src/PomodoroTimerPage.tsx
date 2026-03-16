import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, Check, RotateCcw } from 'lucide-react'

// Types
export interface HomeworkTask {
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

export interface Distraction {
  id: number
  type: string
  timestamp: number
}

// V1.6 规定的分心类型
const DISTRACTION_TYPES = [
  { type: '喝水', emoji: '💧' },
  { type: '伸懒腰', emoji: '🙆' },
  { type: '上厕所', emoji: '🚽' },
  { type: '吃东西', emoji: '🍎' },
  { type: '发呆', emoji: '😴' },
  { type: '看课外书', emoji: '📖' },
  { type: '玩玩具', emoji: '🧸' },
  { type: '其他', emoji: '📌' }
]

const POMODORO_STORAGE_KEY = 'homework-hero-pomodoro-state'

// V1.6 Apple Watch 风格 SVG 环形进度条
function PomodoroRing({ progress, isOvertime }: { progress: number; isOvertime: boolean }) {
  const size = 256
  const viewBox = "0 0 256 256"
  
  // V1.6 规格
  const outerRadius = 116
  const innerRadius = 104
  const progressRadius = 92
  const outerStrokeWidth = 8
  const innerStrokeWidth = 4
  const progressStrokeWidth = 12
  
  const circumference = progressRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference
  
  // V1.6 颜色规范
  const getProgressColor = () => {
    if (isOvertime) return '#FF6B6B'
    if (progress > 80) return '#EF4444'  // 红色
    if (progress >= 50) return '#FBBF24'  // 橙色
    return '#4ADE80'  // 绿色
  }
  
  const progressColor = getProgressColor()
  
  return (
    <svg width={size} height={size} viewBox={viewBox} className="transform -rotate-90">
      <defs>
        {/* 发光效果 */}
        <filter id="pomodoro-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* 背景圆环 */}
      <circle 
        cx={128} 
        cy={128} 
        r={progressRadius} 
        fill="none" 
        stroke="#E5E7EB" 
        strokeWidth={progressStrokeWidth} 
      />
      
      {/* 外圈：发光效果环 - 半径116，线宽8 */}
      <circle 
        cx={128} 
        cy={128} 
        r={outerRadius} 
        fill="none" 
        stroke={progressColor} 
        strokeWidth={outerStrokeWidth} 
        strokeLinecap="round" 
        opacity={0.3}
        filter="url(#pomodoro-glow)"
      />
      
      {/* 进度环 - 半径92，线宽12，圆角末端 */}
      <circle 
        cx={128} 
        cy={128} 
        r={progressRadius} 
        fill="none" 
        stroke={progressColor} 
        strokeWidth={progressStrokeWidth} 
        strokeLinecap="round" 
        strokeDasharray={circumference} 
        strokeDashoffset={strokeDashoffset} 
        className="transition-all duration-1000"
        filter="url(#pomodoro-glow)"
      />
      
      {/* 内圈：装饰环 - 半径104，线宽4，虚线装饰 */}
      <circle 
        cx={128} 
        cy={128} 
        r={innerRadius} 
        fill="none" 
        stroke={progressColor} 
        strokeWidth={innerStrokeWidth} 
        strokeLinecap="round" 
        strokeDasharray="8 6"
        opacity={0.4}
      />
    </svg>
  )
}

interface PomodoroTimerPageProps {
  task: HomeworkTask
  onComplete: (points: number, isOvertime: boolean, distractions: Distraction[]) => void
  onCancel: () => void
}

// 计算预期分数
function calculateExpectedPoints(minutes: number): number {
  return Math.floor(minutes / 25) + 1
}

// 格式化时间
function formatTime(seconds: number): string {
  const absSeconds = Math.abs(seconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 格式化超时时间
function formatOvertimeTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function PomodoroTimerPage({ task, onComplete, onCancel }: PomodoroTimerPageProps) {
  const [timeLeft, setTimeLeft] = useState(task.plannedDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  const [distractions, setDistractions] = useState<Distraction[]>([])
  const [showDistractionModal, setShowDistractionModal] = useState(false)
  const [showRestModal, setShowRestModal] = useState(false)
  const [restTimeLeft, setRestTimeLeft] = useState(5 * 60) // 5分钟休息
  const [isResting, setIsResting] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const restIntervalRef = useRef<number | null>(null)

  const totalSeconds = task.plannedDuration * 60
  const progress = isOvertime ? 100 : Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100))
  
  // V1.6 颜色规范
  const getProgressColor = () => {
    if (isOvertime) return '#FF6B6B'
    if (progress > 80) return '#EF4444'
    if (progress >= 50) return '#FBBF24'
    return '#4ADE80'
  }
  
  const progressColor = getProgressColor()
  
  // V1.6 背景颜色联动
  const getBackgroundColor = () => {
    if (isOvertime) return 'bg-red-50'
    if (progress > 80) return 'bg-red-50'
    if (progress >= 50) return 'bg-orange-50'
    return 'bg-green-50/50'
  }
  
  // V1.6 卡片样式
  const getCardStyle = () => {
    if (isOvertime) {
      return 'bg-red-100 border-4 border-red-400 animate-pulse'
    }
    if (progress > 80) {
      return 'bg-red-50 border-4 border-red-300'
    }
    if (progress >= 50) {
      return 'bg-orange-50 border-4 border-orange-300'
    }
    return 'bg-white border-2 border-green-200'
  }

  // 计算当前可获得分数
  const calculateCurrentPoints = useCallback(() => {
    if (isOvertime) {
      const overtimeMinutes = Math.abs(timeLeft) / 60
      // 超时分钟 × 1分扣除，最低0分
      const deduction = Math.max(0, Math.floor(overtimeMinutes))
      return -deduction
    }
    return calculateExpectedPoints(task.plannedDuration)
  }, [isOvertime, timeLeft, task.plannedDuration])

  // 保存状态到 localStorage
  const saveState = useCallback(() => {
    const state = {
      taskId: task.id,
      timeLeft,
      isRunning,
      isOvertime,
      startTime: Date.now(),
      distractions: distractions.map(d => ({ type: d.type, timestamp: d.timestamp }))
    }
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state))
  }, [task.id, timeLeft, isRunning, isOvertime, distractions])

  // 从 localStorage 恢复状态
  const restoreState = useCallback(() => {
    const saved = localStorage.getItem(POMODORO_STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.taskId === task.id) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
          const newTimeLeft = state.timeLeft - elapsed
          
          if (newTimeLeft < 0 && !state.isOvertime) {
            setIsOvertime(true)
            setTimeLeft(newTimeLeft)
          } else {
            setTimeLeft(newTimeLeft)
          }
          
          if (state.distractions) {
            setDistractions(state.distractions.map((d: { type: string; timestamp: number }, i: number) => ({
              id: i,
              type: d.type,
              timestamp: d.timestamp
            })))
          }
          
          // 如果之前在运行，恢复运行状态
          if (state.isRunning) {
            setIsRunning(true)
          }
        }
      } catch (e) {
        console.error('Failed to restore pomodoro state:', e)
      }
    }
  }, [task.id])

  // 初始化时恢复状态
  useEffect(() => {
    restoreState()
  }, [restoreState])

  // 主计时器
  useEffect(() => {
    if (isRunning && !isResting) {
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, isOvertime, isResting])

  // 保存状态变化
  useEffect(() => {
    if (isRunning) {
      saveState()
    }
  }, [isRunning, timeLeft, isOvertime, distractions, saveState])

  // 清理 localStorage
  useEffect(() => {
    return () => {
      localStorage.removeItem(POMODORO_STORAGE_KEY)
    }
  }, [])

  // 处理开始
  const handleStart = () => {
    setIsRunning(true)
    saveState()
  }

  // 处理暂停
  const handlePause = () => {
    setIsRunning(false)
    localStorage.removeItem(POMODORO_STORAGE_KEY)
  }

  // 处理重置
  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(task.plannedDuration * 60)
    setIsOvertime(false)
    setDistractions([])
    localStorage.removeItem(POMODORO_STORAGE_KEY)
  }

  // 处理完成（提前完成）
  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    localStorage.removeItem(POMODORO_STORAGE_KEY)
    onComplete(calculateExpectedPoints(task.plannedDuration), false, distractions)
  }

  // 处理超时完成
  const handleOvertimeComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    const overtimeMinutes = Math.abs(timeLeft) / 60
    // 超时分钟×1分扣除，最低0分
    const deduction = Math.max(0, Math.floor(overtimeMinutes))
    localStorage.removeItem(POMODORO_STORAGE_KEY)
    onComplete(-deduction, true, distractions)
  }

  // 处理放弃
  const handleGiveUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    localStorage.removeItem(POMODORO_STORAGE_KEY)
    onCancel()
  }

  // 添加分心记录
  const addDistraction = (type: string) => {
    setDistractions([...distractions, {
      id: Date.now(),
      type,
      timestamp: Date.now()
    }])
    setShowDistractionModal(false)
  }

  // 开始休息
  const startRest = () => {
    setIsResting(true)
    setRestTimeLeft(5 * 60)
    setShowRestModal(false)
    
    restIntervalRef.current = window.setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current)
            restIntervalRef.current = null
          }
          setIsResting(false)
          onCancel()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 跳过休息
  const skipRest = () => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current)
      restIntervalRef.current = null
    }
    setIsResting(false)
    onCancel()
  }

  // 休息模态框
  if (showRestModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-green-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 text-white text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold">作业完成！</h2>
            <p className="text-sm opacity-90">你已完成 "{task.name}"</p>
          </div>
          
          <div className="px-6 py-8 text-center">
            <div className="text-6xl font-black text-gray-800 mb-4">
              {formatTime(restTimeLeft)}
            </div>
            <p className="text-gray-600 mb-6">休息一下吧！</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={startRest}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6" />
                开始休息
              </button>
              <button 
                onClick={skipRest}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                跳过休息
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 休息中界面
  if (isResting) {
    const restProgress = ((5 * 60 - restTimeLeft) / (5 * 60)) * 100
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-green-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 text-white">
            <h2 className="text-xl font-bold text-center">休息时间</h2>
          </div>
          
          <div className="px-6 py-8 text-center relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <PomodoroRing progress={restProgress} isOvertime={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-black tracking-wider text-gray-800">
                  {formatTime(restTimeLeft)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <button 
              onClick={skipRest}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              跳过休息
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 超时弹窗提示
  useEffect(() => {
    if (isOvertime && timeLeft === -60) {
      // 超时1分钟时显示提示
      const timer = setTimeout(() => {
        alert('⏰ 已超时！继续完成将扣除积分。\n\n超时每满1分钟扣除1分，不满1分钟不扣除。')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOvertime, timeLeft])

  const currentPoints = calculateCurrentPoints()
  const expectedPoints = calculateExpectedPoints(task.plannedDuration)

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${getBackgroundColor()}`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${getCardStyle()}`}>
        {/* 头部 */}
        <div className={`px-6 py-4 ${isOvertime ? 'bg-red-200' : progress > 80 ? 'bg-red-100' : progress > 50 ? 'bg-orange-100' : 'bg-green-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/80">
                🍅 {task.subject}
              </span>
              {isOvertime && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  超时
                </span>
              )}
            </div>
            <button 
              onClick={handleGiveUp}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mt-2">{task.name}</h2>
          <p className="text-sm text-gray-500 mt-1">计划时长: {task.plannedDuration} 分钟</p>
        </div>

        {/* 分数信息 */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {!isRunning && timeLeft === task.plannedDuration * 60 && (
                <span>预计可获得: <span className="font-bold text-green-500">+{expectedPoints}分</span></span>
              )}
              {isRunning && !isOvertime && (
                <span>当前可获得: <span className="font-bold text-green-500">+{currentPoints}分</span></span>
              )}
              {isRunning && isOvertime && (
                <span>当前扣除: <span className="font-bold text-red-500">{currentPoints}分</span></span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              剩余 {Math.ceil(Math.abs(timeLeft) / 60)} 分钟
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="px-6 py-2">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                backgroundColor: progressColor
              }} 
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>已完成 {Math.round(progress)}%</span>
            <span>剩余 {Math.round(100 - progress)}%</span>
          </div>
        </div>

        {/* 环形计时器 */}
        <div className="px-6 py-8 text-center relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4">
            <PomodoroRing progress={progress} isOvertime={isOvertime} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isOvertime && (
                <span className="text-sm font-medium text-red-500 mb-1">超时</span>
              )}
              <span className="text-5xl font-black tracking-wider text-gray-800">
                {isOvertime ? formatOvertimeTime(Math.abs(timeLeft)) : formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* 分心记录显示 */}
        {distractions.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap justify-center gap-1">
              {distractions.map((d) => {
                const distraction = DISTRACTION_TYPES.find(dt => dt.type === d.type)
                return (
                  <span 
                    key={d.id} 
                    className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"
                  >
                    {distraction?.emoji} {d.type}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="px-6 pb-8">
          {/* 主控制按钮 */}
          <div className="flex justify-center gap-3 mb-4">
            {!isRunning ? (
              <button 
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6" />
                开始
              </button>
            ) : (
              <button 
                onClick={handlePause}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              >
                <Pause className="w-6 h-6" />
                暂停
              </button>
            )}
            <button 
              onClick={handleReset}
              className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* 次要操作按钮 */}
          <div className="flex flex-wrap justify-center gap-2">
            {isRunning && (
              <button 
                onClick={() => setShowDistractionModal(true)}
                className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium text-sm hover:bg-yellow-200 transition-colors"
              >
                📌 记录分心
              </button>
            )}
            
            {/* 完成按钮 - 未超时且已开始 */}
            {!isOvertime && timeLeft < task.plannedDuration * 60 && (
              <button 
                onClick={() => {
                  handleComplete()
                  setShowRestModal(true)
                }}
                className="px-6 py-2 bg-green-500 text-white rounded-full font-medium text-sm hover:bg-green-600 transition-colors"
              >
                <Check className="w-4 h-4 inline mr-1" />
                完成 +{expectedPoints}分
              </button>
            )}
            
            {/* 超时确认按钮 */}
            {isOvertime && (
              <button 
                onClick={() => {
                  handleOvertimeComplete()
                  setShowRestModal(true)
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-full font-medium text-sm hover:bg-red-600 transition-colors animate-pulse"
              >
                确认超时 {currentPoints}分
              </button>
            )}
            
            {/* 放弃按钮 */}
            {isRunning && (
              <button 
                onClick={handleGiveUp}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                放弃
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 分心记录模态框 */}
      {showDistractionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-center">记录分心原因</h3>
            <div className="grid grid-cols-4 gap-2">
              {DISTRACTION_TYPES.map((d) => (
                <button
                  key={d.type}
                  onClick={() => addDistraction(d.type)}
                  className="flex flex-col items-center p-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <span className="text-xs text-gray-600 mt-1">{d.type}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowDistractionModal(false)}
              className="mt-4 w-full py-2 bg-gray-200 text-gray-600 rounded-xl font-medium"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
