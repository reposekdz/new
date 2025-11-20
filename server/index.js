
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { generateApp, runSimulation } = require('./services/aiService');
const { fetchGithubRepo } = require('./services/githubService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large payloads for images/file contexts

// --- IN-MEMORY AUTH STORE (For Simulation) ---
const users = []; 
const tokens = new Map(); // Token -> User

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const user = tokens.get(token);
    if (!user) return res.status(403).json({ error: "Forbidden: Invalid Token" });

    req.user = user;
    next();
};

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
    
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });

    const newUser = { id: Date.now(), email, password, name: name || email.split('@')[0] };
    users.push(newUser);
    
    // Generate mock token
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    tokens.set(token, newUser);

    console.log(`[Auth] Registered: ${email}`);
    res.json({ message: "Registered successfully", token, user: { id: newUser.id, email, name: newUser.name } });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    tokens.set(token, user);

    console.log(`[Auth] Login: ${email}`);
    res.json({ message: "Logged in", token, user: { id: user.id, email, name: user.name } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// --- CORE ROUTES ---
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

app.post('/api/import/github', async (req, res, next) => {
    try {
        const { repoUrl } = req.body;
        if (!repoUrl) return res.status(400).json({ error: "Repository URL is required" });

        const files = await fetchGithubRepo(repoUrl);
        res.json(files);
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
