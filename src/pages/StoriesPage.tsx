import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Story } from '../types';
import { createStory, subscribeToStories } from '../services/storyService';
import { compressImage } from '../utils/mediaUtils';
import { Plus, X, Flame, Image as ImageIcon, Send, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoriesPageProps {
  onOpenAuth: () => void;
  activeStoryModal?: Story | null;
  onCloseStoryModal?: () => void;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({
  onOpenAuth,
  activeStoryModal,
  onCloseStoryModal,
}) => {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Story Creation state
  const [storyType, setStoryType] = useState<'text' | 'image'>('text');
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [bgGradient, setBgGradient] = useState('from-indigo-600 to-violet-600');
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Full-screen Viewer State
  const [currentViewStory, setCurrentViewStory] = useState<Story | null>(activeStoryModal || null);
  const [progress, setProgress] = useState(0);

  const gradients = [
    'from-indigo-600 to-violet-600',
    'from-rose-500 to-amber-500',
    'from-emerald-500 to-teal-700',
    'from-fuchsia-600 to-pink-500',
    'from-slate-900 to-indigo-950',
  ];

  useEffect(() => {
    const unsub = subscribeToStories((list) => {
      setStories(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeStoryModal) {
      setCurrentViewStory(activeStoryModal);
    }
  }, [activeStoryModal]);

  // Story Auto-Advance Timer (5 seconds)
  useEffect(() => {
    if (!currentViewStory) return;
    setProgress(0);

    const step = 50; // ms
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + (step / 5000) * 100;
      });
    }, step);

    return () => clearInterval(interval);
  }, [currentViewStory]);

  const handleNextStory = () => {
    if (!currentViewStory || stories.length === 0) return;
    const currentIndex = stories.findIndex((s) => s.id === currentViewStory.id);
    if (currentIndex < stories.length - 1) {
      setCurrentViewStory(stories[currentIndex + 1]);
    } else {
      closeViewer();
    }
  };

  const handlePrevStory = () => {
    if (!currentViewStory || stories.length === 0) return;
    const currentIndex = stories.findIndex((s) => s.id === currentViewStory.id);
    if (currentIndex > 0) {
      setCurrentViewStory(stories[currentIndex - 1]);
    }
  };

  const closeViewer = () => {
    setCurrentViewStory(null);
    if (onCloseStoryModal) onCloseStoryModal();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1080, 1920, 0.8);
      setImagePreview(compressed);
      setStoryType('image');
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      onOpenAuth();
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrl = storyType === 'image' ? imagePreview : bgGradient;
      const finalCaption = storyType === 'image' ? caption : textContent;

      await createStory(profile, mediaUrl, storyType, finalCaption);

      setIsCreateOpen(false);
      setCaption('');
      setTextContent('');
      setImagePreview('');
    } catch (err) {
      console.error('Story publish error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Status Stories
            </h2>
            <p className="text-xs text-slate-400">
              Disappears automatically after 24 hours
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setIsCreateOpen(true);
          }}
          className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Story
        </button>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => setCurrentViewStory(story)}
            className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-md border border-slate-200 dark:border-slate-800 transition-transform active:scale-[0.98]"
          >
            {story.mediaType === 'image' ? (
              <img
                src={story.mediaUrl}
                alt={story.caption || 'Story'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-tr ${story.mediaUrl} p-5 flex items-center justify-center text-center`}
              >
                <p className="text-white font-bold text-sm line-clamp-4">
                  {story.caption}
                </p>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={story.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorName}`}
                  alt={story.authorName}
                  className="w-8 h-8 rounded-full border-2 border-indigo-400 object-cover"
                />
                <span className="text-white text-xs font-bold drop-shadow truncate">
                  {story.authorName}
                </span>
              </div>

              {story.mediaType === 'image' && story.caption && (
                <p className="text-white text-xs font-medium line-clamp-2 drop-shadow">
                  {story.caption}
                </p>
              )}
            </div>
          </div>
        ))}

        {stories.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No active stories right now. Tap "Add Story" to be the first!
          </div>
        )}
      </div>

      {/* Create Story Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create 24h Story</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStoryType('text')}
                className={`flex-1 py-1.5 rounded-lg ${storyType === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                Text Story
              </button>
              <button
                type="button"
                onClick={() => setStoryType('image')}
                className={`flex-1 py-1.5 rounded-lg ${storyType === 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                Photo Story
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-4">
              {storyType === 'text' ? (
                <>
                  {/* Text Story Preview Card */}
                  <div
                    className={`h-48 rounded-2xl bg-gradient-to-tr ${bgGradient} p-4 flex items-center justify-center text-center shadow-inner`}
                  >
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type your story thought here..."
                      rows={3}
                      className="w-full bg-transparent text-white font-bold text-center text-base placeholder:text-white/60 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Gradient picker */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Choose Background
                    </label>
                    <div className="flex gap-2">
                      {gradients.map((g) => (
                        <div
                          key={g}
                          onClick={() => setBgGradient(g)}
                          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${g} cursor-pointer transition-transform ${
                            bgGradient === g ? 'scale-110 ring-2 ring-indigo-500' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Photo Story Upload */}
                  {imagePreview ? (
                    <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-950">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImagePreview('')}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-48 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors">
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Upload Photo for Story
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add an optional caption..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </>
              )}

              <button
                type="submit"
                disabled={submitting || (storyType === 'text' ? !textContent.trim() : !imagePreview)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Sharing...' : 'Share to Story'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Instagram-style Story Viewer */}
      {currentViewStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Background Story Content */}
            {currentViewStory.mediaType === 'image' ? (
              <img
                src={currentViewStory.mediaUrl}
                alt={currentViewStory.caption || 'Story'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${currentViewStory.mediaUrl} flex items-center justify-center p-8 text-center`}
              >
                <p className="text-white font-extrabold text-xl leading-relaxed">
                  {currentViewStory.caption}
                </p>
              </div>
            )}

            {/* Top Bar with Progress */}
            <div className="relative z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              {/* Progress Line */}
              <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentViewStory.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentViewStory.authorName}`}
                    alt={currentViewStory.authorName}
                    className="w-8 h-8 rounded-full border border-white object-cover"
                  />
                  <div>
                    <p className="text-white text-xs font-bold">{currentViewStory.authorName}</p>
                    <p className="text-white/60 text-[10px]">Story</p>
                  </div>
                </div>

                <button
                  onClick={closeViewer}
                  className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nav click zones */}
            <div className="absolute inset-0 flex z-0">
              <div onClick={handlePrevStory} className="w-1/3 h-full cursor-pointer" />
              <div onClick={handleNextStory} className="w-2/3 h-full cursor-pointer" />
            </div>

            {/* Bottom Caption if any */}
            {currentViewStory.mediaType === 'image' && currentViewStory.caption && (
              <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
                <p className="text-white text-sm font-semibold drop-shadow">
                  {currentViewStory.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
