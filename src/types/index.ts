export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  providerId?: string;
  photoURL?: string;
  bio?: string;
  role: 'user' | 'admin';
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSettings {
  userId: string;
  whoCanMessage: 'everyone' | 'friends' | 'nobody';
  whoCanSeeOnline: 'everyone' | 'friends' | 'nobody';
  readReceipts: boolean;
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  emailNotifications: boolean;
  updatedAt?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoURL?: string;
  content: string;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  tags?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: 'like' | 'love' | 'fire' | 'laugh';
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderProfile?: UserProfile;
  receiverProfile?: UserProfile;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface Follower {
  id: string;
  followerId: string;
  targetId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participantIds: string; // Comma-separated or JSON list
  name?: string;
  photoURL?: string;
  description?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text?: string;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'file';
  audioDuration?: number;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'read';
  deletedFor?: string[]; // Array of user UIDs who deleted for me
  deletedForEveryone?: boolean;
  replyToMessageId?: string;
  replyToContent?: string;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  mediaUrl: string;
  mediaType: 'text' | 'image';
  caption?: string;
  expiresAt: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  type: 'message' | 'friend_request' | 'friend_accept' | 'like' | 'comment' | 'mention' | 'call' | 'admin';
  entityId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhotoURL?: string;
  receiverId: string;
  receiverName: string;
  receiverPhotoURL?: string;
  type: 'audio' | 'video';
  status: 'calling' | 'ongoing' | 'ended' | 'declined' | 'missed';
  offer?: string;
  answer?: string;
  createdAt: string;
  endedAt?: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: 'post' | 'user' | 'message';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
