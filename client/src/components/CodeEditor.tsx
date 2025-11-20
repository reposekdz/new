
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import { GeneratedFile } from '../types';
import { Save, CheckCircle, Sparkles, MessageSquarePlus, Bug, FileSearch, Keyboard, Zap, MoreVertical } from 'lucide-react';
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
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [displayContent, setDisplayContent] = useState("");
  const [showAiMenu, setShowAiMenu] = useState(false);
  
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const completionDisposableRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusNodeRef = useRef<HTMLDivElement>(null);

  loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs' } });

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

  useEffect(() => {
      if (!editorRef.current || !statusNodeRef.current) return;

      if (vimMode) {
          if (!vimModeRef.current) {
              try {
                  vimModeRef.current = initVimMode(editorRef.current, statusNodeRef.current);
              } catch (e) {
                  console.error("Failed to initialize VIM mode.", e);
              }
          }
      } else {
          if (vimModeRef.current) {
              vimModeRef.current.dispose();
              vimModeRef.current = null;
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
      <div className="absolute top-4 right-6 z-10">
        <div className="relative">
            <button 
                onClick={() => setShowAiMenu(!showAiMenu)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white pl-3 pr-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105"
            >
                <Sparkles size={12} />
                AI Actions
                <MoreVertical size={12} className="opacity-50" />
            </button>
            
            {/* Context Menu */}
            {showAiMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#252526] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 z-20">
                    <div className="px-3 py-2 border-b border-zinc-700/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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

      <div ref={statusNodeRef} className={`${vimMode ? 'block' : 'hidden'} border-t border-zinc-700`}></div>

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
      
      {showAiMenu && <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)}></div>}
    </div>
  );
};

export default CodeEditor;
