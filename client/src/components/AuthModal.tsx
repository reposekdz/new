
import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, CheckCircle, Github, Chrome } from 'lucide-react';
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row animate-in zoom-in-95 fade-in duration-300 scale-100">
        
        {/* Left Side - Artistic/Visual */}
        <div className="hidden md:flex md:w-1/2 bg-zinc-900 relative overflow-hidden items-center justify-center p-12">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 opacity-40 blur-[80px]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            
            <div className="relative z-10 text-center space-y-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform rotate-12 hover:rotate-0 transition-all duration-500">
                   <Lock size={32} className="text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome to OmniGen</h2>
                    <p className="text-indigo-200 text-sm leading-relaxed">
                        The AI-powered IDE that architects, builds, and secures your applications in seconds.
                    </p>
                </div>
                
                <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-sm text-indigo-100/80 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                        <CheckCircle size={16} className="text-emerald-400" /> 
                        <span>Secure Cloud Workspace</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-indigo-100/80 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                        <CheckCircle size={16} className="text-emerald-400" /> 
                        <span>Unlimited AI Generations</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#09090b] flex flex-col justify-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
            </button>

            <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-1">
                    {isLogin ? 'Sign back in' : 'Create an account'}
                </h3>
                <p className="text-zinc-400 text-sm">
                    {isLogin ? 'Enter your credentials to access your workspace.' : 'Start building your dream apps today.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Email Address</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-zinc-500" />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Password</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3 top-3 text-zinc-500" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <Button 
                    type="submit" 
                    variant="gradient" 
                    fullWidth 
                    isLoading={isLoading}
                    rightIcon={!isLoading && <ArrowRight size={16} />}
                    className="mt-2"
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#09090b] px-2 text-zinc-500">Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={handleGoogleLogin} leftIcon={<Chrome size={16} className="text-zinc-100"/>}>
                    Google
                </Button>
                <Button variant="secondary" leftIcon={<Github size={16} className="text-zinc-100"/>}>
                    GitHub
                </Button>
            </div>

            <p className="text-center mt-8 text-xs text-zinc-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                    {isLogin ? 'Sign up' : 'Log in'}
                </button>
            </p>

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
