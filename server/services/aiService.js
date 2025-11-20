
const { GoogleGenAI } = require("@google/genai");
const { getSystemInstruction, getExecutionSystemInstruction } = require('../utils/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

// --- HELPER: DEEP COMPLEXITY ANALYSIS ---
const analyzeComplexity = (prompt) => {
    const highTierKeywords = [
        'architecture', 'microservices', 'ddd', 'security', 'encryption', 
        'realtime', 'socket', 'webrtc', 'webgl', 'shader', 'compiler',
        'interpreter', 'operating system', 'kernel', 'blockchain', 'smart contract',
        'optimization', 'refactor', 'testing', 'coverage', 'ci/cd', 'deployment',
        'authentication', 'authorization', 'oauth', 'jwt'
    ];
    
    // Score based on length and keywords
    let score = 0;
    if (prompt.length > 200) score += 1;
    highTierKeywords.forEach(kw => {
        if (prompt.toLowerCase().includes(kw)) score += 2;
    });

    return score >= 2; // Threshold for Pro model
};

// --- HELPER: AUTO-HEALING JSON PARSER ---
const parseHealedJson = (text) => {
    if (!text) throw new Error("Empty response from AI");

    // 1. Remove Markdown Code Blocks
    let cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    // 2. Strip Single Line Comments (// ...) which are invalid in standard JSON
    cleaned = cleaned.replace(/\/\/.*$/gm, '');

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // 3. Extract Array from Text using Regex (Greedy)
        const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e3) { /* continue */ }
        }
        
        // 4. Attempt to fix common trailing comma issues
        cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');
        try { return JSON.parse(cleaned); } catch (e4) { /* continue */ }

        console.error("Failed JSON Text Preview:", text.substring(0, 500) + "...");
        throw new Error("Failed to parse JSON response from AI after multiple attempts.");
    }
};

// --- HELPER: ADVANCED SCAFFOLDING ---
const setupProject = (files, prompt) => {
  const newFiles = [...files];
  const filePaths = new Set(newFiles.map(f => f.path));

  const promptLower = prompt.toLowerCase();
  const isPython = newFiles.some(f => f.path.endsWith('.py')) || promptLower.includes('python');
  const isNode = newFiles.some(f => f.path.match(/\.(js|ts|jsx|tsx)$/)) || (!isPython);

  // 1. Generate .gitignore if missing
  if (!filePaths.has('.gitignore')) {
    let content = "node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n.vscode/\ncoverage/";
    if (isPython) content += "\n__pycache__/\n*.pyc\nvenv/\n.pytest_cache/";
    newFiles.push({ path: '.gitignore', content });
  }

  // 2. Ensure package.json exists for Node projects
  if (isNode && !filePaths.has('package.json')) {
    const pkg = {
      name: "omnigen-app",
      version: "1.0.0",
      type: "module",
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "test": "vitest",
        "lint": "eslint .",
        "server": "node server/index.js"
      },
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.344.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.1",
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "jsonwebtoken": "^9.0.2"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        "vite": "^5.1.4",
        "vitest": "^1.3.1",
        "tailwindcss": "^3.4.1",
        "autoprefixer": "^10.4.18",
        "postcss": "^8.4.35",
        "@types/express": "^4.17.21"
      }
    };
    newFiles.push({ path: 'package.json', content: JSON.stringify(pkg, null, 2) });
  }

  return newFiles;
};

// --- MAIN FUNCTION: GENERATE APP ---
const generateApp = async ({ userPrompt, model, attachments = [], currentFiles = [], history = [], generationType = 'frontend' }) => {
  const isModification = currentFiles.length > 0 || history.length > 0;
  const systemInstruction = getSystemInstruction(isModification, generationType);
  
  // Construct Context
  let promptContext = `User Request: ${userPrompt}\n\n`;
  
  if (currentFiles.length > 0) {
      const fileSummary = currentFiles.map(f => f.path).join(', ');
      promptContext += `Current Project Structure (${currentFiles.length} files): ${fileSummary}\n`;
      // Pass full content for small-medium projects, simplified for massive ones
      promptContext += `Current File Contents:\n${JSON.stringify(currentFiles)}\n\n`;
  }
  
  if (history.length > 0) {
      promptContext += `Conversation History:\n${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n')}\n\n`;
  }

  // Smart Model Selection
  const isComplex = analyzeComplexity(userPrompt);
  let effectiveModel = model;
  
  if (isComplex && model === 'gemini-2.5-flash') {
      console.log("Complexity detected: Upgrading to Gemini 3.0 Pro Preview");
      effectiveModel = 'gemini-3-pro-preview';
  }

  const parts = [{ text: promptContext }];
  
  // Append Attachments
  for (const att of attachments) {
      if (att.isImage) {
          const base64Data = att.content.split(',')[1] || att.content;
          parts.push({
              inlineData: { mimeType: att.type, data: base64Data }
          });
      } else {
          parts.push({ text: `[ATTACHMENT: ${att.name}]\n${att.content}` });
      }
  }

  // Retry Logic with Backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[AI] Generating with ${effectiveModel} (Attempt ${attempt + 1})`);
        
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: { parts },
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                // Pro model benefits from higher temp for architecture creativity
                // Increase temperature on retries to break specific loops
                temperature: effectiveModel.includes('pro') ? 0.4 + (attempt * 0.1) : 0.2 + (attempt * 0.1),
                topK: 40,
                topP: 0.95,
            }
        });

        const text = response.text;
        let files = parseHealedJson(text);

        // Validate Structure
        if (!Array.isArray(files)) {
             if (files.files && Array.isArray(files.files)) files = files.files;
             else throw new Error("Invalid JSON structure: Expected array of files");
        }

        // Filter out invalid entries
        files = files.filter(f => f && f.path && typeof f.content === 'string');

        // Merge Logic for Modifications
        if (isModification) {
            const updatedFilesMap = new Map(currentFiles.map(f => [f.path, f]));
            files.forEach(f => {
                updatedFilesMap.set(f.path, f);
            });
            files = Array.from(updatedFilesMap.values());
        }

        return setupProject(files, userPrompt);

      } catch (err) {
          console.error(`[Attempt ${attempt + 1}] Generation failed:`, err.message);
          if (attempt === MAX_RETRIES) throw new Error(`Failed after ${MAX_RETRIES} attempts: ${err.message}`);
          
          // Exponential backoff
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
      }
  }
};

// --- SIMULATION EXECUTION ---
const runSimulation = async (files, command) => {
  try {
      const fileContext = files.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n');
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Use Flash for fast terminal feedback
          contents: `CONTEXT:\n${fileContext}\n\nCOMMAND: ${command}`,
          config: {
              systemInstruction: getExecutionSystemInstruction(),
              temperature: 0.1
          }
      });

      return response.text;
  } catch (error) {
      return `System Error: ${error.message}`;
  }
};

module.exports = { generateApp, runSimulation };
