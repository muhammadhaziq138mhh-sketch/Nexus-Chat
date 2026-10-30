import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { getAllUsersList } from '../services/adminService';
import { followUser, checkIsFollowing } from '../services/friendService';
import { MessageSquare, UserPlus, TrendingUp, Check } from 'lucide-react';

interface RightSidebarProps {
  onStartDirectMessage: (targetUser: UserProfile) => void;
  onNavigate: (page: string) => void;
  onTagClick: (tag: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  onStartDirectMessage,
  onNavigate,
  onTagClick,
}) => {
  const { user, profile } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const trendingTags = [
    { tag: 'NexusLaunch', posts: '1.2k' },
    { tag: 'WebDev', posts: '850' },
    { tag: 'RealTimeMessaging', posts: '640' },
    { tag: 'DesignSystems', posts: '520' },
    { tag: 'VoiceNotes', posts: '410' },
  ];

  useEffect(() => {
    if (!user) return;
    const loadSuggestions = async () => {
      try {
        const users = await getAllUsersList();
        // Exclude current user
        const others = users.filter((u) => u.uid !== user.uid).slice(0, 5);
        setSuggestedUsers(others);

        // Check which ones are followed
        const checks = await Promise.all(
          others.map((u) => checkIsFollowing(user.uid, u.uid))
        );
        const followed = new Set<string>();
        others.forEach((u, idx) => {
          if (checks[idx]) followed.add(u.uid);
        });
        setFollowedIds(followed);
      } catch (err) {
        console.error('Error loading suggestions:', err);
      }
    };
    loadSuggestions();
  }, [user]);

  const handleFollow = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      await followUser(user.uid, targetUser.uid);
      setFollowedIds((prev) => new Set(prev).add(targetUser.uid));
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  return (
    <aside className="w-80 shrink-0 hidden xl:flex flex-col gap-6 sticky top-20 h-[calc(100vh-6rem)] py-2 select-none overflow-y-auto pr-1">
      {/* Trending Topics Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-bold text-sm">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Trending on Nexus</span>
        </div>

        <div className="space-y-2.5">
          {trendingTags.map((t) => (
            <div
              key={t.tag}
              onClick={() => onTagClick(t.tag)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
            >
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  #{t.tag}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {t.posts} posts
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-medium group-hover:translate-x-0.5 transition-transform">
                Trending
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested People to Follow */}
      {suggestedUsers.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-900 dark:text-white font-bold text-sm">
              Suggested For You
            </span>
            <button
              onClick={() => onNavigate('friends')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {suggestedUsers.map((person) => {
              const isFollowed = followedIds.has(person.uid);
              return (
                <div key={person.uid} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img
                        src={person.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.uid}`}
                        alt={person.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      {person.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute bottom-0 right-0" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {person.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        @{person.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onStartDirectMessage(person)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Send message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleFollow(person)}
                      disabled={isFollowed}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        isFollowed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95'
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          Follow
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed space-y-1">
        <p>© 2026 Nexus Social Ecosystem. All rights reserved.</p>
        <div className="flex gap-2">
          <span className="hover:underline cursor-pointer" onClick={() => onNavigate('settings')}>Privacy</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer" onClick={() => onNavigate('settings')}>Terms</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer" onClick={() => onNavigate('settings')}>Security</span>
        </div>
      </div>
    </aside>
  );
};
