import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { isAdmin } from '@/lib/utils';

interface JoinRequest {
  id: string;
  fullName: string;
  email: string;
  linkedinUrl: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  reviewedAt: string | null;
  createdAt: string;
}

export default function AdminJoinRequestsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<{ request: JoinRequest; decision: 'approved' | 'declined' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-join-requests', page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/join-requests?${params.toString()}`).then(r => r.data);
    },
    enabled: isAdmin(user?.role),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, reviewNotes }: { id: string; decision: string; reviewNotes: string }) =>
      api.patch(`/join-requests/${id}/review`, { decision, reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-join-requests'] });
      addToast('Request reviewed successfully', 'success');
      setReviewModal(null);
      setReviewNotes('');
    },
    onError: () => addToast('Failed to review request', 'error'),
  });

  if (!isAdmin(user?.role)) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Admin Only</h2>
        <p className="text-gray-500 mb-4">This page is restricted to administrators.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const requests: JoinRequest[] = data?.data ?? [];
  const meta = data?.meta;

  const handleReview = () => {
    if (!reviewModal) return;
    reviewMutation.mutate({
      id: reviewModal.request.id,
      decision: reviewModal.decision,
      reviewNotes,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Join Requests</h1>
          <p className="text-gray-500 text-sm mt-1">{meta?.totalCount || 0} total requests</p>
        </div>
        <Shield className="h-8 w-8 text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 animate-fade-in-up">
        {['pending', 'approved', 'declined', ''].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-rsn-red text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Request List */}
      {isLoading ? <PageLoader /> : (
        <div className="space-y-3 animate-fade-in-up">
          {requests.map((r) => (
            <Card key={r.id} className="!p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-800">{r.fullName}</p>
                    <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'default'}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{r.email}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{r.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600">
                      <ExternalLink className="h-3 w-3" /> LinkedIn
                    </a>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setReviewModal({ request: r, decision: 'approved' })}
                      className="!bg-emerald-600 hover:!bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setReviewModal({ request: r, decision: 'declined' })}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {requests.length === 0 && (
            <Card>
              <p className="text-gray-400 text-sm text-center py-8">No {statusFilter || ''} requests found</p>
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!meta.hasPrev} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="ghost" size="sm" disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <Modal
          open={!!reviewModal}
          onClose={() => { setReviewModal(null); setReviewNotes(''); }}
          title={`${reviewModal.decision === 'approved' ? 'Approve' : 'Decline'} Request`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {reviewModal.decision === 'approved'
                ? `Approve ${reviewModal.request.fullName}'s request to join RSN?`
                : `Decline ${reviewModal.request.fullName}'s request?`
              }
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Add review notes..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all duration-200 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setReviewModal(null); setReviewNotes(''); }}>Cancel</Button>
              <Button
                onClick={handleReview}
                isLoading={reviewMutation.isPending}
                className={reviewModal.decision === 'approved' ? '!bg-emerald-600 hover:!bg-emerald-700' : '!bg-red-600 hover:!bg-red-700'}
              >
                {reviewModal.decision === 'approved' ? 'Approve' : 'Decline'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
