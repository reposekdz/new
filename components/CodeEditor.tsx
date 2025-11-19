
import React, { useMemo, useState, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { GeneratedFile } from '../types';
import { Save, CheckCircle, FileCode } from 'lucide-react';

interface CodeEditorProps {
  file: GeneratedFile | null;
  onChange: (newContent: string) => void;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'jsx': return 'javascript';
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'py': return 'python';
    case 'rs': return 'rust';
    case 'go': return 'go';
    case 'java': return 'java';
    case 'md': return 'markdown';
    case 'sh': return 'shell';
    case 'yaml': return 'yaml';
    default: return 'plaintext';
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({ file, onChange }) => {
  const language = useMemo(() => file ? getLanguageFromPath(file.path) : 'plaintext', [file]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [displayContent, setDisplayContent] = useState("");

  // Configure Monaco
  loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

  // Simulate "Loading/Typing" effect on file switch
  useEffect(() => {
    if (file) {
        setDisplayContent(file.content);
    }
  }, [file]);

  // Auto-save logic
  useEffect(() => {
    if (!file) return;
    setSaveStatus('unsaved');
    const handler = setTimeout(() => {
      setSaveStatus('saving');
      localStorage.setItem(`omnigen_cache_${file.path}`, file.content);
      setTimeout(() => setSaveStatus('saved'), 400);
    }, 2000);
    return () => clearTimeout(handler);
  }, [file?.content, file?.path]);

  if (!file) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col relative animate-in fade-in duration-300">
      <div className="flex-1 relative">
        <Editor
          height="100%"
          path={file.path}
          language={language}
          value={displayContent}
          theme="vs-dark"
          onChange={(value) => onChange(value || '')}
          options={{
            minimap: { enabled: true, scale: 0.75 },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            wordWrap: 'on',
            padding: { top: 20, bottom: 20 },
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            formatOnType: true,
            formatOnPaste: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center px-3 justify-between text-[10px] text-white shrink-0 select-none">
        <div className="flex items-center gap-4">
            <span className="font-bold">{language.toUpperCase()}</span>
            <span>UTF-8</span>
        </div>
        
        <div className="flex items-center gap-2">
            {saveStatus === 'unsaved' && (
                <span className="flex items-center gap-1 text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div> Unsaved
                </span>
            )}
            {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-white/80">
                   <Save size={10} className="animate-pulse" /> Saving...
                </span>
            )}
            {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-white/90">
                    <CheckCircle size={10} /> Saved
                </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
