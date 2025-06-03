// backend/api/index.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// Enable CORS on all routes:
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory data stores:
const audioChunksStore = {};      // { userId: [ { filename, base64Audio, timestamp } ] }
const transcriptStore = {};       // { userId: [ 'segment1', 'segment2', … ] }

// 1) POST /api/audio-chunks
app.post('/audio-chunks', (req, res) => {
  const { userId = 'anonymous', filename, base64Audio, timestamp } = req.body;
  if (!filename || !base64Audio) {
    return res.status(400).json({ error: 'filename and base64Audio are required' });
  }
  if (!audioChunksStore[userId]) {
    audioChunksStore[userId] = [];
  }
  audioChunksStore[userId].push({ filename, base64Audio, timestamp: timestamp || Date.now() });
  console.log(`[audio-chunks] stored chunk '${filename}' for user '${userId}'`);
  res.json({ status: 'ok' });
});

// 2) POST /api/transcripts
app.post('/transcripts', (req, res) => {
  const { userId = 'anonymous', segments } = req.body;
  if (!Array.isArray(segments)) {
    return res.status(400).json({ error: 'segments must be an array of strings' });
  }
  if (!transcriptStore[userId]) {
    transcriptStore[userId] = [];
  }
  transcriptStore[userId].push(...segments);
  console.log(`[transcripts] stored ${segments.length} segment(s) for user '${userId}'`);
  res.json({ status: 'ok' });
});

// 3) GET /api/transcripts/:userId
app.get('/transcripts/:userId', (req, res) => {
  const { userId } = req.params;
  const segments = transcriptStore[userId] || [];
  res.json({ segments });
});

// 4) POST /api/chat
app.post('/chat', (req, res) => {
  const { userId = 'anonymous', transcriptSegments, userQuery } = req.body;
  console.log(`[chat] user '${userId}' asked: "${userQuery}"`);
  const fakeResponse = `This is a stubbed chat response to your question: "${userQuery}".`;
  return res.json({ botResponse: fakeResponse });
});

// 5) POST /api/summaries
app.post('/summaries', (req, res) => {
  const { userId = 'anonymous', transcriptSegments } = req.body;
  console.log(`[summaries] generating summary for '${userId}'`);
  // Build a simple bullet list from the first three segments (or a fallback note):
  const bullets = Array.isArray(transcriptSegments) && transcriptSegments.length > 0
    ? transcriptSegments.slice(0, 3).map((seg, i) =>
        `• [Point ${i + 1}] ${seg.substring(0, 50)}${seg.length > 50 ? '…' : ''}`
      )
    : ['• No transcript available to summarize.'];
  const fakeSummary = `Here is a stubbed meeting summary:\n${bullets.join('\n')}`;
  return res.json({ summary: fakeSummary });
});

// Export the app wrapped in serverless-http:
module.exports = serverless(app);
