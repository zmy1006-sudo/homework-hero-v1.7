export type UserRole = 'parent' | 'child' | 'teacher'

export interface UserInfo {
  id: string
  nickname: string
  role: UserRole
  phone?: string
  grade?: string
}

const USER_KEY = 'homework-hero-user'

export function getCurrentUser(): UserInfo | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function setCurrentUser(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function logout(): void {
  localStorage.removeItem(USER_KEY)
}
