# Shared Knowledge Whiteboard

A Cloudflare Workers-based collaborative memory tool that uses **Durable Objects** and **KV storage** to persist and summarize shared user sessions. This serves as a working reference for how to structure multi-user session memory using infrastructure patterns aligned with the MCP and Agent frameworks.

---

## Overview

This project demonstrates:

- Durable Object-based memory session management
- KV storage integration for shared knowledge logs
- Optional AI summarization after N user contributions
- Basic multi-user frontend for message history + identity
- Recruiter-ready example for building real-world MCP tools

---

## Project Structure

/kv-whiteboard-example
├── src/
│ ├── index.ts # Worker entry point and HTML interface
│ └── session.ts # Durable Object for shared memory logic
├── wrangler.toml # Cloudflare deployment config
├── package.json # Dev dependencies (Wrangler, Hono)
└── README.md # Project documentation

---

## Key Components

- **Durable Object**: `SharedKnowledgeSession` stores per-session logs and summaries.
- **KV Memory Store**: All session data is stored in Cloudflare KV under keys like `session:team1`.
- **Session Router**: Hono-based POST route forwards to Durable Object stub.
- **Frontend**: Minimal HTML/JS UI lets users contribute messages and view summaries.

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install/) CLI

### Install dependencies

```bash
npm install

---

## Start local dev server

npm run dev

- This launches the app at http://localhost:8787.

---

## Usage

- Visit / in your browser.

- Enter a session ID (e.g., team-sync) and your name.

- Contribute a message.

- Every 3rd message triggers a new session summary.

- All contributions and summaries persist in KV memory.

---

## Available Endpoints

Method	Route	Description
GET	/	Basic UI frontend
POST	/session/:id/submit	Submits a message to the session
GET	/session/:id/history	Returns full session message history

---

## Deployment

- Ensure your wrangler.toml is correctly configured:

name = "kv-whiteboard-example"
main = "src/index.ts"
compatibility_date = "2024-06-20"

[[kv_namespaces]]
binding = "CACHE"
id = "<your-kv-id>"

[[durable_objects.bindings]]
name = "SESSION_NAMESPACE"
class_name = "SharedKnowledgeSession"

[[migrations]]
tag = "v1"
new_classes = ["SharedKnowledgeSession"]

- Then run:

npx wrangler publish

---

## Testing

- You can test locally with:

curl -X POST http://localhost:8787/session/demo/submit \
  -H "Content-Type: application/json" \
  -d '{"role":"user", "name":"Farai", "content":"Let’s start the session."}'
