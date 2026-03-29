import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, Check, RotateCcw, Flag } from 'lucide-react'

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
export interface Distraction { id: number; type: string; timestamp: number }

const DISTRACTION_TYPES = [
  { type: '喝水', emoji: '💧' }, { type: '伸懒腰', emoji: '🙆' },
  { type: '上厕所', emoji: '🚽' }, { type: '吃东西', emoji: '🍎' },
  { type: '发呆', emoji: '😴' }, { type: '看课外书', emoji: '📖' },
  { type: '玩玩具', emoji: '🧸' }, { type: '其他', emoji: '📌' },
]
const STORAGE_KEY = 'hh-pomodoro-v10'

// ─────────────────────────────────────────────
//  中文语音预加载
// ─────────────────────────────────────────────
let _zhVoice: SpeechSynthesisVoice | null = null
function _loadVoice() {
  if (!window.speechSynthesis) return
  const trySet = () => {
    const vs = window.speechSynthesis.getVoices()
    _zhVoice = vs.find(v => v.lang.includes('zh') || v.lang.includes('CN')) || vs[0] || null
  }
  trySet()
  if (!_zhVoice) window.speechSynthesis.addEventListener('voiceschanged', trySet, { once: true })
}
_loadVoice()

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = 1.1; u.pitch = 1.0
  if (_zhVoice) u.voice = _zhVoice
  window.speechSynthesis.speak(u)
}

// ─────────────────────────────────────────────
//  V1.6 番茄钟环形
// ─────────────────────────────────────────────
function TomatoRing({ progress, isOvertime }: { progress: number; isOvertime: boolean }) {
  const size = 280
  const cx = size / 2, cy = size / 2
  const R = size / 2 - 20
  const r2 = R - 14
  const C = 2 * Math.PI * r2
  const color = isOvertime ? '#DC2626' : progress > 80 ? '#EF4444' : progress >= 50 ? '#F97316' : '#4ADE80'
  const dashOffset = isOvertime ? 0 : C * (1 - progress / 100)

  // 刻度
  const ticks = Array.from({ length: 13 }, (_, i) => {
    const frac = i / 12, angle = frac * 360 - 90
    const rad = (angle * Math.PI) / 180
    return {
      x1: cx + R * Math.cos(rad), y1: cy + R * Math.sin(rad),
      x2: cx + (R - 10) * Math.cos(rad), y2: cy + (R - 10) * Math.sin(rad),
    }
  })

  // 终点坐标
  const endAngle = isOvertime ? 0 : 2 * Math.PI * (1 - progress / 100)
  const px = cx + r2 * Math.cos(Math.PI / 2 + endAngle)
  const py = cy - r2 * Math.sin(Math.PI / 2 + endAngle)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs select-none">
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="outerGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/></feMerge>
        </filter>
      </defs>

      {/* 外层光晕 */}
      {isOvertime ? (
        <circle cx={cx} cy={cy} r={R + 5} fill="none" stroke="#DC2626" strokeWidth="10"
          strokeOpacity="0.25" filter="url(#outerGlow)"/>
      ) : progress > 20 ? (
        <circle cx={cx} cy={cy} r={R + 5} fill="none" stroke={color} strokeWidth="5"
          strokeOpacity="0.18" filter="url(#outerGlow)"/>
      ) : null}

      {/* 刻度线 */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(0,0,0,0.12)" strokeWidth={i % 5 === 0 ? 2 : 1} strokeLinecap="round"/>
      ))}

      {/* 轨道 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>

      {/* 白底 */}
      <circle cx={cx} cy={cy} r={r2} fill="white"/>

      {/* 进度弧 */}
      <circle cx={cx} cy={cy} r={r2}
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        filter="url(#glow)"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}/>

      {/* 终点红点 */}
      {!isOvertime && progress > 0 && (
        <>
          <circle cx={px} cy={py} r="7" fill={color} filter="url(#glow)"/>
          <circle cx={px} cy={py} r="3" fill="white"/>
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────
//  格式化
// ─────────────────────────────────────────────
function fmtTime(secs: number) {
  const m = Math.floor(Math.abs(secs) / 60), s = Math.abs(secs) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────
//  主组件
// ─────────────────────────────────────────────
interface Props {
  task: HomeworkTask
  onComplete: (pts: number, iso: boolean, dist: Distraction[]) => void
  onCancel: () => void
}

export default function PomodoroTimerPage({ task, onComplete, onCancel }: Props) {
  const totalSecs = task.plannedDuration * 60
  const [timeLeft, setTimeLeft] = useState(totalSecs)
  const [isRunning, setIsRunning] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  const [overtimeSecs, setOvertimeSecs] = useState(0)
  const [distractions, setDistractions] = useState<Distraction[]>([])
  const [showDistraction, setShowDistraction] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastReportedRef = useRef<number>(0)
  const lastBeepSecRef = useRef<number>(-1)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const progress = isOvertime ? 0 : Math.max(0, Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100))
  const color = isOvertime ? '#DC2626' : progress > 80 ? '#EF4444' : progress >= 50 ? '#F97316' : '#4ADE80'
  const bgClass = isOvertime ? 'bg-red-100' : progress > 80 ? 'bg-red-100' : progress >= 50 ? 'bg-orange-100' : 'bg-green-50'

  /** 嘟声 */
  const beep = useCallback((freq = 880, dur = 120) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      g.gain.setValueAtTime(0.4, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur / 1000)
    } catch {}
  }, [])

  /** 里程碑检查 */
  const checkMilestones = useCallback((e: number) => {
    const rem = totalSecs - e
    if (rem === 180 && lastReportedRef.current < 180) { speak('时间还剩3分钟'); lastReportedRef.current = 180 }
    if (rem === 60 && lastReportedRef.current < 60) { speak('时间还剩1分钟'); lastReportedRef.current = 60 }
    if (rem === 30 && lastReportedRef.current < 30) { speak('时间还剩30秒'); lastReportedRef.current = 30 }
    if (rem <= 30 && rem > 0 && rem !== lastBeepSecRef.current) { beep(880, 100); lastBeepSecRef.current = rem }
    if (rem <= 0 && lastReportedRef.current > 0) { const cnt = Math.abs(rem); if (cnt % 2 < 1) beep(660, 80); lastReportedRef.current = rem }
  }, [beep, totalSecs])

  /** 计时循环 */
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1
          checkMilestones(next)
          if (next < 0 && !isOvertime) setIsOvertime(true)
          if (next < 0) setOvertimeSecs(o => o + 1)
          return next
        })
      }, 1000)
    } else { if (intervalRef.current) clearInterval(intervalRef.current) }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, checkMilestones, isOvertime])

  /** 持久化 */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id, timeLeft, isRunning, isOvertime, overtimeSecs, distractions }))
  }, [task.id, timeLeft, isRunning, isOvertime, overtimeSecs, distractions])
  useEffect(() => () => localStorage.removeItem(STORAGE_KEY), [])

  /** 启动 → 初始化 AudioContext（用户交互触发避免被屏蔽） */
  const handleMainBtn = () => {
    try { if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)() } catch {}
    setIsRunning(r => !r)
  }

  const calcPts = () => {
    if (isOvertime) return Math.max(-20, 5 - Math.floor(overtimeSecs / 60) * 2)
    const r = timeLeft / totalSecs
    if (r > 0.5) return 10
    if (r > 0.25) return 8
    if (r > 0) return 5
    return 3
  }

  const handleComplete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false); localStorage.removeItem(STORAGE_KEY)
    onComplete(calcPts(), isOvertime, distractions)
  }
  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false); localStorage.removeItem(STORAGE_KEY); onCancel()
  }

  const addDistraction = (type: string) => {
    setDistractions(p => [...p, { id: Date.now(), type, timestamp: Date.now() }])
    setShowDistraction(false)
  }

  const displayTime = isOvertime ? `+${fmtTime(overtimeSecs)}` : fmtTime(timeLeft)
  const statusText = isOvertime ? '超时中...' : isRunning ? '专注中' : timeLeft < totalSecs ? '已暂停' : '准备开始'

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${bgClass}`}>
      <div className="w-full max-w-sm">

        {/* ── 顶部：科目标签 + 任务名 ── */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-2"
            style={{ background: '#F0FDF4', color: '#16A34A' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }}/>
            {task.subject}
          </div>
          <div className="text-lg font-bold text-gray-900">{task.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">计划时间：{task.plannedDuration} 分钟</div>
        </div>

        {/* ── V1.6 卡片 ── */}
        <div className="bg-white rounded-3xl shadow-xl" style={{ boxShadow: '0 8px 40px rgba(255,107,107,0.12)' }}>

          {/* 环形区 */}
          <div className="relative flex items-center justify-center py-4">
            <TomatoRing progress={progress} isOvertime={isOvertime}/>

            {/* 中心数字 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black leading-none"
                style={{ color: isOvertime ? '#DC2626' : color, letterSpacing: '-0.04em' }}>
                {displayTime}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: isOvertime ? '#DC2626' : '#9CA3AF' }}>
                {statusText}
              </div>
              {isOvertime && (
                <div className="text-xs font-medium mt-0.5" style={{ color: '#DC2626', opacity: 0.7 }}>
                  累计 {Math.floor((totalSecs + overtimeSecs) / 60)} 分钟
                </div>
              )}
            </div>
          </div>

          {/* ── 控制按钮 ── */}
          <div className="flex items-center justify-center gap-3 px-6 pb-4">

            {/* 重置 */}
            <button onClick={handleCancel}
              className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
              <RotateCcw className="w-5 h-5 text-gray-500"/>
            </button>

            {/* 主按钮 */}
            <button onClick={handleMainBtn}
              className="h-11 px-7 rounded-full flex items-center gap-2 font-bold text-white text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
              style={{
                background: isRunning
                  ? 'linear-gradient(135deg, #F97316, #FB923C)'
                  : isOvertime ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : 'linear-gradient(135deg, #FF6B6B, #FD79A8)',
              }}>
              {isRunning ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              <span>{isRunning ? '暂停' : isOvertime || timeLeft < totalSecs ? '继续' : '开始'}</span>
            </button>

            {/* 打扰 */}
            <button onClick={() => setShowDistraction(true)}
              className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all relative">
              <span className="text-xl">📝</span>
              {distractions.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ background: color }}>{distractions.length}</div>
              )}
            </button>
          </div>

          {/* ── 完成按钮 ── */}
          <div className="px-6 pb-4">
            <button onClick={handleComplete}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.01] active:scale-0.99"
              style={{
                background: isOvertime ? '#FEE2E2' : '#FFF0F0',
                color: isOvertime ? '#DC2626' : '#FF6B6B',
              }}>
              <Flag className="w-4 h-4"/>
              <span>{isOvertime ? `完成（超时 ${Math.floor(overtimeSecs / 60)} 分钟）` : '完成作业'}</span>
            </button>
          </div>

          {/* ── 打扰气泡 ── */}
          {distractions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 pb-4 px-6">
              {distractions.map(d => {
                const def = DISTRACTION_TYPES.find(x => x.type === d.type)
                return (
                  <span key={d.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
                    {def?.emoji} {d.type}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 打扰弹窗 ── */}
        {showDistraction && (
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">📝 记录打扰</h3>
              <button onClick={() => setShowDistraction(false)}>
                <X className="w-4 h-4 text-gray-400"/>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DISTRACTION_TYPES.map(d => (
                <button key={d.type}
                  onClick={() => addDistraction(d.type)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 border-transparent hover:border-red-200 hover:bg-red-50 transition-all">
                  <span className="text-xl">{d.emoji}</span>
                  <span className="text-xs text-gray-500">{d.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
