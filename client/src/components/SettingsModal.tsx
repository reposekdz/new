
import React from 'react';
import { X, Settings, Cpu, Type, Save, Zap, Box } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden scale-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-100 font-medium">
            <Settings size={18} className="text-indigo-500" />
            <span>IDE Configuration</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Project Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2"><Box size={12}/> Project Namespace</label>
            <input 
              type="text" 
              value={settings.projectName}
              onChange={(e) => onUpdateSettings({ ...settings, projectName: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              placeholder="omnigen-project"
            />
          </div>

          {/* AI Model */}
          <div className="space-y-2">
             <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                <Cpu size={14} /> Intelligence Engine
             </label>
             <div className="grid grid-cols-1 gap-2">
                <button 
                    onClick={() => onUpdateSettings({ ...settings, model: 'gemini-2.5-flash' })}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        settings.model === 'gemini-2.5-flash' 
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    <div>
                        <div className="font-medium text-sm">Gemini 2.5 Flash</div>
                        <div className="text-[10px] opacity-70">Latency-Optimized • Quick Iterations</div>
                    </div>
                    {settings.model === 'gemini-2.5-flash' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                </button>
                <button 
                    onClick={() => onUpdateSettings({ ...settings, model: 'gemini-3-pro-preview' })}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        settings.model === 'gemini-3-pro-preview' 
                        ? 'bg-purple-500/10 border-purple-500/50 text-purple-200' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    <div>
                        <div className="font-medium text-sm">Gemini 3.0 Pro (God Mode)</div>
                        <div className="text-[10px] opacity-70">Deep Reasoning • Architecture • Complex Logic</div>
                    </div>
                    {settings.model === 'gemini-3-pro-preview' && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
                </button>
             </div>
          </div>

          {/* Capabilities Info */}
          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold mb-2">
                  <Zap size={12} className="text-amber-400" /> 
                  Supported Capabilities
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                  <span>• Full-Stack Web (React, Node)</span>
                  <span>• Game Dev (C++, Unreal, Unity)</span>
                  <span>• Data Science (Python, PyTorch)</span>
                  <span>• Systems (Rust, Go, C)</span>
                  <span>• Mobile (Swift, Kotlin)</span>
                  <span>• Cloud (Docker, K8s, AWS)</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
               {/* Font Size */}
               <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                        <Type size={14} /> Editor Font
                    </label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                        <button onClick={() => onUpdateSettings({ ...settings, editorFontSize: Math.max(10, settings.editorFontSize - 1) })} className="p-2 hover:bg-zinc-800 rounded text-zinc-400">-</button>
                        <div className="flex-1 text-center text-sm text-zinc-200 font-mono">{settings.editorFontSize}px</div>
                        <button onClick={() => onUpdateSettings({ ...settings, editorFontSize: Math.min(24, settings.editorFontSize + 1) })} className="p-2 hover:bg-zinc-800 rounded text-zinc-400">+</button>
                    </div>
               </div>

               {/* Auto Save */}
               <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                        <Save size={14} /> Auto-Save
                    </label>
                    <button 
                        onClick={() => onUpdateSettings({ ...settings, autoSave: !settings.autoSave })}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            settings.autoSave 
                            ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}
                    >
                        {settings.autoSave ? 'Enabled' : 'Disabled'}
                    </button>
               </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-medium transition-colors">
                Apply Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
