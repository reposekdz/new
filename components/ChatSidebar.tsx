
import React, { useEffect, useRef } from 'react';
import { ChatMessage, Attachment, AIModel } from '../types';
import { Send, Paperclip, Image as ImageIcon, FileText, X, Sparkles, User, Cpu } from 'lucide-react';

interface ChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isGenerating: boolean;
  model: AIModel;
  onModelChange: (model: AIModel) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ messages, onSendMessage, isGenerating, model, onModelChange }) => {
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    onSendMessage(input, attachments);
    setInput("");
    setAttachments([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

            newAttachments.push({
                name: file.name,
                type: file.type,
                content,
                isImage
            });
        }
        setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 min-w-[300px] max-w-[350px]">
      {/* Header */}
      <div className="h-9 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/50 shrink-0 justify-between">
        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-500" />
            OmniGen Assistant
        </span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/50">
            <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[10px] text-zinc-500 font-mono">{isGenerating ? 'THINKING' : 'IDLE'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
            <div className="text-center mt-10">
                <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={18} className="text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500">Start a conversation to edit your app.</p>
                <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px] mx-auto">Try asking: "Add a dark mode toggle" or "Refactor the API service"</p>
            </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold mb-1`}>
                {msg.role === 'user' ? <User size={10}/> : <Sparkles size={10} className="text-indigo-400"/>}
                {msg.role === 'user' ? 'You' : 'OmniGen'}
            </div>
            <div 
                className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[90%] shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
                    : 'bg-gradient-to-br from-indigo-950/50 to-indigo-900/20 text-indigo-100 rounded-tl-none border border-indigo-500/20'
                }`}
            >
                {msg.attachments && msg.attachments.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-xs bg-black/20 px-2 py-1 rounded border border-white/5">
                                {att.isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
                                <span className="truncate max-w-[100px]">{att.name}</span>
                            </div>
                        ))}
                     </div>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isGenerating && (
            <div className="flex flex-col gap-1 items-start">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold mb-1">
                    <Sparkles size={10} className="text-indigo-400"/>
                    OmniGen
                </div>
                <div className="bg-zinc-900/50 text-zinc-400 px-4 py-2 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs ml-1 font-medium animate-pulse">Thinking...</span>
                </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
        {/* Attachment Chips */}
        {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md border border-zinc-700">
                        <span className="truncate max-w-[80px]">{att.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-400"><X size={10}/></button>
                    </div>
                ))}
            </div>
        )}

        {/* Model Selection and Tools */}
        <div className="flex items-center justify-between mb-2 px-1">
             <div className="flex items-center gap-2">
                 <Cpu size={12} className="text-zinc-500" />
                 <select 
                    value={model} 
                    onChange={(e) => onModelChange(e.target.value as AIModel)}
                    className="bg-transparent text-[10px] text-zinc-400 focus:outline-none focus:text-zinc-200 uppercase tracking-wide font-semibold cursor-pointer"
                 >
                     <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                     <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Reasoning)</option>
                 </select>
             </div>
        </div>

        <div className="flex items-end gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-lg">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Attach file"
            >
                <Paperclip size={16} />
            </button>
            <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
            />
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Modify code or add features..."
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none py-2 max-h-[120px] scrollbar-hide font-light"
                rows={1}
            />
            <button 
                onClick={handleSend}
                disabled={isGenerating || (!input.trim() && attachments.length === 0)}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-900/20"
            >
                <Send size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
