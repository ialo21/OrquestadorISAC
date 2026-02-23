export type UserRole = 'superadmin' | 'admin' | 'user'

export interface User {
  id: string
  email: string
  name: string
  picture: string
  role: UserRole
  allowed_bot_ids: string[]
  created_at: string
  last_login?: string
}

export interface Bot {
  id: string
  name: string
  description: string
  requires_ui: boolean
  script_path: string
  script_args: string[]
  page_slug: string
  enabled: boolean
  icon: string
  supports_data_input: boolean
  supports_scheduling: boolean
  created_at: string
}

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'

export interface BotExecution {
  id: string
  bot_id: string
  bot_name: string
  status: ExecutionStatus
  queued_at: string
  started_at?: string
  completed_at?: string
  triggered_by: string
  triggered_by_name: string
  run_folder: string
  exit_code?: number
  error_message: string
  duration_seconds: number
  input_data: Record<string, string>
}

export interface ExecutionFile {
  name: string
  size: number
  path: string
}

export interface ExecutionFiles {
  logs: ExecutionFile[]
  resultados: ExecutionFile[]
}

export interface Stats {
  total_executions: number
  executions_today: number
  executions_running: number
  executions_queued: number
  executions_completed: number
  executions_failed: number
  total_bots: number
  bots_enabled: number
}

export interface BotCreate {
  name: string
  description: string
  requires_ui: boolean
  script_path: string
  script_args: string[]
  page_slug: string
  enabled: boolean
  icon: string
  supports_data_input: boolean
  supports_scheduling: boolean
}

export type ScheduleType = 'dates' | 'frequency'
export type FrequencyKind = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface BotSchedule {
  id: string
  bot_id: string
  enabled: boolean
  type: ScheduleType
  scheduled_dates: string[]
  frequency?: FrequencyKind
  frequency_days: number[]
  frequency_weekday?: number
  time: string
  input_data: Record<string, string>
  created_by: string
  created_at: string
}
