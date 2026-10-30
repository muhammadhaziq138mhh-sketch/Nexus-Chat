import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Post } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { subscribeToPosts, deletePost, toggleReaction } from '../services/postService';
import { followUser, unfollowUser, checkIsFollowing, sendFriendRequest } from '../services/friendService';
import { 
  User, 
  Calendar, 
  Edit3, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  Grid, 
  Image as ImageIcon, 
  ShieldCheck, 
  Heart, 
  MessageCircle, 
  Trash2,
  X 
} from 'lucide-react';

interface ProfilePageProps {
  viewUserId?: string | null;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  viewUserId,
  onStartDirectMessage,
  onOpenAuth,
}) => {
  const { user, profile: myProfile, updateProfileData } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'about'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [saving, setSaving] = useState(false);

  const targetUid = viewUserId || user?.uid;
  const isMe = user?.uid === targetUid;

  useEffect(() => {
    if (!targetUid) return;

    const loadTargetProfile = async () => {
      if (isMe && myProfile) {
        setProfile(myProfile);
        setEditName(myProfile.displayName);
        setEditBio(myProfile.bio || '');
        setEditPhoto(myProfile.photoURL || '');
      } else {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
        }
      }

      // Check following status
      if (user && !isMe) {
        const followed = await checkIsFollowing(user.uid, targetUid);
        setIsFollowing(followed);
      }
    };

    loadTargetProfile();
  }, [targetUid, isMe, myProfile, user]);

  // Load target user's posts
  useEffect(() => {
    if (!targetUid) return;
    const unsub = subscribeToPosts((allPosts) => {
      setUserPosts(allPosts.filter((p) => p.authorId === targetUid));
    });
    return () => unsub();
  }, [targetUid]);

  const handleToggleFollow = async () => {
    if (!user || !profile) {
      onOpenAuth();
      return;
    }
    if (isFollowing) {
      await unfollowUser(user.uid, profile.uid);
      setIsFollowing(false);
      setProfile((prev) => prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : null);
    } else {
      await followUser(user.uid, profile.uid);
      setIsFollowing(true);
      setProfile((prev) => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
    }
  };

  const handleSendFriendReq = async () => {
    if (!user || !myProfile || !profile) {
      onOpenAuth();
      return;
    }
    await sendFriendRequest(myProfile, profile.uid);
    alert('Friend request sent!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({
        displayName: editName.trim(),
        bio: editBio.trim(),
        photoURL: editPhoto.trim(),
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatJoinDate = (isoString?: string) => {
    if (!isoString) return 'Joined Recently';
    return `Joined ${new Date(isoString).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  };

  if (!profile) {
    if (!user && !viewUserId) {
      return (
        <div className="flex-1 max-w-md mx-auto w-full p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Access</h2>
          <p className="text-xs text-slate-500">Sign in to view your profile, edit your information, and manage your posts.</p>
          <button
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            Sign In to Nexus
          </button>
        </div>
      );
    }
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full p-12 text-center text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Profile Header Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {/* Cover Banner */}
        <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="relative">
              <img
                src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`}
                alt={profile.displayName}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-slate-800"
              />
              {profile.isOnline && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 absolute bottom-1 right-1" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              {isMe ? (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onStartDirectMessage(profile)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
                    title="Send Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSendFriendReq}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                  >
                    Add Friend
                  </button>

                  <button
                    onClick={handleToggleFollow}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                      isFollowing
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Follow
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & Bio */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {profile.displayName}
              </h1>
              {profile.role === 'admin' && (
                <span className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono mt-0.5">
              @{profile.username}
            </p>

            <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 whitespace-pre-wrap leading-relaxed max-w-xl">
              {profile.bio || 'No bio yet.'}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatJoinDate(profile.createdAt)}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{userPosts.length}</span>
                <span className="text-slate-400">Posts</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{profile.followersCount || 0}</span>
                <span className="text-slate-400">Followers</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{profile.followingCount || 0}</span>
                <span className="text-slate-400">Following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-t border-slate-200/80 dark:border-slate-800/80 px-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'posts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Posts ({userPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Photos & Videos
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {userPosts.map((post) => (
            <div
              key={post.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
            >
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap mb-3">
                {post.content}
              </p>
              {post.mediaUrl && (
                <div className="rounded-2xl overflow-hidden mb-3 bg-slate-950">
                  <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 font-semibold">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> {post.likesCount}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-indigo-500" /> {post.commentsCount}</span>
                </div>
                {isMe && (
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {userPosts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No posts shared yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {userPosts.filter((p) => p.mediaUrl).map((post) => (
            <div key={post.id} className="h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
              <img src={post.mediaUrl} alt="Media" className="w-full h-full object-cover" />
            </div>
          ))}
          {userPosts.filter((p) => p.mediaUrl).length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No media uploads yet.
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bio / Status
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Share a short bio..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Avatar Photo URL
                </label>
                <input
                  type="url"
                  value={editPhoto}
                  onChange={(e) => setEditPhoto(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
