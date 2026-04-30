// Messages page — Phase E of chat-fix-and-dm-system plan (1 May 2026).
//
// Two-pane layout: conversation list (left) + active thread (right).
// On mobile: single-pane, list collapses when a conversation is open.
//
// Real-time updates: subscribes to dm:message, dm:read_receipt,
// dm:conversation_updated. Updates React Query cache so the inbox sort
// + thread view update without polling.

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Trash2, MessageSquare } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';

interface ConversationSummary {
  conversationId: string;
  otherUserId: string;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromMe: boolean;
  unreadCount: number;
}

interface DmMessage {
  id: string;
  conversationId: string;
  fromUserId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function MessagesPage() {
  const { conversationId: activeId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const myUserId = user?.id;
  const [draft, setDraft] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Inbox: list of conversations sorted by recent activity.
  const { data: inboxData } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: () => api.get('/dm/conversations').then(r => r.data.data as ConversationSummary[]),
    refetchOnWindowFocus: true,
  });

  // Thread: messages in the active conversation.
  const { data: messagesData } = useQuery({
    queryKey: ['dm-messages', activeId],
    queryFn: () => api.get(`/dm/conversations/${activeId}/messages`).then(r => r.data.data as DmMessage[]),
    enabled: !!activeId,
  });

  // Mark-as-read: fire on opening a conversation.
  useEffect(() => {
    if (!activeId) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('dm:read', { conversationId: activeId });
    } else {
      api.post(`/dm/conversations/${activeId}/read`).catch(err => console.warn('mark-read failed', err));
    }
  }, [activeId]);

  // Real-time subscriptions: refresh inbox + active thread on incoming events.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg: DmMessage) => {
      // If it's for the active thread, append + refetch
      if (msg.conversationId === activeId) {
        qc.invalidateQueries({ queryKey: ['dm-messages', activeId] });
      }
      // Always refresh inbox sort + unread badge
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
      qc.invalidateQueries({ queryKey: ['dm-unread-count'] });
    };
    const onConversationUpdated = () => {
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
    };
    const onReadReceipt = (data: { conversationId: string }) => {
      if (data.conversationId === activeId) {
        qc.invalidateQueries({ queryKey: ['dm-messages', activeId] });
      }
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
      qc.invalidateQueries({ queryKey: ['dm-unread-count'] });
    };

    socket.on('dm:message', onMessage);
    socket.on('dm:conversation_updated', onConversationUpdated);
    socket.on('dm:read_receipt', onReadReceipt);
    return () => {
      socket.off('dm:message', onMessage);
      socket.off('dm:conversation_updated', onConversationUpdated);
      socket.off('dm:read_receipt', onReadReceipt);
    };
  }, [activeId, qc]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const activeConv = inboxData?.find(c => c.conversationId === activeId);

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeConv) throw new Error('No active conversation');
      return api.post('/dm/messages', { toUserId: activeConv.otherUserId, content });
    },
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['dm-messages', activeId] });
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error?.message || 'Failed to send message', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dm/conversations/${id}`),
    onSuccess: () => {
      addToast('Conversation deleted', 'info');
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
      navigate('/messages');
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error?.message || 'Failed to delete', 'error');
    },
  });

  if (!myUserId) return <PageLoader />;

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
      {/* Conversation list (left, hidden on mobile when a thread is open) */}
      <div className={`md:w-80 md:flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden ${activeId ? 'hidden md:flex' : 'flex'} flex-col`}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-[#1a1a2e]">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {inboxData === undefined ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : inboxData.length === 0 ? (
            <div className="text-center py-12 px-4 text-sm text-gray-500">
              No conversations yet. Once you meet someone in an event, you can DM them from their profile.
            </div>
          ) : (
            inboxData.map(c => (
              <Link
                key={c.conversationId}
                to={`/messages/${c.conversationId}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${activeId === c.conversationId ? 'bg-rsn-red/5' : ''}`}
              >
                <Avatar src={c.otherAvatarUrl || undefined} name={c.otherDisplayName || 'User'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-[#1a1a2e] truncate">{c.otherDisplayName || 'User'}</p>
                    {c.lastMessageAt && <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatRelative(c.lastMessageAt)}</span>}
                  </div>
                  <p className={`text-xs truncate ${c.unreadCount > 0 && !c.lastMessageFromMe ? 'font-semibold text-[#1a1a2e]' : 'text-gray-500'}`}>
                    {c.lastMessageFromMe ? 'You: ' : ''}{c.lastMessage || <em className="text-gray-300">No messages yet</em>}
                  </p>
                </div>
                {c.unreadCount > 0 && !c.lastMessageFromMe && (
                  <span className="bg-rsn-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Thread view (right) */}
      <div className={`flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden ${activeId ? 'flex' : 'hidden md:flex'} flex-col`}>
        {!activeId || !activeConv ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-6 text-center">
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => navigate('/messages')}
                className="md:hidden p-1 rounded-lg hover:bg-gray-100"
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-4 w-4 text-gray-500" />
              </button>
              <Avatar src={activeConv.otherAvatarUrl || undefined} name={activeConv.otherDisplayName || 'User'} size="sm" />
              <Link to={`/profile/${activeConv.otherUserId}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1a2e] truncate hover:underline">{activeConv.otherDisplayName || 'User'}</p>
              </Link>
              <button
                onClick={() => {
                  if (confirm('Delete this conversation from your view? The other person\'s view is unaffected.')) {
                    deleteMutation.mutate(activeConv.conversationId);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                title="Delete conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messagesData === undefined ? (
                <div className="flex items-center justify-center py-8"><Spinner /></div>
              ) : messagesData.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No messages yet — say hi!</div>
              ) : (
                // Server returns messages newest first; render oldest first in UI.
                [...messagesData].reverse().map(m => {
                  const fromMe = m.fromUserId === myUserId;
                  return (
                    <div key={m.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${fromMe ? 'bg-rsn-red text-white rounded-br-sm' : 'bg-gray-100 text-[#1a1a2e] rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${fromMe ? 'text-white/70' : 'text-gray-400'}`}>
                          {formatRelative(m.createdAt)}{fromMe && m.readAt ? ' · seen' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Composer */}
            <div className="px-3 py-2 border-t border-gray-200 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim() && !sendMutation.isPending) sendMutation.mutate(draft.trim());
                  }
                }}
                rows={1}
                placeholder="Type a message..."
                className="flex-1 resize-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rsn-red max-h-32"
                maxLength={4000}
              />
              <Button
                size="sm"
                onClick={() => sendMutation.mutate(draft.trim())}
                disabled={!draft.trim() || sendMutation.isPending}
                isLoading={sendMutation.isPending}
                className="!px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
