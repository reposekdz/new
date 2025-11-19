
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedFile, AIModel, TerminalLog, Attachment, ChatMessage, AppSettings } from './types';
import { generateAppCode, runCodeSimulation, setupProject } from './services/geminiService';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import TerminalPane from './components/TerminalPane';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';
import { 
  Loader2, Play, Download, Code2, Sparkles, ArrowRight, 
  Search, Terminal as TerminalIcon, Paperclip, X, Image as ImageIcon, 
  FileText, Layout, MessageSquare, Monitor, Columns, Maximize, PanelLeftClose, PanelLeftOpen, Settings
} from 'lucide-react';

const App: React.FC = () => {
  // --- GLOBAL SETTINGS ---
  const [settings, setSettings] = useState<AppSettings>({
      projectName: 'omnigen-app',
      model: 'gemini-2.5-flash',
      editorFontSize: 14,
      autoSave: true,
      vimMode: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- STATE ---
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  
  // View & Layout State
  const [viewMode, setViewMode] = useState<'code' | 'split' | 'preview'>('split');
  const [showChat, setShowChat] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  
  // Dimensions & Resizing
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [chatWidth, setChatWidth] = useState(300);
  const [splitPos, setSplitPos] = useState(50); 
  
  // Resizing Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isResizingSidebar = useRef(false);
  const isResizingChat = useRef(false);
  const isResizingSplit = useRef(false);

  // Conversational State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [landingPrompt, setLandingPrompt] = useState("");
  const [landingAttachments, setLandingAttachments] = useState<Attachment[]>([]);
  const landingFileRef = useRef<HTMLInputElement>(null);

  // Terminal State
  const [activeTab, setActiveTab] = useState<'preview' | 'terminal'>('preview');
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // --- EFFECT: Sync Project Name to package.json ---
  useEffect(() => {
    if (files.length === 0) return;
    
    setFiles(prevFiles => prevFiles.map(f => {
        if (f.path === 'package.json') {
            try {
                const pkg = JSON.parse(f.content);
                if (pkg.name !== settings.projectName) {
                    pkg.name = settings.projectName;
                    return { ...f, content: JSON.stringify(pkg, null, 2) };
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        }
        return f;
    }));
  }, [settings.projectName]); // Dependency on project name setting

  // --- MOUSE EVENTS FOR RESIZING ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(Math.max(180, Math.min(400, e.clientX - (showChat ? chatWidth : 0))));
      }
      if (isResizingChat.current) {
        setChatWidth(Math.max(250, Math.min(500, e.clientX)));
      }
      if (isResizingSplit.current && workspaceRef.current) {
        const workspaceRect = workspaceRef.current.getBoundingClientRect();
        const relativeX = e.clientX - workspaceRect.left;
        const percentage = (relativeX / workspaceRect.width) * 100;
        setSplitPos(Math.max(20, Math.min(80, percentage)));
      }
    };

    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      isResizingChat.current = false;
      isResizingSplit.current = false;
      document.body.style.cursor = 'default';
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(el => (el.style.pointerEvents = 'auto'));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatWidth, showChat]);

  const startSplitResize = () => {
      isResizingSplit.current = true;
      document.body.style.cursor = 'col-resize';
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(el => (el.style.pointerEvents = 'none'));
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setShowExplorer(prev => !prev); }
        if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setShowChat(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- HANDLERS ---
  const handleLandingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newAttachments: Attachment[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const isImage = file.type.startsWith('image/');
            const content = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                if (isImage) reader.readAsDataURL(file);
                else reader.readAsText(file);
            });
            newAttachments.push({ name: file.name, type: file.type, content, isImage });
        }
        setLandingAttachments(prev => [...prev, ...newAttachments]);
    }
    if (landingFileRef.current) landingFileRef.current.value = '';
  };

  const handleInitialGenerate = async () => {
    if (!landingPrompt.trim() && landingAttachments.length === 0) return;
    
    setHasStarted(true);
    setIsGenerating(true);
    setError(null);
    
    const scaffold = setupProject(settings.projectName);
    setFiles(scaffold);

    const userMsg: ChatMessage = { role: 'user', text: landingPrompt, timestamp: Date.now(), attachments: landingAttachments };
    setMessages([userMsg]);

    try {
      const generatedFiles = await generateAppCode(landingPrompt, settings.model, landingAttachments, scaffold, []);
      setFiles(generatedFiles);
      
      setMessages(prev => [...prev, { role: 'model', text: "Project generated successfully.", timestamp: Date.now() }]);

      if (generatedFiles.length > 0) {
        const entry = generatedFiles.find(f => f.path === 'index.html') || generatedFiles[0];
        setSelectedFile(entry);
        if (generatedFiles.some(f => f.path === 'index.html')) setActiveTab('preview');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setPreviewKey(prev => prev + 1);
    }
  };

  const handleConversationMessage = async (text: string, attachments: Attachment[]) => {
      setIsGenerating(true);
      setError(null);

      const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now(), attachments };
      setMessages(prev => [...prev, userMsg]);

      try {
          const updatedFiles = await generateAppCode(text, settings.model, attachments, files, messages);
          setFiles(updatedFiles);
          
          if (selectedFile) {
              const updatedSelected = updatedFiles.find(f => f.path === selectedFile.path);
              if (updatedSelected) setSelectedFile(updatedSelected);
          }

          setMessages(prev => [...prev, { role: 'model', text: `Changes applied successfully.`, timestamp: Date.now() }]);
      } catch (err: any) {
          setError(err.message);
          setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}`, timestamp: Date.now() }]);
      } finally {
          setIsGenerating(false);
          setPreviewKey(prev => prev + 1);
      }
  };

  const handleAiAction = async (action: string, filePath: string, code: string) => {
      setShowChat(true);
      let prompt = "";
      switch(action) {
          case 'explain': prompt = `Explain the code in ${filePath} and how it works.`; break;
          case 'refactor': prompt = `Refactor ${filePath} to be cleaner, more performant, and follow best practices.`; break;
          case 'debug': prompt = `Analyze ${filePath} for potential bugs and fix them.`; break;
          case 'comments': prompt = `Add helpful comments to ${filePath} explaining the logic.`; break;
      }
      if(prompt) handleConversationMessage(prompt, []);
  };

  const handleAutoFix = async (errorLog: string) => {
      if (isGenerating) return;
      setShowChat(true);
      handleConversationMessage(`Fix this error:\n${errorLog}`, []);
  };

  const handleFileChange = (newContent: string) => {
    if (!selectedFile) return;
    const updatedFiles = files.map(f => 
      f.path === selectedFile.path ? { ...f, content: newContent } : f
    );
    setFiles(updatedFiles);
    setSelectedFile({ ...selectedFile, content: newContent });
  };

  const handleTerminalCommand = async (command: string) => {
      setTerminalLogs(prev => [...prev, { type: 'command', content: command, timestamp: Date.now() }]);
      const args = command.trim().split(' ');
      const cmd = args[0].toLowerCase();

      if (cmd === 'clear') { setTerminalLogs([]); return; }
      
      setIsRunning(true);
      try {
          const output = await runCodeSimulation(files, command);
          const type = (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) ? 'stderr' : 'stdout';
          setTerminalLogs(prev => [...prev, { type, content: output, timestamp: Date.now() }]);
      } catch (e) {
           setTerminalLogs(prev => [...prev, { type: 'stderr', content: "Simulation failed.", timestamp: Date.now() }]);
      } finally {
          setIsRunning(false);
      }
  };

  const handleRun = async () => {
    const isWebApp = files.some(f => f.path === 'index.html');
    if (isWebApp) {
        setActiveTab('preview');
        setPreviewKey(prev => prev + 1);
    } else {
        setActiveTab('terminal');
        handleTerminalCommand("npm start"); 
    }
  };

  const handleDownload = async () => {
    if (files.length === 0) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      files.forEach(file => zip.file(file.path, file.content));
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Failed to zip files");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- LANDING VIEW ---
  if (!hasStarted && files.length === 0) {
     return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 mb-8 backdrop-blur-sm shadow-lg">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Powered by Gemini 3.0 Pro</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 drop-shadow-sm">
            OmniGen
          </h1>
          <p className="text-lg text-zinc-400 mb-10 max-w-xl leading-relaxed">
            The universal AI software architect. Describe any application, and watch it build instantly.
          </p>

          <div className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 shadow-2xl backdrop-blur-xl relative group focus-within:border-indigo-500/50 transition-all duration-300">
             {/* Attachments List */}
            {landingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                    {landingAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-zinc-800/80 text-zinc-200 text-xs px-2 py-1 rounded-md border border-zinc-700">
                            {att.isImage ? <ImageIcon size={12} className="text-purple-400"/> : <FileText size={12} className="text-blue-400"/>}
                            <span className="max-w-[120px] truncate">{att.name}</span>
                            <button onClick={() => setLandingAttachments(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-400"><X size={12}/></button>
                        </div>
                    ))}
                </div>
            )}

            <textarea 
              value={landingPrompt}
              onChange={(e) => setLandingPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInitialGenerate(); } }}
              placeholder="Describe your dream application... (e.g., 'A Snake game in Python' or 'A React Landing Page')"
              className="w-full bg-transparent text-lg text-white p-4 min-h-[120px] outline-none resize-none font-light placeholder:text-zinc-600"
            />
            
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-3">
                 <select 
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value as AIModel })}
                    className="bg-zinc-900 border border-zinc-800 text-xs rounded-md px-2 py-1.5 text-zinc-400 focus:outline-none hover:border-zinc-700 transition-colors"
                 >
                    <option value="gemini-2.5-flash">⚡ Flash (Speed)</option>
                    <option value="gemini-3-pro-preview">🧠 Pro (Logic)</option>
                 </select>
                 <div className="relative group/attach">
                     <input type="file" multiple className="hidden" ref={landingFileRef} onChange={handleLandingFileSelect} />
                     <button onClick={() => landingFileRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all">
                        <Paperclip size={18} />
                     </button>
                 </div>
              </div>
              <button 
                onClick={handleInitialGenerate}
                disabled={!landingPrompt.trim() && landingAttachments.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              >
                <span>Generate</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
     );
  }

  // --- APP LAYOUT ---
  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings} 
      />

      {/* === HEADER === */}
      <header className="h-12 border-b border-zinc-800 flex items-center px-4 gap-4 bg-[#09090b] shrink-0 z-20 justify-between select-none">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setHasStarted(false); setFiles([]); }}>
                <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-zinc-100 hidden md:block">OmniGen</span>
            </div>

            {/* Sidebar Toggles */}
            <div className="flex items-center bg-zinc-900/50 rounded-lg border border-zinc-800 p-0.5">
                <button 
                    onClick={() => setShowChat(!showChat)} 
                    className={`p-1.5 rounded-md transition-all ${showChat ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} 
                    title="Toggle Chat (Ctrl+\)"
                >
                    <MessageSquare size={14}/>
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                <button 
                    onClick={() => setShowExplorer(!showExplorer)} 
                    className={`p-1.5 rounded-md transition-all ${showExplorer ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} 
                    title="Toggle Explorer (Ctrl+B)"
                >
                    {showExplorer ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                </button>
            </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1 shadow-inner">
            <button 
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'code' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <Code2 size={12} /> Code
            </button>
            <button 
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'split' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <Columns size={12} /> Split
            </button>
            <button 
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <Maximize size={12} /> Preview
            </button>
        </div>

        <div className="flex items-center gap-3">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <Settings size={16} />
            </button>
            <button onClick={handleRun} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 text-xs font-medium transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Play size={14} /> <span className="hidden sm:inline">Run</span>
            </button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-all">
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} <span className="hidden sm:inline">Export</span>
            </button>
        </div>
      </header>

      {/* === MAIN WORKSPACE === */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 1. Chat Sidebar */}
        {showChat && (
            <div style={{ width: chatWidth }} className="flex flex-col border-r border-zinc-800 shrink-0 relative bg-zinc-950 z-10">
                 <ChatSidebar 
                    messages={messages} 
                    onSendMessage={handleConversationMessage} 
                    isGenerating={isGenerating} 
                    model={settings.model}
                    onModelChange={(m) => setSettings({...settings, model: m})}
                />
                <div 
                    className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500 transition-colors delay-150"
                    onMouseDown={() => { isResizingChat.current = true; document.body.style.cursor = 'col-resize'; }}
                />
            </div>
        )}

        {/* 2. File Explorer */}
        {showExplorer && (
            <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-zinc-800 bg-[#09090b] shrink-0 relative z-0">
                 <div className="p-2 border-b border-zinc-800">
                    <div className="relative group">
                        <Search size={12} className="absolute top-2 left-2 text-zinc-500" />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                 </div>
                <FileExplorer files={files} selectedFile={selectedFile} onSelectFile={setSelectedFile} searchQuery={searchQuery} />
                 <div 
                    className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500 transition-colors delay-150"
                    onMouseDown={() => { isResizingSidebar.current = true; document.body.style.cursor = 'col-resize'; }}
                />
            </div>
        )}

        {/* 3. WORKSPACE AREA (Code + Preview/Terminal) */}
        <div ref={workspaceRef} className="flex-1 flex min-w-0 bg-[#1e1e1e] relative overflow-hidden">
            
            {/* CODE PANE */}
            <div 
                className={`flex flex-col h-full ${viewMode === 'preview' ? 'hidden' : ''} relative`}
                style={{ width: viewMode === 'split' ? `${splitPos}%` : '100%' }}
            >
                {selectedFile ? (
                    <>
                        <div className="h-9 bg-[#09090b] border-b border-zinc-800 flex items-center px-4 gap-2 text-xs text-zinc-400 shrink-0 select-none overflow-x-auto scrollbar-hide">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-t-2 border-indigo-500 text-zinc-200 rounded-t-sm">
                                <Code2 size={13} className="text-indigo-400"/>
                                <span className="font-medium">{selectedFile.path}</span>
                            </div>
                        </div>
                        <div className="flex-1 relative group">
                            {isGenerating && !showChat && (
                                <div className="absolute top-4 right-4 z-50 bg-zinc-900/90 border border-zinc-700 px-3 py-2 rounded-md shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none">
                                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                                    <span className="text-xs text-zinc-200">Generating...</span>
                                </div>
                            )}
                            <CodeEditor 
                                file={selectedFile} 
                                onChange={handleFileChange} 
                                fontSize={settings.editorFontSize}
                                onAIAction={handleAiAction}
                            />
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                        <Code2 size={48} className="opacity-20 mb-4" />
                        <p className="text-sm font-medium">Select a file to edit</p>
                    </div>
                )}
            </div>

            {/* RESIZER (Only in Split Mode) */}
            {viewMode === 'split' && (
                <div 
                    className="w-1 bg-zinc-800 hover:bg-indigo-500 cursor-col-resize relative z-50 transition-colors"
                    onMouseDown={startSplitResize}
                />
            )}

            {/* PREVIEW / TERMINAL PANE */}
            <div 
                className={`flex flex-col h-full bg-[#0c0c0c] border-l border-zinc-800 ${viewMode === 'code' ? 'hidden' : ''}`}
                style={{ width: viewMode === 'split' ? `${100 - splitPos}%` : '100%' }}
            >
                 <div className="h-9 bg-[#09090b] border-b border-zinc-800 flex items-center px-2 gap-1 shrink-0 select-none">
                    <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 rounded-t-md transition-colors ${activeTab === 'preview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>
                        <Monitor size={12} /> Preview
                    </button>
                    <button onClick={() => setActiveTab('terminal')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 rounded-t-md transition-colors ${activeTab === 'terminal' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>
                        <TerminalIcon size={12} /> Terminal
                    </button>
                </div>
                <div className="flex-1 relative">
                    {activeTab === 'preview' ? (
                        <PreviewPane files={files} refreshKey={previewKey} />
                    ) : (
                        <TerminalPane 
                            logs={terminalLogs} 
                            isRunning={isRunning} 
                            onClear={() => setTerminalLogs([])} 
                            onCommand={handleTerminalCommand}
                            onAutoFix={handleAutoFix}
                        />
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="h-6 bg-[#09090b] border-t border-zinc-800 flex items-center px-4 text-[10px] text-zinc-500 justify-between shrink-0 select-none z-20">
        <div className="flex gap-3">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> OmniGen v2.5</span>
            {files.length > 0 && <span>• {files.length} files</span>}
            <span>• {settings.model}</span>
        </div>
        <div className="flex gap-4 font-mono opacity-70">
             <span className="hidden md:inline">CTRL+B Explorer</span>
             <span className="hidden md:inline">CTRL+\ Chat</span>
             {error && <span className="text-red-400 font-bold animate-pulse">{error}</span>}
        </div>
      </footer>
    </div>
  );
};

export default App;
