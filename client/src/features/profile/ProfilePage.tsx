import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Save, X, Plus, Pencil } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';

interface ProfileForm {
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  company: string;
  jobTitle: string;
  industry: string;
  location: string;
  linkedinUrl: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [languages, setLanguages] = useState<string[]>(user?.languages || []);
  const [reasons, setReasons] = useState<string[]>(user?.reasonsToConnect || []);
  const [newInterest, setNewInterest] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      displayName: user?.displayName || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: user?.bio || '',
      company: user?.company || '',
      jobTitle: user?.jobTitle || '',
      industry: user?.industry || '',
      location: '',
      linkedinUrl: '',
    },
  });

  const addTag = (list: string[], setter: (v: string[]) => void, value: string, inputSetter: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
    }
    inputSetter('');
  };

  const removeTag = (list: string[], setter: (v: string[]) => void, index: number) => {
    setter(list.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const { data: res } = await api.put('/users/me', {
        ...data,
        interests,
        languages,
        reasonsToConnect: reasons,
      });
      setUser(res.data);
      setEditing(false);
      addToast({ type: 'success', title: 'Profile updated' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to update profile', message: err.response?.data?.error?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-100">Profile</h1>
        {!editing && (
          <Button onClick={() => setEditing(true)} variant="secondary" size="sm">
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Avatar src={user.avatarUrl} name={user.displayName || user.email} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-surface-100">{user.displayName || user.email}</h2>
            <p className="text-sm text-surface-400">{user.email}</p>
            {user.company && <p className="text-sm text-surface-400 mt-0.5">{user.jobTitle} at {user.company}</p>}
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" {...register('firstName', { required: 'Required' })} error={errors.firstName?.message} />
              <Input label="Last Name" {...register('lastName', { required: 'Required' })} error={errors.lastName?.message} />
              <Input label="Display Name" {...register('displayName')} />
              <Input label="Company" {...register('company')} />
              <Input label="Job Title" {...register('jobTitle')} />
              <Input label="Industry" {...register('industry')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Bio</label>
              <textarea
                {...register('bio')}
                rows={3}
                className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent hover:border-surface-500 transition-all resize-none"
              />
            </div>

            {/* Interest tags */}
            <TagEditor
              label="Interests"
              tags={interests}
              newTag={newInterest}
              setNewTag={setNewInterest}
              onAdd={() => addTag(interests, setInterests, newInterest, setNewInterest)}
              onRemove={(i) => removeTag(interests, setInterests, i)}
            />

            <TagEditor
              label="Languages"
              tags={languages}
              newTag={newLanguage}
              setNewTag={setNewLanguage}
              onAdd={() => addTag(languages, setLanguages, newLanguage, setNewLanguage)}
              onRemove={(i) => removeTag(languages, setLanguages, i)}
            />

            <TagEditor
              label="Reasons to Connect"
              tags={reasons}
              newTag={newReason}
              setNewTag={setNewReason}
              onAdd={() => addTag(reasons, setReasons, newReason, setNewReason)}
              onRemove={(i) => removeTag(reasons, setReasons, i)}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={saving}>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {user.bio && <p className="text-sm text-surface-300">{user.bio}</p>}

            {user.interests.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((t) => <Badge key={t} variant="brand">{t}</Badge>)}
                </div>
              </div>
            )}

            {user.languages.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {user.languages.map((t) => <Badge key={t} variant="info">{t}</Badge>)}
                </div>
              </div>
            )}

            {user.reasonsToConnect.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">Reasons to Connect</h4>
                <div className="flex flex-wrap gap-2">
                  {user.reasonsToConnect.map((t) => <Badge key={t} variant="success">{t}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function TagEditor({
  label,
  tags,
  newTag,
  setNewTag,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  newTag: string;
  setNewTag: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1 rounded-full bg-surface-800 px-3 py-1 text-sm text-surface-200 border border-surface-700"
          >
            {tag}
            <button type="button" onClick={() => onRemove(i)} className="text-surface-500 hover:text-red-400 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </motion.span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1"
        />
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
