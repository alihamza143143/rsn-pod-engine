import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicUrl, setMagicUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/magic-link', { email });
      setSent(true);
      // In dev mode, the server logs the magic link URL.
      // The API may return it in response for dev convenience.
      if (data.data?.magicLink) {
        setMagicUrl(data.data.magicLink);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 mb-4">
            <Zap className="h-8 w-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            Raw Speed Networking
          </h1>
          <p className="text-surface-400 mt-2">Sign in with your email to get started</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/80 backdrop-blur-xl p-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  required
                  autoFocus
                  error={error}
                />
              </div>
              <Button type="submit" isLoading={loading} className="w-full" size="lg">
                Send Magic Link
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Check your email</h3>
                <p className="text-sm text-surface-400 mt-1">
                  We sent a magic link to <span className="text-surface-200 font-medium">{email}</span>
                </p>
              </div>
              {magicUrl && (
                <div className="mt-4 p-3 rounded-xl bg-surface-800 border border-surface-700">
                  <p className="text-xs text-surface-500 mb-1">Dev Mode — Click to verify:</p>
                  <a
                    href={magicUrl}
                    className="text-sm text-brand-400 hover:text-brand-300 break-all underline"
                  >
                    Open Magic Link
                  </a>
                </div>
              )}
              <button
                onClick={() => { setSent(false); setMagicUrl(''); }}
                className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                Try a different email
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
