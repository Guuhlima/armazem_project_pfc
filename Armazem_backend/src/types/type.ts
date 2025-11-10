export type Granularity = 'hour' | 'day' | 'week' | 'month'
export type LogType =
  | 'ACCESS'
  | 'INVENTORY'
  | 'BOT'
export type LogAction =
  | 'LOGIN' | 'LOGOUT' | 'REQUEST'
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'MOVE' | 'TRANSFER'
  | 'MESSAGE_SENT' | 'MESSAGE_FAILED'