import { useState, useEffect, useRef, useCallback } from 'react'
import { X, RotateCcw, Flag } from 'lucide-react'

export interface HomeworkTask {
  id: number; name: string; subject: string
  completed: boolean; cancelled: boolean; pomodorosCompleted: number
  plannedDuration: number; completedAt?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}
export interface Distraction { id: number; type: string; timestamp: number }

const DISTRACTION_TYPES = [
  { type: '喝水', emoji: '💧' }, { type: '伸懒腰', emoji: '🙆' },
  { type: '上厕所', emoji: '🚽' }, { type: '吃东西', emoji: '🍎' },
  { type: '发呆', emoji: '😴' }, { type: '看课外书', emoji: '📖' },
  { type: '玩玩具', emoji: '🧸' }, { type: '其他', emoji: '📌' },
]
const STORAGE_KEY = 'hh-pomodoro-v11'

// ─────────────────────────────────────────────
//  中文语音（预加载）
// ─────────────────────────────────────────────
let _zhVoice: SpeechSynthesisVoice | null = null
function _loadVoice() {
  if (!window.speechSynthesis) return
  const trySet = () => { _zhVoice = (window.speechSynthesis.getVoices().find(v => v.lang.includes('zh')) || null) }
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
//  环形组件
// ─────────────────────────────────────────────
function TomatoRing({ progress, isOvertime, size = 280 }: { progress: number; isOvertime: boolean; size?: number }) {
  const cx = size / 2, cy = size / 2
  const R = size / 2 - 20, r2 = R - 14
  const C = 2 * Math.PI * r2
  const color = isOvertime ? '#DC2626' : progress > 80 ? '#EF4444' : progress >= 50 ? '#F97316' : '#4ADE80'
  const offset = isOvertime ? 0 : C * (1 - progress / 100)

  const ticks = Array.from({ length: 13 }, (_, i) => {
    const a = (i / 12) * 360 - 90, r = (a * Math.PI) / 180
    return { x1: cx + R * Math.cos(r), y1: cy + R * Math.sin(r), x2: cx + (R - 10) * Math.cos(r), y2: cy + (R - 10) * Math.sin(r) }
  })
  const endA = isOvertime ? 0 : 2 * Math.PI * (1 - progress / 100)
  const px = cx + r2 * Math.cos(Math.PI / 2 + endA)
  const py = cy - r2 * Math.sin(Math.PI / 2 + endA)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full select-none" style={{ maxWidth: size }}>
      <defs>
        <filter id="g1" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="g2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/></feMerge></filter>
      </defs>
      {isOvertime ? <circle cx={cx} cy={cy} r={R+5} fill="none" stroke="#DC2626" strokeWidth="10" strokeOpacity="0.25" filter="url(#g2)"/> : progress > 20 && <circle cx={cx} cy={cy} r={R+5} fill="none" stroke={color} strokeWidth="5" strokeOpacity="0.18" filter="url(#g2)"/>}
      {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(0,0,0,0.12)" strokeWidth={i%5===0?2:1} strokeLinecap="round"/>)}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={r2} fill="white"/>
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`} filter="url(#g1)" style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}/>
      {!isOvertime && progress > 0 && <><circle cx={px} cy={py} r="7" fill={color} filter="url(#g1)"/><circle cx={px} cy={py} r="3" fill="white"/></>}
    </svg>
  )
}

function fmt(secs: number) { return `${Math.floor(Math.abs(secs)/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}` }

interface Props { task: HomeworkTask; onComplete: (pts: number, iso: boolean, dist: Distraction[]) => void; onCancel: () => void }

export default function PomodoroTimerPage({ task, onComplete, onCancel }: Props) {
  const TOTAL = task.plannedDuration * 60

  // elapsed = 已过去的秒数（从0开始，永不减到负）
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // ── elapsed 驱动：timeLeft = TOTAL - elapsed，始终 >= 0 ──
  const timeLeft = Math.max(0, TOTAL - elapsed)
  const isOvertime = elapsed >= TOTAL
  const overtimeSecs = isOvertime ? elapsed - TOTAL : 0
  const progress = isOvertime ? 0 : Math.max(0, Math.min(100, (elapsed / TOTAL) * 100))
  const color = isOvertime ? '#DC2626' : progress > 80 ? '#EF4444' : progress >= 50 ? '#F97316' : '#4ADE80'
  const bgClass = isOvertime ? 'bg-red-100' : progress > 80 ? 'bg-red-100' : progress >= 50 ? 'bg-orange-100' : 'bg-green-50'

  // ── 嘟声：独立追踪变量，不依赖useRef（避免闭包陷阱）──
  // 用 ref 存 lastBeepAt（上次嘟声的elapsed值）
  const lastBeepRef = useRef<number>(-1)
  // 里程碑：已播报的elapsed值集合
  const milestoneFiredRef = useRef<Set<number>>(new Set())

  /** 每秒tick */
  const tick = useCallback(() => {
    setElapsed(prev => {
      const e = prev + 1
      const rem = TOTAL - e   // 剩余时间（可正可负）

      // ── 里程碑语音（只触发一次）──
      if (rem === 180 && !milestoneFiredRef.current.has(180)) {
        speak('时间还剩3分钟'); milestoneFiredRef.current.add(180)
      }
      if (rem === 60 && !milestoneFiredRef.current.has(60)) {
        speak('时间还剩1分钟'); milestoneFiredRef.current.add(60)
      }
      if (rem === 30 && !milestoneFiredRef.current.has(30)) {
        speak('时间还剩30秒'); milestoneFiredRef.current.add(30)
      }

      // ── 嘟声：最后30秒（rem 0~30），每秒均匀响 ──
      if (rem >= 0 && rem <= 30 && lastBeepRef.current !== rem) {
        _doBeep(880, 100)
        lastBeepRef.current = rem
      }
      // ── 超时嘟声：每2秒响 ──
      if (rem < 0 && (e - TOTAL) % 2 === 0) {
        _doBeep(660, 80)
      }

      return e
    })
  }, [TOTAL])

  /** 实际发声音（顶层函数，避免闭包）*/
  function _doBeep(freq: number, dur: number) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtxRef.current
      // 柔和铃声：正弦波 + 泛音叠加，再加渐变衰减
      const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator()
      const g = ctx.createGain()
      osc1.connect(g); osc2.connect(g); g.connect(ctx.destination)
      osc1.frequency.value = freq
      osc2.frequency.value = freq * 2   // 泛音（高八度）
      osc1.type = 'sine'; osc2.type = 'sine'
      g.gain.setValueAtTime(0.25, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + dur / 1000)
      osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + dur / 1000)
    } catch {}
  }

  // ── 计时循环 ──
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, tick])

  // ── 持久化 ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id, elapsed, isRunning }))
  }, [task.id, elapsed, isRunning])

  const handleMainBtn = () => {
    try { if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)() } catch {}
    setIsRunning(r => !r)
  }

  const calcPts = () => {
    if (isOvertime) return Math.max(-20, 5 - Math.floor(overtimeSecs / 60) * 2)
    const r = timeLeft / TOTAL
    if (r > 0.5) return 10; if (r > 0.25) return 8; if (r > 0) return 5; return 3
  }

  const handleComplete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false); localStorage.removeItem(STORAGE_KEY)
    onComplete(calcPts(), isOvertime, [])
  }
  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false); localStorage.removeItem(STORAGE_KEY); onCancel()
  }

  const displayTime = isOvertime ? `+${fmt(overtimeSecs)}` : fmt(timeLeft)
  const statusText = isOvertime ? '超时中...' : isRunning ? '专注中' : elapsed > 0 ? '已暂停' : '准备开始'
  const ovMin = Math.floor(overtimeSecs / 60)

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${bgClass}`}>
      <div className="w-full max-w-sm">

        {/* 科目标签 + 任务名（放大醒目） */}
        <div className="text-center px-4 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-3"
            style={{ background: '#F0FDF4', color: '#16A34A', letterSpacing: '0.02em' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#16A34A' }}/>
            {task.subject}
          </div>
          <div className="text-2xl font-black text-gray-900 leading-tight">{task.name}</div>
          <div className="text-sm text-gray-400 mt-1">计划时间：{task.plannedDuration} 分钟</div>
        </div>

        {/* 卡片 */}
        <div className="bg-white rounded-3xl shadow-xl pt-2" style={{ boxShadow: '0 8px 40px rgba(255,107,107,0.12)' }}>

          {/* 环形 */}
          <div className="relative flex items-center justify-center py-5">
            <TomatoRing progress={progress} isOvertime={isOvertime} size={280}/>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black leading-none" style={{ color: isOvertime ? '#DC2626' : color, letterSpacing: '-0.04em' }}>
                {displayTime}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: isOvertime ? '#DC2626' : '#9CA3AF' }}>{statusText}</div>
              {isOvertime && <div className="text-xs font-medium mt-0.5" style={{ color: '#DC2626', opacity: 0.7 }}>累计 {Math.floor((TOTAL + overtimeSecs) / 60)} 分钟</div>}
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-3 px-6 pb-4">
            <button onClick={handleCancel}
              className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
              <RotateCcw className="w-5 h-5 text-gray-500"/>
            </button>
            <button onClick={handleMainBtn}
              className="h-11 px-7 rounded-full flex items-center gap-2 font-bold text-white text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
              style={{ background: isRunning ? 'linear-gradient(135deg, #F97316, #FB923C)' : isOvertime ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'linear-gradient(135deg, #FF6B6B, #FD79A8)' }}>
              {isRunning ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              <span>{isRunning ? '暂停' : isOvertime || elapsed > 0 ? '继续' : '开始'}</span>
            </button>
            {/* 打扰占位，保持布局对称 */}
            <div className="w-11 h-11"/>
          </div>

          {/* 完成按钮 */}
          <div className="px-6 pb-4">
            <button onClick={handleComplete}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.01] active:scale-0.99"
              style={{ background: isOvertime ? '#FEE2E2' : '#FFF0F0', color: isOvertime ? '#DC2626' : '#FF6B6B' }}>
              <Flag className="w-4 h-4"/>
              <span>{isOvertime ? `完成（超时 ${ovMin} 分钟）` : '完成作业'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
