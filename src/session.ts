// src/session.ts (fully updated for Phase 2)

import { Context, Hono } from 'hono';
import type { Env as BaseEnv } from './server';
import { z } from 'zod';

export class SharedKnowledgeSession {
  state: DurableObjectState;
  env: Env;
  sessionKey: string;
  static SUMMARY_INTERVAL = 3;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessionKey = `session:log:${state.id.toString()}`;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/submit') {
      const raw = await request.json();
      const parsed = messageSchema.safeParse(raw);
      if (!parsed.success) {
        return new Response('Invalid payload', { status: 400 });
      }
      const { role, content, name, userId } = parsed.data;

      const updated = await this.appendMessage({ role, content, name, userId });

      let summary = '(waiting for more input...)';
      if (updated.length % SharedKnowledgeSession.SUMMARY_INTERVAL === 0) {
        summary = await this.generateSummary(updated);
      }

      return Response.json({ summary, history: updated });
    }

    return new Response('Not found', { status: 404 });
  }

  async appendMessage(entry: MessageEntry) {
    const existing = await this.env.CACHE.get(this.sessionKey, 'json') || [];
    const timestamp = new Date().toISOString();
    const updated = [...existing, { ...entry, timestamp }];
    await this.env.CACHE.put(this.sessionKey, JSON.stringify(updated));
    return updated;
  }

  async generateSummary(history: MessageEntry[]): Promise<string> {
    const transcript = history.map((m) => `${m.role}: ${m.content}`).join('\n');
    return `Summary:\n${transcript}`;
  }
}

// Types
export interface Env extends BaseEnv {
  SESSION_NAMESPACE: DurableObjectNamespace;
  CACHE: KVNamespace;
}

interface MessageEntry {
  role: string;
  content: string;
  name?: string;
  userId?: string;
  timestamp?: string;
}

// Zod validation
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  name: z.string().optional(),
  userId: z.string().optional(),
});

// Helper: List all sessions
async function listSessions(env: Env): Promise<string[]> {
  const list = await env.CACHE.list({ prefix: 'session:log:' });
  return list.keys.map((k) => k.name.replace('session:log:', ''));
}

// Helper: Reset a session
async function resetSession(env: Env, sessionId: string): Promise<void> {
  await env.CACHE.delete(`session:log:${sessionId}`);
  await env.CACHE.delete(`session:summary:${sessionId}`);
}

// Routes
export const router = new Hono<Env>();

router.post('/:id/submit', async (c: Context<Env>) => {
  const id = c.req.param('id');
  const stub = c.env.SESSION_NAMESPACE.get(c.env.SESSION_NAMESPACE.idFromName(id));
  const payload = await c.req.json();

  const res = await stub.fetch('https://internal/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res;
});

router.get('/:id/history', async (c) => {
  const id = c.req.param('id');
  const log = await c.env.CACHE.get(`session:log:${id}`, 'json');
  return c.json({ history: log || [] });
});

router.get('/sessions', async (c) => {
  const sessions = await listSessions(c.env);
  return c.json({ sessions });
});

router.post('/:id/reset', async (c) => {
  const id = c.req.param('id');
  await resetSession(c.env, id);
  return c.json({ ok: true });
});
