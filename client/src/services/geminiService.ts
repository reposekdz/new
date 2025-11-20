
import { GeneratedFile, AIModel, Attachment, ChatMessage, GenerationType } from "../types";

const API_BASE = 'http://localhost:3001/api';

export const generateAppCode = async (
  userPrompt: string, 
  model: AIModel, 
  attachments: Attachment[] = [],
  currentFiles: GeneratedFile[] = [],
  history: ChatMessage[] = [],
  generationType: GenerationType = 'frontend'
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
        history,
        generationType
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

export const importGithubRepo = async (repoUrl: string): Promise<GeneratedFile[]> => {
    try {
        const response = await fetch(`${API_BASE}/import/github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to import GitHub repository");
        }
        return await response.json();
    } catch (error: any) {
        console.error("GitHub Import Error:", error);
        throw new Error(error.message || "Failed to import GitHub repository");
    }
};

/**
 * Generates initial project scaffolding (package.json, .gitignore, Tests)
 * This runs client-side to provide instant feedback before the AI response.
 */
export const setupProject = (projectName: string = 'omnigen-app'): GeneratedFile[] => {
  const files: GeneratedFile[] = [];

  // 1. Package.json with Testing & Enterprise Deps
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: projectName,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "lint": "eslint .",
        "preview": "vite preview",
        "test": "vitest",
        "test:ui": "vitest --ui",
        "coverage": "vitest run --coverage",
        "server": "node server/index.js"
      },
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.344.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.1",
        "framer-motion": "^11.0.0",
        "zustand": "^4.5.0",
        "react-router-dom": "^6.22.0",
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "jsonwebtoken": "^9.0.2",
        "axios": "^1.6.0"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        "autoprefixer": "^10.4.18",
        "postcss": "^8.4.35",
        "tailwindcss": "^3.4.1",
        "typescript": "^5.2.2",
        "vite": "^5.1.4",
        "vitest": "^1.3.1",
        "@testing-library/react": "^14.2.1",
        "@testing-library/jest-dom": "^6.4.2",
        "jsdom": "^24.0.0",
        "@types/express": "^4.17.21",
        "@types/node": "^20.11.0"
      }
    }, null, 2)
  });

  // 2. .gitignore
  files.push({
    path: '.gitignore',
    content: `node_modules
.DS_Store
dist
dist-ssr
*.local
.env
.vscode/
coverage/
`
  });

  // 3. Vitest Config
  files.push({
    path: 'vitest.config.ts',
    content: `/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});`
  });

  // 4. Test Setup
  files.push({
    path: 'src/test/setup.ts',
    content: `import '@testing-library/jest-dom';`
  });

  // 5. Example Utility & Test (To guide the AI)
  files.push({
    path: 'src/utils/cn.ts',
    content: `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`
  });

  files.push({
    path: 'src/utils/cn.test.ts',
    content: `import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('merges tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'bg-red-500', 'px-4');
    expect(result).toBe('py-1 bg-red-500 px-4');
  });

  it('handles conditional classes', () => {
    const result = cn('text-sm', true && 'text-blue-500', false && 'hidden');
    expect(result).toBe('text-sm text-blue-500');
  });
});`
  });

  // 6. README.md
  files.push({
    path: 'README.md',
    content: `# ${projectName}

Generated by OmniGen AI.

## Stack
- Frontend: React 18 + TypeScript + Tailwind
- Backend: Node.js + Express + JWT Auth
- Testing: Vitest

## Commands

### Development
\`\`\`bash
npm run dev
\`\`\`

### Backend
\`\`\`bash
node server/index.js
\`\`\`

### Testing
\`\`\`bash
npm test
\`\`\`
`
  });

  return files;
};
