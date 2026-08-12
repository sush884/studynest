import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Name is required.');
        if (!email.trim()) throw new Error('Email is required.');
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

        const res = await api.signup({ name: name.trim(), email: email.trim(), password });
        onAuthSuccess(res.user);
      } else {
        if (!email.trim()) throw new Error('Email is required.');
        if (!password) throw new Error('Password is required.');

        const res = await api.login({ email: email.trim(), password });
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword('demo123456');
    setName(demoName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-pink-100 max-w-md w-full overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-pink-50 via-amber-50 to-emerald-50 border-b border-pink-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20 font-bold text-xl">
              🪹
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">StudyNest</h2>
              <p className="text-xs text-slate-500">Real Multi-User Learning Account</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            {mode === 'signup'
              ? 'Create your free account to store your study progress, build playlists, and study with friends.'
              : 'Log in to access your personal study plans, daily sessions, and group chats.'}
          </p>
        </div>

        {/* Toggle Mode Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                {mode === 'signup' ? 'Create My Account' : 'Log In to StudyNest'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Guarantee Note */}
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero fake data guarantee: All streaks and progress are stored safely in your account.</span>
          </div>
        </form>
      </div>
    </div>
  );
};
