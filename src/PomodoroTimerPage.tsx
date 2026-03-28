import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw } from 'lucide-react'

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

const DISTRACTIONS = [
  { type: '喝水', emoji: '💧' },
  { type: '伸懒腰', emoji: '🙆' },
  { type: '上厕所', emoji: '🚽' },
  { type: '吃东西', emoji: '🍎' },
  { type: '发呆', emoji: '😴' },
  { type: '看课外书', emoji: '📖' },
  { type: '其他', emoji: '📌' },
]

const STORAGE_KEY = 'hh-pomodoro'

function saveState(data: object) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
function clearState() { localStorage.removeItem(STORAGE_KEY) }

function formatTime(secs: number) {
  const m = Math.floor(Math.abs(secs) / 60)
  const s = Math.abs(secs) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 大号 SVG 圆环 — 极简设计 */
function TimerRing({ progress, color }: { progress: number; color: string }) {
  const R = 100, W = 10, C = 2 * Math.PI * R
  const offset = C - (progress / 100) * C
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px]">
      {/* 背景轨道 */}
      <circle cx="110" cy="110" r={R} fill="none" stroke="#E8E8E8" strokeWidth={W} />
      {/* 进度弧 */}
      <circle
        cx="110" cy="110" r={R}
        fill="none"
        stroke={color}
        strokeWidth={W}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
      />
    </svg>
  )
}

interface PomodoroTimerPageProps {
  task: HomeworkTask
  onComplete: (points: number, isOvertime: boolean, distractions: Distraction[]) => void
  onCancel: () => void
}

export default function PomodoroTimerPage({ task, onComplete, onCancel }: PomodoroTimerPageProps) {
  const totalSecs = task.plannedDuration * 60

  // === State ===
  const [phase, setPhase] = useState<'idle' | 'running' | 'overtime' | 'rest' | 'done'>('idle')
  const [timeLeft, setTimeLeft] = useState(totalSecs)
  const [distractions, setDistractions] = useState<Distraction[]>([])
  const [showDistractions, setShowDistractions] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // === Persistence ===
  useEffect(() => {
    const saved = loadState()
    if (saved && saved.taskId === task.id) {
      const elapsed = Math.floor((Date.now() - (saved.savedAt || 0)) / 1000)
      let restored = saved.timeLeft - elapsed
      if (restored < 0 && saved.phase !== 'overtime' && saved.phase !== 'rest') {
        setTimeLeft(restored)
        setPhase('overtime')
        setDistractions(saved.distractions || [])
      } else {
        setTimeLeft(restored)
        setPhase(saved.phase === 'running' ? 'running' : 'idle')
        setDistractions(saved.distractions || [])
      }
    }
  }, [task.id])

  useEffect(() => {
    saveState({ taskId: task.id, timeLeft, phase, distractions, savedAt: Date.now() })
  }, [timeLeft, phase, distractions, task.id])

  useEffect(() => {
    return () => { if (!timerRef.current) clearState() }
  }, [])

  // === Timer ===
  useEffect(() => {
    if (phase === 'running' || phase === 'overtime') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (phase === 'running') {
              clearInterval(timerRef.current!)
              timerRef.current = null
              setPhase('overtime')
            }
            return t - 1
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [phase])

  // === Computed ===
  const progress = phase === 'idle' ? 0
    : phase === 'rest' ? ((totalSecs - timeLeft) / totalSecs) * 100
    : phase === 'overtime' ? 100
    : Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100)

  const ringColor = phase === 'idle' ? '#4ADE80'
    : phase === 'rest' ? '#34D399'
    : phase === 'overtime' ? '#F87171'
    : progress > 80 ? '#FBBF24'
    : progress > 50 ? '#FBBF24'
    : '#4ADE80'

  const expectedPoints = Math.floor(task.plannedDuration / 25) + 1
  const overtimeSecs = phase === 'overtime' ? Math.abs(timeLeft) : 0
  const penalty = Math.floor(overtimeSecs / 60)
  const currentPoints = phase === 'overtime' ? -penalty : expectedPoints

  // === Actions ===
  const handleStart = () => {
    startTimeRef.current = Date.now()
    setPhase('running')
  }
  const handlePause = () => setPhase('idle')
  const handleReset = () => {
    clearInterval(timerRef.current!); timerRef.current = null
    setTimeLeft(totalSecs); setPhase('idle'); setDistractions([])
    clearState()
  }
  const handleQuit = () => {
    clearInterval(timerRef.current!); timerRef.current = null
    clearState()
    onCancel()
  }
  const handleFinish = () => {
    clearInterval(timerRef.current!); timerRef.current = null
    clearState()
    onComplete(currentPoints, phase === 'overtime', distractions)
  }
  const addDistraction = (type: string) => {
    setDistractions(d => [...d, { id: Date.now(), type, timestamp: Date.now() }])
  }

  // === Rest screen ===
  if (phase === 'rest') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-emerald-100 px-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">太棒了！</h2>
          <p className="text-gray-500 mt-1">"{task.name}" 番茄钟完成</p>
        </div>

        <div className="relative mb-8">
          <TimerRing progress={progress} color={ringColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-gray-800">{formatTime(timeLeft)}</span>
            <span className="text-sm text-gray-400 mt-1">休息中</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white rounded-full shadow-sm">
            <span className="text-gray-500 text-sm">获得积分</span>
            <span className="text-xl font-black text-green-500">+{expectedPoints}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={handleFinish} className="w-full py-3.5 bg-green-500 text-white rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-transform">
            继续学习 →
          </button>
        </div>
      </div>
    )
  }

  // === Quit confirm ===
  if (showQuit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center">
          <div className="text-4xl mb-3">🤔</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">确认放弃？</h3>
          <p className="text-sm text-gray-500 mb-6">放弃此次番茄钟，本次不计积分</p>
          <div className="flex gap-3">
            <button onClick={() => setShowQuit(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-medium">取消</button>
            <button onClick={handleQuit} className="flex-1 py-2.5 bg-red-500 text-white rounded-2xl font-medium">确认放弃</button>
          </div>
        </div>
      </div>
    )
  }

  // === Distraction drawer ===
  const distractionOverlay = showDistractions ? (
    <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowDistractions(false)} />
  ) : null
  const distractionPanel = showDistractions ? (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-8 shadow-2xl">
      <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
      <h3 className="text-base font-bold text-gray-800 mb-4 text-center">记录分心</h3>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {DISTRACTIONS.map(d => (
          <button key={d.type} onClick={() => { addDistraction(d.type); setShowDistractions(false) }}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all">
            <span className="text-2xl">{d.emoji}</span>
            <span className="text-xs text-gray-600">{d.type}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setShowDistractions(false)} className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-2xl font-medium text-sm">取消</button>
    </div>
  ) : null

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500">🍅 {task.subject}</span>
        </div>
        <button onClick={() => setShowQuit(true)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Task name */}
      <div className="px-5 mb-2">
        <h2 className="text-xl font-bold text-gray-800 leading-snug">{task.name}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{task.plannedDuration} 分钟专注</p>
      </div>

      {/* Main: Ring + Time */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-4 px-5">
        <div className="relative">
          <TimerRing progress={progress} color={ringColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'overtime' && (
              <span className="text-xs font-bold text-red-500 tracking-widest mb-1">超时</span>
            )}
            <span className="text-5xl font-black text-gray-800 tracking-tight">
              {phase === 'overtime' ? `-${formatTime(overtimeSecs)}` : formatTime(timeLeft)}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {phase === 'idle' ? '准备开始' : phase === 'overtime' ? '超时中' : '专注中'}
            </span>
          </div>
        </div>

        {/* Points badge */}
        <div className={`mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
          phase === 'overtime'
            ? 'bg-red-50 text-red-500'
            : phase === 'idle'
            ? 'bg-gray-100 text-gray-400'
            : 'bg-green-50 text-green-600'
        }`}>
          {phase === 'idle' ? `预计 +${expectedPoints} 分` : phase === 'overtime' ? `扣除 ${currentPoints} 分` : `+${expectedPoints} 分`}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-5 pb-10">
        {/* Distractions tags */}
        {distractions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {distractions.map(d => (
              <span key={d.id} className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full">
                {DISTRACTIONS.find(x => x.type === d.type)?.emoji} {d.type}
              </span>
            ))}
          </div>
        )}

        {/* Main action button */}
        <div className="flex items-center gap-3">
          {phase === 'idle' ? (
            <button onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-transform">
              <Play className="w-5 h-5" fill="white" /> 开始专注
            </button>
          ) : phase === 'running' ? (
            <>
              <button onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-400 text-white rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-transform">
                <Pause className="w-5 h-5" fill="white" /> 暂停
              </button>
              <button onClick={handleReset}
                className="p-4 bg-gray-100 text-gray-500 rounded-2xl shadow-sm hover:bg-gray-200 active:scale-95 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          ) : phase === 'overtime' ? (
            <>
              <button onClick={handleFinish}
                className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-transform">
                结束 · {currentPoints} 分
              </button>
              <button onClick={handleReset}
                className="p-4 bg-gray-100 text-gray-500 rounded-2xl shadow-sm hover:bg-gray-200 active:scale-95 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          ) : null}

          {/* Record distraction */}
          {(phase === 'running' || phase === 'overtime') && (
            <button onClick={() => setShowDistractions(true)}
              className="px-4 py-4 bg-yellow-50 text-yellow-600 rounded-2xl shadow-sm hover:bg-yellow-100 active:scale-95 transition-transform text-sm font-medium">
              📌
            </button>
          )}
        </div>
      </div>

      {distractionOverlay}
      {distractionPanel}
    </div>
  )
}
