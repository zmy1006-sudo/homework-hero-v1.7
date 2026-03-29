export type UserRole = 'parent' | 'child' | 'teacher'

export interface UserInfo {
  id: string
  /** 登录账号（手机号或自定义用户名） */
  account: string
  nickname: string
  role: UserRole
  phone?: string
  grade?: string
  school?: string
  className?: string
  classCode?: string
  classId?: string
  /** 注册时间戳 */
  createdAt?: number
}

const USER_KEY = 'homework-hero-user'

/** 账户注册表：{ account: password } */
const ACCOUNTS_KEY = 'homework-hero-accounts'

/** 简易hash（前端无法真加密，仅防误操作） */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return 'h' + Math.abs(hash).toString(36)
}

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

/** 注册账户 */
export function registerAccount(account: string, password: string): { success: boolean; error?: string } {
  const accounts: Record<string, string> = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
  if (accounts[account]) {
    return { success: false, error: '该账号已注册，请直接登录' }
  }
  accounts[account] = simpleHash(password)
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  return { success: true }
}

/** 验证登录 */
export function verifyAccount(account: string, password: string): boolean {
  const accounts: Record<string, string> = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
  return accounts[account] === simpleHash(password)
}

/** 账号是否存在 */
export function accountExists(account: string): boolean {
  const accounts: Record<string, string> = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
  return !!accounts[account]
}
