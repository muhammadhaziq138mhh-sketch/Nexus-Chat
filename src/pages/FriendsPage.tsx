import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FriendRequest, UserProfile } from '../types';
import { 
  subscribeToIncomingFriendRequests, 
  respondToFriendRequest, 
  unfollowUser 
} from '../services/friendService';
import { getAllUsersList } from '../services/adminService';
import { Users, UserCheck, UserX, MessageSquare, Check, X, Search } from 'lucide-react';

interface FriendsPageProps {
  onStartDirectMessage: (user: UserProfile) => void;
  onNavigateToUser: (userId: string) => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({
  onStartDirectMessage,
  onNavigateToUser,
}) => {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'network'>('requests');
  const [networkUsers, setNetworkUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToIncomingFriendRequests(user.uid, (list) => {
      setRequests(list);
    });

    // Load general network
    getAllUsersList().then((users) => {
      setNetworkUsers(users.filter((u) => u.uid !== user.uid));
    });

    return () => unsub();
  }, [user]);

  const handleRespond = async (req: FriendRequest, status: 'accepted' | 'rejected') => {
    await respondToFriendRequest(req.id, status, req.senderId, req.receiverId);
  };

  const filteredNetwork = networkUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    return u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
          <Users className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Network & Connections
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit text-xs font-semibold">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Friend Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'network'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            All Connections ({networkUsers.length})
          </button>
        </div>
      </div>

      {/* Friend Requests List */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-4"
            >
              <div
                onClick={() => onNavigateToUser(req.senderId)}
                className="flex items-center gap-3 cursor-pointer min-w-0"
              >
                <img
                  src={req.senderProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.senderId}`}
                  alt={req.senderProfile?.displayName || 'User'}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {req.senderProfile?.displayName || 'New Connection'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    wants to connect with you
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRespond(req, 'rejected')}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  title="Decline"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleRespond(req, 'accepted')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept
                </button>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No pending friend requests.
            </div>
          )}
        </div>
      )}

      {/* Network Directory */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter network by name or username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredNetwork.map((u) => (
              <div
                key={u.uid}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onNavigateToUser(u.uid)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <div className="relative shrink-0">
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    {u.isOnline && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute bottom-0 right-0" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {u.displayName}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      @{u.username}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onStartDirectMessage(u)}
                  className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white transition-all active:scale-95 shrink-0"
                  title="Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
