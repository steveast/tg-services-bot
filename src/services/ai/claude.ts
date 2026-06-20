import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../../config.js';

// Все вызовы идут из одного фиксированного cwd: сессии Claude Code привязаны к cwd,
// поэтому --resume находит диалог только из той же директории.
const CWD = path.join(os.homedir(), '.tg-services-bot-ai');

const TIMEOUT_MS = 150_000;

const SYSTEM =
  'Ты — харизматичный и остроумный ассистент в семейном Telegram-чате. ' +
  'Характер: живой ум, лёгкая ирония и самоирония, уместный юмор. ' +
  'Отвечай полезно и по делу, но с искрой — без канцелярита и занудства. ' +
  'Юмор не в ущерб сути: сначала ответ, потом шутка, если она к месту. ' +
  'На русском (если не просят иначе), кратко, без преамбул вроде «Конечно!». ' +
  'У тебя есть веб-поиск (WebSearch/WebFetch) — пользуйся им для свежих фактов ' +
  '(курсы, погода, новости, цены, расписания). Доступа к файлам и другим инструментам нет.';

// Последовательная очередь: один процесс claude за раз — бережём прод-бокс.
let chain: Promise<unknown> = Promise.resolve();

export interface RunOpts {
  sessionId: string;
  resume: boolean; // true — продолжить сессию (--resume), false — создать (--session-id)
}

export function runClaude(prompt: string, opts: RunOpts): Promise<string> {
  const next = () => spawnClaude(prompt, opts);
  const result = chain.then(next, next);
  chain = result.catch(() => undefined);
  return result;
}

function spawnClaude(prompt: string, { sessionId, resume }: RunOpts): Promise<string> {
  mkdirSync(CWD, { recursive: true });
  const args = [
    '-p',
    prompt,
    '--tools',
    'WebSearch,WebFetch', // только веб-поиск; файлы/bash недоступны
    '--allowedTools',
    'WebSearch,WebFetch', // авто-разрешение в неинтерактиве (иначе запрос на разрешение auto-deny)
    '--system-prompt',
    SYSTEM,
    '--output-format',
    'text',
  ];
  args.push(resume ? '--resume' : '--session-id', sessionId);

  return new Promise<string>((resolve, reject) => {
    // stdin закрыт (ignore) — иначе claude ждёт ввод ~3 c.
    const child = spawn(config.claudeCliPath, args, { cwd: CWD, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('claude timeout'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(`claude exit ${code}: ${(err || out).trim().slice(0, 500)}`));
    });
  });
}

export function isNoConversationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /No conversation found/i.test(msg);
}
