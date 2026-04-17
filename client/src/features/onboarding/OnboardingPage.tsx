import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User, Target, Layers, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import api from '@/lib/api';

const STEPS = [
  { title: 'About You', icon: User, description: 'Let others know who they\'re meeting' },
  { title: 'What You Want', icon: Target, description: 'Help us match you with the right people' },
  { title: 'Depth', icon: Layers, description: 'Fine-tune your matching profile' },
];

const ROLES = ['Founder', 'CEO', 'CTO', 'COO', 'VP', 'Director', 'Manager', 'IC', 'Advisor', 'Investor', 'Student', 'Other'];
const STATES = ['Building', 'Scaling', 'Exploring', 'Transitioning', 'Advising'];
const STAGES = ['Early Career', 'Mid Career', 'Senior', 'Executive', 'Retired'];
const GOALS = ['Find Co-founder', 'Get Mentorship', 'Give Mentorship', 'Expand Network', 'Find Investors', 'Find Talent', 'Learn Skills', 'Share Knowledge'];
const MEETING_PREFS = ['Founders', 'Investors', 'Mentors', 'Industry Peers', 'Students', 'Anyone'];

function ChipSelect({ options, selected, onChange, multi = true }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
}) {
  const toggle = (opt: string) => {
    if (multi) {
      onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
    } else {
      onChange(selected.includes(opt) ? [] : [opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            selected.includes(opt)
              ? 'bg-rsn-red text-white border-rsn-red'
              : 'bg-white text-gray-600 border-gray-200 hover:border-rsn-red/40 hover:text-rsn-red'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput('');
  };
  return (
    <div>
      <div className="flex gap-2 mb-2 flex-wrap min-h-[28px]">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-rsn-red-light text-rsn-red px-3 py-1 text-xs font-medium">
            {t}
            <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { user, checkSession } = useAuthStore();
  const { addToast } = useToastStore();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Step 1 — About You (identity + professional context)
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [company, setCompany] = useState(user?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [industry, setIndustry] = useState(user?.industry || '');
  const [professionalRole, setProfessionalRole] = useState<string[]>(user?.professionalRole || []);
  const [currentState, setCurrentState] = useState<string[]>(user?.currentState ? [user.currentState] : []);
  const [careerStage, setCareerStage] = useState<string[]>(user?.careerStage ? [user.careerStage] : []);

  // Step 2 — What You Want
  const [goals, setGoals] = useState<string[]>(user?.goals || []);
  const [meetingPreferences, setMeetingPreferences] = useState<string[]>(user?.meetingPreferences || []);

  // Step 3 — Depth
  const [reasonsToConnect, setReasonsToConnect] = useState<string[]>(user?.reasonsToConnect || []);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [matchingNotes, setMatchingNotes] = useState(user?.matchingNotes || '');

  // ── Required-field validation per step ──
  const step0Errors = {
    displayName: !displayName.trim(),
    company: !company.trim(),
    jobTitle: !jobTitle.trim(),
    industry: !industry.trim(),
  };
  const step0Valid = !step0Errors.displayName && !step0Errors.company && !step0Errors.jobTitle && !step0Errors.industry;
  const step1Valid = goals.length > 0;
  const step2Valid = reasonsToConnect.length > 0;

  const canProceed = step === 0 ? step0Valid : step === 1 ? step1Valid : step2Valid;

  const handleNext = () => {
    if (!canProceed) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(step + 1);
  };

  const handleFinish = useCallback(async () => {
    if (!step0Valid || !step1Valid || !step2Valid) {
      setShowErrors(true);
      addToast('Please fill all required fields before completing.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/users/me', {
        displayName: displayName.trim(),
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        industry: industry.trim(),
        reasonsToConnect,
        professionalRole,
        currentState: currentState[0] || null,
        careerStage: careerStage[0] || null,
        goals,
        meetingPreferences,
        interests,
        matchingNotes: matchingNotes.trim() || null,
      });
      // Mark onboarding as completed — server re-validates required fields.
      await api.post('/auth/onboarding/complete', {
        displayName: displayName.trim(),
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        industry: industry.trim(),
        reasonsToConnect,
      });
      await checkSession();
      addToast('Profile set up!', 'success');
      navigate(redirect, { replace: true });
    } catch (err: any) {
      addToast(err?.response?.data?.error?.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    displayName, company, jobTitle, industry, reasonsToConnect,
    professionalRole, currentState, careerStage, goals, meetingPreferences,
    interests, matchingNotes,
    step0Valid, step1Valid, step2Valid,
    checkSession, addToast, navigate, redirect,
  ]);

  const StepIcon = STEPS[step].icon;

  const errorClass = 'mt-1 text-xs text-rsn-red';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50/50 p-4">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-rsn-red' : i < step ? 'w-2 bg-rsn-red/40' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rsn-red-light text-rsn-red mx-auto mb-3">
              <StepIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">{STEPS[step].title}</h2>
            <p className="text-gray-500 text-sm mt-1">{STEPS[step].description}</p>
          </div>

          {/* Step 1: About You */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Display Name <span className="text-rsn-red">*</span>
                </label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How you want to appear" />
                {showErrors && step0Errors.displayName && <p className={errorClass}>Display name is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Company <span className="text-rsn-red">*</span>
                </label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Where you work (or current venture)" />
                {showErrors && step0Errors.company && <p className={errorClass}>Company is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Job Title <span className="text-rsn-red">*</span>
                </label>
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Founder, Head of Product" />
                {showErrors && step0Errors.jobTitle && <p className={errorClass}>Job title is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Industry <span className="text-rsn-red">*</span>
                </label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS, Fintech, Healthcare" />
                {showErrors && step0Errors.industry && <p className={errorClass}>Industry is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
                <ChipSelect options={ROLES} selected={professionalRole} onChange={setProfessionalRole} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Current State</label>
                <ChipSelect options={STATES} selected={currentState} onChange={setCurrentState} multi={false} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Career Stage</label>
                <ChipSelect options={STAGES} selected={careerStage} onChange={setCareerStage} multi={false} />
              </div>
            </div>
          )}

          {/* Step 2: What You Want */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Goals <span className="text-rsn-red">*</span>
                </label>
                <ChipSelect options={GOALS} selected={goals} onChange={setGoals} />
                {showErrors && !step1Valid && <p className={errorClass}>Select at least one goal.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Who do you want to meet?</label>
                <ChipSelect options={MEETING_PREFS} selected={meetingPreferences} onChange={setMeetingPreferences} />
              </div>
            </div>
          )}

          {/* Step 3: Depth */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Reasons to Connect <span className="text-rsn-red">*</span>
                </label>
                <TagInput tags={reasonsToConnect} setTags={setReasonsToConnect} placeholder="e.g. hiring, co-founder search, mentorship" />
                {showErrors && !step2Valid && <p className={errorClass}>Add at least one reason to connect.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Topics / Interests</label>
                <TagInput tags={interests} setTags={setInterests} placeholder="e.g. AI, startups, design" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Matching Notes</label>
                <textarea
                  value={matchingNotes}
                  onChange={e => setMatchingNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything else you'd like potential matches to know?"
                  maxLength={1000}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rsn-red/20 focus:border-rsn-red/40 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
            {step > 0 ? (
              <button onClick={() => { setShowErrors(false); setStep(step - 1); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span className="text-xs text-gray-500">
                We need your profile to introduce you to the right people. You can always edit it later on your Profile page.
              </span>
            )}

            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} size="sm">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} isLoading={saving} size="sm">
                <Check className="h-4 w-4 mr-1" /> Complete
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Step {step + 1} of {STEPS.length}</p>
      </div>
    </div>
  );
}
