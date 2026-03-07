import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowRight, UserPlus, Users, Video, Star, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const steps = [
  {
    icon: Mail,
    title: '1. Get Invited or Sign Up',
    desc: 'RSN is invite-first. Receive an invite link from someone in the network, or sign up directly with your email. No password needed — we use magic links.',
  },
  {
    icon: UserPlus,
    title: '2. Invite Others',
    desc: 'Grow the network by inviting people you think would add value. Each accepted invite unlocks more features and pod capacity for you.',
  },
  {
    icon: Users,
    title: '3. Join a Pod',
    desc: 'Pods are curated groups around a topic, industry, or interest. Browse available pods or create your own. Each pod hosts its own sessions.',
  },
  {
    icon: Video,
    title: '4. Join a Live Session',
    desc: 'When a session starts, you enter the lobby. The host kicks off rounds and the matching engine pairs you 1-on-1 with another participant via live video.',
  },
  {
    icon: Star,
    title: '5. Rate & Connect',
    desc: 'After each round, rate the conversation and indicate if you\'d meet again. Mutual matches are highlighted in your Encounters page so you can follow up.',
  },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200">
      {/* Nav */}
      <header className="border-b border-surface-800/50 backdrop-blur-sm sticky top-0 z-50 bg-surface-950/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/welcome')} className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">RSN</span>
          </button>
          <Button size="sm" onClick={() => navigate('/login')}>Get Started</Button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-8">
        <button onClick={() => navigate('/welcome')} className="flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors text-sm mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-surface-50 mb-4">How RSN Works</h1>
        <p className="text-lg text-surface-400">From sign-up to meaningful connections in 5 simple steps.</p>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5 rounded-xl border border-surface-800 bg-surface-900/40 p-6 hover:border-surface-700 transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="h-6 w-6 text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-100 text-lg mb-2">{step.title}</h3>
                <p className="text-surface-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button onClick={() => navigate('/login')} className="btn-glow text-base px-8 py-3">
            Get Started <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
