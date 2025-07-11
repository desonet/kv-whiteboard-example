// src/index.ts
addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

import { Hono } from 'hono';
import { SharedKnowledgeSession, router as sessionRouter } from './session';
import type { Env } from './session';

const app = new Hono<Env>();

app.get('/', (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Shared Knowledge Whiteboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: auto; padding: 2rem; }
    textarea, input, button { width: 100%; margin-bottom: 1rem; padding: 0.5rem; font-size: 1rem; }
    pre { background: #f3f3f3; padding: 1rem; border-radius: 5px; white-space: pre-wrap; }
    ul { padding-left: 1rem; }
    li { margin-bottom: 0.5rem; }
    label { font-weight: bold; display: block; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Shared Knowledge Whiteboard</h1>

  <label for="session-id">Session ID:</label>
  <input type="text" id="session-id" placeholder="e.g., team-sync" />

  <label for="user-name">Your Name:</label>
  <input type="text" id="user-name" placeholder="e.g., Farai" />

  <label for="user-message">Your Message:</label>
  <textarea id="user-message" rows="4" placeholder="Contribute to the shared session..."></textarea>

  <button id="send">Send</button>

  <h2>Assistant Summary</h2>
  <pre id="summary">(waiting for input...)</pre>

  <h2>Session History</h2>
  <ul id="history"></ul>

  <script>
    const sendBtn = document.getElementById('send');
    const sessionInput = document.getElementById('session-id');
    const nameInput = document.getElementById('user-name');
    const messageInput = document.getElementById('user-message');
    const summaryEl = document.getElementById('summary');
    const historyEl = document.getElementById('history');

    // Load name from localStorage
    nameInput.value = localStorage.getItem('whiteboard:name') || '';

    sendBtn.addEventListener('click', async () => {
      const sessionId = sessionInput.value.trim();
      const userName = nameInput.value.trim();
      const userMessage = messageInput.value.trim();

      if (!sessionId || !userMessage) {
        alert('Please enter a session ID and message');
        return;
      }

      if (userName) localStorage.setItem('whiteboard:name', userName);

      const res = await fetch(\`/session/\${encodeURIComponent(sessionId)}/submit\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          name: userName,
          content: userMessage
        }),
      });

      if (!res.ok) {
        summaryEl.textContent = '⚠️ Failed to submit message.';
        return;
      }

      const data = await res.json();
      summaryEl.textContent = data.summary || '(no summary yet)';
      renderHistory(data.history);

      messageInput.value = '';
    });

    function renderHistory(history) {
      historyEl.innerHTML = '';
      history.forEach(m => {
        const li = document.createElement('li');
        const who = m.name ? \`\${m.name} (\${m.role})\` : m.role;
        const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
        li.textContent = \`[\${time}] \${who}: \${m.content}\`;
        historyEl.appendChild(li);
      });
    }
  </script>
</body>
</html>`)
);

// Mount session Durable Object routes
app.route('/session', sessionRouter);

// Export app and Durable Object
export default app;
export { SharedKnowledgeSession } from './session';
