import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Search, LayoutGrid, List } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Spinner';
import CreatePodModal from './CreatePodModal';
import api from '@/lib/api';

interface Pod {
  id: string;
  name: string;
  description: string | null;
  pod_type: string;
  visibility: string;
  status: string;
  max_members: number | null;
  created_at: string;
  member_count?: number;
}

export default function PodsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);

  const { data: pods, isLoading, refetch } = useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      const { data } = await api.get('/pods');
      return data.data as Pod[];
    },
  });

  const filtered = (pods || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-surface-100">Pods</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Create Pod
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <Input
            placeholder="Search pods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex rounded-xl border border-surface-700 overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2.5 transition-colors ${view === 'list' ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No pods found"
          description={search ? 'Try a different search term' : 'Create your first pod to get started'}
          action={!search ? <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-2" /> Create Pod</Button> : undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pod, i) => (
            <motion.div
              key={pod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/pods/${pod.id}`}>
                <Card hover>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-surface-100 text-sm">{pod.name}</h3>
                        <p className="text-xs text-surface-500">{pod.pod_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge variant={pod.status === 'active' ? 'success' : 'default'}>{pod.status}</Badge>
                  </div>
                  {pod.description && (
                    <p className="text-sm text-surface-400 line-clamp-2 mb-3">{pod.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-surface-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {pod.member_count || 0} members
                    </span>
                    <Badge size="sm">{pod.visibility}</Badge>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pod) => (
            <Link key={pod.id} to={`/pods/${pod.id}`}>
              <Card hover className="!p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-100 text-sm">{pod.name}</h3>
                  {pod.description && <p className="text-xs text-surface-400 truncate">{pod.description}</p>}
                </div>
                <Badge variant={pod.status === 'active' ? 'success' : 'default'}>{pod.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreatePodModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />
    </motion.div>
  );
}
