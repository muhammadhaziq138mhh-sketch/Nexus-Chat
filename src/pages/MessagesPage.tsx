import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Conversation, Message, UserProfile } from '../types';
import { 
  subscribeToConversations, 
  subscribeToMessages, 
  sendMessage, 
  deleteMessageForMe, 
  deleteMessageForEveryone,
  createGroupConversation,
  getOrCreateDirectConversation,
  markMessageAsRead
} from '../services/messageService';
import { getAllUsersList } from '../services/adminService';
import { AudioPlayer } from '../components/AudioPlayer';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RecordingResult } from '../services/voiceService';
import { compressImage } from '../utils/mediaUtils';
import { 
  Search, 
  Plus, 
  Users, 
  Phone, 
  Video, 
  Send, 
  Paperclip, 
  Mic, 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Trash2, 
  X, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon 
} from 'lucide-react';

interface MessagesPageProps {
  onStartCall: (targetUser: UserProfile, type: 'audio' | 'video') => void;
  onOpenAuth: () => void;
  initialConversationId?: string | null;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  onStartCall,
  onOpenAuth,
  initialConversationId,
}) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [searchConvQuery, setSearchConvQuery] = useState('');

  // Modals
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);

  // Users for new chat
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Message menu popover
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (list) => {
      setConversations(list);
      // Auto-select if requested or keep current
      if (initialConversationId) {
        const found = list.find((c) => c.id === initialConversationId);
        if (found) setSelectedConv(found);
      } else if (!selectedConv && list.length > 0) {
        // default select first on desktop
        if (window.innerWidth >= 768) {
          setSelectedConv(list[0]);
        }
      }
    });
    return () => unsub();
  }, [user, initialConversationId]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv || !user) return;
    const unsub = subscribeToMessages(selectedConv.id, user.uid, (msgs) => {
      setMessages(msgs);
      // Mark latest unread messages as read
      msgs.forEach((m) => {
        if (m.senderId !== user.uid && m.status !== 'read') {
          markMessageAsRead(selectedConv.id, m.id);
        }
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsub();
  }, [selectedConv, user]);

  // Load all users for starting chats
  const loadUsersForNewChat = async () => {
    try {
      const users = await getAllUsersList();
      setAllUsers(users.filter((u) => u.uid !== user?.uid));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleStartDirectChat = async (targetUser: UserProfile) => {
    if (!user || !profile) return;
    try {
      const convId = await getOrCreateDirectConversation(
        user.uid,
        targetUser.uid,
        targetUser.displayName,
        targetUser.photoURL || ''
      );
      setIsNewChatOpen(false);
      // Look up conversation
      const found = conversations.find((c) => c.id === convId);
      if (found) {
        setSelectedConv(found);
      } else {
        setSelectedConv({
          id: convId,
          type: 'direct',
          participantIds: `${user.uid},${targetUser.uid}`,
          name: targetUser.displayName,
          photoURL: targetUser.photoURL,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to create direct chat:', err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !groupName.trim()) return;

    try {
      const convId = await createGroupConversation(
        user.uid,
        profile.displayName,
        groupName.trim(),
        selectedGroupMemberIds,
        groupDesc.trim()
      );
      setIsNewGroupOpen(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedGroupMemberIds([]);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedConv || !inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    await sendMessage(selectedConv.id, {
      senderId: user.uid,
      senderName: profile.displayName,
      senderPhotoURL: profile.photoURL || '',
      text: textToSend,
      mediaType: 'text',
    });
  };

  const handleSendVoiceMessage = async (result: RecordingResult) => {
    if (!user || !profile || !selectedConv) return;
    setIsRecordingVoice(false);

    await sendMessage(selectedConv.id, {
      senderId: user.uid,
      senderName: profile.displayName,
      senderPhotoURL: profile.photoURL || '',
      mediaUrl: result.dataUrl,
      mediaType: 'audio',
      audioDuration: result.duration,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile || !selectedConv) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file, 1280, 1280, 0.75);
        await sendMessage(selectedConv.id, {
          senderId: user.uid,
          senderName: profile.displayName,
          senderPhotoURL: profile.photoURL || '',
          mediaUrl: compressed,
          mediaType: 'image',
          fileName: file.name,
          fileSize: file.size,
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const isVid = file.type.startsWith('video/');

        await sendMessage(selectedConv.id, {
          senderId: user.uid,
          senderName: profile.displayName,
          senderPhotoURL: profile.photoURL || '',
          mediaUrl: dataUrl,
          mediaType: isVid ? 'video' : 'file',
          fileName: file.name,
          fileSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchConvQuery.trim()) return true;
    return c.name?.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
           c.lastMessage?.toLowerCase().includes(searchConvQuery.toLowerCase());
  });

  if (!user) {
    return (
      <div className="flex-1 max-w-md mx-auto w-full p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Phone className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Real-Time Messaging</h2>
        <p className="text-xs text-slate-500">Sign in to exchange private text messages, send voice notes, and start group chats.</p>
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
    <div className="flex-1 max-w-6xl mx-auto w-full h-[calc(100vh-6rem)] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex overflow-hidden select-none">
      {/* Left Conversations Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 shrink-0 ${
        selectedConv ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Messages
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                loadUsersForNewChat();
                setIsNewGroupOpen(true);
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="New Group"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                loadUsersForNewChat();
                setIsNewChatOpen(true);
              }}
              className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
              title="New Message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {filteredConversations.map((conv) => {
            const isSelected = selectedConv?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.name || conv.id}`}
                    alt={conv.name || 'Chat'}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  {conv.type === 'group' ? (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center absolute bottom-0 right-0 border border-white dark:border-slate-900">
                      G
                    </span>
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {conv.name || 'Chat Room'}
                    </h4>
                    {conv.lastMessageTime && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatMessageTime(conv.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found. Click + to start one!
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Pane */}
      <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 ${
        !selectedConv ? 'hidden md:flex items-center justify-center' : 'flex'
      }`}>
        {selectedConv ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedConv(null)}
                  className="p-1.5 rounded-xl md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <img
                  src={selectedConv.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedConv.id}`}
                  alt={selectedConv.name || 'Chat'}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedConv.name || 'Chat Room'}
                  </h3>
                  <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Encrypted Real-Time Session
                  </p>
                </div>
              </div>

              {/* Call Triggers for Direct Chats */}
              {selectedConv.type === 'direct' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const otherUid = selectedConv.participantIds.split(',').find((id) => id !== user?.uid);
                      if (otherUid) {
                        onStartCall({
                          uid: otherUid,
                          displayName: selectedConv.name || 'Contact',
                          photoURL: selectedConv.photoURL,
                          username: '',
                          email: '',
                          role: 'user',
                          followersCount: 0,
                          followingCount: 0,
                          postsCount: 0,
                          createdAt: '',
                        }, 'audio');
                      }
                    }}
                    className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const otherUid = selectedConv.participantIds.split(',').find((id) => id !== user?.uid);
                      if (otherUid) {
                        onStartCall({
                          uid: otherUid,
                          displayName: selectedConv.name || 'Contact',
                          photoURL: selectedConv.photoURL,
                          username: '',
                          email: '',
                          role: 'user',
                          followersCount: 0,
                          followingCount: 0,
                          postsCount: 0,
                          createdAt: '',
                        }, 'video');
                      }
                    }}
                    className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.uid;
                if (msg.deletedForEveryone) {
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="py-1.5 px-3 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 text-xs italic">
                        🚫 This message was deleted
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group relative ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                      {/* Avatar for others in group */}
                      {!isMine && selectedConv.type === 'group' && (
                        <img
                          src={msg.senderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`}
                          alt={msg.senderName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mb-1"
                        />
                      )}

                      <div
                        className={`p-3 rounded-3xl shadow-sm text-sm ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-sm'
                        }`}
                      >
                        {/* Sender name for group */}
                        {!isMine && selectedConv.type === 'group' && (
                          <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-1">
                            {msg.senderName}
                          </p>
                        )}

                        {/* Text Message */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap leading-relaxed break-words">
                            {msg.text}
                          </p>
                        )}

                        {/* Voice Note */}
                        {msg.mediaType === 'audio' && msg.mediaUrl && (
                          <div className="py-1">
                            <AudioPlayer audioUrl={msg.mediaUrl} duration={msg.audioDuration} />
                          </div>
                        )}

                        {/* Image / Video Attachment */}
                        {msg.mediaType === 'image' && msg.mediaUrl && (
                          <div className="rounded-2xl overflow-hidden mt-1 max-w-sm">
                            <img src={msg.mediaUrl} alt="Attachment" className="max-h-60 w-full object-cover" />
                          </div>
                        )}
                        {msg.mediaType === 'video' && msg.mediaUrl && (
                          <div className="rounded-2xl overflow-hidden mt-1 max-w-sm">
                            <video src={msg.mediaUrl} controls className="max-h-60 w-full object-cover" />
                          </div>
                        )}

                        {/* File Attachment */}
                        {msg.mediaType === 'file' && msg.mediaUrl && (
                          <a
                            href={msg.mediaUrl}
                            download={msg.fileName || 'file'}
                            className="flex items-center gap-2 p-2 rounded-xl bg-black/10 dark:bg-white/10 mt-1 hover:underline text-xs"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{msg.fileName || 'Attachment'}</span>
                          </a>
                        )}

                        {/* Message Status & Timestamp */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isMine ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isMine && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Options Button on hover */}
                      <button
                        onClick={() => setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Popover Deletion Menu */}
                    {activeMsgMenuId === msg.id && (
                      <div className="mt-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs space-y-1 z-20">
                        <button
                          onClick={async () => {
                            if (user) {
                              await deleteMessageForMe(selectedConv.id, msg.id, user.uid);
                              setActiveMsgMenuId(null);
                            }
                          }}
                          className="w-full px-2.5 py-1 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                          Delete for me
                        </button>
                        {isMine && (
                          <button
                            onClick={async () => {
                              await deleteMessageForEveryone(selectedConv.id, msg.id);
                              setActiveMsgMenuId(null);
                            }}
                            className="w-full px-2.5 py-1 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                          >
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Composer */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
              {isRecordingVoice ? (
                <VoiceRecorder
                  onSendVoice={handleSendVoiceMessage}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                  {/* File input attachment */}
                  <label className="p-2.5 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* Voice Record Button or Send Button */}
                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          /* Empty Chat State */
          <div className="text-center p-8 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mx-auto">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Your Conversations
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Send real-time encrypted messages, crystal-clear voice notes, and media to friends and groups.
            </p>
          </div>
        )}
      </div>

      {/* New Direct Chat Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Conversation</h3>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search user by name or username..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {allUsers
                .filter((u) => {
                  if (!userSearchQuery.trim()) return true;
                  return u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         u.username.toLowerCase().includes(userSearchQuery.toLowerCase());
                })
                .map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => handleStartDirectChat(u)}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                        alt={u.displayName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                        <p className="text-[10px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">Chat</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {isNewGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Group Chat</h3>
              <button
                onClick={() => setIsNewGroupOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Nexus Developers & Creators"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="What is this group about?"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Members
                </label>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                  {allUsers.map((u) => {
                    const isSelected = selectedGroupMemberIds.includes(u.uid);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGroupMemberIds(selectedGroupMemberIds.filter((id) => id !== u.uid));
                          } else {
                            setSelectedGroupMemberIds([...selectedGroupMemberIds, u.uid]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs ${
                          isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 font-bold text-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{u.displayName} (@{u.username})</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-95"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
