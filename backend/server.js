const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const audioChunksStore = {};
const transcriptStore = {};

// … define routes for /api/audio-chunks, /api/transcripts, etc. …

app.listen(PORT, () => {
  console.log(`✨ Backend listening on http://localhost:${PORT}`);
});
