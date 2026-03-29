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
const STORAGE_KEY = 'hh-pomodoro-v12'

// ─────────────────────────────────────────────
//  中文语音预加载
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
    const a = (i / 12) * 360 - 90, rad = (a * Math.PI) / 180
    return { x1: cx + R * Math.cos(rad), y1: cy + R * Math.sin(rad), x2: cx + (R - 10) * Math.cos(rad), y2: cy + (R - 10) * Math.sin(rad) }
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
      {isOvertime
        ? <circle cx={cx} cy={cy} r={R+5} fill="none" stroke="#DC2626" strokeWidth="10" strokeOpacity="0.25" filter="url(#g2)"/>
        : progress > 20 && <circle cx={cx} cy={cy} r={R+5} fill="none" stroke={color} strokeWidth="5" strokeOpacity="0.18" filter="url(#g2)"/>}
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

  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [distractions, setDistractions] = useState<Distraction[]>([])
  const [showDistraction, setShowDistraction] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBeepRef = useRef<number>(-1)
  const milestoneFiredRef = useRef<Set<number>>(new Set())

  const timeLeft = Math.max(0, TOTAL - elapsed)
  const isOvertime = elapsed >= TOTAL
  const overtimeSecs = isOvertime ? elapsed - TOTAL : 0
  const progress = isOvertime ? 0 : Math.max(0, Math.min(100, (elapsed / TOTAL) * 100))
  const color = isOvertime ? '#DC2626' : progress > 80 ? '#EF4444' : progress >= 50 ? '#F97316' : '#4ADE80'
  const bgClass = isOvertime ? 'bg-red-100' : progress > 80 ? 'bg-red-100' : progress >= 50 ? 'bg-orange-100' : 'bg-green-50'

  /** 柔和铃声（双音叠加） */
  function _doBeep(freq: number, dur: number) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtxRef.current
      const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator()
      const g = ctx.createGain()
      osc1.connect(g); osc2.connect(g); g.connect(ctx.destination)
      osc1.frequency.value = freq; osc2.frequency.value = freq * 2
      osc1.type = 'sine'; osc2.type = 'sine'
      g.gain.setValueAtTime(0.25, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + dur / 1000)
      osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + dur / 1000)
    } catch {}
  }

  /** 每秒tick */
  const tick = useCallback(() => {
    setElapsed(prev => {
      const e = prev + 1
      const rem = TOTAL - e

      // 里程碑语音（仅一次）
      if (rem === 180 && !milestoneFiredRef.current.has(180)) { speak('时间还剩3分钟'); milestoneFiredRef.current.add(180) }
      if (rem === 60 && !milestoneFiredRef.current.has(60)) { speak('时间还剩1分钟'); milestoneFiredRef.current.add(60) }
      if (rem === 30 && !milestoneFiredRef.current.has(30)) { speak('时间还剩30秒'); milestoneFiredRef.current.add(30) }

      // 最后30秒每秒嘟一声
      if (rem >= 0 && rem <= 30 && lastBeepRef.current !== rem) { _doBeep(880, 200); lastBeepRef.current = rem }
      // 超时每2秒嘟
      if (rem < 0 && (e - TOTAL) % 2 === 0) { _doBeep(660, 200) }

      return e
    })
  }, [TOTAL])

  useEffect(() => {
    if (isRunning) intervalRef.current = setInterval(tick, 1000)
    else if (intervalRef.current) clearInterval(intervalRef.current)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, tick])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id, elapsed, isRunning })) }, [task.id, elapsed, isRunning])

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

  const displayTime = isOvertime ? `+${fmt(overtimeSecs)}` : fmt(timeLeft)
  const statusText = isOvertime ? '超时中...' : isRunning ? '专注中' : elapsed > 0 ? '已暂停' : '准备开始'
  const ovMin = Math.floor(overtimeSecs / 60)

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgClass}`}>
      <div className="w-full max-w-sm flex flex-col items-center justify-center">

        {/* ── 学科 + 作业名（全屏大字醒目）── */}
        <div className="w-full bg-white rounded-b-3xl shadow-xl px-6 pb-6 mb-4" style={{ boxShadow: '0 8px 40px rgba(255,107,107,0.12)', borderRadius: '0 0 1.5rem 1.5rem' }}>
          <div className="text-center pt-6 pb-2">
            {/* 学科标签 */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-base font-bold shadow-sm"
                style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#16A34A' }}/>
                {task.subject}
              </div>
            </div>
            {/* 作业名超大 */}
            <div className="text-3xl font-black text-gray-900 leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
              {task.name}
            </div>
            <div className="text-sm text-gray-400">计划时长 {task.plannedDuration} 分钟</div>
          </div>
        </div>

        {/* ── 环形计时器 ── */}
        <div className="relative flex items-center justify-center w-full" style={{ padding: '0.5rem 0' }}>
          <div style={{ width: 280, height: 280 }}>
            <TomatoRing progress={progress} isOvertime={isOvertime} size={280}/>
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
                  累计 {Math.floor((TOTAL + overtimeSecs) / 60)} 分钟
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 控制按钮 ── */}
        <div className="flex items-center justify-center gap-3 px-6 py-5">
          {/* 重置 */}
          <button onClick={handleCancel}
            className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
            <RotateCcw className="w-5 h-5 text-gray-500"/>
          </button>

          {/* 主按钮 */}
          <button onClick={handleMainBtn}
            className="h-12 px-8 rounded-full flex items-center gap-2 font-bold text-white text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
            style={{
              background: isRunning
                ? 'linear-gradient(135deg, #F97316, #FB923C)'
                : isOvertime ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                : 'linear-gradient(135deg, #FF6B6B, #FD79A8)',
            }}>
            {isRunning ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
            <span>{isRunning ? '暂停' : isOvertime || elapsed > 0 ? '继续' : '开始'}</span>
          </button>

          {/* 打扰 */}
          <button onClick={() => setShowDistraction(true)}
            className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all relative">
            <span className="text-xl">📝</span>
            {distractions.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: color }}>{distractions.length}</div>
            )}
          </button>
        </div>

        {/* ── 完成按钮 ── */}
        <div className="w-full max-w-sm px-4 pb-4">
          <button onClick={handleComplete}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.01] active:scale-0.99"
            style={{ background: isOvertime ? '#FEE2E2' : '#FFF0F0', color: isOvertime ? '#DC2626' : '#FF6B6B' }}>
            <Flag className="w-4 h-4"/>
            <span>{isOvertime ? `完成（超时 ${ovMin} 分钟）` : '完成作业'}</span>
          </button>
        </div>

        {/* ── 打扰气泡 ── */}
        {distractions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 px-4 pb-3 max-w-sm">
            {distractions.map(d => {
              const def = DISTRACTION_TYPES.find(x => x.type === d.type)
              return (
                <span key={d.id}
                  className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 font-medium">
                  {def?.emoji} {d.type}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 打扰记录弹窗（底部抽屉）── */}
      {showDistraction && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={() => setShowDistraction(false)}>
          <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl px-6 py-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800 text-base">📝 记录打扰</h3>
              <button onClick={() => setShowDistraction(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DISTRACTION_TYPES.map(d => (
                <button key={d.type} onClick={() => addDistraction(d.type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-gray-100 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all">
                  <span className="text-2xl">{d.emoji}</span>
                  <span className="text-xs text-gray-600 font-medium">{d.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
