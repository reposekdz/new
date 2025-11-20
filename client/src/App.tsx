
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneratedFile, AIModel, TerminalLog, Attachment, ChatMessage, AppSettings, GenerationType, Platform, ProgrammingLanguage, ProjectTemplate } from './types';
import { generateAppCode, runCodeSimulation, setupProject, importGithubRepo, getTemplateBoilerplate } from './services/geminiService';
import { logger } from './services/logger';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import TerminalPane from './components/TerminalPane';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { Button } from './components/ui/Button';
import JSZip from 'jszip';
import { 
  Loader2, Play, Download, Code2, Sparkles, ArrowRight, 
  Search, Terminal as TerminalIcon, Paperclip, X, Image as ImageIcon, 
  FileText, Layout, MessageSquare, Monitor, Columns, Maximize, PanelLeftClose, PanelLeftOpen, Settings,
  Github, FolderUp, Keyboard, Command, LogIn, Smartphone, Globe, Box, Layers, Server, GitBranch, Database, FileCode2, AppWindow,
  BarChart3, Gamepad2
} from 'lucide-react';

// --- TEMPLATE DEFINITIONS ---
const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'Standard modern web app structure.',
    icon: <Globe className="text-blue-400" size={20} />,
    platform: 'web',
    language: 'javascript'
  },
  {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard',
    description: 'Admin panel with Charts, Tables & Sidebar.',
    icon: <BarChart3 className="text-purple-400" size={20} />,
    platform: 'web',
    language: 'typescript'
  },
  {
    id: 'node-express',
    name: 'Node.js API',
    description: 'REST API with TypeScript & Express.',
    icon: <Server className="text-green-400" size={20} />,
    platform: 'web', 
    language: 'typescript'
  },
  {
    id: '3d-game',
    name: '3D Game (R3F)',
    description: 'Interactive 3D scene with Three.js.',
    icon: <Box className="text-red-400" size={20} />,
    platform: 'web',
    language: 'javascript'
  }
];

const App: React.FC = () => {
  // --- GLOBAL SETTINGS ---
  const [settings, setSettings] = useState<AppSettings>({
      projectName: 'omnigen-app',
      model: 'gemini-2.5-flash',
      defaultPlatform: 'web',
      defaultLanguage: 'typescript',
      editorFontSize: 14,
      autoSave: true,
      vimMode: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // --- APP STATE ---
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem('omnigen_search_history');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
  });

  // Landing View State
  const [landingTab, setLandingTab] = useState<'new' | 'github' | 'folder'>('new');
  const [githubUrl, setGithubUrl] = useState("");
  const [landingPrompt, setLandingPrompt] = useState("");
  const [landingAttachments, setLandingAttachments] = useState<Attachment[]>([]);
  
  const [platform, setPlatform] = useState<Platform>('web');
  const [language, setLanguage] = useState<ProgrammingLanguage>('typescript');
  
  const landingFileRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // View & Layout State
  const [viewMode, setViewMode] = useState<'code' | 'split' | 'preview'>('split');
  const [showChat, setShowChat] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [chatWidth, setChatWidth] = useState(300);
  const [splitPos, setSplitPos] = useState(50); 
  
  const isResizingSidebar = useRef(false);
  const isResizingChat = useRef(false);
  const isResizingSplit = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [activeTab, setActiveTab] = useState<'preview' | 'terminal'>('preview');
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // --- PERSISTENCE ---
  useEffect(() => {
      try {
        localStorage.setItem('omnigen_search_history', JSON.stringify(searchHistory));
      } catch (e) {
        logger.error("Failed to save search history", e);
      }
  }, [searchHistory]);

  useEffect(() => {
      if (!hasStarted) {
          setPlatform(settings.defaultPlatform);
          setLanguage(settings.defaultLanguage);
      }
  }, [settings.defaultPlatform, settings.defaultLanguage, hasStarted]);

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
                logger.warn("Failed to parse package.json for renaming", e);
            }
        }
        return f;
    }));
  }, [settings.projectName]); 

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setShowExplorer(prev => !prev); }
        if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setShowChat(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchHistoryAdd = (term: string) => {
      if (!term.trim()) return;
      setSearchHistory(prev => {
          const filtered = prev.filter(t => t !== term);
          return [term, ...filtered].slice(0, 10);
      });
  };

  const handleSearchHistoryClear = () => setSearchHistory([]);

  const handleLandingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newAttachments: Attachment[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            try {
                const isImage = file.type.startsWith('image/');
                const content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    if (isImage) reader.readAsDataURL(file);
                    else reader.readAsText(file);
                });
                newAttachments.push({ name: file.name, type: file.type, content, isImage });
            } catch (err) {
                logger.error(`Failed to read file ${file.name}`, err);
                setError(`Failed to load attachment: ${file.name}`);
            }
        }
        setLandingAttachments(prev => [...prev, ...newAttachments]);
    }
    if (landingFileRef.current) landingFileRef.current.value = '';
  };

  const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      setIsGenerating(true);
      setHasStarted(true);
      
      const filesArray: GeneratedFile[] = [];
      const IGNORED = ['.git', 'node_modules', 'dist', 'build', 'coverage', '.DS_Store'];
      
      try {
          for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              const path = (file.webkitRelativePath || file.name);
              
              if (IGNORED.some(ignore => path.includes(ignore))) continue;
              if (path.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|mp3|zip|tar|gz|pdf|exe|dll|so|dylib|class|jar)$/i)) continue;

              const content = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string || "");
                  reader.readAsText(file);
              });

              filesArray.push({ path, content });
          }

          setFiles(filesArray);
          const contextMsg: ChatMessage = {
               role: 'model',
               text: `Successfully imported ${filesArray.length} files from local folder. I have analyzed the structure. How can I help you?`,
               timestamp: Date.now()
          };
          setMessages([contextMsg]);
          
          if (filesArray.length > 0) {
              const entry = filesArray.find(f => f.path.endsWith('index.html') || f.path.endsWith('App.tsx') || f.path.endsWith('main.py')) || filesArray[0];
              setSelectedFile(entry);
              if (filesArray.some(f => f.path.endsWith('index.html'))) setActiveTab('preview');
          }

      } catch (err: any) {
          logger.error("Folder Import Failed", err);
          setError("Failed to import folder: " + err.message);
          setHasStarted(false);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGithubImport = async () => {
      if (!githubUrl.trim()) return;
      
      setIsGenerating(true);
      setHasStarted(true);
      setError(null);

      try {
          const importedFiles = await importGithubRepo(githubUrl);
          setFiles(importedFiles);
          
          const contextMsg: ChatMessage = {
               role: 'model',
               text: `Successfully cloned repository from ${githubUrl}. Loaded ${importedFiles.length} files.`,
               timestamp: Date.now()
          };
          setMessages([contextMsg]);

          if (importedFiles.length > 0) {
              const entry = importedFiles.find(f => f.path.endsWith('index.html') || f.path.endsWith('README.md')) || importedFiles[0];
              setSelectedFile(entry);
          }
      } catch (err: any) {
          logger.error("GitHub Import Failed", err);
          setError(err.message);
          setHasStarted(false);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setIsGenerating(true);
    setHasStarted(true);
    setError(null);

    try {
      // Instant load from hardcoded boilerplates
      const templateFiles = getTemplateBoilerplate(template.id);
      setFiles(templateFiles);
      setPlatform(template.platform);
      setLanguage(template.language);

      const contextMsg: ChatMessage = {
        role: 'model',
        text: `Loaded ${template.name} template. Ready to code!`,
        timestamp: Date.now()
      };
      setMessages([contextMsg]);

      if (templateFiles.length > 0) {
        // Heuristic for finding the "Main" file to show first
        const entry = templateFiles.find(f => 
          f.path === 'src/App.tsx' || 
          f.path === 'src/App.jsx' || 
          f.path === 'src/index.ts' || 
          f.path === 'app.py' || 
          f.path === 'index.html'
        ) || templateFiles[0];
        
        setSelectedFile(entry);
        
        // Switch tab based on template type
        if (template.platform === 'web') {
          setActiveTab('preview');
        } else {
          setActiveTab('terminal');
        }
      }
    } catch (err: any) {
      setError("Failed to load template.");
    } finally {
      setIsGenerating(false);
      setPreviewKey(prev => prev + 1);
    }
  };

  const handleInitialGenerate = async () => {
    if (!landingPrompt.trim() && landingAttachments.length === 0) return;
    
    setHasStarted(true);
    setIsGenerating(true);
    setError(null);
    
    try {
        const scaffold = setupProject(settings.projectName, language);
        setFiles(scaffold);

        const userMsg: ChatMessage = { role: 'user', text: landingPrompt, timestamp: Date.now(), attachments: landingAttachments };
        setMessages([userMsg]);

        const generatedFiles = await generateAppCode(landingPrompt, settings.model, landingAttachments, scaffold, [], platform, language);
        setFiles(generatedFiles);
        
        setMessages(prev => [...prev, { role: 'model', text: `Project generated successfully (${platform} / ${language}).`, timestamp: Date.now() }]);

        if (generatedFiles.length > 0) {
            const entry = generatedFiles.find(f => f.path === 'index.html' || f.path.endsWith('App.tsx')) || generatedFiles[0];
            setSelectedFile(entry);
            if (generatedFiles.some(f => f.path === 'index.html') && platform === 'web') setActiveTab('preview');
        }
    } catch (err: any) {
        logger.error("Initial Generation Failed", err);
        setError(err.message || "An unexpected error occurred during generation.");
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
          const updatedFiles = await generateAppCode(text, settings.model, attachments, files, messages, platform, language);
          setFiles(updatedFiles);
          
          if (selectedFile) {
              const updatedSelected = updatedFiles.find(f => f.path === selectedFile.path);
              if (updatedSelected) setSelectedFile(updatedSelected);
          }

          setMessages(prev => [...prev, { role: 'model', text: `Changes applied successfully.`, timestamp: Date.now() }]);
      } catch (err: any) {
          logger.error("Conversation Generation Failed", err);
          setError(err.message || "Failed to update project.");
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
          case 'explain': prompt = `Explain the code in ${filePath} deeply. Break down the logic, inputs, and outputs.`; break;
          case 'performance': prompt = `Analyze ${filePath} for performance bottlenecks (Time Complexity, Memory, React Renders) and suggest specific optimizations.`; break;
          case 'refactor': prompt = `Refactor ${filePath} to be cleaner, more performant, and follow best practices (SOLID, DRY). Maintain functionality.`; break;
          case 'debug': prompt = `Analyze ${filePath} for potential bugs, race conditions, or edge cases. Suggest fixes.`; break;
          case 'comments': prompt = `Add helpful JSDoc/DocString comments to ${filePath} explaining complex logic.`; break;
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

  const handleRenameFile = (oldPath: string, newName: string, isFolder: boolean) => {
    try {
        setFiles(prevFiles => {
        const newFiles = prevFiles.map(file => {
            if (isFolder) {
            if (file.path.startsWith(oldPath + '/')) {
                const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;
                return {
                    ...file,
                    path: file.path.replace(oldPath, newFolderPath)
                };
            }
            } else {
            if (file.path === oldPath) {
                const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newPath = parentPath ? `${parentPath}/${newName}` : newName;
                return { ...file, path: newPath };
            }
            }
            return file;
        });
        
        if (selectedFile) {
            const newSelected = newFiles.find(f => {
                if (isFolder) return f.content === selectedFile.content && f.path.includes(newName); 
                return f.content === selectedFile.content && f.path.endsWith(newName);
            });
            if(newSelected) setSelectedFile(newSelected);
        }

        return newFiles;
        });
    } catch (e) {
        logger.error("Rename failed", e);
        setError("Failed to rename file.");
    }
  };

  const handleDeleteFile = (path: string, isFolder: boolean) => {
      try {
        const newFiles = files.filter(f => {
            if (isFolder) return !f.path.startsWith(path + '/');
            return f.path !== path;
        });
        setFiles(newFiles);
        if (selectedFile && (selectedFile.path === path || (isFolder && selectedFile.path.startsWith(path + '/')))) {
            setSelectedFile(null);
        }
      } catch (e) {
          logger.error("Delete failed", e);
          setError("Failed to delete file.");
      }
  };


  const handleTerminalCommand = async (command: string) => {
      setTerminalLogs(prev => [...prev, { type: 'command', content: command, timestamp: Date.now() }]);
      const args = command.trim().split(' ');
      const cmd = args[0].toLowerCase();

      if (cmd === 'clear') { setTerminalLogs([]); return; }
      
      // --- ADVANCED GIT SIMULATION ---
      if (cmd === 'git') {
          const gitAction = args[1];
          if (!gitAction) {
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: "usage: git <command> [<args>]", timestamp: Date.now() }]);
              return;
          }
          
          if (gitAction === 'init') {
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: `Initialized empty Git repository in /app/${settings.projectName}/.git/`, timestamp: Date.now() }]);
              return;
          }
          
          if (gitAction === 'status') {
              const untracked = files.slice(0, Math.min(5, files.length)).map(f => `\t${f.path}`);
              const output = `On branch master\n\nNo commits yet\n\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n${untracked.join('\n')}\n${files.length > 5 ? `\t... and ${files.length - 5} more` : ''}\n\nnothing added to commit but untracked files present (use "git add" to track)`;
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: output, timestamp: Date.now() }]);
              return;
          }
          
          if (gitAction === 'add') {
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: "", timestamp: Date.now() }]);
              return;
          }

          if (gitAction === 'commit') {
              const msg = args.slice(3).join(' ').replace(/"/g, '') || 'Initial commit';
              const hash = Math.random().toString(16).substr(2, 7);
              const output = `[master (root-commit) ${hash}] ${msg}\n ${files.length} files changed, ${files.reduce((acc, f) => acc + f.content.split('\n').length, 0)} insertions(+)`;
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: output, timestamp: Date.now() }]);
              return;
          }

          if (gitAction === 'log') {
               setTerminalLogs(prev => [...prev, { type: 'stdout', content: `commit ${Math.random().toString(16).substr(2, 40)}\nAuthor: ${user?.name || 'OmniGen User'} <${user?.email || 'dev@omnigen.ai'}>\nDate:   ${new Date().toString()}\n\n    Initial commit`, timestamp: Date.now() }]);
               return;
          }
          
          if (gitAction === 'push') {
              setTerminalLogs(prev => [...prev, { type: 'stdout', content: `Enumerating objects: ${files.length + 3}, done.\nCounting objects: 100% (${files.length + 3}/${files.length + 3}), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (${files.length}/${files.length}), done.\nWriting objects: 100% (${files.length + 3}/${files.length + 3}), 2.45 KiB | 2.45 MiB/s, done.\nTotal ${files.length + 3} (delta 1), reused 0 (delta 0)\nTo https://github.com/${user?.name || 'user'}/${settings.projectName}.git\n * [new branch]      master -> master`, timestamp: Date.now() }]);
              return;
          }
      }

      setIsRunning(true);
      try {
          const output = await runCodeSimulation(files, command);
          const type = (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) ? 'stderr' : 'stdout';
          setTerminalLogs(prev => [...prev, { type, content: output, timestamp: Date.now() }]);
      } catch (e: any) {
           logger.error("Terminal command failed", e);
           setTerminalLogs(prev => [...prev, { type: 'stderr', content: `Simulation failed: ${e.message}`, timestamp: Date.now() }]);
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
      logger.error("Zip export failed", e);
      alert("Failed to zip files");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!hasStarted && files.length === 0) {
     return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={(u) => { setUser(u); setIsAuthModalOpen(false); }} />

        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[100] w-full pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles size={16} className="text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight shadow-black drop-shadow-md">OmniGen</span>
            </div>
            <div className="pointer-events-auto">
                {user ? (
                    <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full pl-4 pr-1 py-1 shadow-lg">
                         <span className="text-sm text-zinc-300 font-medium">Hi, {user.name}</span>
                         <Button size="sm" variant="secondary" onClick={() => setUser(null)} className="rounded-full h-7 text-xs">Logout</Button>
                    </div>
                ) : (
                    <Button 
                        variant="gradient" 
                        size="sm" 
                        onClick={() => setIsAuthModalOpen(true)} 
                        leftIcon={<LogIn size={14} />}
                        className="shadow-xl shadow-indigo-500/30 animate-in fade-in slide-in-from-top-2 duration-500"
                    >
                        Login / Register
                    </Button>
                )}
            </div>
        </div>

        <div className="z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 mb-8 backdrop-blur-sm shadow-lg hover:border-indigo-500/50 transition-colors cursor-default">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Powered by Gemini 3.0 Pro + Deep Thinking</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 drop-shadow-sm">
            OmniGen
          </h1>
          <p className="text-lg text-zinc-400 mb-10 max-w-xl leading-relaxed">
            The universal AI software architect. Build Web, Mobile, and Desktop applications in any language.
          </p>

          <div className="w-full bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden relative group focus-within:border-indigo-500/50 transition-all duration-300">
             
             <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50">
                 <button 
                    onClick={() => setLandingTab('new')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${landingTab === 'new' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                    <Sparkles size={14} /> New Project
                 </button>
                 <button 
                    onClick={() => setLandingTab('github')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${landingTab === 'github' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                    <Github size={14} /> Import GitHub
                 </button>
                 <button 
                    onClick={() => setLandingTab('folder')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${landingTab === 'folder' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                    <FolderUp size={14} /> Import Folder
                 </button>
             </div>

             <div className="p-2">
                {landingTab === 'new' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* Templates Section */}
                        <div className="px-4 py-3 border-b border-zinc-800/50 mb-2">
                          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 text-left">Quick Start Templates</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {TEMPLATES.map(template => (
                              <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 rounded-lg p-3 text-left transition-all group/card flex flex-col gap-2"
                              >
                                <div className="p-2 bg-zinc-950 rounded-md w-fit group-hover/card:bg-indigo-900/20 transition-colors">
                                  {template.icon}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-zinc-200">{template.name}</div>
                                  <div className="text-[10px] text-zinc-500 leading-tight mt-0.5 truncate">{template.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 mb-2 py-2 border-b border-zinc-800/50">
                             <button 
                                onClick={() => setPlatform('web')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${platform === 'web' ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
                             >
                                <Globe size={14} /> Web App
                             </button>
                             <button 
                                onClick={() => setPlatform('mobile')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${platform === 'mobile' ? 'bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
                             >
                                <Smartphone size={14} /> Mobile (Expo)
                             </button>
                             <button 
                                onClick={() => setPlatform('desktop')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${platform === 'desktop' ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
                             >
                                <Monitor size={14} /> Desktop (Electron)
                             </button>
                        </div>

                        {landingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                                {landingAttachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-zinc-800/80 text-zinc-200 text-xs px-2 py-1 rounded-md border border-zinc-700 animate-in zoom-in duration-200">
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
                            placeholder={
                                platform === 'mobile' ? "Describe your mobile app (e.g. 'A React Native fitness tracker')..." :
                                platform === 'desktop' ? "Describe your desktop tool (e.g. 'An Electron system monitor')..." :
                                "Or describe your custom application from scratch..."
                            }
                            className="w-full bg-transparent text-lg text-white p-4 min-h-[100px] outline-none resize-none font-light placeholder:text-zinc-600"
                        />
                        <div className="flex flex-wrap items-center justify-between px-4 pb-2 gap-2">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                                        className="bg-zinc-900 border border-zinc-800 text-xs rounded-md pl-2 pr-6 py-1.5 text-zinc-400 focus:outline-none hover:border-zinc-700 transition-colors appearance-none cursor-pointer"
                                    >
                                        <optgroup label="Web & Scripting">
                                            <option value="javascript">JavaScript</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="python">Python</option>
                                            <option value="php">PHP</option>
                                            <option value="ruby">Ruby</option>
                                        </optgroup>
                                        <optgroup label="Systems">
                                            <option value="rust">Rust</option>
                                            <option value="go">Go</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                            <option value="csharp">C#</option>
                                        </optgroup>
                                        <optgroup label="Mobile">
                                            <option value="swift">Swift</option>
                                            <option value="kotlin">Kotlin</option>
                                        </optgroup>
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                        <Code2 size={10} />
                                    </div>
                                </div>

                                <select 
                                    value={settings.model}
                                    onChange={(e) => setSettings({...settings, model: e.target.value as AIModel})}
                                    className="bg-zinc-900 border border-zinc-800 text-xs rounded-md px-2 py-1.5 text-zinc-400 focus:outline-none hover:border-zinc-700 transition-colors"
                                >
                                    <option value="gemini-2.5-flash">⚡ Flash</option>
                                    <option value="gemini-3-pro-preview">🧠 Pro (Reasoning)</option>
                                </select>
                                <div className="relative group/attach">
                                    <input type="file" multiple className="hidden" ref={landingFileRef} onChange={handleLandingFileSelect} />
                                    <button onClick={() => landingFileRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all" title="Attach Images/Files">
                                        <Paperclip size={16} />
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
                )}

                {landingTab === 'github' && (
                    <div className="p-6 flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[160px]">
                        <div className="w-full max-w-md relative">
                            <Github size={18} className="absolute left-3 top-3 text-zinc-500" />
                            <input 
                                type="text" 
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/username/repository/tree/branch"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                            />
                        </div>
                        <Button 
                             onClick={handleGithubImport}
                             disabled={!githubUrl}
                             isLoading={isGenerating}
                             leftIcon={<Download size={16} />}
                             variant="secondary"
                        >
                            Clone Repository
                        </Button>
                        <p className="text-[10px] text-zinc-500">Supports public repositories and branches.</p>
                    </div>
                )}

                {landingTab === 'folder' && (
                    <div className="p-6 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[160px]">
                        <div 
                            className="border-2 border-dashed border-zinc-800 rounded-xl p-8 w-full text-center hover:bg-zinc-900/30 hover:border-zinc-700 transition-all cursor-pointer"
                            onClick={() => folderInputRef.current?.click()}
                        >
                             <FolderUp size={32} className="mx-auto text-zinc-600 mb-2" />
                             <p className="text-sm text-zinc-300 font-medium">Click to select a folder</p>
                             <p className="text-[10px] text-zinc-500 mt-1">Your files stay local until processed</p>
                             <input 
                                type="file" 
                                ref={folderInputRef}
                                onChange={handleFolderImport}
                                className="hidden"
                                {...{ webkitdirectory: "", directory: "" } as any}
                                multiple
                             />
                        </div>
                    </div>
                )}

             </div>
          </div>
          
          <div className="mt-8 flex gap-6 text-xs text-zinc-500">
               <div className="flex items-center gap-2">
                   <Keyboard size={12} />
                   <span><span className="text-zinc-300">Ctrl+Enter</span> to submit</span>
               </div>
               <div className="flex items-center gap-2">
                   <Command size={12} />
                   <span><span className="text-zinc-300">/fix</span> to debug</span>
               </div>
               <div className="flex items-center gap-2">
                   <GitBranch size={12} />
                   <span>Git CLI ready</span>
               </div>
          </div>

        </div>
      </div>
     );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={(userData) => { setUser(userData); setIsAuthModalOpen(false); }}
      />

      <header className="h-12 border-b border-zinc-800 flex items-center px-4 gap-4 bg-[#09090b] shrink-0 z-20 justify-between select-none">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setHasStarted(false); setFiles([]); setMessages([]); }}>
                <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-zinc-100 hidden md:block">OmniGen</span>
            </div>

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
            {user ? (
                <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 rounded-full pl-1 pr-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                        {user.avatar || user.name[0]}
                    </div>
                    <span className="text-zinc-300">{user.name}</span>
                </div>
            ) : (
                <Button 
                    variant="gradient" 
                    size="sm" 
                    onClick={() => setIsAuthModalOpen(true)} 
                    leftIcon={<LogIn size={12} />}
                    className="shadow-md shadow-indigo-500/20"
                >
                    Login
                </Button>
            )}

            <div className="h-6 w-px bg-zinc-800"></div>

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

      <div className="flex-1 flex overflow-hidden relative">
        
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

        {showExplorer && (
            <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-zinc-800 bg-[#09090b] shrink-0 relative z-0">
                <FileExplorer 
                    files={files} 
                    selectedFile={selectedFile} 
                    onSelectFile={setSelectedFile} 
                    onRename={handleRenameFile}
                    onDelete={handleDeleteFile}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchHistory={searchHistory}
                    onAddToHistory={handleSearchHistoryAdd}
                    onClearHistory={handleSearchHistoryClear}
                />
                 <div 
                    className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500 transition-colors delay-150"
                    onMouseDown={() => { isResizingSidebar.current = true; document.body.style.cursor = 'col-resize'; }}
                />
            </div>
        )}

        <div ref={workspaceRef} className="flex-1 flex min-w-0 bg-[#1e1e1e] relative overflow-hidden">
            
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
                                vimMode={settings.vimMode}
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

            {viewMode === 'split' && (
                <div 
                    className="w-1 bg-zinc-800 hover:bg-indigo-500 cursor-col-resize relative z-50 transition-colors"
                    onMouseDown={startSplitResize}
                />
            )}

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

      <footer className="h-6 bg-[#09090b] border-t border-zinc-800 flex items-center px-4 text-[10px] text-zinc-500 justify-between shrink-0 select-none z-20">
        <div className="flex gap-3">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> OmniGen v3.1 Enterprise</span>
            {files.length > 0 && <span>• {files.length} files</span>}
            <span>• {settings.model}</span>
            {user && <span className="text-indigo-400">• Auth: Active</span>}
            <span className="uppercase tracking-wider text-zinc-400">• {platform} / {language}</span>
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
