import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Post } from '../types';
import { searchUsers, followUser, checkIsFollowing } from '../services/friendService';
import { subscribeToPosts } from '../services/postService';
import { Search, Compass, Users, Hash, MessageSquare, UserPlus, Check, Heart, MessageCircle } from 'lucide-react';

interface ExplorePageProps {
  initialQuery?: string;
  onStartDirectMessage: (user: UserProfile) => void;
  onNavigateToUser: (userId: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialQuery = '',
  onStartDirectMessage,
  onNavigateToUser,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts'>('all');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postsResults, setPostsResults] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      setAllPosts(posts);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, allPosts]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const q = searchQuery.toLowerCase().trim();

      // Search users
      if (q) {
        const users = await searchUsers(q);
        setUserResults(users.filter((u) => u.uid !== user?.uid));

        // Check follow states
        if (user) {
          const checks = await Promise.all(
            users.map((u) => checkIsFollowing(user.uid, u.uid))
          );
          const fSet = new Set<string>();
          users.forEach((u, i) => {
            if (checks[i]) fSet.add(u.uid);
          });
          setFollowedIds(fSet);
        }
      } else {
        setUserResults([]);
      }

      // Filter posts
      if (q) {
        const filtered = allPosts.filter((p) => {
          return (
            p.content.toLowerCase().includes(q) ||
            p.authorName.toLowerCase().includes(q) ||
            (p.tags && p.tags.toLowerCase().includes(q))
          );
        });
        setPostsResults(filtered);
      } else {
        setPostsResults(allPosts.slice(0, 15));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="flex-1 max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Search Header card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Compass className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Explore & Discover
          </h2>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, creators, usernames, or hashtags..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'people', label: 'People' },
            { id: 'posts', label: 'Posts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* People Results */}
      {(activeTab === 'all' || activeTab === 'people') && userResults.length > 0 && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>People ({userResults.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userResults.map((u) => {
              const isFollowed = followedIds.has(u.uid);
              return (
                <div
                  key={u.uid}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => onNavigateToUser(u.uid)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {u.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onStartDirectMessage(u)}
                      className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleFollow(u)}
                      disabled={isFollowed}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        isFollowed
                          ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
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

      {/* Posts Results */}
      {(activeTab === 'all' || activeTab === 'posts') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white px-2">
            <Hash className="w-4 h-4 text-indigo-500" />
            <span>{searchQuery ? `Matching Posts (${postsResults.length})` : 'Popular & Trending Posts'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postsResults.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <img
                      src={post.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorName}`}
                      alt={post.authorName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {post.authorName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        @{post.authorUsername}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 mb-2.5">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 max-h-48 bg-slate-950">
                      <img src={post.mediaUrl} alt="Post media" className="w-full h-40 object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/60 font-semibold">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    {post.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                    {post.commentsCount}
                  </span>
                  {post.tags && (
                    <span className="text-indigo-500 truncate max-w-[120px]">
                      {post.tags}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {postsResults.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No matching posts found. Try another search term!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
