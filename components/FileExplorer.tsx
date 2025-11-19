
import React, { useState, useMemo } from 'react';
import { GeneratedFile } from '../types';
import { 
  File, FileJson, FileCode, FileType2, Folder, FolderOpen, 
  ChevronDown, ChevronRight, Image as ImageIcon, Music, 
  Database, Settings, Terminal, Layout
} from 'lucide-react';

interface FileExplorerProps {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  onSelectFile: (file: GeneratedFile) => void;
  searchQuery: string;
}

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: Record<string, FileNode>;
  fileRef?: GeneratedFile;
};

const getFileIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase();

  if (lower.includes('docker')) return <Layout size={15} className="text-blue-400" />;
  if (lower.includes('.yml') || lower.includes('.yaml') || lower.includes('config')) return <Settings size={15} className="text-red-400" />;
  if (lower.includes('.sh')) return <Terminal size={15} className="text-green-500" />;
  if (lower.includes('sql')) return <Database size={15} className="text-purple-400" />;
  
  switch (ext) {
    case 'html': return <FileCode size={15} className="text-orange-400" />;
    case 'css': return <FileType2 size={15} className="text-blue-400" />;
    case 'js': 
    case 'jsx': return <FileCode size={15} className="text-yellow-400" />;
    case 'ts': 
    case 'tsx': return <FileCode size={15} className="text-blue-500" />;
    case 'json': return <FileJson size={15} className="text-green-400" />;
    case 'md': return <File size={15} className="text-gray-400" />;
    case 'py': return <FileCode size={15} className="text-yellow-300" />;
    case 'rs': return <FileCode size={15} className="text-orange-600" />;
    case 'go': return <FileCode size={15} className="text-cyan-400" />;
    case 'png': 
    case 'jpg':
    case 'svg': return <ImageIcon size={15} className="text-purple-400" />;
    default: return <File size={15} className="text-zinc-400" />;
  }
};

// Recursive Tree Item Component
const FileTreeItem: React.FC<{ 
  node: FileNode; 
  depth: number; 
  selectedFile: GeneratedFile | null; 
  onSelectFile: (file: GeneratedFile) => void; 
  defaultExpanded?: boolean 
}> = ({ node, depth, selectedFile, onSelectFile, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sort: Folders first, then files, alphabetical
  const sortedChildren = useMemo(() => {
    return Object.values(node.children).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }, [node.children]);

  const isSelected = node.type === 'file' && selectedFile?.path === node.path;
  const indent = depth * 12 + 12; // base 12px padding

  if (node.type === 'folder') {
    return (
      <div>
        <div 
          className="flex items-center gap-1 py-1 px-2 hover:bg-zinc-900/50 cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors select-none"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="opacity-70">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {isExpanded ? <FolderOpen size={15} className="text-indigo-400/80" /> : <Folder size={15} className="text-indigo-400/80" />}
          <span className="text-xs font-medium ml-1">{node.name}</span>
        </div>
        {isExpanded && (
          <div>
            {sortedChildren.map(child => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                depth={depth + 1} 
                selectedFile={selectedFile} 
                onSelectFile={onSelectFile} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 py-1 px-2 cursor-pointer select-none border-l-2 transition-all duration-150 ${
        isSelected 
          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-200' 
          : 'border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${indent + 16}px` }}
      onClick={() => node.fileRef && onSelectFile(node.fileRef)}
    >
      {getFileIcon(node.name)}
      <span className="text-xs font-mono truncate">{node.name}</span>
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile, searchQuery }) => {
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

  return (
    <div className="flex flex-col h-full bg-[#09090b] select-none">
      <div className="p-3 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
         <div className="flex items-center justify-between">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {Object.keys(fileTree.children).length === 0 ? (
             <div className="text-center mt-8 opacity-40 text-xs">
                {files.length === 0 ? "No files generated" : "No matches found"}
             </div>
        ) : (
            Object.values(fileTree.children).map(node => (
                <FileTreeItem 
                    key={node.path} 
                    node={node} 
                    depth={0} 
                    selectedFile={selectedFile} 
                    onSelectFile={onSelectFile} 
                />
            ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
