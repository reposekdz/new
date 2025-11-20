
import React from 'react';
import { X, Settings, Cpu, Type, Save, Zap, Box, Smartphone, Monitor, Globe, Code2 } from 'lucide-react';
import { AppSettings, Platform, ProgrammingLanguage } from '../types';

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

          {/* AI Model Dropdown */}
          <div className="space-y-2">
             <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                <Cpu size={14} /> Intelligence Engine
             </label>
             <select
                value={settings.model}
                onChange={(e) => onUpdateSettings({ ...settings, model: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
             >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Efficient)</option>
                <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Deep Reasoning Architect)</option>
             </select>
             <p className="text-[10px] text-zinc-500 px-1">
                Select 3.0 Pro for complex architectures like Microservices or React Native.
             </p>
          </div>

          {/* Defaults */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                    <Monitor size={12} /> Default Platform
                </label>
                <select
                    value={settings.defaultPlatform || 'web'}
                    onChange={(e) => onUpdateSettings({ ...settings, defaultPlatform: e.target.value as Platform })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                >
                    <option value="web">Web Application</option>
                    <option value="mobile">Mobile (React Native)</option>
                    <option value="desktop">Desktop (Electron)</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                    <Code2 size={12} /> Default Language
                </label>
                <select
                    value={settings.defaultLanguage || 'typescript'}
                    onChange={(e) => onUpdateSettings({ ...settings, defaultLanguage: e.target.value as ProgrammingLanguage })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                </select>
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
