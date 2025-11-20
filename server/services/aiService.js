
const { GoogleGenAI } = require("@google/genai");
const { getSystemInstruction, getExecutionSystemInstruction } = require('../utils/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

// --- HELPER: DEEP COMPLEXITY ANALYSIS ---
/**
 * Analyzes the user's prompt to determine if the task requires a more powerful model.
 * 
 * Strategy:
 * 1. Check for specific keywords related to high-level architecture, security, or complex systems.
 * 2. Check for prompt length (longer prompts usually imply more constraints).
 * 3. Return a boolean to trigger a model upgrade (e.g., Flash -> Pro).
 */
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
/**
 * Robustly extracts and parses JSON from AI responses.
 * 
 * AI models often wrap JSON in markdown code blocks (```json ... ```) or add 
 * conversational filler text ("Here is your code: ...").
 * This function uses multiple strategies to extract the clean JSON payload.
 */
const parseHealedJson = (text) => {
    if (!text) throw new Error("Empty response from AI");

    // 1. Markdown Code Block Extraction
    // We look for the pattern ```json [CONTENT] ```.
    // We take the *last* occurrence to handle cases where the AI might output 
    // "Thinking: ..." inside a block first, then the actual code.
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    
    let cleanText = text;
    if (match && match[1]) {
        cleanText = match[1];
    } else {
        // Fallback: Just strip the markers if the regex didn't catch the block structure perfectly.
        cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    }

    // 2. Strip Comments
    // JSON.parse does not support comments, so we remove single-line JS style comments.
    cleanText = cleanText.replace(/\/\/.*$/gm, '');

    // 3. Attempt Standard Parse
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // 4. Aggressive Regex Extraction (The "Hail Mary")
        // If standard parse fails, we look for the first '[' and last ']' 
        // to isolate the array from any surrounding text.
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
            try { return JSON.parse(potentialJson); } catch (e2) { /* continue */ }
        }
        
        // 5. Fix Trailing Commas
        // Common AI error: leaving a comma after the last element in an array/object.
        const fixedText = cleanText.replace(/,(\s*[\]}])/g, '$1');
        try { return JSON.parse(fixedText); } catch (e3) { /* continue */ }

        console.error("Failed JSON Text Preview:", text.substring(0, 500) + "...");
        throw new Error("Failed to parse JSON response. The AI might have outputted conversational text instead of code.");
    }
};

// --- MAIN FUNCTION: GENERATE APP ---
const generateApp = async ({ userPrompt, model, attachments = [], currentFiles = [], history = [], platform = 'web', language = 'typescript' }) => {
  const isModification = currentFiles.length > 0 || history.length > 0;
  // Get the specific system instruction based on platform (Mobile/Desktop/Web) and Language
  const systemInstruction = getSystemInstruction(isModification, platform, language);
  
  // Construct Context
  // We pass the current file structure and contents so the AI knows what to modify.
  // We assume 'currentFiles' contains the full project state.
  let promptContext = `User Request: ${userPrompt}\n`;
  promptContext += `Target Platform: ${platform.toUpperCase()}\n`;
  promptContext += `Target Language: ${language.toUpperCase()}\n\n`;
  
  if (currentFiles.length > 0) {
      const fileSummary = currentFiles.map(f => f.path).join(', ');
      promptContext += `Current Project Structure (${currentFiles.length} files): ${fileSummary}\n`;
      // Optimization: Truncate very large files to prevent hitting token limits while keeping relevant context.
      const contextFiles = currentFiles.map(f => ({
          path: f.path,
          content: f.content.length > 10000 ? f.content.substring(0, 10000) + "\n...[TRUNCATED]..." : f.content
      }));
      promptContext += `Current File Contents:\n${JSON.stringify(contextFiles)}\n\n`;
  }
  
  if (history.length > 0) {
      promptContext += `Conversation History:\n${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n')}\n\n`;
  }

  // Smart Model Selection Logic
  // If the prompt is complex and the user selected 'flash', we upgrade to 'pro' for better reasoning.
  const isComplex = analyzeComplexity(userPrompt);
  let effectiveModel = model;
  
  if (isComplex && model === 'gemini-2.5-flash') {
      console.log("Complexity detected: Upgrading to Gemini 3.0 Pro Preview for Architecture Planning");
      effectiveModel = 'gemini-3-pro-preview';
  }

  const parts = [{ text: promptContext }];
  
  // Append Attachments (Images/Text) to the multimodal prompt
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

  // Retry Logic with Exponential Backoff
  // Crucial for handling API rate limits or transient 5xx errors.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[AI] Generating with ${effectiveModel} (Attempt ${attempt + 1})`);
        
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: { parts },
            config: {
                systemInstruction,
                // Note: We do NOT use responseMimeType: 'application/json' here because 
                // we want the AI to potentially output "Thinking" text before the JSON block.
                temperature: effectiveModel.includes('pro') ? 0.4 : 0.3, // Lower temperature for code precision
                topK: 40,
                topP: 0.95,
            }
        });

        const text = response.text;
        let files = parseHealedJson(text);

        // Validate Structure
        // Sometimes AI wraps the result in { "files": [...] } instead of just [...]
        if (!Array.isArray(files)) {
             if (files.files && Array.isArray(files.files)) files = files.files;
             else throw new Error("Invalid JSON structure: Expected array of files");
        }

        // Filter out invalid entries
        files = files.filter(f => f && f.path && typeof f.content === 'string');

        // Merge Logic for Modifications
        // If modifying, we merge the new files onto the existing state.
        // The AI is instructed to return ONLY changed files, so we overlay them here.
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
          
          // Exponential backoff: 1s, 2s, 4s...
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
      }
  }
};

// --- SIMULATION EXECUTION ---
/**
 * Simulates terminal command execution using a lightweight LLM call.
 * This avoids the security risk of running arbitrary code on the server.
 */
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
