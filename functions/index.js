// functions/index.js
const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory stores (reset on cold start, but fine for stubs/demo)
const audioChunksStore = {};
const transcriptStore = {};

// Health‐check at /
app.get('/', (req, res) => {
  return res.json({ status: 'OK', message: 'Firebase function is running.' });
});

// POST /audio-chunks
app.post('/api/audio-chunks', (req, res) => {
  const { userId = 'anonymous', filename, base64Audio, timestamp } = req.body;
  if (!filename || !base64Audio) {
    return res.status(400).json({ error: 'filename and base64Audio are required' });
  }
  if (!audioChunksStore[userId]) audioChunksStore[userId] = [];
  audioChunksStore[userId].push({ filename, base64Audio, timestamp: timestamp || Date.now() });
  return res.json({ status: 'ok' });
});

// POST /transcripts
app.post('/api/transcripts', (req, res) => {
  const { userId = 'anonymous', segments } = req.body;
  if (!Array.isArray(segments)) {
    return res.status(400).json({ error: 'segments must be an array of strings' });
  }
  if (!transcriptStore[userId]) transcriptStore[userId] = [];
  transcriptStore[userId].push(...segments);
  return res.json({ status: 'ok' });
});

// GET /transcripts/:userId
app.get('/api/transcripts/:userId', (req, res) => {
  const { userId } = req.params;
  const segments = transcriptStore[userId] || [];
  return res.json({ segments });
});

// POST /chat
app.post('/api/chat', (req, res) => {
  const { userId = 'anonymous', transcriptSegments, userQuery } = req.body;
  const fakeResponse = `This is a stubbed chat response to: "${userQuery}".`;
  return res.json({ botResponse: fakeResponse });
});

// POST /summaries
app.post('/api/summaries', (req, res) => {
  const { userId = 'anonymous', transcriptSegments } = req.body;
  const bullets = Array.isArray(transcriptSegments) && transcriptSegments.length > 0
    ? transcriptSegments.slice(0, 3).map((seg, i) =>
        `• [Point ${i + 1}] ${seg.substring(0, 50)}${seg.length > 50 ? '…' : ''}`
      )
    : ['• No transcript available to summarize.'];
  const fakeSummary = `Here is a stubbed summary:\n${bullets.join('\n')}`;
  return res.json({ summary: fakeSummary });
});

// Expose the Express app as a Firebase HTTPS function:
module.exports.api = functions.https.onRequest(app);
