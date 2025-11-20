
const { GoogleGenAI } = require("@google/genai");
const { getSystemInstruction, getExecutionSystemInstruction } = require('../utils/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

/**
 * Analyzes complexity to determine if we need the "Heavy Lifter" model.
 */
const analyzeComplexity = (prompt) => {
    const highTierKeywords = [
        'architecture', 'microservices', 'database', 'full stack', 'production',
        'react native', 'rust', 'go', 'python', 'c++', 'security', 'auth',
        'realtime', 'socket', 'webrtc', 'encryption', 'algorithm', 'singularity', 
        'optimize', 'refactor', 'scalable'
    ];
    
    // Almost any "create" request should go to Pro to ensure "World Class" quality
    if (prompt.length > 40 || prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('build')) {
        return true;
    }

    return highTierKeywords.some(kw => prompt.toLowerCase().includes(kw));
};

/**
 * Robustly extracts and parses JSON from AI responses.
 */
const parseHealedJson = (text) => {
    if (!text) throw new Error("Empty response from AI");
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    let cleanText = match && match[1] ? match[1] : text.replace(/```json/g, '').replace(/```/g, '');
    cleanText = cleanText.replace(/\/\/.*$/gm, ''); // Remove comments

    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // Fallback: Try to find the largest array bracket pair
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
            try { return JSON.parse(potentialJson); } catch (e2) { /* give up */ }
             // Fix Trailing Commas
            const fixedText = potentialJson.replace(/,(\s*[\]}])/g, '$1');
            try { return JSON.parse(fixedText); } catch (e3) { /* give up */ }
        }
        console.error("Failed JSON Text:", text.substring(0, 500) + "...");
        throw new Error("Failed to parse JSON. The architecture was too complex to serialize.");
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
      promptContext += `Current Project Structure: ${fileSummary}\n`;
      // Send full content for deep reasoning
      const contextFiles = currentFiles.map(f => ({ path: f.path, content: f.content }));
      promptContext += `Current File Contents:\n${JSON.stringify(contextFiles)}\n\n`;
  }
  
  if (history.length > 0) {
      promptContext += `History:\n${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n')}\n\n`;
  }

  const isComplex = analyzeComplexity(userPrompt);
  
  // AGGRESSIVE UPGRADE: Always use Pro for creation/complex tasks to match "World Class" requirement
  let effectiveModel = model;
  if (isComplex || !isModification) {
      effectiveModel = 'gemini-3-pro-preview';
      console.log("🚀 Upgrading to Gemini 3.0 Pro for World-Class Generation");
  }

  const parts = [{ text: promptContext }];
  
  for (const att of attachments) {
      if (att.isImage) {
          const base64Data = att.content.split(',')[1] || att.content;
          parts.push({ inlineData: { mimeType: att.type, data: base64Data } });
      } else {
          parts.push({ text: `[ATTACHMENT: ${att.name}]\n${att.content}` });
      }
  }

  // MAXIMIZED THINKING BUDGET (SINGULARITY MODE)
  const config = {
      systemInstruction,
      temperature: 0.7, 
      topK: 40,
      topP: 0.95,
  };

  if (effectiveModel.includes('pro') || effectiveModel.includes('2.5')) {
       // 32768 is the hard limit for the 2.5 Pro model. This provides maximum reasoning depth.
       config.thinkingConfig = { thinkingBudget: 32768 }; 
       console.log(`[AI] SINGULARITY MODE ACTIVE: Thinking Budget Maxed to 32,768`);
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

        // Merge with existing
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
          await new Promise(r => setTimeout(r, 1500)); // Backoff
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
