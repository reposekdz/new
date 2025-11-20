
import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, CheckCircle, Github, Chrome, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: email.split('@')[0] })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      // Simulate network delay for effect
      await new Promise(r => setTimeout(r, 800));
      
      onLogin(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      // Simulation
      setTimeout(() => {
          setIsLoading(false);
          onLogin({ id: 'google-user', name: 'Google User', email: 'user@gmail.com', avatar: 'G' });
          onClose();
      }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl shadow-indigo-900/20 overflow-hidden relative z-10 flex flex-col md:flex-row animate-in zoom-in-95 fade-in duration-300 scale-100 ring-1 ring-white/10">
        
        {/* Left Side - Abstract Visuals */}
        <div className="hidden md:flex md:w-1/2 bg-black relative overflow-hidden items-center justify-center p-12">
            {/* Advanced Mesh Gradient */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-rose-500 via-purple-600 to-indigo-500 opacity-30 blur-[100px] animate-spin-slow" style={{ animationDuration: '20s' }}></div>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            
            <div className="relative z-10 text-center space-y-8">
                <div className="w-24 h-24 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform rotate-6 hover:rotate-0 transition-all duration-700 group">
                   <ShieldCheck size={40} className="text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                </div>
                <div>
                    <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-3">OmniGen ID</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                        Secure access to your personal AI architect. 
                        Sync projects, manage deployments, and collaborate.
                    </p>
                </div>
                
                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center gap-3 text-xs font-medium text-white/80 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                        <CheckCircle size={14} className="text-emerald-400" /> 
                        <span>Enterprise-Grade Encryption</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-white/80 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                        <CheckCircle size={14} className="text-emerald-400" /> 
                        <span>Cloud Workspace Sync</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#09090b] flex flex-col justify-center relative">
            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-full transition-all">
                <X size={18} />
            </button>

            <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                    {isLogin ? 'Welcome back' : 'Join the future'}
                </h3>
                <p className="text-zinc-500 text-sm">
                    {isLogin ? 'Enter your credentials to continue.' : 'Create your account to start building.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
                        <X size={14} /> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={16} className="text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="dev@omnigen.ai"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <Button 
                    type="submit" 
                    variant="gradient" 
                    fullWidth 
                    size="lg"
                    isLoading={isLoading}
                    rightIcon={!isLoading && <ArrowRight size={18} />}
                    className="mt-4 shadow-xl shadow-indigo-900/20"
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center text-xs font-medium uppercase"><span className="bg-[#09090b] px-4 text-zinc-600">Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button variant="secondary" onClick={handleGoogleLogin} leftIcon={<Chrome size={18} className="text-white"/>} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                    Google
                </Button>
                <Button variant="secondary" leftIcon={<Github size={18} className="text-white"/>} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                    GitHub
                </Button>
            </div>

            <p className="text-center mt-8 text-xs text-zinc-500">
                {isLogin ? "New here? " : "Already a member? "}
                <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-all">
                    {isLogin ? 'Create an account' : 'Log in'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
