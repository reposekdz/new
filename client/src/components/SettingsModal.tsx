
import React from 'react';
import { X, Settings, Cpu, Type, Save, Zap, Box, Smartphone, Monitor, Globe, Code2, Keyboard, Brain, Gauge } from 'lucide-react';
import { AppSettings, Platform, ProgrammingLanguage, ThinkingLevel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleThinkingChange = (level: ThinkingLevel) => {
      onUpdateSettings({ ...settings, thinkingLevel: level });
  };

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
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
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

          {/* AI Model & Reasoning Power */}
          <div className="space-y-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
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
             </div>

             <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center justify-between">
                    <div className="flex items-center gap-2"><Brain size={14} className="text-purple-400"/> Reasoning Power</div>
                    <span className="text-indigo-400 font-bold text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{settings.thinkingLevel?.toUpperCase() || 'HIGH'}</span>
                </label>
                
                <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'maximum'] as ThinkingLevel[]).map(level => (
                        <button
                            key={level}
                            onClick={() => handleThinkingChange(level)}
                            className={`text-xs py-2 rounded-md border transition-all flex flex-col items-center gap-1 ${
                                settings.thinkingLevel === level
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 transform scale-105'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                            }`}
                        >
                            <span className="font-medium">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                            {level === 'maximum' && <Zap size={8} className="fill-yellow-400 text-yellow-400" />}
                        </button>
                    ))}
                </div>
                <div className="text-[10px] text-zinc-500 px-1 leading-tight mt-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                    {settings.thinkingLevel === 'low' && "Minimal latency. Best for small fixes and simple scripts."}
                    {settings.thinkingLevel === 'medium' && "Balanced reasoning. Good for standard React/Node features."}
                    {settings.thinkingLevel === 'high' && "Deep analysis. Checks for security and basic optimization."}
                    {settings.thinkingLevel === 'maximum' && (
                        <span className="text-indigo-300 flex items-start gap-1">
                            <Zap size={10} className="mt-0.5 text-yellow-400" /> 
                            <strong>Singularity Mode:</strong> Activates rigorous chain-of-thought architecture, security audits, and self-healing verification. Slower, but Principal Engineer quality.
                        </span>
                    )}
                </div>
             </div>
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

          {/* Editor Settings */}
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

          {/* Advanced Settings */}
           <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                    <Keyboard size={14} /> Advanced Editor
                </label>
                <button 
                    onClick={() => onUpdateSettings({ ...settings, vimMode: !settings.vimMode })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        settings.vimMode 
                        ? 'bg-indigo-900/20 border-indigo-900/50 text-indigo-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                >
                    <span>VIM Keybindings</span>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.vimMode ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.vimMode ? 'left-6' : 'left-1'}`}></div>
                    </div>
                </button>
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
