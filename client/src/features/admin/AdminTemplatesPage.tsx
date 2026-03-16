import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Pencil, Trash2, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { isAdmin } from '@/lib/utils';

interface TemplateForm {
  name: string;
  description: string;
  weightIndustry: number;
  weightInterests: number;
  weightIntent: number;
  weightExperience: number;
  weightLocation: number;
  rematchCooldownRounds: number;
  explorationLevel: number;
  sameCompanyAllowed: boolean;
  fallbackStrategy: string;
}

const DEFAULTS: TemplateForm = {
  name: '', description: '',
  weightIndustry: 0.3, weightInterests: 0.3, weightIntent: 0.2, weightExperience: 0.1, weightLocation: 0.1,
  rematchCooldownRounds: 3, explorationLevel: 0.2, sameCompanyAllowed: false, fallbackStrategy: 'random',
};

const selectClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all duration-200';

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs text-gray-400">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range" min="0" max="100" value={value * 100}
        onChange={e => onChange(parseInt(e.target.value) / 100)}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rsn-red"
      />
    </div>
  );
}

export default function AdminTemplatesPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(DEFAULTS);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => api.get('/admin/templates').then(r => r.data.data ?? []),
    enabled: isAdmin(user?.role),
  });

  const saveMutation = useMutation({
    mutationFn: () => editId
      ? api.put(`/admin/templates/${editId}`, form)
      : api.post('/admin/templates', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-templates'] });
      addToast(editId ? 'Template updated' : 'Template created', 'success');
      setEditModal(false);
    },
    onError: () => addToast('Failed to save template', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-templates'] }); addToast('Template deleted', 'success'); },
  });

  const openCreate = () => { setEditId(null); setForm(DEFAULTS); setEditModal(true); };
  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      name: t.name, description: t.description || '',
      weightIndustry: t.weightIndustry, weightInterests: t.weightInterests,
      weightIntent: t.weightIntent, weightExperience: t.weightExperience, weightLocation: t.weightLocation,
      rematchCooldownRounds: t.rematchCooldownRounds, explorationLevel: t.explorationLevel,
      sameCompanyAllowed: t.sameCompanyAllowed, fallbackStrategy: t.fallbackStrategy,
    });
    setEditModal(true);
  };

  if (!isAdmin(user?.role)) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Admin Only</h2>
        <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Matching Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Configure how participants are matched in events</p>
        </div>
        <Button onClick={openCreate} className="btn-glow">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="space-y-3 animate-fade-in-up">
          {(templates || []).map((t: any) => (
            <Card key={t.id} className="!p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    {t.isDefault && <Badge variant="brand"><Star className="h-3 w-3 mr-1" /> Default</Badge>}
                  </div>
                  {t.description && <p className="text-sm text-gray-500 mb-3">{t.description}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div><span className="text-gray-400">Industry</span><br /><span className="font-medium">{(t.weightIndustry * 100).toFixed(0)}%</span></div>
                    <div><span className="text-gray-400">Interests</span><br /><span className="font-medium">{(t.weightInterests * 100).toFixed(0)}%</span></div>
                    <div><span className="text-gray-400">Intent</span><br /><span className="font-medium">{(t.weightIntent * 100).toFixed(0)}%</span></div>
                    <div><span className="text-gray-400">Experience</span><br /><span className="font-medium">{(t.weightExperience * 100).toFixed(0)}%</span></div>
                    <div><span className="text-gray-400">Location</span><br /><span className="font-medium">{(t.weightLocation * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Cooldown: {t.rematchCooldownRounds} rounds</span>
                    <span>Exploration: {(t.explorationLevel * 100).toFixed(0)}%</span>
                    <span>Same company: {t.sameCompanyAllowed ? 'Yes' : 'No'}</span>
                    <span>Fallback: {t.fallbackStrategy}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!t.isDefault && (
                    <button onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id); }} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {(!templates || templates.length === 0) && (
            <Card><p className="text-gray-400 text-sm text-center py-8">No templates yet. Create one to get started.</p></Card>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={editId ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Speed Networking Default" />
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="What is this template for?"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] resize-none"
            />
          </div>

          <h3 className="text-sm font-semibold text-gray-700 pt-2">Scoring Weights</h3>
          <WeightSlider label="Industry" value={form.weightIndustry} onChange={v => setForm(f => ({ ...f, weightIndustry: v }))} />
          <WeightSlider label="Interests" value={form.weightInterests} onChange={v => setForm(f => ({ ...f, weightInterests: v }))} />
          <WeightSlider label="Intent" value={form.weightIntent} onChange={v => setForm(f => ({ ...f, weightIntent: v }))} />
          <WeightSlider label="Experience" value={form.weightExperience} onChange={v => setForm(f => ({ ...f, weightExperience: v }))} />
          <WeightSlider label="Location" value={form.weightLocation} onChange={v => setForm(f => ({ ...f, weightLocation: v }))} />

          <h3 className="text-sm font-semibold text-gray-700 pt-2">Matching Behaviour</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rematch Cooldown (rounds)</label>
              <input type="number" min={0} max={50} value={form.rematchCooldownRounds}
                onChange={e => setForm(f => ({ ...f, rematchCooldownRounds: parseInt(e.target.value) || 0 }))}
                className={selectClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exploration Level</label>
              <input type="number" min={0} max={1} step={0.05} value={form.explorationLevel}
                onChange={e => setForm(f => ({ ...f, explorationLevel: parseFloat(e.target.value) || 0 }))}
                className={selectClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fallback Strategy</label>
              <select value={form.fallbackStrategy} onChange={e => setForm(f => ({ ...f, fallbackStrategy: e.target.value }))} className={selectClass}>
                <option value="random">Random</option>
                <option value="round_robin">Round Robin</option>
                <option value="least_matched">Least Matched</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.sameCompanyAllowed}
                  onChange={e => setForm(f => ({ ...f, sameCompanyAllowed: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-rsn-red focus:ring-rsn-red" />
                Allow same-company matches
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={!form.name}>
              {editId ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
