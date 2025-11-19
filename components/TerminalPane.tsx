
import React, { useEffect, useRef, useState } from 'react';
import { TerminalLog } from '../types';
import { Terminal as TerminalIcon, Trash2, Maximize2, Minimize2, Wrench, ArrowDown } from 'lucide-react';
import * as ReactWindow from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Robustly handle react-window imports for various environments (ESM/CJS/CDN)
const List = ReactWindow.VariableSizeList || (ReactWindow as any).default?.VariableSizeList || (ReactWindow as any).VariableSizeList;

interface TerminalPaneProps {
  logs: TerminalLog[];
  isRunning: boolean;
  onClear: () => void;
  onCommand: (cmd: string) => void;
  onAutoFix?: (error: string) => void;
}

const TerminalPane: React.FC<TerminalPaneProps> = ({ logs, isRunning, onClear, onCommand, onAutoFix }) => {
  const listRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll effect
  useEffect(() => {
    if (!userScrolled && listRef.current) {
      try {
        listRef.current.scrollToItem(logs.length + 1, 'end');
      } catch (e) {
        // Ignore scroll errors on init
      }
    }
  }, [logs, userScrolled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          if (!input.trim()) return;
          setHistory(prev => [...prev, input]);
          setHistoryIndex(-1);
          onCommand(input);
          setInput("");
          setUserScrolled(false);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (history.length > 0) {
              const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
              setHistoryIndex(newIndex);
              setInput(history[newIndex]);
          }
      } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (historyIndex !== -1) {
              const newIndex = Math.min(history.length - 1, historyIndex + 1);
              if (historyIndex === history.length - 1) {
                  setHistoryIndex(-1);
                  setInput("");
              } else {
                  setHistoryIndex(newIndex);
                  setInput(history[newIndex]);
              }
          }
      }
  };

  // Simple ANSI Code Parser
  const parseAnsi = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\x1b\[[0-9;]*m)/g);
    let currentColor = 'text-zinc-300';
    
    return parts.map((part, i) => {
        if (part.startsWith('\x1b[')) {
            if (part.includes('31')) currentColor = 'text-red-400';
            else if (part.includes('32')) currentColor = 'text-green-400';
            else if (part.includes('33')) currentColor = 'text-yellow-400';
            else if (part.includes('34')) currentColor = 'text-blue-400';
            else if (part.includes('36')) currentColor = 'text-cyan-400';
            else if (part.includes('0')) currentColor = 'text-zinc-300';
            return null;
        }
        return <span key={i} className={currentColor}>{part}</span>;
    });
  };

  // Helper to estimate row height (imperfect but fast)
  const getItemSize = (index: number) => {
      if (index >= logs.length) return 40; // Input row height
      const log = logs[index];
      const charLength = log.content?.length || 0;
      // Estimate wrapping based on ~80-100 chars per line at this font size/width
      const lines = Math.max(1, Math.ceil(charLength / 90)); 
      return Math.min(lines * 20, 300) + 8; // Base 20px line-height + padding, max 300px
  };

  // Row Renderer
  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
      if (index === logs.length) {
          // Input Row
          return (
            <div style={style} className="flex items-center gap-2 px-3">
                <span className="text-indigo-400 shrink-0">➜</span>
                <span className="text-cyan-400 shrink-0">~</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isRunning}
                    spellCheck="false"
                    autoComplete="off"
                    className="flex-1 bg-transparent outline-none border-none p-0 text-zinc-100 placeholder-zinc-700 font-mono text-sm"
                />
                {isRunning && <div className="w-2 h-4 bg-zinc-500 animate-pulse"></div>}
            </div>
          );
      }

      const log = logs[index];
      return (
          <div style={style} className={`px-3 py-1 break-all whitespace-pre-wrap leading-snug group/line text-sm ${log.type === 'command' ? 'font-bold mt-2 mb-1' : ''}`}>
              {log.type === 'command' ? (
                  <div className="flex items-center gap-2 text-indigo-400">
                      <span>➜</span>
                      <span className="text-white">{log.content}</span>
                  </div>
              ) : (
                  <div className="flex items-start gap-2 relative">
                     <div className="flex-1">
                        {parseAnsi(log.content)}
                     </div>
                     {log.type === 'stderr' && onAutoFix && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAutoFix(log.content); }}
                            className="absolute right-0 top-0 opacity-0 group-hover/line:opacity-100 flex items-center gap-1 px-1.5 py-0.5 bg-red-900/30 border border-red-800/50 rounded text-[10px] text-red-300 hover:bg-red-900/50 transition-all backdrop-blur-sm"
                        >
                            <Wrench size={10} /> Fix
                        </button>
                     )}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div 
        className={`h-full w-full flex flex-col bg-[#0c0c0c] font-mono text-sm group ${isMaximized ? 'fixed inset-0 z-50' : ''}`} 
        onClick={() => !window.getSelection()?.toString() && inputRef.current?.focus()}
    >
      {/* Toolbar */}
      <div className="h-8 min-h-[32px] bg-[#18181b] border-b border-zinc-800 flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-2 text-zinc-400">
             <TerminalIcon size={13} />
             <span className="text-xs font-medium">shell</span>
             <span className="text-zinc-600 text-[10px]">({logs.length} events)</span>
        </div>
        
        <div className="flex items-center gap-1">
            {userScrolled && (
                <button onClick={() => { setUserScrolled(false); listRef.current?.scrollToItem(logs.length + 1, 'end'); }} className="mr-2 text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 animate-pulse">
                    <ArrowDown size={10} /> Resume Auto-scroll
                </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
        </div>
      </div>

      {/* Output Area with Virtualization */}
      <div className="flex-1 overflow-hidden relative">
         {List ? (
           <AutoSizer>
            {({ height, width }) => (
                <List
                    ref={listRef}
                    height={height}
                    width={width}
                    itemCount={logs.length + 1} // +1 for input row
                    itemSize={getItemSize}
                    className="scrollbar-hide"
                    onScroll={({ scrollOffset, scrollDirection }: any) => {
                        if (scrollDirection === 'backward') {
                            setUserScrolled(true);
                        }
                        // Heuristic to detect if user is at bottom
                        const totalHeight = logs.reduce((acc, _, i) => acc + getItemSize(i), 0) + 40;
                        if (totalHeight - scrollOffset - height < 50) {
                            setUserScrolled(false);
                        }
                    }}
                >
                    {Row}
                </List>
            )}
           </AutoSizer>
         ) : (
           <div className="p-4 text-red-500">Error loading terminal component.</div>
         )}
      </div>
    </div>
  );
};

export default TerminalPane;
