
import React, { useState, useMemo } from 'react';
import { GeneratedFile, GitState, FileChange } from '../types';
import { 
  GitBranch, Check, Plus, Minus, RotateCcw, 
  MoreHorizontal, Search, GitCommit, Play, 
  Clock, ChevronRight, ChevronDown, FileCode,
  ArrowUp, Sparkles, Loader2
} from 'lucide-react';
import { Button } from './ui/Button';

interface SourceControlProps {
  files: GeneratedFile[];
  gitState: GitState;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onCommit: (message: string) => void;
  onPush: () => void;
  onDiscard: (path: string) => void;
  onSelectFileForDiff: (file: GeneratedFile) => void;
  onGenerateAiMessage: () => Promise<string>;
}

const SourceControl: React.FC<SourceControlProps> = ({ 
  files, gitState, onStage, onUnstage, onCommit, onPush, onDiscard, onSelectFileForDiff, onGenerateAiMessage 
}) => {
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);

  // Calculate Changes
  const changes = useMemo(() => {
    if (!gitState.isInitialized) return { staged: [], modified: [] };

    const lastCommit = gitState.commits[0];
    const stagedItems: FileChange[] = [];
    const modifiedItems: FileChange[] = [];

    files.forEach(file => {
      const original = lastCommit ? lastCommit.filesSnapshot.find(f => f.path === file.path) : null;
      const isStaged = gitState.stagedFiles.includes(file.path);

      let status: 'modified' | 'new' | 'unmodified' = 'unmodified';

      if (!original) status = 'new';
      else if (original.content !== file.content) status = 'modified';

      if (status !== 'unmodified') {
        if (isStaged) stagedItems.push({ path: file.path, status });
        else modifiedItems.push({ path: file.path, status });
      }
    });

    // Check for deleted files
    if (lastCommit) {
        lastCommit.filesSnapshot.forEach(oldFile => {
            if (!files.find(f => f.path === oldFile.path)) {
                 const isStaged = gitState.stagedFiles.includes(oldFile.path);
                 if (isStaged) stagedItems.push({ path: oldFile.path, status: 'deleted' });
                 else modifiedItems.push({ path: oldFile.path, status: 'deleted' });
            }
        });
    }

    return { staged: stagedItems, modified: modifiedItems };
  }, [files, gitState]);

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    // Simulate network/processing delay
    setTimeout(() => {
        onCommit(commitMessage);
        setCommitMessage("");
        setIsCommitting(false);
    }, 500);
  };

  const handleGenerateAiMessage = async () => {
     if (changes.staged.length === 0) return;
     setIsGeneratingMsg(true);
     try {
         const msg = await onGenerateAiMessage();
         setCommitMessage(msg);
     } catch (e) {
         setCommitMessage("feat: update files");
     } finally {
         setIsGeneratingMsg(false);
     }
  };

  if (!gitState.isInitialized) {
      return (
          <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-[#09090b] text-zinc-400">
              <GitBranch size={48} className="mb-4 opacity-20" />
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">No Repository Open</h3>
              <p className="text-xs mb-6 max-w-[200px]">The current workspace is not tracked by git.</p>
              <Button size="sm" onClick={() => onCommit("Initial commit")} className="w-full">Initialize Repository</Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] select-none border-r border-zinc-800">
        {/* Header */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <GitBranch size={14}/> Source Control
            </span>
            <div className="flex gap-1">
                 <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"><Search size={14}/></button>
                 <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"><MoreHorizontal size={14}/></button>
            </div>
        </div>

        {/* Commit Input Area */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/30">
            <div className="relative">
                <textarea 
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Message (⌘Enter to commit)" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none min-h-[80px]"
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleCommit(); }}
                />
                <button 
                    onClick={handleGenerateAiMessage}
                    disabled={isGeneratingMsg || changes.staged.length === 0}
                    className="absolute right-2 bottom-2 p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full transition-colors disabled:opacity-50"
                    title="Generate AI Commit Message"
                >
                    {isGeneratingMsg ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                </button>
            </div>
            <div className="flex gap-2 mt-2">
                 <Button 
                    size="sm" 
                    fullWidth 
                    disabled={changes.staged.length === 0 || !commitMessage.trim()} 
                    isLoading={isCommitting}
                    onClick={handleCommit}
                    leftIcon={<Check size={12} />}
                >
                    Commit
                </Button>
                <Button size="sm" variant="secondary" onClick={onPush} title="Sync Changes">
                    <ArrowUp size={14} />
                </Button>
            </div>
        </div>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto">
            {/* Staged Changes */}
            <div className="py-2">
                <div className="px-3 py-1 flex items-center justify-between group cursor-pointer hover:bg-zinc-900/50">
                    <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase">
                        <ChevronDown size={12} />
                        Staged Changes ({changes.staged.length})
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button onClick={() => changes.staged.forEach(c => onUnstage(c.path))} title="Unstage All" className="p-0.5 hover:bg-zinc-700 rounded"><Minus size={12}/></button>
                    </div>
                </div>
                <div className="mt-1">
                    {changes.staged.map(change => (
                        <ChangeItem 
                            key={change.path} 
                            change={change} 
                            onClick={() => onSelectFileForDiff(files.find(f => f.path === change.path)!)}
                            actionIcon={<Minus size={12} />}
                            onAction={() => onUnstage(change.path)}
                        />
                    ))}
                </div>
            </div>

            {/* Modified Changes */}
            <div className="py-2 border-t border-zinc-800/50">
                <div className="px-3 py-1 flex items-center justify-between group cursor-pointer hover:bg-zinc-900/50">
                    <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase">
                        <ChevronDown size={12} />
                        Changes ({changes.modified.length})
                    </div>
                     <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button onClick={() => changes.modified.forEach(c => onStage(c.path))} title="Stage All" className="p-0.5 hover:bg-zinc-700 rounded"><Plus size={12}/></button>
                        <button onClick={() => changes.modified.forEach(c => onDiscard(c.path))} title="Discard All" className="p-0.5 hover:bg-zinc-700 rounded text-red-400"><RotateCcw size={12}/></button>
                    </div>
                </div>
                <div className="mt-1">
                    {changes.modified.map(change => (
                        <ChangeItem 
                            key={change.path} 
                            change={change} 
                            onClick={() => onSelectFileForDiff(files.find(f => f.path === change.path)!)}
                            actionIcon={<Plus size={12} />}
                            onAction={() => onStage(change.path)}
                            secondaryActionIcon={<RotateCcw size={12} />}
                            onSecondaryAction={() => onDiscard(change.path)}
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* Commits History */}
        <div className="border-t border-zinc-800 bg-zinc-900/20 flex-1 min-h-[150px] overflow-y-auto">
             <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">History</div>
             {gitState.commits.map((commit, i) => (
                 <div key={commit.id} className="px-3 py-2 border-b border-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer">
                     <div className="flex items-center gap-2 mb-1">
                         <GitCommit size={12} className="text-indigo-400" />
                         <span className="text-xs font-medium text-zinc-200 truncate">{commit.message}</span>
                     </div>
                     <div className="flex items-center justify-between text-[10px] text-zinc-500">
                         <span>{commit.id.substring(0, 7)}</span>
                         <span>{new Date(commit.date).toLocaleTimeString()}</span>
                     </div>
                 </div>
             ))}
        </div>
    </div>
  );
};

const ChangeItem = ({ change, onClick, actionIcon, onAction, secondaryActionIcon, onSecondaryAction }: any) => (
    <div className="flex items-center justify-between px-4 py-1 hover:bg-zinc-800 group cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 overflow-hidden">
            <span className={`text-[10px] font-bold w-3 ${
                change.status === 'modified' ? 'text-yellow-400' : 
                change.status === 'new' ? 'text-green-400' : 'text-red-400'
            }`}>
                {change.status === 'modified' ? 'M' : change.status === 'new' ? 'U' : 'D'}
            </span>
            <span className="text-xs text-zinc-300 truncate">{change.path.split('/').pop()}</span>
            <span className="text-[10px] text-zinc-600 truncate">{change.path.substring(0, change.path.lastIndexOf('/'))}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
             {secondaryActionIcon && (
                 <button onClick={(e) => { e.stopPropagation(); onSecondaryAction(); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">{secondaryActionIcon}</button>
             )}
             <button onClick={(e) => { e.stopPropagation(); onAction(); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">{actionIcon}</button>
        </div>
    </div>
);

export default SourceControl;
