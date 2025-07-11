// src/server.ts

import { DurableObjectState } from '@cloudflare/workers-types';
import { OpenAI } from 'openai';

export class SharedKnowledgeSession implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private get summaryKey(): string {
    return `summary:${this.state.id.toString()}`;
  }

  async fetch(request: Request): Promise<Response> {
    const method = request.method;

    if (method === 'POST') {
      try {
        const body = await request.json();
        const { contribution } = body;

        if (!contribution) {
          return new Response('Missing contribution', { status: 400 });
        }

        const currentSummary = (await this.env.CACHE.get(this.summaryKey)) || '';

        const openai = new OpenAI({ apiKey: this.env.OPEN_AI_API_KEY });
        const chatResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are summarizing a collaborative session.' },
            { role: 'user', content: `Current summary:\n${currentSummary}` },
            { role: 'user', content: `New contribution:\n${contribution}` },
            { role: 'user', content: 'Update the summary with this new contribution.' }
          ]
        });

        const newSummary = chatResponse.choices?.[0]?.message?.content;

        if (!newSummary) {
          return new Response('Failed to generate summary', { status: 500 });
        }

        await this.env.CACHE.put(this.summaryKey, newSummary);

        return new Response(JSON.stringify({ summary: newSummary }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(`Error: ${(err as Error).message}`, { status: 500 });
      }
    }

    if (method === 'GET') {
      const currentSummary = (await this.env.CACHE.get(this.summaryKey)) || 'No summary yet.';
      return new Response(currentSummary, { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  }
}

export type Env = {
  CACHE: KVNamespace;
  OPEN_AI_API_KEY: string;
};
