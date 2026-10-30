import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, Story, UserProfile, Comment } from '../types';
import { 
  createPost, 
  subscribeToPosts, 
  deletePost, 
  toggleReaction, 
  addComment, 
  subscribeToComments 
} from '../services/postService';
import { submitReport } from '../services/adminService';
import { compressImage } from '../utils/mediaUtils';
import { 
  Image, 
  Video, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Trash2, 
  Flag, 
  Plus, 
  Flame, 
  X, 
  Check, 
  Sparkles,
  Smile
} from 'lucide-react';

interface FeedPageProps {
  onOpenStoryViewer: (story: Story) => void;
  onOpenCreateStory: () => void;
  stories: Story[];
  onNavigateToUser: (userId: string) => void;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  onOpenStoryViewer,
  onOpenCreateStory,
  stories,
  onNavigateToUser,
  onStartDirectMessage,
  onOpenAuth,
}) => {
  const { user, profile, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // New post form
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);

  // Active comments accordion
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Menu popover
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToPosts((allPosts) => {
      setPosts(allPosts);
      setLoadingPosts(false);
    });
    return () => unsub();
  }, []);

  // Listen to comments when a post's comments section is opened
  useEffect(() => {
    if (!activeCommentPostId) return;
    const unsub = subscribeToComments(activeCommentPostId, (loadedComments) => {
      setCommentsMap((prev) => ({
        ...prev,
        [activeCommentPostId]: loadedComments,
      }));
    });
    return () => unsub();
  }, [activeCommentPostId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      onOpenAuth();
      return;
    }
    if (!content.trim() && !mediaUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await createPost({
        authorId: user.uid,
        authorName: profile.displayName,
        authorUsername: profile.username,
        authorPhotoURL: profile.photoURL || '',
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl.trim() ? mediaType : 'text',
        tags: tags.trim() || undefined,
      });

      setContent('');
      setMediaUrl('');
      setTags('');
      setShowMediaInput(false);
    } catch (err) {
      console.error('Post creation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const isLiked = likedPosts.has(postId);
    const newSet = new Set(likedPosts);
    if (isLiked) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
    }
    setLikedPosts(newSet);
    await toggleReaction(postId, user.uid);
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !profile) {
      onOpenAuth();
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      await addComment(
        postId,
        user.uid,
        profile.displayName,
        profile.photoURL || '',
        text
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(postId);
      setMenuOpenPostId(null);
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const reason = window.prompt('Please enter the reason for reporting this post:');
    if (reason && reason.trim()) {
      await submitReport(user.uid, 'post', postId, reason, profile?.displayName);
      alert('Report submitted for review by administrators.');
      setMenuOpenPostId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file, 1280, 1280, 0.75);
        setMediaUrl(compressed);
        setMediaType('image');
        setShowMediaInput(true);
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setMediaUrl(reader.result as string);
        setMediaType('video');
        setShowMediaInput(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* 24-Hour Stories Carousel */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* Add story trigger */}
          <div
            onClick={onOpenCreateStory}
            className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
          >
            <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border-2 border-white dark:border-slate-900 overflow-hidden">
                <img
                  src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt="My Story"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Your Story
            </span>
          </div>

          {/* User stories */}
          {stories.map((story) => (
            <div
              key={story.id}
              onClick={() => onOpenStoryViewer(story)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
            >
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-0.5 border-2 border-white dark:border-slate-900 overflow-hidden">
                  <img
                    src={story.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorName}`}
                    alt={story.authorName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 max-w-[68px] truncate text-center">
                {story.authorName.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Post Composer Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-3.5 items-start">
            <img
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'guest'}`}
              alt={profile?.displayName || 'User'}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={user ? `What's happening, ${profile?.displayName}?` : "Sign in to share an update on Nexus..."}
                rows={3}
                className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none resize-none"
              />

              {/* Media Preview if attached */}
              {mediaUrl && (
                <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} controls className="max-h-72 w-full object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="Upload preview" className="max-h-72 w-full object-cover" />
                  )}
                </div>
              )}

              {/* Tag input */}
              {showMediaInput && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Add tags: #WebDev #Technology #Launch"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              {/* Media File Upload Button */}
              <label className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-semibold">
                <Image className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Photo</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">Tags</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !mediaUrl.trim())}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Post</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      {loadingPosts ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-20 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Welcome to Nexus!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The platform is ready. Be the first to publish a post, share a photo, or start a real-time conversation!
          </p>
          <button
            onClick={() => {
              if (!user) onOpenAuth();
              else {
                setContent("🚀 Hello world! Excited to join the Nexus social & real-time messaging network! #NexusLaunch");
              }
            }}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 mx-auto inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {user ? 'Publish Welcome Post' : 'Sign In to Post'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isLiked = likedPosts.has(post.id);
            const isAuthor = user?.uid === post.authorId;
            const comments = commentsMap[post.id] || [];
            const isCommentOpen = activeCommentPostId === post.id;

            return (
              <article
                key={post.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    onClick={() => onNavigateToUser(post.authorId)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={post.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorName}`}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {post.authorName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        @{post.authorUsername} • {formatRelativeTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Options Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpenPostId === post.id && (
                      <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                        {(isAuthor || isAdmin) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Post
                          </button>
                        )}
                        <button
                          onClick={() => handleReportPost(post.id)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          Report Content
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
                  {post.content}
                </p>

                {/* Tags */}
                {post.tags && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.split(' ').map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Media preview */}
                {post.mediaUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mb-3 bg-slate-950">
                    {post.mediaType === 'video' ? (
                      <video src={post.mediaUrl} controls className="w-full max-h-96 object-cover" />
                    ) : (
                      <img src={post.mediaUrl} alt="Post content" className="w-full max-h-96 object-cover" />
                    )}
                  </div>
                )}

                {/* Post Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {/* Like Button */}
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                      isLiked ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likesCount + (isLiked ? 1 : 0)}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      isCommentOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: 'Nexus Post', text: post.content, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Post link copied to clipboard!');
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>

                {/* Comments Accordion */}
                {isCommentOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                    {/* Add Comment input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Comments list */}
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {comments.map((comm) => (
                        <div key={comm.id} className="flex gap-2.5 items-start bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
                          <img
                            src={comm.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comm.authorName}`}
                            alt={comm.authorName}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {comm.authorName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatRelativeTime(comm.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                              {comm.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-2">
                          No comments yet. Start the conversation!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
