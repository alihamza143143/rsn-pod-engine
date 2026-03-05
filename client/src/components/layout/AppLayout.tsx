import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Mail, User, LogOut, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';
import ToastContainer from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/pods', icon: Users, label: 'Pods' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/invites', icon: Mail, label: 'Invites' },
  { to: '/profile', icon: User, label: 'Profile' },
];

function SidebarLink({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-600/20 text-brand-400 shadow-sm'
            : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800',
        )
      }
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass border-b border-surface-700/50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-500" />
            <span className="text-lg font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent hidden sm:inline">
              RSN
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <Avatar src={user.avatarUrl} name={user.displayName || user.email} size="sm" />
                <span className="text-sm text-surface-300 hidden sm:inline">{user.displayName}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800 transition-colors" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-surface-400 hover:text-surface-200 rounded-lg hover:bg-surface-800 transition-colors md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-surface-700/50 bg-surface-950/50 p-3 gap-1 sticky top-14 h-[calc(100vh-3.5rem)]">
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-30 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: -256 }}
                animate={{ x: 0 }}
                exit={{ x: -256 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-14 bottom-0 w-64 bg-surface-950 border-r border-surface-700/50 z-40 p-3 md:hidden"
              >
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-brand-600/20 text-brand-400'
                            : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800',
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-700/50 safe-area-bottom">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[3rem]',
                  isActive ? 'text-brand-400' : 'text-surface-500',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <ToastContainer />
    </div>
  );
}
