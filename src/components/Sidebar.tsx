import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  MessageSquare, 
  Compass, 
  Flame, 
  Users, 
  Bell, 
  Settings, 
  ShieldCheck, 
  PlusCircle, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenCreatePost: () => void;
  unreadMessagesCount: number;
  unreadNotifsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  onOpenCreatePost,
  unreadMessagesCount,
  unreadNotifsCount,
}) => {
  const { user, profile, isAdmin, logout } = useAuth();

  const navItems = [
    { id: 'feed', label: 'Home Feed', icon: Home },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'explore', label: 'Explore & Search', icon: Compass },
    { id: 'stories', label: 'Stories', icon: Flame },
    { id: 'friends', label: 'Network & Friends', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
    { id: 'settings', label: 'Settings & Privacy', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between sticky top-20 h-[calc(100vh-6rem)] py-2 select-none">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white shadow-sm'
                  }`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Create Post Button */}
        <button
          onClick={onOpenCreatePost}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" />
          Create Post
        </button>
      </div>

      {/* Mini Profile card at bottom */}
      {user && profile && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div 
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-3 cursor-pointer min-w-0"
          >
            <div className="relative">
              <img
                src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt={profile.displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800 absolute bottom-0 right-0" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {profile.displayName}
              </p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                @{profile.username}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
