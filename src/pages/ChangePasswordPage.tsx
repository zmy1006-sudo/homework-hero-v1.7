import { useState } from 'react'
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Lock } from 'lucide-react'
import { verifyParentPassword, updateParentPassword } from '../lib/parentAccounts'
import { UserInfo } from '../lib/auth'

interface Props {
  user: UserInfo
  onBack: () => void
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return '密码至少8位'
  if (pw.length > 20) return '密码最多20位'
  return null
}

export default function ChangePasswordPage({ user, onBack }: Props) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPw) { setError('请输入当前密码'); return }
    if (!verifyParentPassword(user.phone || '', currentPw, user.nickname.replace('的家长', ''))) {
      setError('当前密码错误')
      return
    }
    const pwErr = validatePassword(newPw)
    if (pwErr) { setError(pwErr); return }
    if (newPw !== confirmPw) { setError('两次密码不一致'); return }
    if (currentPw === newPw) { setError('新密码不能与当前密码相同'); return }
    updateParentPassword(user.phone || '', btoa(newPw))
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">密码修改成功！</p>
            <p className="text-gray-400 text-sm mt-1">下次登录请使用新密码</p>
          </div>
          <button onClick={onBack} className="w-full py-3 bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white rounded-xl font-bold">
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 mb-4 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">修改密码</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPw}
                onChange={e => { setCurrentPw(e.target.value); setError('') }}
                placeholder="请输入当前密码" className="w-full px-4 py-3 pr-12 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800" />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">新密码（8-20位）</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw}
                onChange={e => { setNewPw(e.target.value); setError('') }}
                placeholder="请输入新密码" className="w-full px-4 py-3 pr-12 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800" />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setError('') }}
                placeholder="请再次输入新密码" className="w-full px-4 py-3 pr-12 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none text-gray-800" />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-base shadow-lg mt-2">
            确认修改
          </button>
        </form>
      </div>
    </div>
  )
}
