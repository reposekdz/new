
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

// Routes
app.post('/api/generate', async (req, res) => {
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
    console.error("Generation Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const { files, command } = req.body;
    const output = await runSimulation(files, command);
    res.send(output);
  } catch (error) {
    console.error("Execution Error:", error);
    res.status(500).send(`[SYSTEM ERROR]: ${error.message}`);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 OmniGen Backend running on http://localhost:${PORT}`);
});
