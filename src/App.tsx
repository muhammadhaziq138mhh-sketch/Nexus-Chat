import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { CallModal } from './components/CallModal';

import { FeedPage } from './pages/FeedPage';
import { MessagesPage } from './pages/MessagesPage';
import { ExplorePage } from './pages/ExplorePage';
import { StoriesPage } from './pages/StoriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

import { NotificationItem, Story, UserProfile, CallSession } from './types';
import { subscribeToNotifications } from './services/notificationService';
import { subscribeToConversations } from './services/messageService';
import { subscribeToStories } from './services/storyService';
import { WebRTCService, subscribeToIncomingCalls } from './services/webrtcService';

const MainAppContent: React.FC = () => {
  const { user, profile } = useAuth();

  // Navigation
  const [currentPage, setCurrentPage] = useState<string>('feed');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [activeChatTarget, setActiveChatTarget] = useState<string | null>(null);

  // App Theme & Accent
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('nexus_dark_mode') !== 'false';
  });
  const [accentColor, setAccentColor] = useState<string>('#6366F1');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeStoryToView, setActiveStoryToView] = useState<Story | null>(null);

  // Real-time feeds & indicators
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [stories, setStories] = useState<Story[]>([]);

  // Calling & WebRTC
  const webrtcServiceRef = useRef<WebRTCService>(new WebRTCService());
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nexus_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nexus_dark_mode', 'false');
    }
  }, [darkMode]);

  // Subscribe to real-time stories
  useEffect(() => {
    const unsub = subscribeToStories((list) => {
      setStories(list);
    });
    return () => unsub();
  }, []);

  // Listen to user notifications & unread counts
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadMessagesCount(0);
      return;
    }

    const unsubNotifs = subscribeToNotifications(user.uid, (items) => {
      setNotifications(items);
    });

    const unsubConvs = subscribeToConversations(user.uid, (convs) => {
      // Calculate active chats where user is participant
      setUnreadMessagesCount(convs.length > 0 ? 1 : 0);
    });

    // Listen for real-time incoming WebRTC calls
    const unsubCalls = subscribeToIncomingCalls(user.uid, (call) => {
      if (call) {
        setActiveCallSession(call);
        setIsIncomingCall(true);
      }
    });

    return () => {
      unsubNotifs();
      unsubConvs();
      unsubCalls();
    };
  }, [user]);

  const handleStartCall = async (targetUser: UserProfile, type: 'audio' | 'video') => {
    if (!user || !profile) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const callId = await webrtcServiceRef.current.startCall(
        { uid: user.uid, displayName: profile.displayName, photoURL: profile.photoURL },
        { uid: targetUser.uid, displayName: targetUser.displayName, photoURL: targetUser.photoURL },
        type,
        () => {}
      );

      setActiveCallSession({
        id: callId,
        callerId: user.uid,
        callerName: profile.displayName,
        callerPhotoURL: profile.photoURL,
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        receiverPhotoURL: targetUser.photoURL,
        type,
        status: 'calling',
        createdAt: new Date().toISOString(),
      });
      setIsIncomingCall(false);
    } catch (err) {
      console.error('Call initiation failed:', err);
      alert('Could not start call. Please verify camera & microphone permissions.');
    }
  };

  const handleStartDirectMessage = (targetUser: UserProfile) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveChatTarget(targetUser.uid);
    setCurrentPage('messages');
  };

  const handleNavigateToUser = (targetUserId: string) => {
    setViewingProfileId(targetUserId);
    setCurrentPage('profile');
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'feed':
        return (
          <FeedPage
            stories={stories}
            onOpenStoryViewer={(s) => setActiveStoryToView(s)}
            onOpenCreateStory={() => setCurrentPage('stories')}
            onNavigateToUser={handleNavigateToUser}
            onStartDirectMessage={handleStartDirectMessage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            onStartCall={handleStartCall}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            initialConversationId={activeChatTarget}
          />
        );
      case 'explore':
        return (
          <ExplorePage
            initialQuery={searchFilter}
            onStartDirectMessage={handleStartDirectMessage}
            onNavigateToUser={handleNavigateToUser}
          />
        );
      case 'stories':
        return (
          <StoriesPage
            onOpenAuth={() => setIsAuthModalOpen(true)}
            activeStoryModal={activeStoryToView}
            onCloseStoryModal={() => setActiveStoryToView(null)}
          />
        );
      case 'friends':
        return (
          <FriendsPage
            onStartDirectMessage={handleStartDirectMessage}
            onNavigateToUser={handleNavigateToUser}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            viewUserId={viewingProfileId}
            onStartDirectMessage={handleStartDirectMessage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            notifications={notifications}
            onNavigate={(p) => setCurrentPage(p)}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            accentColor={accentColor}
            onChangeAccentColor={setAccentColor}
          />
        );
      case 'admin':
        return <AdminPage />;
      default:
        return (
          <FeedPage
            stories={stories}
            onOpenStoryViewer={(s) => setActiveStoryToView(s)}
            onOpenCreateStory={() => setCurrentPage('stories')}
            onNavigateToUser={handleNavigateToUser}
            onStartDirectMessage={handleStartDirectMessage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(p) => {
          if (p === 'profile') setViewingProfileId(null);
          setCurrentPage(p);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        notifications={notifications}
        unreadMessagesCount={unreadMessagesCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSearch={(q) => {
          setSearchFilter(q);
          setCurrentPage('explore');
        }}
      />

      {/* Main 3-Column Content Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex gap-6 justify-center">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={(p) => {
            if (p === 'profile') setViewingProfileId(null);
            setCurrentPage(p);
          }}
          onOpenCreatePost={() => {
            if (!user) setIsAuthModalOpen(true);
            else setCurrentPage('feed');
          }}
          unreadMessagesCount={unreadMessagesCount}
          unreadNotifsCount={notifications.filter((n) => !n.isRead).length}
        />

        {/* Center Main Viewport Area */}
        <main className="flex-1 max-w-2xl lg:max-w-3xl min-w-0">
          {renderActivePage()}
        </main>

        {/* Right Info & Recommendations Sidebar (Visible on desktop) */}
        {currentPage !== 'messages' && (
          <RightSidebar
            onStartDirectMessage={handleStartDirectMessage}
            onNavigate={(p) => setCurrentPage(p)}
            onTagClick={(tag) => {
              setSearchFilter(tag);
              setCurrentPage('explore');
            }}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentPage={currentPage}
        onNavigate={(p) => {
          if (p === 'profile') setViewingProfileId(null);
          setCurrentPage(p);
        }}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Active WebRTC Calling Modal */}
      {activeCallSession && (
        <CallModal
          callSession={activeCallSession}
          isIncoming={isIncomingCall}
          onClose={() => {
            setActiveCallSession(null);
            setIsIncomingCall(false);
          }}
          webrtcService={webrtcServiceRef.current}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
