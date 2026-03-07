import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, Zap, Shield, ArrowRight, Video, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200">
      {/* Nav */}
      <header className="border-b border-surface-800/50 backdrop-blur-sm sticky top-0 z-50 bg-surface-950/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">RSN</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-surface-400">
            <button onClick={() => navigate('/how-it-works')} className="hover:text-surface-200 transition-colors">How It Works</button>
            <button onClick={() => navigate('/login')} className="hover:text-surface-200 transition-colors">Login</button>
            <Button size="sm" onClick={() => navigate('/login')}>
              Get Started <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </nav>
          <Button size="sm" className="md:hidden" onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center px-6 pt-24 pb-20 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" /> Real-time peer networking
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-surface-50 leading-tight mb-6 animate-fade-in-up">
            Meet founders who <br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">actually get it</span>
          </h1>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            RSN connects you with curated peers through fast, structured 1-on-1 video sessions.
            No more awkward mixers — just meaningful conversations with the right people.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Button onClick={() => navigate('/login')} className="btn-glow text-base px-8 py-3">
              Join RSN <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button variant="secondary" onClick={() => navigate('/how-it-works')} className="text-base px-8 py-3">
              How It Works <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-surface-100 text-center mb-4">Why RSN?</h2>
        <p className="text-surface-400 text-center mb-12 max-w-xl mx-auto">Purpose-built for founders, operators, and professionals who value their time.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Video, title: 'Live 1-on-1 Video', desc: 'Structured speed-networking rounds with built-in video calls. No downloads needed.' },
            { icon: Users, title: 'Curated Pods', desc: 'Join invite-only pods of like-minded professionals. Quality over quantity.' },
            { icon: Zap, title: 'Smart Matching', desc: 'Our engine pairs you optimally each round — no repeated matches, no wasted time.' },
            { icon: Star, title: 'Rate & Remember', desc: 'Rate every conversation. See who wants to meet again. Build real connections.' },
            { icon: Shield, title: 'Invite-Only Access', desc: 'Grow the network through trusted referrals. Each invite unlocks new features.' },
            { icon: Sparkles, title: 'Pod-First Design', desc: 'Organize around topics, industries, or interests. Host sessions on your terms.' },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-surface-800 bg-surface-900/40 p-6 hover:border-surface-700 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-brand-400" />
              </div>
              <h3 className="font-semibold text-surface-100 mb-2">{f.title}</h3>
              <p className="text-sm text-surface-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-b from-surface-950 to-surface-900 py-20 border-t border-surface-800/50">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-surface-100 mb-4">Ready to start networking?</h2>
          <p className="text-surface-400 mb-8">Sign up with your email — no credit card, no noise. Just conversations that matter.</p>
          <Button onClick={() => navigate('/login')} className="btn-glow text-base px-8 py-3">
            Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-surface-500">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <span>RSN Platform</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => navigate('/how-it-works')} className="hover:text-surface-300 transition-colors">How It Works</button>
            <button onClick={() => navigate('/login')} className="hover:text-surface-300 transition-colors">Sign In</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
