import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { 
  Bell, 
  CheckCheck, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Phone, 
  ShieldCheck, 
  MessageSquare 
} from 'lucide-react';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onNavigate: (page: string) => void;
  onOpenConversation?: (convId?: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onNavigate,
  onOpenConversation,
}) => {
  const { user } = useAuth();

  const handleMarkAll = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-indigo-500" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'call':
        return <Phone className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full space-y-4 pb-20 select-none">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Notifications
            </h2>
            <p className="text-xs text-slate-400">
              Activity across your posts, friends, and conversations
            </p>
          </div>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAll}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              markNotificationAsRead(item.id);
              if (item.type === 'message') {
                onNavigate('messages');
              } else if (item.type === 'friend_request' || item.type === 'friend_accept') {
                onNavigate('friends');
              } else {
                onNavigate('feed');
              }
            }}
            className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
              item.isRead
                ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 opacity-80 hover:opacity-100'
                : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={item.senderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.senderName}`}
                  alt={item.senderName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                  {getIcon(item.type)}
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                    {item.senderName}
                  </span>
                  {item.message}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatTime(item.createdAt)}
                </span>
              </div>
            </div>

            {!item.isRead && (
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
            )}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No notifications yet. You're all caught up!
          </div>
        )}
      </div>
    </div>
  );
};
