
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import { GeneratedFile } from '../types';
import { Sparkles, FileSearch, Zap, Bug, MessageSquarePlus, MoreVertical, Keyboard } from 'lucide-react';
import { getSnippetsForLanguage } from '../utils/snippetLibrary';

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
    case 'cpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'php': return 'php';
    case 'rb': return 'ruby';
    case 'sql': return 'sql';
    case 'md': return 'markdown';
    case 'sh': return 'shell';
    case 'yaml': return 'yaml';
    case 'dockerfile': return 'dockerfile';
    default: return 'plaintext';
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({ file, onChange, fontSize, onAIAction, vimMode = false }) => {
  const language = useMemo(() => file ? getLanguageFromPath(file.path) : 'plaintext', [file]);
  
  const [showAiMenu, setShowAiMenu] = useState(false);
  
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const completionDisposableRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusNodeRef = useRef<HTMLDivElement>(null);

  loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs' } });

  // Register Snippets
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

  // VIM Mode Logic
  useEffect(() => {
      let mounted = true;
      
      const loadVim = async () => {
        if (!editorRef.current || !statusNodeRef.current) return;

        if (vimMode) {
            if (!vimModeRef.current) {
                try {
                    // Dynamic import to prevent build errors if dependency is missing
                    // @ts-ignore
                    const { initVimMode } = await import('monaco-vim');
                    if (!mounted) return;
                    const vim = initVimMode(editorRef.current, statusNodeRef.current);
                    vimModeRef.current = vim;
                } catch (e) {
                    console.error("Failed to load VIM mode:", e);
                }
            }
        } else {
            if (vimModeRef.current) {
                vimModeRef.current.dispose();
                vimModeRef.current = null;
                if (statusNodeRef.current) statusNodeRef.current.innerHTML = '';
            }
        }
      };

      loadVim();

      return () => {
          mounted = false;
          if (vimModeRef.current) {
               vimModeRef.current.dispose();
               vimModeRef.current = null;
          }
      };
  }, [vimMode, file?.path]); // Re-run on file change to ensure VIM re-attaches if needed

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
      monacoRef.current = monaco;
      editorRef.current = editor;
  };

  const handleAction = (action: string) => {
      if (!file) return;
      onAIAction(action, file.path, file.content);
      setShowAiMenu(false);
  };

  if (!file) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col relative group">
      
      {/* Floating AI Action Widget */}
      <div className="absolute top-4 right-6 z-10">
        <div className="relative">
            <button 
                onClick={() => setShowAiMenu(!showAiMenu)}
                className="flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white pl-3 pr-4 py-1.5 rounded-full shadow-lg shadow-indigo-900/20 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 border border-indigo-500/50 backdrop-blur-md"
            >
                <Sparkles size={12} />
                AI Actions
                <MoreVertical size={12} className="opacity-50" />
            </button>
            
            {/* Context Menu */}
            {showAiMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-[#252526] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 z-20">
                    <div className="px-3 py-2 border-b border-zinc-700/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-900/50">
                        Intelligence
                    </div>
                    <button onClick={() => handleAction('explain')} className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white text-left transition-colors group/item">
                        <FileSearch size={14} className="text-blue-400 group-hover/item:text-white"/> Explain Logic
                    </button>
                    <button onClick={() => handleAction('performance')} className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white text-left transition-colors group/item">
                        <Zap size={14} className="text-amber-400 group-hover/item:text-white"/> Optimize Performance
                    </button>
                    <button onClick={() => handleAction('refactor')} className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white text-left transition-colors group/item">
                        <Sparkles size={14} className="text-purple-400 group-hover/item:text-white"/> Refactor Code
                    </button>
                    <button onClick={() => handleAction('debug')} className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white text-left transition-colors group/item">
                        <Bug size={14} className="text-red-400 group-hover/item:text-white"/> Find Bugs
                    </button>
                    <div className="h-px bg-zinc-700/50 my-1"></div>
                    <button onClick={() => handleAction('comments')} className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white text-left transition-colors">
                        <MessageSquarePlus size={14} className="text-green-400"/> Add Comments
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          path={file.path}
          language={language}
          value={file.content}
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
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            formatOnType: true,
            formatOnPaste: true,
            tabSize: 2,
            snippetSuggestions: 'top',
            cursorBlinking: vimMode ? 'solid' : 'blink',
            cursorStyle: vimMode ? 'block' : 'line',
            contextmenu: true,
          }}
        />
      </div>

      {/* VIM Status Bar (Integrated into Editor Bottom) */}
      <div 
        ref={statusNodeRef} 
        className={`vim-status-bar bg-[#007acc] text-white font-mono text-xs px-2 flex items-center transition-all duration-200 ${vimMode ? 'min-h-[24px] border-t border-white/10' : 'h-0 overflow-hidden border-0'}`}
      >
      </div>
      
      {showAiMenu && <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)}></div>}
    </div>
  );
};

export default CodeEditor;
