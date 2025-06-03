// backend/api/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const audioChunksStore = {};
const transcriptStore = {};

// 1) POST /audio-chunks
app.post('/audio-chunks', (req, res) => {
  const { userId = 'anonymous', filename, base64Audio, timestamp } = req.body;
  if (!filename || !base64Audio) {
    return res.status(400).json({ error: 'filename and base64Audio are required' });
  }
  if (!audioChunksStore[userId]) audioChunksStore[userId] = [];
  audioChunksStore[userId].push({ filename, base64Audio, timestamp: timestamp || Date.now() });
  console.log(`[audio-chunks] stored '${filename}' for '${userId}'`);
  res.json({ status: 'ok' });
});

// 2) POST /transcripts
app.post('/transcripts', (req, res) => {
  const { userId = 'anonymous', segments } = req.body;
  if (!Array.isArray(segments)) {
    return res.status(400).json({ error: 'segments must be an array of strings' });
  }
  if (!transcriptStore[userId]) transcriptStore[userId] = [];
  transcriptStore[userId].push(...segments);
  console.log(`[transcripts] stored ${segments.length} segment(s) for '${userId}'`);
  res.json({ status: 'ok' });
});

// 3) GET /transcripts/:userId
app.get('/transcripts/:userId', (req, res) => {
  const { userId } = req.params;
  const segments = transcriptStore[userId] || [];
  res.json({ segments });
});

// 4) POST /chat (stub)
app.post('/chat', (req, res) => {
  const { userId = 'anonymous', transcriptSegments, userQuery } = req.body;
  console.log(`[chat] '${userId}' asked: "${userQuery}"`);
  const fakeResponse = `This is a stubbed chat response to: "${userQuery}".`;
  res.json({ botResponse: fakeResponse });
});

// 5) POST /summaries (stub)
app.post('/summaries', (req, res) => {
  const { userId = 'anonymous', transcriptSegments } = req.body;
  console.log(`[summaries] generating for '${userId}'`);
  const bullets = Array.isArray(transcriptSegments) && transcriptSegments.length > 0
    ? transcriptSegments.slice(0, 3).map((seg, i) =>
        `• [Point ${i + 1}] ${seg.substring(0, 50)}${seg.length > 50 ? '…' : ''}`
      )
    : ['• No transcript available to summarize.'];
  const fakeSummary = `Here is a stubbed summary:\n${bullets.join('\n')}`;
  res.json({ summary: fakeSummary });
});

// Export as a serverless function
module.exports = serverless(app);
