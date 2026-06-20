import { db } from '../../core/db.js';

// Маппинг «чат → session-id Claude Code» для памяти переписки (схема создаётся в core/db.ts).
const getStmt = db.prepare('SELECT session_id FROM ai_sessions WHERE chat_id = ?');
const setStmt = db.prepare(`
  INSERT INTO ai_sessions (chat_id, session_id, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(chat_id) DO UPDATE SET session_id = excluded.session_id, updated_at = excluded.updated_at
`);
const delStmt = db.prepare('DELETE FROM ai_sessions WHERE chat_id = ?');

export function getSessionId(chatId: number): string | undefined {
  const row = getStmt.get(String(chatId)) as { session_id: string } | undefined;
  return row?.session_id;
}

export function setSessionId(chatId: number, sessionId: string): void {
  setStmt.run(String(chatId), sessionId, Date.now());
}

export function clearSession(chatId: number): void {
  delStmt.run(String(chatId));
}
