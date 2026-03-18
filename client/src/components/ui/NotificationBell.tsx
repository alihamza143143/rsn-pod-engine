import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch on mount + when opening
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - 320, window.innerWidth - 328)),
      });
    }
    setOpen(!open);
    if (!open) fetchNotifications();
  };

  const markRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    if (n.link) window.location.href = n.link;
    setOpen(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={handleOpen} className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rsn-red text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-[9999] overflow-hidden" style={dropPos ? { top: dropPos.top, left: dropPos.left } : undefined}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-rsn-red hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No notifications yet</p>
            )}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/40' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <div className="mt-1.5 w-2 h-2 rounded-full bg-rsn-red shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-400 truncate mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
