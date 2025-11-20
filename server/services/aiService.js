
const { GoogleGenAI } = require("@google/genai");
const { getSystemInstruction, getExecutionSystemInstruction } = require('../utils/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

/**
 * Analyzes the user's prompt to determine if the task requires a more powerful model.
 */
const analyzeComplexity = (prompt) => {
    const highTierKeywords = [
        'architecture', 'microservices', 'ddd', 'security', 'encryption', 
        'realtime', 'socket', 'webrtc', 'webgl', 'shader', 'compiler',
        'interpreter', 'operating system', 'kernel', 'blockchain', 'smart contract',
        'optimization', 'refactor', 'testing', 'coverage', 'ci/cd', 'deployment',
        'authentication', 'authorization', 'oauth', 'jwt', 'redux', 'zustand',
        'mobile', 'react native', 'expo', 'electron', 'rust', 'c++',
        'dashboard', 'analytics', 'ecommerce', 'social media', 'marketplace', '3d', 'three.js',
        'vim', 'neovim', 'plugin', 'extension', 'template', 'scaffold', 'new project'
    ];
    
    let score = 0;
    if (prompt.length > 200) score += 1;
    if (prompt.toLowerCase().includes('full stack') || prompt.toLowerCase().includes('complete')) score += 1;
    
    // Scaffolding a new project is critical, always use Pro
    if (prompt.toLowerCase().includes('new project') || prompt.toLowerCase().includes('scaffold')) score += 5;

    highTierKeywords.forEach(kw => {
        if (prompt.toLowerCase().includes(kw)) score += 2;
    });

    return score >= 3; 
};

/**
 * Robustly extracts and parses JSON from AI responses, handling "Thinking" blocks and Markdown.
 */
const parseHealedJson = (text) => {
    if (!text) throw new Error("Empty response from AI");

    // 1. Try to extract JSON block using Markdown Code Blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    
    let cleanText = text;
    if (match && match[1]) {
        cleanText = match[1];
    } else {
        // 2. Fallback: Remove all markdown code block markers
        cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    }

    // 3. Strip comments (// ...) to ensure JSON.parse works
    cleanText = cleanText.replace(/\/\/.*$/gm, '');

    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // 4. Aggressive Regex Extraction (Find outer-most [ ... ])
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
            try { return JSON.parse(potentialJson); } catch (e2) { /* continue */ }
            
            // 5. Fix Trailing Commas in the extracted block
            const fixedText = potentialJson.replace(/,(\s*[\]}])/g, '$1');
            try { return JSON.parse(fixedText); } catch (e3) { /* continue */ }
        }
        
        console.error("Failed JSON Text Preview:", text.substring(0, 500) + "...");
        throw new Error("Failed to parse JSON response from AI. The model might be thinking too hard.");
    }
};

const generateApp = async ({ userPrompt, model, attachments = [], currentFiles = [], history = [], platform = 'web', language = 'typescript' }) => {
  const isModification = currentFiles.length > 0 || history.length > 0;
  const systemInstruction = getSystemInstruction(isModification, platform, language);
  
  let promptContext = `User Request: ${userPrompt}\n`;
  promptContext += `Target Platform: ${platform.toUpperCase()}\n`;
  promptContext += `Target Language: ${language.toUpperCase()}\n\n`;
  
  if (currentFiles.length > 0) {
      const fileSummary = currentFiles.map(f => f.path).join(', ');
      promptContext += `Current Project Structure (${currentFiles.length} files): ${fileSummary}\n`;
      
      // Truncate large files for context to avoid token limits
      const contextFiles = currentFiles.map(f => ({
          path: f.path,
          content: f.content.length > 12000 ? f.content.substring(0, 12000) + "\n...[TRUNCATED]..." : f.content
      }));
      promptContext += `Current File Contents:\n${JSON.stringify(contextFiles)}\n\n`;
  }
  
  if (history.length > 0) {
      promptContext += `Conversation History:\n${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n')}\n\n`;
  }

  const isComplex = analyzeComplexity(userPrompt);
  let effectiveModel = model;
  
  // Auto-upgrade to Pro for complex architecture tasks
  if (isComplex && model === 'gemini-2.5-flash') {
      console.log("Complexity detected: Upgrading to Gemini 3.0 Pro Preview for Architecture Planning");
      effectiveModel = 'gemini-3-pro-preview';
  }

  const parts = [{ text: promptContext }];
  
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

  const isThinkingModel = effectiveModel.includes('2.5') || effectiveModel.includes('pro');

  const config = {
      systemInstruction,
      temperature: isThinkingModel ? 0.7 : 0.4, 
      topK: 40,
      topP: 0.95,
  };

  // Enable Deep Thinking Budget for complex tasks
  if (isThinkingModel && (isComplex || effectiveModel.includes('pro'))) {
       // Maximize reasoning for Pro model to beat competitors
       const budget = isComplex ? 16384 : 8192; 
       config.thinkingConfig = { thinkingBudget: budget };
       console.log(`[AI] Deep Thinking Enabled: Budget ${budget}`);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[AI] Generating with ${effectiveModel} (Attempt ${attempt + 1})`);
        
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: { parts },
            config
        });

        const text = response.text;
        let files = parseHealedJson(text);

        if (!Array.isArray(files)) {
             if (files.files && Array.isArray(files.files)) files = files.files;
             else throw new Error("Invalid JSON structure: Expected array of files");
        }

        files = files.filter(f => f && f.path && typeof f.content === 'string');

        // Merge with existing if modification
        if (isModification) {
            const updatedFilesMap = new Map(currentFiles.map(f => [f.path, f]));
            files.forEach(f => {
                updatedFilesMap.set(f.path, f);
            });
            files = Array.from(updatedFilesMap.values());
        }

        return files;

      } catch (err) {
          console.error(`[Attempt ${attempt + 1}] Generation failed:`, err.message);
          if (attempt === MAX_RETRIES) throw new Error(`Failed after ${MAX_RETRIES} attempts: ${err.message}`);
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
      }
  }
};

const runSimulation = async (files, command) => {
  try {
      const fileContext = files.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n');
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', 
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
