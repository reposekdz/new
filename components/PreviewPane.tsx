
import React, { useEffect, useState } from 'react';
import { GeneratedFile } from '../types';
import { AlertCircle, RefreshCw, Terminal, BookOpen, ExternalLink } from 'lucide-react';

interface PreviewPaneProps {
  files: GeneratedFile[];
  refreshKey: number; // Used to force reload iframe
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ files, refreshKey }) => {
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce logic to prevent iframe thrashing during editing
  useEffect(() => {
    if (files.length === 0) {
      setIframeSrc('');
      return;
    }

    setIsLoading(true);

    const generatePreview = () => {
      try {
        // 1. Identify Project Type
        const indexFile = files.find(f => f.path.endsWith('index.html') || f.path === 'index.html');
        
        if (!indexFile) {
          // Handle Non-Web Apps
          setError("NON_WEB_PREVIEW");
          setIsLoading(false);
          return;
        }

        setError(null);
        let htmlContent = indexFile.content;

        // 2. Resolve Relative CSS Links
        htmlContent = htmlContent.replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g, (match, href) => {
          const cssFile = files.find(f => f.path.endsWith(href) || f.path.endsWith(href.replace('./', '')));
          if (cssFile) {
            return `<style>\n/* Injected from ${cssFile.path} */\n${cssFile.content}\n</style>`;
          }
          return match;
        });

        // 3. Resolve Relative JS Scripts
        htmlContent = htmlContent.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
          const jsFile = files.find(f => f.path.endsWith(src) || f.path.endsWith(src.replace('./', '')));
          if (jsFile) {
            return `<script>\n// Injected from ${jsFile.path}\n${jsFile.content}\n</script>`;
          }
          return match;
        });

        // 4. Inject Error Handling Script (Hot-Reloading Support)
        // This script intercepts runtime errors inside the iframe and displays them nicely.
        const errorScript = `
          <script>
            window.onerror = function(msg, url, line, col, error) {
              const div = document.createElement('div');
              div.style = "position:fixed; top:0; left:0; right:0; background:rgba(185,28,28,0.95); color:white; padding:12px; font-family:monospace; font-size:12px; z-index:9999; border-bottom:1px solid #991b1b; display:flex; align-items:center; gap:8px;";
              div.innerHTML = '<strong>RUNTIME ERROR:</strong> ' + msg + ' <span style="opacity:0.7">(Line ' + line + ')</span>';
              document.body.appendChild(div);
              return false;
            };
            console.log("OmniGen Hot-Reload Active");
          </script>
        `;
        htmlContent = errorScript + htmlContent;

        // 5. Create Blob URL
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeSrc(url);
        setIsLoading(false);

        return () => URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Preview generation error:", err);
        setError("Failed to generate preview.");
        setIsLoading(false);
      }
    };

    // 1.5s debounce for typing to simulate "Hot Reloading" without flashing
    const timer = setTimeout(generatePreview, 1500);

    // Immediate update on explicit refresh
    if (refreshKey > 0) {
        clearTimeout(timer);
        generatePreview();
    }

    return () => clearTimeout(timer);
  }, [files, refreshKey]);

  // Simple Markdown Parser for Readme
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-indigo-400 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-zinc-100 mt-6 mb-3 border-b border-zinc-700 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="text-indigo-300">$1</strong>')
      .replace(/`([^`]+)`/gim, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-sm text-emerald-400 font-mono">$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-zinc-950 p-4 rounded-lg border border-zinc-800 my-4 overflow-x-auto text-zinc-300 font-mono text-sm">$1</pre>')
      .split('\n').map((line, i) => <div key={i} dangerouslySetInnerHTML={{ __html: line || '<br/>' }} />);
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-400">
        <RefreshCw size={48} className="mb-4 opacity-20" />
        <p className="font-medium text-zinc-500">Preview Area</p>
        <p className="text-sm opacity-60">Generated output renders here</p>
      </div>
    );
  }

  if (error === "NON_WEB_PREVIEW") {
      const readme = files.find(f => f.path.toLowerCase().includes('readme')) || files[0];
      const isReadme = readme.path.toLowerCase().includes('readme');

      return (
        <div className="h-full flex flex-col bg-zinc-900">
            <div className="h-10 bg-zinc-800 border-b border-zinc-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2 text-zinc-300 text-sm">
                    <Terminal size={16} className="text-emerald-500" />
                    <span className="font-medium">Native Application Mode</span>
                </div>
                {isReadme && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                        <BookOpen size={12} /> Readme Preview
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                    {isReadme ? (
                        <div className="prose prose-invert prose-zinc max-w-none">
                            {renderMarkdown(readme.content)}
                        </div>
                    ) : (
                        <div className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-6 text-center">
                            <AlertCircle size={48} className="mx-auto text-indigo-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">No Preview Available</h3>
                            <p className="text-zinc-400 mb-4">
                                This project does not have an index.html or README.md to preview.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="h-8 bg-zinc-100 border-b border-zinc-200 flex items-center px-4 gap-2 text-xs text-zinc-500 shrink-0">
        <div className="w-2 h-2 rounded-full bg-red-400/80"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-400/80"></div>
        <div className="w-2 h-2 rounded-full bg-green-400/80"></div>
        <div className="ml-2 flex-1 bg-white h-5 rounded border border-zinc-200 flex items-center px-2 relative overflow-hidden">
             <span className="text-zinc-400 mr-1">http://</span>
             <span className="text-zinc-700">localhost:3000</span>
             {isLoading && (
                 <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 w-full animate-progress-indeterminate"></div>
             )}
        </div>
        <RefreshCw size={12} className="opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setIframeSrc(prev => prev + ' ')} />
        {iframeSrc && (
            <a href={iframeSrc} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-700 ml-2">
                <ExternalLink size={12} />
            </a>
        )}
      </div>
      <div className="flex-1 relative bg-white">
          {iframeSrc && (
            <iframe
                key={refreshKey} 
                src={iframeSrc}
                className="w-full h-full border-none block"
                title="App Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
            />
          )}
      </div>
      <style>{`
        @keyframes progress-indeterminate {
            0% { left: -100%; width: 50%; }
            100% { left: 100%; width: 50%; }
        }
        .animate-progress-indeterminate {
            animation: progress-indeterminate 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default PreviewPane;
