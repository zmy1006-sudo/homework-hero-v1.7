import { useState } from 'react'
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { verifyParentIdentity, updateParentPassword } from '../lib/parentAccounts'

type Step = 'phone' | 'verify' | 'reset' | 'done'

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return '密码至少8位'
  if (pw.length > 20) return '密码最多20位'
  return null
}

interface Props {
  onBack: () => void
  onLogin: () => void
}

export default function ForgotPasswordPage({ onBack, onLogin }: Props) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [childName, setChildName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError('')
    if (!phone.trim()) { setPhoneError('请输入手机号'); return }
    setStep('verify')
  }

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const account = verifyParentIdentity(phone.trim(), childName.trim())
    if (!account) {
      setError('手机号或孩子姓名不匹配，请核实后重试')
      return
    }
    setStep('reset')
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== confirmPw) { setError('两次密码不一致'); return }
    updateParentPassword(phone.trim(), btoa(password))
    setStep('done')
  }

  const pwStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const pwColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-green-400'][pwStrength]
  const pwLabel = ['', '弱', '中', '强'][pwStrength]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 mb-4 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">找回密码</h2>
          <p className="text-gray-400 text-sm mt-1">通过孩子姓名验证身份</p>
        </div>

        {/* Step 1: Phone */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                placeholder="请输入注册时的手机号"
                className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800"
                autoFocus
              />
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg">
              下一步 →
            </button>
          </form>
        )}

        {/* Step 2: Verify child name */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="bg-[#FFE66D]/20 rounded-xl p-3 text-sm text-gray-600">
              📱 已发送验证码到 <strong>{phone}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">孩子的姓名</label>
              <input
                type="text"
                value={childName}
                onChange={e => { setChildName(e.target.value); setError('') }}
                placeholder="请输入您绑定孩子的姓名"
                className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg">
              验证身份
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full py-2 text-gray-400 text-sm hover:text-gray-600">
              ← 重新输入手机号
            </button>
          </form>
        )}

        {/* Step 3: Reset password */}
        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">新密码（8-20位）</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="请输入新密码"
                  className="w-full px-4 py-3 pr-12 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pwColor}`} style={{ width: `${(pwStrength / 3) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{pwLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError('') }}
                  placeholder="请再次输入新密码"
                  className="w-full px-4 py-3 pr-12 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg">
              重置密码
            </button>
          </form>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">密码重置成功！</p>
              <p className="text-gray-400 text-sm mt-1">请使用新密码重新登录</p>
            </div>
            <button
              onClick={onLogin}
              className="w-full py-3 bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white rounded-xl font-bold text-base shadow-lg"
            >
              去登录 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
