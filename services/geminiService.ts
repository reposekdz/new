
import { GeneratedFile, AIModel, Attachment, ChatMessage } from "../types";

const API_BASE = 'http://localhost:3001/api';

export const generateAppCode = async (
  userPrompt: string, 
  model: AIModel, 
  attachments: Attachment[] = [],
  currentFiles: GeneratedFile[] = [],
  history: ChatMessage[] = []
): Promise<GeneratedFile[]> => {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        model,
        attachments,
        currentFiles,
        history
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Generation failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "Failed to connect to OmniGen backend");
  }
};

export const runCodeSimulation = async (files: GeneratedFile[], command: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, command })
    });

    if (!response.ok) throw new Error("Execution failed");
    return await response.text();
  } catch (error: any) {
    return `[CONNECTION ERROR]: ${error.message}. Ensure backend is running on port 3001.`;
  }
};
