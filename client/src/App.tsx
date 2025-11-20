
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneratedFile, AIModel, TerminalLog, Attachment, ChatMessage, AppSettings, Platform, ProgrammingLanguage, ProjectTemplate, GitState, Commit } from './types';
import { generateAppCode, runCodeSimulation, setupProject, importGithubRepo, getTemplateBoilerplate, generateCommitMessage } from './services/geminiService';
import { logger } from './services/logger';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import TerminalPane from './components/TerminalPane';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import SourceControl from './components/SourceControl';
import { Button } from './components/ui/Button';
import JSZip from 'jszip';
import { 
  Loader2, Play, Download, Code2, Sparkles, ArrowRight, 
  Search, Terminal as TerminalIcon, Paperclip, X, Image as ImageIcon, 
  FileText, Layout, MessageSquare, Monitor, Columns, Maximize, PanelLeftClose, PanelLeftOpen, Settings,
  Github, FolderUp, Keyboard, Command, LogIn, Smartphone, Globe, Box, Server, GitBranch, 
  BarChart3, CheckCircle, AlertCircle, XCircle, Wifi, GitCommit, GitCompare, UploadCloud, Brain
} from 'lucide-react';

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
    description: 'Admin panel with Charts & Sidebar.',
    icon: <BarChart3 className="text-purple-400" size={20} />,
    platform: 'web',
    language: 'typescript'
  },
  {
    id: 'node-express',
    name: 'Node.js API',
    description: 'REST API with TypeScript.',
    icon: <Server className="text-green-400" size={20} />,
    platform: 'web', 
    language: 'typescript'
  },
  {
    id: '3d-game',
    name: '3D Game (R3F)',
    description: 'Interactive 3D scene.',
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
      vimMode: false,
      thinkingLevel: 'high'
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
  const [isDragging, setIsDragging] = useState(false);
  
  // --- GIT STATE ---
  const [gitState, setGitState] = useState<GitState>({
      isInitialized: false,
      commits: [],
      stagedFiles: [],
      branch: 'main'
  });
  const [diffFile, setDiffFile] = useState<GeneratedFile | null>(null); // Current file being diffed
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'git'>('explorer');

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem('omnigen_search_history');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
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
  const [showSidebar, setShowSidebar] = useState(true);
  
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

  // --- INITIALIZATION & EFFECTS ---
  useEffect(() => {
      if (!hasStarted) {
          setPlatform(settings.defaultPlatform);
          setLanguage(settings.defaultLanguage);
      }
  }, [settings.defaultPlatform, settings.defaultLanguage, hasStarted]);

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
        if ((e.metaKey || e.ctrlKey) && e.key === 'b') { 
            e.preventDefault(); 
            if (!showSidebar) { setShowSidebar(true); setActiveSidebar('explorer'); }
            else if (activeSidebar === 'git') { setActiveSidebar('explorer'); }
            else { setShowSidebar(false); }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setShowChat(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar, activeSidebar]);

  // --- DRAG AND DROP LOGIC ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      setIsGenerating(true);
      setError(null);

      if (!hasStarted) setHasStarted(true);

      const filesArray: GeneratedFile[] = [];
      
      const isBinary = (filename: string) => {
          return /\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|mp3|zip|tar|gz|pdf|exe|dll|so|dylib|class|jar|pyc|o|a|DS_Store)$/i.test(filename);
      };

      const traverseFileTree = async (item: any, path = "") => {
          if (item.isFile) {
             if (item.name.startsWith('.')) return; 
             if (path.includes('node_modules') || path.includes('.git') || path.includes('dist') || path.includes('build')) return;
             if (isBinary(item.name)) return;

             const file = await new Promise<File>((resolve, reject) => item.file(resolve, reject));
             const content = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = (e) => resolve(e.target?.result as string || "");
                 reader.readAsText(file);
             });
             filesArray.push({ path: path + item.name, content });
          } else if (item.isDirectory) {
             if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.vscode', '.idea'].includes(item.name)) return;
             
             const dirReader = item.createReader();
             const entries = await new Promise<any[]>((resolve) => {
                 const allEntries: any[] = [];
                 const read = () => {
                    dirReader.readEntries((results: any[]) => {
                        if (results.length > 0) {
                            allEntries.push(...results);
                            read(); 
                        } else {
                            resolve(allEntries);
                        }
                    });
                 };
                 read();
             });
             
             for (const entry of entries) {
                 await traverseFileTree(entry, path + item.name + "/");
             }
          }
      };

      try {
          const promises = [];
          for (let i = 0; i < items.length; i++) {
              const item = items[i].webkitGetAsEntry();
              if (item) {
                  promises.push(traverseFileTree(item, ""));
              }
          }
          await Promise.all(promises);

          if (filesArray.length > 0) {
              const rootDirs = new Set(filesArray.map(f => f.path.split('/')[0]));
              if (rootDirs.size === 1 && items.length === 1 && items[0].webkitGetAsEntry()?.isDirectory) {
                  const rootDir = rootDirs.values().next().value;
                  filesArray.forEach(f => {
                      f.path = f.path.substring(rootDir.length + 1);
                  });
              }

              setFiles(prev => {
                  const newFilesMap = new Map(prev.map(f => [f.path, f]));
                  filesArray.forEach(f => newFilesMap.set(f.path, f));
                  return Array.from(newFilesMap.values());
              });

              handleGitInit(filesArray);
              setMessages(prev => [...prev, { role: 'model', text: `Singularity Import: Analyzed and loaded ${filesArray.length} source files.`, timestamp: Date.now() }]);
              
              const entry = filesArray.find(f => f.path === 'package.json' || f.path.endsWith('index.html') || f.path.endsWith('App.tsx') || f.path.endsWith('main.py'));
              if (entry) setSelectedFile(entry);
          } else {
              setError("No valid source code found in dropped folder.");
          }
      } catch (err: any) {
          setError(`Import failed: ${err.message}`);
      } finally {
          setIsGenerating(false);
      }
  }, [hasStarted]);

  // --- GIT ACTIONS ---
  const handleGitInit = (initialFiles: GeneratedFile[]) => {
      const initialCommit: Commit = {
          id: Math.random().toString(36).substr(2, 9),
          message: 'Initial commit',
          author: 'OmniGen',
          date: new Date().toISOString(),
          filesSnapshot: JSON.parse(JSON.stringify(initialFiles))
      };
      setGitState({
          isInitialized: true,
          commits: [initialCommit],
          stagedFiles: [],
          branch: 'main'
      });
  };

  const handleStage = (path: string) => {
      setGitState(prev => ({ ...prev, stagedFiles: [...prev.stagedFiles, path] }));
  };

  const handleUnstage = (path: string) => {
      setGitState(prev => ({ ...prev, stagedFiles: prev.stagedFiles.filter(p => p !== path) }));
  };

  const handleCommit = (message: string) => {
      const newCommit: Commit = {
          id: Math.random().toString(36).substr(2, 9),
          message,
          author: user ? user.name : 'Developer',
          date: new Date().toISOString(),
          filesSnapshot: JSON.parse(JSON.stringify(files))
      };
      setGitState(prev => ({
          ...prev,
          commits: [newCommit, ...prev.commits],
          stagedFiles: []
      }));
      setTerminalLogs(prev => [...prev, { type: 'info', content: `[master ${newCommit.id.substr(0,7)}] ${message}`, timestamp: Date.now() }]);
  };

  const handlePush = () => {
      setTerminalLogs(prev => [...prev, { type: 'info', content: `Enumerating objects: ${gitState.commits.length}, done.\nCounting objects: 100% (${gitState.commits.length}/${gitState.commits.length}), done.\nWriting objects: 100%, 4.12 KiB | 4.12 MiB/s, done.\nTo https://github.com/omnigen-project/${settings.projectName}.git\n   ${gitState.commits[1]?.id.substr(0,7) || '0000000'}..${gitState.commits[0].id.substr(0,7)}  main -> main`, timestamp: Date.now() }]);
      setMessages(prev => [...prev, { role: 'model', text: `Code pushed to origin/main successfully.`, timestamp: Date.now() }]);
  };

  const handleDiscard = (path: string) => {
      const lastCommit = gitState.commits[0];
      if (!lastCommit) return;
      const originalFile = lastCommit.filesSnapshot.find(f => f.path === path);
      if (originalFile) {
          setFiles(prev => prev.map(f => f.path === path ? { ...f, content: originalFile.content } : f));
          if (selectedFile?.path === path) setSelectedFile({ ...selectedFile, content: originalFile.content });
      } else {
          setFiles(prev => prev.filter(f => f.path !== path));
          if (selectedFile?.path === path) setSelectedFile(null);
      }
  };

  const handleSelectForDiff = (file: GeneratedFile) => {
      setSelectedFile(file);
      setDiffFile(file);
  };

  const handleGenerateCommitMessage = async (): Promise<string> => {
      const staged = files.filter(f => gitState.stagedFiles.includes(f.path));
      return await generateCommitMessage(staged, files);
  };

  // --- HANDLERS ---
  const handleInitialGenerate = async () => {
    if (!landingPrompt.trim() && landingAttachments.length === 0) return;
    
    setHasStarted(true);
    setIsGenerating(true);
    setError(null);
    
    try {
        const scaffold = setupProject(settings.projectName, language);
        
        const userMsg: ChatMessage = { role: 'user', text: landingPrompt, timestamp: Date.now(), attachments: landingAttachments };
        setMessages([userMsg]);

        // Pass thinkingLevel here
        const generatedFiles = await generateAppCode(
            landingPrompt, 
            settings.model, 
            landingAttachments, 
            scaffold, 
            [], 
            platform, 
            language, 
            settings.thinkingLevel
        );
        setFiles(generatedFiles);
        
        handleGitInit(generatedFiles);

        setMessages(prev => [...prev, { role: 'model', text: `Project generated successfully (${platform} / ${language}). Git repository initialized.`, timestamp: Date.now() }]);

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
          // Pass thinkingLevel here
          const updatedFiles = await generateAppCode(
              text, 
              settings.model, 
              attachments, 
              files, 
              messages, 
              platform, 
              language, 
              settings.thinkingLevel
          );
          setFiles(updatedFiles);
          
          if (selectedFile) {
              const updatedSelected = updatedFiles.find(f => f.path === selectedFile.path);
              if (updatedSelected) setSelectedFile(updatedSelected);
          }

          setMessages(prev => [...prev, { role: 'model', text: `Changes applied successfully. Don't forget to commit your changes.`, timestamp: Date.now() }]);
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
                return { ...file, path: file.path.replace(oldPath, newFolderPath) };
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
        if (selectedFile && (selectedFile.path === oldPath || selectedFile.path.startsWith(oldPath + '/'))) {
             const newSel = newFiles.find(f => f.content === selectedFile.content && (f.path.endsWith(newName) || f.path.includes(newName)));
             if(newSel) setSelectedFile(newSel);
        }
        return newFiles;
        });
    } catch (e) {
        logger.error("Rename failed", e);
        setError("Failed to rename file.");
    }
  };

  const handleDeleteFile = (path: string, isFolder: boolean) => {
      const newFiles = files.filter(f => isFolder ? !f.path.startsWith(path + '/') : f.path !== path);
      setFiles(newFiles);
      if (selectedFile && (selectedFile.path === path || (isFolder && selectedFile.path.startsWith(path + '/')))) {
          setSelectedFile(null);
      }
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
      setIsGenerating(true);
      setHasStarted(true);
      setError(null);
      try {
          const templateFiles = getTemplateBoilerplate(template.id);
          setFiles(templateFiles);
          setPlatform(template.platform);
          setLanguage(template.language);
          handleGitInit(templateFiles);
          setMessages([{ role: 'model', text: `Loaded ${template.name} template.`, timestamp: Date.now() }]);
          if (templateFiles.length > 0) {
              setSelectedFile(templateFiles.find(f => f.path.endsWith('tsx') || f.path.endsWith('jsx')) || templateFiles[0]);
              if(template.platform === 'web') setActiveTab('preview');
          }
      } catch (err: any) {
          setError("Failed to load template.");
      } finally {
          setIsGenerating(false);
          setPreviewKey(prev => prev + 1);
      }
  };

  const handleGithubImport = async () => {
      if (!githubUrl.trim()) return;
      setIsGenerating(true);
      setHasStarted(true);
      try {
          const importedFiles = await importGithubRepo(githubUrl);
          setFiles(importedFiles);
          handleGitInit(importedFiles);
          setMessages([{ role: 'model', text: `Imported ${importedFiles.length} files from GitHub.`, timestamp: Date.now() }]);
          if (importedFiles.length > 0) setSelectedFile(importedFiles[0]);
      } catch (err: any) {
          setError(err.message);
          setHasStarted(false);
      } finally {
          setIsGenerating(false);
      }
  };
  
  const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsGenerating(true);
    setHasStarted(true);
    const filesArray: GeneratedFile[] = [];
    try {
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const path = (file.webkitRelativePath || file.name);
            if (['.git', 'node_modules'].some(ignore => path.includes(ignore))) continue;
            if (path.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|mp3|zip|tar|gz|pdf|exe|dll|so|dylib|class|jar)$/i)) continue;
            const content = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string || "");
                reader.readAsText(file);
            });
            filesArray.push({ path, content });
        }
        setFiles(filesArray);
        handleGitInit(filesArray);
        setMessages([{ role: 'model', text: `Imported ${filesArray.length} files from folder.`, timestamp: Date.now() }]);
        if (filesArray.length > 0) setSelectedFile(filesArray[0]);
    } catch (err: any) {
        setError(err.message);
        setHasStarted(false);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleTerminalCommand = async (command: string) => {
    setTerminalLogs(prev => [...prev, { type: 'command', content: command, timestamp: Date.now() }]);
    const cmd = command.trim().split(' ')[0].toLowerCase();
    
    if (cmd === 'git') {
        const args = command.trim().split(' ');
        const subCmd = args[1];
        if (subCmd === 'commit') {
            const msgMatch = command.match(/-m\s+["'](.+)["']/);
            const msg = msgMatch ? msgMatch[1] : 'Update';
            handleCommit(msg);
            return;
        }
        if (subCmd === 'add') {
            if (args[2] === '.') files.forEach(f => handleStage(f.path));
            else handleStage(args[2]);
            setTerminalLogs(prev => [...prev, { type: 'stdout', content: '', timestamp: Date.now() }]);
            return;
        }
        if (subCmd === 'push') {
            handlePush();
            return;
        }
        if (subCmd === 'status') {
            setTerminalLogs(prev => [...prev, { type: 'stdout', content: `On branch main\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n\tmodified: ...`, timestamp: Date.now() }]);
            return;
        }
    }

    if (cmd === 'clear') { setTerminalLogs([]); return; }
    setIsRunning(true);
    try {
        const output = await runCodeSimulation(files, command);
        const type = (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) ? 'stderr' : 'stdout';
        setTerminalLogs(prev => [...prev, { type, content: output, timestamp: Date.now() }]);
    } catch (e: any) {
         setTerminalLogs(prev => [...prev, { type: 'stderr', content: `Error: ${e.message}`, timestamp: Date.now() }]);
    } finally {
        setIsRunning(false);
    }
  };

  const handleRun = () => {
      if (files.some(f => f.path === 'index.html')) {
          setActiveTab('preview');
          setPreviewKey(prev => prev + 1);
      } else {
          setActiveTab('terminal');
          handleTerminalCommand("npm start");
      }
  };

  // --- RENDER LANDING ---
  if (!hasStarted && files.length === 0) {
     return (
      <div 
        className={`min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30 ${isDragging ? 'bg-zinc-900/80' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/20 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-3xl animate-pulse">
                <div className="flex flex-col items-center text-white">
                    <UploadCloud size={48} className="mb-4" />
                    <span className="text-2xl font-bold">Drop project folder here</span>
                    <span className="text-zinc-300">OmniGen will analyze and import the codebase</span>
                </div>
            </div>
        )}

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={(u) => { setUser(u); setIsAuthModalOpen(false); }} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[100] w-full">
             <div className="flex items-center gap-2"><Sparkles size={16} className="text-indigo-500" /><span className="font-bold text-lg">OmniGen</span></div>
             <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}><Settings size={18} /></Button>
                {user ? (
                    <span className="text-sm text-zinc-300 font-medium px-3 py-1 border border-zinc-800 rounded-full bg-zinc-900">Hi, {user.name}</span>
                ) : (
                    <Button variant="gradient" size="sm" onClick={() => setIsAuthModalOpen(true)} leftIcon={<LogIn size={14} />}>Login</Button>
                )}
             </div>
        </div>

        <div className="z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
             <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500">OmniGen</h1>
             <p className="text-lg text-zinc-400 mb-10 max-w-xl">The universal AI software architect. Build full-stack apps in seconds.</p>
             
             <div className="w-full bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden relative group">
                  <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50">
                      <button onClick={() => setLandingTab('new')} className={`flex-1 py-3 text-xs font-medium ${landingTab === 'new' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500'}`}>New Project</button>
                      <button onClick={() => setLandingTab('github')} className={`flex-1 py-3 text-xs font-medium ${landingTab === 'github' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500'}`}>Import GitHub</button>
                      <button onClick={() => setLandingTab('folder')} className={`flex-1 py-3 text-xs font-medium ${landingTab === 'folder' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500'}`}>Import Folder</button>
                  </div>
                  
                  <div className="p-4">
                    {landingTab === 'new' && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                {TEMPLATES.map(t => (
                                    <button key={t.id} onClick={() => handleTemplateSelect(t)} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 rounded-lg p-3 text-left transition-all">
                                        <div className="mb-2">{t.icon}</div>
                                        <div className="text-xs font-semibold text-zinc-200">{t.name}</div>
                                    </button>
                                ))}
                            </div>
                            <textarea 
                                value={landingPrompt}
                                onChange={(e) => setLandingPrompt(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInitialGenerate(); } }}
                                placeholder="Describe your custom application... (e.g. 'A Next.js E-commerce store with Stripe')"
                                className="w-full bg-transparent text-lg text-white p-4 min-h-[100px] outline-none resize-none font-light placeholder:text-zinc-600"
                            />
                            <div className="flex items-center justify-between pt-2">
                                 <div className="flex gap-2">
                                     <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="bg-zinc-900 border border-zinc-800 text-xs rounded-md px-2 py-1"><option value="typescript">TypeScript</option><option value="python">Python</option></select>
                                     <select value={settings.model} onChange={(e) => setSettings({...settings, model: e.target.value as any})} className="bg-zinc-900 border border-zinc-800 text-xs rounded-md px-2 py-1"><option value="gemini-2.5-flash">Flash</option><option value="gemini-3-pro-preview">Pro</option></select>
                                 </div>
                                 <Button onClick={handleInitialGenerate} disabled={!landingPrompt.trim()}>Generate</Button>
                            </div>
                        </>
                    )}
                    {landingTab === 'github' && (
                        <div className="flex gap-2">
                            <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="GitHub URL..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white" />
                            <Button onClick={handleGithubImport}>Clone</Button>
                        </div>
                    )}
                    {landingTab === 'folder' && (
                        <div className="text-center p-8 border-2 border-dashed border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => folderInputRef.current?.click()}>
                            <FolderUp size={24} className="mx-auto mb-2 text-zinc-500" />
                            <span className="text-sm text-zinc-400">Click to upload or Drag & Drop folder</span>
                            <input type="file" ref={folderInputRef} onChange={handleFolderImport} className="hidden" {...{ webkitdirectory: "", directory: "" } as any} />
                        </div>
                    )}
                  </div>
             </div>
        </div>
      </div>
     );
  }

  // --- MAIN RENDER ---
  return (
    <div 
        className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-indigo-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-zinc-900 p-6 rounded-xl border border-indigo-500 shadow-2xl text-center animate-bounce">
                <UploadCloud size={48} className="mx-auto mb-2 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Import Folder</h2>
                <p className="text-zinc-400">Drop to load into workspace</p>
            </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={(u) => { setUser(u); setIsAuthModalOpen(false); }} />

      {/* HEADER */}
      <header className="h-10 border-b border-zinc-800 flex items-center px-3 bg-[#09090b] shrink-0 justify-between select-none z-20">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer text-zinc-100 hover:text-white" onClick={() => { setHasStarted(false); setFiles([]); }}>
                 <Sparkles size={14} className="text-indigo-500" /> <span className="font-bold text-xs tracking-wide">OmniGen</span>
            </div>
            <div className="h-4 w-px bg-zinc-800"></div>
            <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                <button onClick={() => setShowChat(!showChat)} className={`p-1 rounded ${showChat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Chat (Ctrl+\)"><MessageSquare size={12}/></button>
                <button onClick={() => { setShowSidebar(true); setActiveSidebar('explorer'); }} className={`p-1 rounded ${showSidebar && activeSidebar === 'explorer' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Explorer (Ctrl+B)"><PanelLeftOpen size={12}/></button>
                <button onClick={() => { setShowSidebar(true); setActiveSidebar('git'); }} className={`p-1 rounded ${showSidebar && activeSidebar === 'git' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Source Control"><GitBranch size={12}/></button>
            </div>
         </div>

         <div className="flex items-center gap-2">
             <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                 <button onClick={() => setViewMode('code')} className={`px-2 py-0.5 text-[10px] font-medium rounded ${viewMode === 'code' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Code</button>
                 <button onClick={() => setViewMode('split')} className={`px-2 py-0.5 text-[10px] font-medium rounded ${viewMode === 'split' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Split</button>
                 <button onClick={() => setViewMode('preview')} className={`px-2 py-0.5 text-[10px] font-medium rounded ${viewMode === 'preview' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Preview</button>
             </div>
             <button onClick={handleRun} className="bg-emerald-900/20 text-emerald-400 border border-emerald-900/50 px-2 py-1 rounded flex items-center gap-1 text-[10px] hover:bg-emerald-900/40 transition-colors">
                 <Play size={10} /> Run
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-zinc-500 hover:text-zinc-300"><Settings size={14}/></button>
         </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 1. Chat */}
        {showChat && (
            <div style={{ width: chatWidth }} className="flex flex-col border-r border-zinc-800 bg-zinc-950 z-10 relative">
                 <ChatSidebar messages={messages} onSendMessage={handleConversationMessage} isGenerating={isGenerating} model={settings.model} onModelChange={(m) => setSettings({...settings, model: m})} />
                 <div className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500/50" onMouseDown={() => { isResizingChat.current = true; document.body.style.cursor = 'col-resize'; }} />
            </div>
        )}

        {/* 2. Sidebar (Explorer / Git) */}
        {showSidebar && (
            <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-zinc-800 bg-[#09090b] z-0 relative">
                 {activeSidebar === 'explorer' ? (
                     <FileExplorer files={files} selectedFile={selectedFile} onSelectFile={(f) => { setSelectedFile(f); setDiffFile(null); }} onRename={handleRenameFile} onDelete={handleDeleteFile} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchHistory={searchHistory} onAddToHistory={(t) => setSearchHistory(p => [t, ...p])} onClearHistory={() => setSearchHistory([])} />
                 ) : (
                     <SourceControl 
                        files={files} 
                        gitState={gitState} 
                        onStage={handleStage} 
                        onUnstage={handleUnstage} 
                        onCommit={handleCommit} 
                        onPush={handlePush} 
                        onDiscard={handleDiscard}
                        onSelectFileForDiff={handleSelectForDiff}
                        onGenerateAiMessage={handleGenerateCommitMessage}
                     />
                 )}
                 <div className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500/50" onMouseDown={() => { isResizingSidebar.current = true; document.body.style.cursor = 'col-resize'; }} />
            </div>
        )}

        {/* 3. Main Content */}
        <div ref={workspaceRef} className="flex-1 flex min-w-0 bg-[#1e1e1e] relative">
            {/* Editor Area */}
            <div className={`flex flex-col h-full ${viewMode === 'preview' ? 'hidden' : ''}`} style={{ width: viewMode === 'split' ? `${splitPos}%` : '100%' }}>
                {selectedFile ? (
                    <>
                        {/* VS Code Style Tabs */}
                        <div className="h-9 bg-[#09090b] border-b border-zinc-800 flex items-end px-0 gap-0.5 overflow-x-auto scrollbar-hide select-none">
                             <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border-t-2 border-indigo-500 text-zinc-200 text-xs min-w-[120px] max-w-[200px] relative group">
                                 {diffFile ? <GitCompare size={12} className="text-yellow-400 shrink-0" /> : <Code2 size={12} className="text-blue-400 shrink-0" />}
                                 <span className="truncate font-medium">{selectedFile.path.split('/').pop()} {diffFile ? '(Diff)' : ''}</span>
                                 <button onClick={() => { setSelectedFile(null); setDiffFile(null); }} className="ml-auto opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded p-0.5"><X size={10} /></button>
                             </div>
                        </div>
                        
                        {/* Breadcrumbs */}
                        <div className="h-6 bg-[#1e1e1e] flex items-center px-4 text-[10px] text-zinc-500 border-b border-white/5 select-none">
                             {selectedFile.path.split('/').map((part, i, arr) => (
                                 <React.Fragment key={i}>
                                     <span className="hover:text-zinc-300 cursor-pointer">{part}</span>
                                     {i < arr.length - 1 && <span className="mx-1 opacity-50">/</span>}
                                 </React.Fragment>
                             ))}
                        </div>

                        {/* Editor */}
                        <div className="flex-1 relative">
                             {isGenerating && !showChat && (
                                <div className="absolute top-2 right-2 z-50 bg-zinc-800 text-zinc-200 px-2 py-1 rounded text-xs flex items-center gap-2 border border-zinc-700 shadow-lg">
                                    <Loader2 size={10} className="animate-spin" /> Generating...
                                </div>
                             )}
                             <CodeEditor 
                                file={selectedFile} 
                                originalFile={diffFile && gitState.commits[0] ? gitState.commits[0].filesSnapshot.find(f => f.path === selectedFile.path) : null}
                                isDiffMode={!!diffFile}
                                onChange={handleFileChange} 
                                fontSize={settings.editorFontSize} 
                                onAIAction={handleAiAction} 
                                vimMode={settings.vimMode} 
                             />
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4"><Code2 size={32} /></div>
                        <p className="text-sm font-medium">No file selected</p>
                        <p className="text-xs mt-2 text-zinc-700">Press Ctrl+B to open explorer</p>
                    </div>
                )}
            </div>

            {viewMode === 'split' && (
                 <div className="w-1 bg-zinc-800 hover:bg-indigo-500 cursor-col-resize z-50 transition-colors" onMouseDown={startSplitResize} />
            )}

            {/* Preview / Terminal Area */}
            <div className={`flex flex-col h-full bg-[#0c0c0c] border-l border-zinc-800 ${viewMode === 'code' ? 'hidden' : ''}`} style={{ width: viewMode === 'split' ? `${100 - splitPos}%` : '100%' }}>
                 <div className="h-9 bg-[#09090b] border-b border-zinc-800 flex items-center px-2 gap-1 select-none">
                    <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 border-t-2 ${activeTab === 'preview' ? 'border-indigo-500 bg-[#0c0c0c] text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                        <Monitor size={12} /> Preview
                    </button>
                    <button onClick={() => setActiveTab('terminal')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 border-t-2 ${activeTab === 'terminal' ? 'border-indigo-500 bg-[#0c0c0c] text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                        <TerminalIcon size={12} /> Terminal
                    </button>
                </div>
                <div className="flex-1 relative">
                    {activeTab === 'preview' ? (
                        <PreviewPane files={files} refreshKey={previewKey} />
                    ) : (
                        <TerminalPane logs={terminalLogs} isRunning={isRunning} onClear={() => setTerminalLogs([])} onCommand={handleTerminalCommand} onAutoFix={handleAutoFix} />
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* STATUS BAR (VS Code Style) */}
      <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none z-30 shrink-0 font-sans">
        <div className="flex items-center gap-4 h-full">
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer" onClick={() => { setShowSidebar(true); setActiveSidebar('git'); }}>
                 <GitBranch size={10} />
                 <span>{gitState.branch}*</span>
             </div>
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer">
                 <XCircle size={10} /> 0
                 <AlertCircle size={10} className="ml-1" /> 0
             </div>
             {settings.vimMode && (
                 <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer font-bold bg-white/20">
                     <Keyboard size={10} /> VIM ACTIVE
                 </div>
             )}
        </div>
        <div className="flex items-center gap-4 h-full">
             {error && <span className="flex items-center gap-1 text-red-100 bg-red-500/50 px-2 h-full animate-pulse"><AlertCircle size={10}/> System Error</span>}
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer">
                 <CheckCircle size={10} /> Prettier
             </div>
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer">
                 <span>{selectedFile ? language.toUpperCase() : 'TXT'}</span>
             </div>
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                 <Brain size={10} /> {settings.thinkingLevel.toUpperCase()}
             </div>
             <div className="flex items-center gap-1 hover:bg-white/10 px-1 h-full cursor-pointer">
                 <Wifi size={10} /> OmniGen Server
             </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
