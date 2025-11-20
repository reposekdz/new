
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GeneratedFile } from '../types';
import { 
  File, FileJson, FileCode, FileType2, Folder, FolderOpen, 
  ChevronDown, ChevronRight, Image as ImageIcon, Music, 
  Database, Settings, Terminal, Layout, Edit2, Trash2, 
  MoreVertical, Search, Clock, X, Box, Coffee, FileText, 
  Globe, Server, Shield, Cpu, Gem, Atom, Video, Key, 
  PlayCircle, Braces
} from 'lucide-react';

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  onSelectFile: (file: GeneratedFile) => void;
  onRename: (oldPath: string, newName: string, isFolder: boolean) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchHistory: string[];
  onAddToHistory: (term: string) => void;
  onClearHistory: () => void;
}

type FileNode = {
  name: string;
  path: string; // Full path including name
  type: 'file' | 'folder';
  children: Record<string, FileNode>;
  fileRef?: GeneratedFile;
};

const getFileIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase();

  // Specific Filenames
  if (lower === 'package.json') return <Box size={15} className="text-red-400" />;
  if (lower === 'tsconfig.json' || lower.includes('jsconfig')) return <Settings size={15} className="text-blue-400" />;
  if (lower === 'dockerfile' || lower.includes('docker')) return <Box size={15} className="text-blue-500" />;
  if (lower === '.gitignore' || lower === '.env') return <Settings size={15} className="text-zinc-500" />;
  if (lower === 'readme.md') return <FileText size={15} className="text-emerald-400" />;

  // Extensions
  switch (ext) {
    // Web
    case 'html': return <Globe size={15} className="text-orange-500" />;
    case 'css': 
    case 'scss':
    case 'less': return <FileType2 size={15} className="text-blue-400" />;
    case 'js': return <FileCode size={15} className="text-yellow-400" />;
    case 'jsx': return <Atom size={15} className="text-cyan-400" />; // React
    case 'ts': return <FileCode size={15} className="text-blue-500" />;
    case 'tsx': return <Atom size={15} className="text-blue-400" />; // React TS
    case 'json': return <FileJson size={15} className="text-yellow-200" />;
    
    // Backend / Systems
    case 'py': return <FileCode size={15} className="text-blue-300" />;
    case 'go': return <FileCode size={15} className="text-cyan-500" />;
    case 'rs': return <Settings size={15} className="text-orange-600" />; // Rust (Gear is common for rust)
    case 'java': return <Coffee size={15} className="text-red-500" />;
    case 'rb': return <Gem size={15} className="text-red-600" />;
    case 'php': return <Server size={15} className="text-indigo-400" />;
    case 'c': 
    case 'cpp': 
    case 'h': return <FileCode size={15} className="text-blue-600" />;
    case 'cs': return <FileCode size={15} className="text-purple-600" />;

    // Data / Config
    case 'sql': 
    case 'db': 
    case 'sqlite': return <Database size={15} className="text-purple-400" />;
    case 'yml': 
    case 'yaml': 
    case 'toml': 
    case 'xml': return <Settings size={15} className="text-zinc-400" />;
    case 'sh': 
    case 'bash': 
    case 'zsh': return <Terminal size={15} className="text-green-500" />;
    
    // Assets
    case 'md': 
    case 'txt': return <FileText size={15} className="text-zinc-400" />;
    case 'png': 
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico': 
    case 'webp': return <ImageIcon size={15} className="text-purple-400" />;
    case 'mp4':
    case 'webm':
    case 'mov': return <Video size={15} className="text-pink-400" />;
    case 'mp3':
    case 'wav': return <Music size={15} className="text-pink-400" />;
    
    // Security
    case 'pem':
    case 'crt':
    case 'key': return <Key size={15} className="text-yellow-500" />;

    default: return <File size={15} className="text-zinc-500" />;
  }
};

// Recursive Tree Item Component
const FileTreeItem: React.FC<{ 
  node: FileNode; 
  depth: number; 
  selectedFile: GeneratedFile | null; 
  onSelectFile: (file: GeneratedFile) => void; 
  onRename: (oldPath: string, newName: string, isFolder: boolean) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  defaultExpanded?: boolean 
}> = ({ node, depth, selectedFile, onSelectFile, onRename, onDelete, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sort: Folders first, then files, alphabetical
  const sortedChildren = useMemo(() => {
    return (Object.values(node.children) as FileNode[]).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }, [node.children]);

  const isSelected = node.type === 'file' && selectedFile?.path === node.path;
  const indent = depth * 12 + 12; // base 12px padding

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (editName.trim() && editName !== node.name) {
      onRename(node.path, editName.trim(), node.type === 'folder');
    }
    setIsEditing(false);
    setEditName(node.name); // Reset to current if failed/cancelled, will update on next render if success
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(node.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Basic right click to delete implementation
    if (confirm(`Delete ${node.name}?`)) {
      onDelete(node.path, node.type === 'folder');
    }
  };

  if (node.type === 'folder') {
    return (
      <div>
        <div 
          className="flex items-center gap-1 py-1 px-2 hover:bg-zinc-900/50 cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors select-none group relative"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => !isEditing && setIsExpanded(!isExpanded)}
          onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          onContextMenu={handleContextMenu}
        >
          <span className="opacity-70 transition-transform duration-200">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {isExpanded ? <FolderOpen size={15} className="text-indigo-400/80" /> : <Folder size={15} className="text-indigo-400/80" />}
          
          {isEditing ? (
            <input 
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="ml-1 bg-zinc-800 text-xs text-white px-1 py-0.5 rounded border border-indigo-500 outline-none w-full min-w-[50px]"
            />
          ) : (
            <span className="text-xs font-medium ml-1 truncate">{node.name}</span>
          )}
        </div>
        {isExpanded && (
          <div className="animate-in slide-in-from-left-1 duration-200">
            {sortedChildren.map(child => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                depth={depth + 1} 
                selectedFile={selectedFile} 
                onSelectFile={onSelectFile} 
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 py-1 px-2 cursor-pointer select-none border-l-2 transition-all duration-150 group relative ${
        isSelected 
          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-200' 
          : 'border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${indent + 16}px` }}
      onClick={() => node.fileRef && !isEditing && onSelectFile(node.fileRef)}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      onContextMenu={handleContextMenu}
    >
      {getFileIcon(node.name)}
      {isEditing ? (
        <input 
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-800 text-xs font-mono text-white px-1 py-0 rounded border border-indigo-500 outline-none w-full min-w-[50px]"
        />
      ) : (
        <span className={`text-xs font-mono truncate ${isSelected ? 'font-semibold' : ''}`}>{node.name}</span>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, selectedFile, onSelectFile, onRename, onDelete, 
  searchQuery, onSearchChange, searchHistory, onAddToHistory, onClearHistory 
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Build Tree Structure
  const fileTree = useMemo(() => {
    const root: FileNode = { name: 'root', path: '', type: 'folder', children: {} };
    
    files.forEach(file => {
      if (searchQuery && !file.path.toLowerCase().includes(searchQuery.toLowerCase())) return;

      const parts = file.path.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');
        
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path,
            type: isFile ? 'file' : 'folder',
            children: {},
            fileRef: isFile ? file : undefined
          };
        }
        current = current.children[part];
      });
    });
    return root;
  }, [files, searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          onAddToHistory(searchQuery);
          setShowHistory(false);
      }
  };

  // Click outside logic
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
              setShowHistory(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#09090b] select-none">
      <div className="p-3 border-b border-zinc-800 flex flex-col gap-2 shrink-0 z-20">
         <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
             <div className="text-[10px] text-zinc-600">Double-click to rename</div>
         </div>
         
         <div className="relative" ref={searchRef}>
            <Search size={12} className="absolute top-2 left-2 text-zinc-500" />
            <input 
                type="text" 
                placeholder="Search files..." 
                value={searchQuery} 
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setShowHistory(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors" 
            />
            
            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-800/50 border-b border-zinc-800">
                        <span className="text-[10px] font-medium text-zinc-500 uppercase">Recent Searches</span>
                        <button onClick={onClearHistory} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors">Clear</button>
                    </div>
                    {searchHistory.map((term, idx) => (
                        <button 
                            key={idx}
                            onClick={() => {
                                onSearchChange(term);
                                onAddToHistory(term); // Move to top
                                setShowHistory(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <Clock size={12} className="opacity-50"/>
                            <span className="truncate">{term}</span>
                        </button>
                    ))}
                </div>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {Object.keys(fileTree.children).length === 0 ? (
             <div className="text-center mt-8 opacity-40 text-xs">
                {files.length === 0 ? "No files generated" : "No matches found"}
             </div>
        ) : (
            (Object.values(fileTree.children) as FileNode[]).map(node => (
                <FileTreeItem 
                    key={node.path} 
                    node={node} 
                    depth={0} 
                    selectedFile={selectedFile} 
                    onSelectFile={onSelectFile} 
                    onRename={onRename}
                    onDelete={onDelete}
                />
            ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
