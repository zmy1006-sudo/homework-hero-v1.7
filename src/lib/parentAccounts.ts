import { UserInfo } from '../lib/auth'

export interface ParentAccount {
  phone: string
  childName: string      // 安全问答：孩子姓名
  passwordHash: string
  createdAt: number
}

const PARENT_ACCOUNTS_KEY = 'parent_accounts'

export function getParentAccounts(): ParentAccount[] {
  try {
    return JSON.parse(localStorage.getItem(PARENT_ACCOUNTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveParentAccounts(accounts: ParentAccount[]) {
  localStorage.setItem(PARENT_ACCOUNTS_KEY, JSON.stringify(accounts))
}

/** 注册家长账号（登录时自动存入） */
export function registerParentAccount(phone: string, childName: string, userId: string) {
  const accounts = getParentAccounts()
  if (!accounts.find(a => a.phone === phone)) {
    accounts.push({
      phone,
      childName,
      passwordHash: btoa(userId), // 初始密码=用户ID的base64
      createdAt: Date.now()
    })
    saveParentAccounts(accounts)
  }
}

/** 验证身份：手机号 + 孩子姓名 */
export function verifyParentIdentity(phone: string, childName: string): ParentAccount | null {
  return getParentAccounts().find(a => a.phone === phone && a.childName === childName) || null
}

/** 更新密码 */
export function updateParentPassword(phone: string, newPasswordHash: string) {
  const accounts = getParentAccounts().map(a =>
    a.phone === phone ? { ...a, passwordHash: newPasswordHash } : a
  )
  saveParentAccounts(accounts)
}

/** 验证当前密码 */
export function verifyParentPassword(phone: string, password: string, childName: string): boolean {
  const account = getParentAccounts().find(a => a.phone === phone && a.childName === childName)
  if (!account) return false
  return account.passwordHash === btoa(password)
}

/** 获取家长账号（按手机号查） */
export function getParentAccountByPhone(phone: string): ParentAccount | null {
  return getParentAccounts().find(a => a.phone === phone) || null
}
