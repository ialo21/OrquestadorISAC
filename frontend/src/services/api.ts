import type { Bot, BotCreate, BotExecution, BotSchedule, ExecutionFiles, Stats, User, UserRole } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const fetchGoogleUrl = () => get<{ url: string }>('/api/auth/google-url')
export const fetchMe = () => get<User>('/api/auth/me')

// ── Bots ─────────────────────────────────────────────────────────────────────
export const fetchBots = () => get<Bot[]>('/api/bots')
export const fetchBot = (id: string) => get<Bot>(`/api/bots/${id}`)
export const executeBot = (id: string, inputData?: Record<string, string>) =>
  post<BotExecution>(`/api/bots/${id}/execute`, { input_data: inputData ?? {} })
export const fetchBotExecutions = (id: string) => get<BotExecution[]>(`/api/bots/${id}/executions`)

// ── Ejecuciones ───────────────────────────────────────────────────────────────
export const fetchExecutions = () => get<BotExecution[]>('/api/executions')
export const fetchExecution = (id: string) => get<BotExecution>(`/api/executions/${id}`)
export const cancelExecution = (id: string) => post<{ ok: boolean }>(`/api/executions/${id}/cancel`)
export const fetchExecutionFiles = (id: string) => get<ExecutionFiles>(`/api/executions/${id}/files`)
export const downloadFileUrl = (execId: string, filePath: string) =>
  `${BASE}/api/executions/${execId}/download/${filePath}?token=${localStorage.getItem('token')}`
export const downloadZipUrl = (execId: string) =>
  `${BASE}/api/executions/${execId}/download-zip`

export function streamExecution(execId: string, onMessage: (ex: BotExecution) => void): EventSource {
  const token = localStorage.getItem('token')
  const es = new EventSource(`${BASE}/api/executions/${execId}/stream?token=${token}`)
  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch { /* ignore */ }
  }
  return es
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchStats = () => get<Stats>('/api/stats')

// ── Admin — Usuarios ──────────────────────────────────────────────────────────
export const fetchAdminUsers = () => get<User[]>('/api/admin/users')
export const updateUserRole = (userId: string, role: UserRole) => put<User>(`/api/admin/users/${userId}/role`, { role })
export const updateUserBots = (userId: string, allowed_bot_ids: string[]) =>
  put<User>(`/api/admin/users/${userId}/bots`, { allowed_bot_ids })

// ── Admin — Bots ──────────────────────────────────────────────────────────────
export const createBot = (data: BotCreate) => post<Bot>('/api/admin/bots', data)
export const updateBot = (id: string, data: Partial<BotCreate>) => put<Bot>(`/api/admin/bots/${id}`, data)
export const deleteBot = (id: string) => del<{ ok: boolean }>(`/api/admin/bots/${id}`)

// ── Schedules ─────────────────────────────────────────────────────────────────
export const fetchBotSchedules = (botId: string) => get<BotSchedule[]>(`/api/bots/${botId}/schedules`)
export const createSchedule = (botId: string, data: Omit<BotSchedule, 'id' | 'bot_id' | 'created_by' | 'created_at'>) =>
  post<BotSchedule>(`/api/bots/${botId}/schedules`, data)
export const updateSchedule = (scheduleId: string, data: Partial<BotSchedule>) =>
  put<BotSchedule>(`/api/schedules/${scheduleId}`, data)
export const deleteSchedule = (scheduleId: string) => del<{ ok: boolean }>(`/api/schedules/${scheduleId}`)
