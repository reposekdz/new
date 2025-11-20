
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { generateApp, runSimulation } = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large payloads for images/file contexts

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/generate', async (req, res, next) => {
  try {
    const { prompt, model, attachments, currentFiles, history } = req.body;
    
    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Prompt or attachments required" });
    }

    const generatedFiles = await generateApp({
      userPrompt: prompt,
      model,
      attachments,
      currentFiles,
      history
    });

    res.json(generatedFiles);
  } catch (error) {
    next(error);
  }
});

app.post('/api/execute', async (req, res, next) => {
  try {
    const { files, command } = req.body;
    if (!files || !command) return res.status(400).send("Missing files or command");

    const output = await runSimulation(files, command);
    res.send(output);
  } catch (error) {
    next(error);
  }
});

// Centralized Error Handling
app.use((err, req, res, next) => {
    console.error("[SERVER ERROR]", err.stack);
    
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({
        error: message,
        timestamp: new Date().toISOString(),
        path: req.url
    });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 OmniGen Backend running on http://localhost:${PORT}`);
});
