import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import {
  ArrowLeft, MapPin, Globe, Sparkles, Target, Heart,
  HelpCircle, Users, User, Award, Compass, Link2, Languages, Linkedin,
} from 'lucide-react';
import api from '@/lib/api';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`).then(r => r.data.data),
    enabled: !!userId,
  });

  if (isLoading) return <PageLoader />;
  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-gray-700">User not found</h2>
        <Button onClick={() => navigate(-1)} variant="secondary" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const linkedinSlug = user.linkedinUrl
    ? user.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '')
    : null;
  const linkedinHref = linkedinSlug ? `https://www.linkedin.com/in/${linkedinSlug}` : null;

  const matchingSections = [
    { key: 'whatICareAbout', label: 'What I Care About', Icon: Heart },
    { key: 'whatICanHelpWith', label: 'What I Can Help With', Icon: HelpCircle },
    { key: 'whoIWantToMeet', label: 'Who I Want to Meet', Icon: Users },
    { key: 'whyIWantToMeet', label: 'Why I Want to Meet', Icon: Target },
    { key: 'myIntent', label: 'My Intent', Icon: Compass },
  ].filter(s => user[s.key]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* ═══ PROFILE CARD ═══ */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200">

        {/* ─── Avatar + Identity ─── */}
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="inline-block rounded-full p-[3px] border-2 border-rsn-red/30">
            <Avatar src={user.avatarUrl} name={user.displayName || 'User'} size="xl" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">{user.displayName}</h1>

          {(user.jobTitle || user.company) && (
            <p className="mt-1 text-sm text-gray-500">
              {[user.jobTitle, user.company].filter(Boolean).join(' at ')}
            </p>
          )}

          {/* Inline meta */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {user.location && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {user.location}</span>
            )}
            {user.industry && (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {user.industry}</span>
            )}
            {user.languages?.length > 0 && (
              <span className="flex items-center gap-1"><Languages className="h-3 w-3" /> {user.languages.join(', ')}</span>
            )}
          </div>

          {linkedinHref && (
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Linkedin className="h-3.5 w-3.5" /> linkedin.com/in/{linkedinSlug}
            </a>
          )}
        </div>

        {/* ─── Bio ─── */}
        {user.bio && (
          <Section icon={User} title="About">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{user.bio}</p>
          </Section>
        )}

        {/* ─── Interests ─── */}
        {user.interests?.length > 0 && (
          <Section icon={Sparkles} title="Interests">
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((t: string) => (
                <span key={t} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">{t}</span>
              ))}
            </div>
          </Section>
        )}

        {/* ─── Expertise ─── */}
        {user.expertiseText && (
          <Section icon={Award} title="Expertise">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{user.expertiseText}</p>
          </Section>
        )}

        {/* ─── Reasons to Connect ─── */}
        {user.reasonsToConnect?.length > 0 && (
          <Section icon={Link2} title="Reasons to Connect">
            <div className="flex flex-wrap gap-1.5">
              {user.reasonsToConnect.map((r: string) => (
                <span key={r} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">{r}</span>
              ))}
            </div>
          </Section>
        )}

        {/* ─── Matching Profile ─── */}
        {matchingSections.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Matching Profile</h3>
            <div className="space-y-4">
              {matchingSections.map(({ key, label, Icon }) => (
                <div key={key} className="flex gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="mt-0.5 text-sm text-gray-700 leading-relaxed">{user[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 px-6 py-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-rsn-red/70" /> {title}
      </h3>
      {children}
    </div>
  );
}
