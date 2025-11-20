
export interface GeneratedFile {
  path: string;
  content: string;
}

export type AIModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview';
export type GenerationType = 'frontend' | 'fullstack';

export interface Attachment {
  name: string;
  type: string;
  content: string; // Base64 string for images, raw text for code/text
  isImage: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface AppSettings {
  projectName: string;
  model: AIModel;
  editorFontSize: number;
  autoSave: boolean;
  vimMode: boolean;
}

export interface AppState {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  isGenerating: boolean;
  error: string | null;
  model: AIModel;
  messages: ChatMessage[];
}

export enum ViewMode {
  EDITOR = 'EDITOR',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export interface TerminalLog {
  type: 'stdout' | 'stderr' | 'info' | 'command';
  content: string;
  timestamp: number;
}
