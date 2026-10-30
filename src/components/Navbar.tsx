import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Search, 
  MessageSquare, 
  Bell, 
  Sun, 
  Moon, 
  ShieldCheck, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  LogIn 
} from 'lucide-react';
import { NotificationItem } from '../types';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onOpenAuth: () => void;
  notifications: NotificationItem[];
  unreadMessagesCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSearch: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPage,
  onOpenAuth,
  notifications,
  unreadMessagesCount,
  darkMode,
  onToggleDarkMode,
  onSearch,
}) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      onNavigate('explore');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              Nexus
            </span>
            <span className="text-[10px] block font-semibold text-slate-400 -mt-1 tracking-widest uppercase">
              Social Ecosystem
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <form 
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md relative hidden md:block"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users, posts, or #hashtags..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </form>

        {/* Right Action Icons & User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {user ? (
            <>
              {/* Messages button */}
              <button
                onClick={() => onNavigate('messages')}
                className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-colors ${
                  currentPage === 'messages' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Real-time Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Notifications button */}
              <button
                onClick={() => onNavigate('notifications')}
                className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-colors ${
                  currentPage === 'notifications' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* User Avatar & Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all focus:outline-none"
                >
                  <img
                    src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt={profile?.displayName || 'Avatar'}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {profile?.displayName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        @{profile?.username}
                      </p>
                      {isAdmin && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          Platform Administrator
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { onNavigate('profile'); setMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        My Profile
                      </button>

                      <button
                        onClick={() => { onNavigate('settings'); setMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-400" />
                        Settings & Privacy
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-500" />
                          Admin Console
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                      <button
                        onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
