import { useState } from 'react'
import { UserInfo, setCurrentUser, UserRole } from '../lib/auth'

interface AuthPageProps {
  onLoginSuccess: (user: UserInfo) => void
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<UserRole>('child')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('请输入昵称')
      return
    }
    const user: UserInfo = {
      id: Date.now().toString(),
      nickname: nickname.trim(),
      role
    }
    setCurrentUser(user)
    onLoginSuccess(user)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#FD79A8] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🦸</span>
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] bg-clip-text text-transparent">
            作业闯关小英雄
          </h1>
          <p className="text-gray-500 mt-2">V1.1 让学习更有趣</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              你的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              className="w-full px-4 py-3 border-2 border-[#FFE66D] rounded-xl focus:border-[#FF6B6B] focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              我是
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('child')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  role === 'child'
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                🧒小朋友
              </button>
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  role === 'parent'
                    ? 'bg-gradient-to-r from-[#4ECDC4] to-[#A8E6CF] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                👨‍👩‍👧家长
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FD79A8] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            开始冒险 ✨
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          完成作业赚积分，兑换奖励！
        </p>
      </div>
    </div>
  )
}
