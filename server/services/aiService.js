
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
        'authentication', 'authorization', 'oauth', 'jwt',
        'mobile', 'react native', 'expo', 'electron', 'rust', 'c++',
        'dashboard', 'analytics', 'ecommerce', 'social media', 'marketplace'
    ];
    
    // Score based on length and keywords
    let score = 0;
    if (prompt.length > 150) score += 1;
    highTierKeywords.forEach(kw => {
        if (prompt.toLowerCase().includes(kw)) score += 2;
    });

    return score >= 3; // Threshold for Pro model (Lowered slightly to favor quality)
};

// --- HELPER: AUTO-HEALING JSON PARSER ---
const parseHealedJson = (text) => {
    if (!text) throw new Error("Empty response from AI");

    // 1. Remove Markdown Code Blocks (and any text outside them)
    // This regex searches for the *last* occurrence of a JSON array in the text,
    // which handles cases where the AI outputs "Thinking: ... \n ```json [...]```"
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    
    let cleanText = text;
    if (match && match[1]) {
        cleanText = match[1];
    } else {
        // Fallback: Remove just the markers if regex didn't catch a block structure
        cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    }

    // 2. Strip Comments
    cleanText = cleanText.replace(/\/\/.*$/gm, '');

    // 3. Attempt Parse
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // 4. Aggressive Regex Extraction (Find the largest array bracket pair)
        // This finds the first '[' and the last ']'
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
            try { return JSON.parse(potentialJson); } catch (e2) { /* continue */ }
        }
        
        // 5. Final Hail Mary: Fix trailing commas
        const fixedText = cleanText.replace(/,(\s*[\]}])/g, '$1');
        try { return JSON.parse(fixedText); } catch (e3) { /* continue */ }

        console.error("Failed JSON Text Preview:", text.substring(0, 500) + "...");
        throw new Error("Failed to parse JSON response. The AI might have outputted conversational text instead of code.");
    }
};

// --- MAIN FUNCTION: GENERATE APP ---
const generateApp = async ({ userPrompt, model, attachments = [], currentFiles = [], history = [], platform = 'web', language = 'typescript' }) => {
  const isModification = currentFiles.length > 0 || history.length > 0;
  const systemInstruction = getSystemInstruction(isModification, platform, language);
  
  // Construct Context
  let promptContext = `User Request: ${userPrompt}\n`;
  promptContext += `Target Platform: ${platform.toUpperCase()}\n`;
  promptContext += `Target Language: ${language.toUpperCase()}\n\n`;
  
  if (currentFiles.length > 0) {
      const fileSummary = currentFiles.map(f => f.path).join(', ');
      promptContext += `Current Project Structure (${currentFiles.length} files): ${fileSummary}\n`;
      // Pass content, but truncate very large files to save context
      const contextFiles = currentFiles.map(f => ({
          path: f.path,
          content: f.content.length > 10000 ? f.content.substring(0, 10000) + "\n...[TRUNCATED]..." : f.content
      }));
      promptContext += `Current File Contents:\n${JSON.stringify(contextFiles)}\n\n`;
  }
  
  if (history.length > 0) {
      promptContext += `Conversation History:\n${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n')}\n\n`;
  }

  // Smart Model Selection
  const isComplex = analyzeComplexity(userPrompt);
  let effectiveModel = model;
  
  if (isComplex && model === 'gemini-2.5-flash') {
      console.log("Complexity detected: Upgrading to Gemini 3.0 Pro Preview for Architecture Planning");
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
                // responseMimeType: 'application/json', // REMOVED: Allow text for Thinking, we parse manually
                temperature: effectiveModel.includes('pro') ? 0.4 : 0.3, // Lower temp for code precision
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

        return files;

      } catch (err) {
          console.error(`[Attempt ${attempt + 1}] Generation failed:`, err.message);
          if (attempt === MAX_RETRIES) throw new Error(`Failed after ${MAX_RETRIES} attempts: ${err.message}`);
          
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
