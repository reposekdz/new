
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import { GeneratedFile } from '../types';
import { Save, CheckCircle, Sparkles, MessageSquarePlus, Bug, FileSearch, Keyboard, Zap } from 'lucide-react';
import { getSnippetsForLanguage } from '../utils/snippetLibrary';
// @ts-ignore - Dynamic import handling for CDN
import { initVimMode } from 'monaco-vim';

interface CodeEditorProps {
  file: GeneratedFile | null;
  onChange: (newContent: string) => void;
  fontSize: number;
  onAIAction: (action: string, filePath: string, code: string) => void;
  vimMode?: boolean;
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
    case 'cpp': 
    case 'c': 
    case 'h': 
    case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'php': return 'php';
    case 'rb': return 'ruby';
    case 'swift': return 'swift';
    case 'kt': return 'kotlin';
    case 'sql': return 'sql';
    case 'md': return 'markdown';
    case 'sh': return 'shell';
    case 'yaml': 
    case 'yml': return 'yaml';
    case 'xml': return 'xml';
    case 'dockerfile': return 'dockerfile';
    default: return 'plaintext';
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({ file, onChange, fontSize, onAIAction, vimMode = false }) => {
  const language = useMemo(() => file ? getLanguageFromPath(file.path) : 'plaintext', [file]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [displayContent, setDisplayContent] = useState("");
  const [showAiMenu, setShowAiMenu] = useState(false);
  
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const completionDisposableRef = useRef<any>(null);
  
  // VIM Refs
  const vimModeRef = useRef<any>(null);
  const statusNodeRef = useRef<HTMLDivElement>(null);

  // Configure Monaco
  loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

  useEffect(() => {
    if (file) {
        setDisplayContent(file.content);
    }
  }, [file]);

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

  // Register Snippets when language or monaco instance changes
  useEffect(() => {
      if (monacoRef.current && language) {
          if (completionDisposableRef.current) {
              completionDisposableRef.current.dispose();
          }
          completionDisposableRef.current = monacoRef.current.languages.registerCompletionItemProvider(language, {
              provideCompletionItems: (model, position) => {
                  const snippets = getSnippetsForLanguage(monacoRef.current, language);
                  return { suggestions: snippets };
              }
          });
      }
      return () => {
          if (completionDisposableRef.current) completionDisposableRef.current.dispose();
      };
  }, [language]);

  // Handle VIM Mode Toggle
  useEffect(() => {
      if (!editorRef.current || !statusNodeRef.current) return;

      if (vimMode) {
          if (!vimModeRef.current) {
              try {
                  // Initialize VIM mode attached to the editor and status bar
                  vimModeRef.current = initVimMode(editorRef.current, statusNodeRef.current);
                  console.log('VIM Mode Enabled');
              } catch (e) {
                  console.error("Failed to initialize VIM mode. Ensure monaco-vim is loaded.", e);
              }
          }
      } else {
          if (vimModeRef.current) {
              vimModeRef.current.dispose();
              vimModeRef.current = null;
              console.log('VIM Mode Disabled');
          }
      }
      
      return () => {
          if (vimModeRef.current) {
              vimModeRef.current.dispose();
              vimModeRef.current = null;
          }
      }
  }, [vimMode, editorRef.current]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
      monacoRef.current = monaco;
      editorRef.current = editor;
  };

  const handleAction = (action: string) => {
      if (!file) return;
      onAIAction(action, file.path, file.content);
      setShowAiMenu(false);
  }

  if (!file) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col relative animate-in fade-in duration-300 group">
      
      {/* AI Floating Action Button */}
      <div className="absolute top-4 right-8 z-10">
        <div className="relative">
            <button 
                onClick={() => setShowAiMenu(!showAiMenu)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
            >
                <Sparkles size={12} />
                AI Actions
            </button>
            
            {showAiMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 z-20">
                    <button onClick={() => handleAction('explain')} className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left transition-colors">
                        <FileSearch size={14} className="text-blue-400"/> Explain Code
                    </button>
                    <button onClick={() => handleAction('performance')} className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left transition-colors">
                        <Zap size={14} className="text-amber-400"/> Performance Check
                    </button>
                    <button onClick={() => handleAction('refactor')} className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left transition-colors">
                        <Sparkles size={14} className="text-purple-400"/> Refactor
                    </button>
                    <button onClick={() => handleAction('debug')} className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left transition-colors">
                        <Bug size={14} className="text-red-400"/> Find Bugs
                    </button>
                    <button onClick={() => handleAction('comments')} className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left transition-colors">
                        <MessageSquarePlus size={14} className="text-green-400"/> Add Comments
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 relative">
        <Editor
          height="100%"
          path={file.path}
          language={language}
          value={displayContent}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          onChange={(value) => onChange(value || '')}
          options={{
            minimap: { enabled: true, scale: 0.75 },
            fontSize: fontSize,
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
            snippetSuggestions: 'top', 
            cursorBlinking: vimMode ? 'solid' : 'blink',
            cursorStyle: vimMode ? 'block' : 'line',
          }}
        />
      </div>

      {/* VIM Status Bar (Visible only when VIM mode enabled) */}
      <div 
          ref={statusNodeRef} 
          className={`${vimMode ? 'block' : 'hidden'} border-t border-zinc-700`}
      ></div>

      {/* Standard Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center px-3 justify-between text-[10px] text-white shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
            <span className="font-bold">{language.toUpperCase()}</span>
            <span>UTF-8</span>
            <span>{fontSize}px</span>
            {vimMode && <span className="flex items-center gap-1 bg-white/20 px-1.5 rounded text-[9px] font-bold"><Keyboard size={8}/> VIM</span>}
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
      
      {/* Click outside listener for menu */}
      {showAiMenu && <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)}></div>}
    </div>
  );
};

export default CodeEditor;
