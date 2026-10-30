import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Conversation, Message } from '../types';

export const getOrCreateDirectConversation = async (
  currentUserId: string, 
  targetUserId: string, 
  targetUserName: string, 
  targetUserPhoto: string
): Promise<string> => {
  try {
    // Generate deterministic id for direct conversation between two users
    const sortedIds = [currentUserId, targetUserId].sort();
    const convId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);

    if (!snap.exists()) {
      const newConv: Conversation = {
        id: convId,
        type: 'direct',
        participantIds: `${currentUserId},${targetUserId}`,
        name: targetUserName,
        photoURL: targetUserPhoto,
        lastMessage: 'Conversation started',
        lastMessageTime: new Date().toISOString(),
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(convRef, newConv);
    }
    return convId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'conversations');
    throw err;
  }
};

export const createGroupConversation = async (
  creatorId: string, 
  creatorName: string,
  name: string, 
  memberIds: string[], 
  description: string = '',
  photoURL: string = ''
): Promise<string> => {
  try {
    const convRef = doc(collection(db, 'conversations'));
    const allMembers = Array.from(new Set([creatorId, ...memberIds])).join(',');

    const newGroup: Conversation = {
      id: convRef.id,
      type: 'group',
      participantIds: allMembers,
      name: name.trim(),
      photoURL: photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${convRef.id}`,
      description: description.trim(),
      lastMessage: `${creatorName} created group "${name}"`,
      lastMessageTime: new Date().toISOString(),
      lastMessageSenderId: creatorId,
      createdBy: creatorId,
      createdAt: new Date().toISOString(),
    };

    await setDoc(convRef, newGroup);
    return convRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'conversations');
    throw err;
  }
};

export const subscribeToConversations = (userId: string, onUpdate: (conversations: Conversation[]) => void) => {
  try {
    // Order by lastMessageTime descending
    const q = query(collection(db, 'conversations'), orderBy('lastMessageTime', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Conversation;
        if (data.participantIds && data.participantIds.includes(userId)) {
          convs.push(data);
        }
      });
      onUpdate(convs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'conversations');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'conversations');
    return () => {};
  }
};

export const subscribeToMessages = (conversationId: string, currentUserId: string, onUpdate: (messages: Message[]) => void) => {
  try {
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data() as Message;
        // Filter out if user deleted for me
        if (!msg.deletedFor || !msg.deletedFor.includes(currentUserId)) {
          msgs.push(msg);
        }
      });
      onUpdate(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
    return () => {};
  }
};

export const sendMessage = async (
  conversationId: string,
  messageData: Omit<Message, 'id' | 'conversationId' | 'status' | 'createdAt'>
) => {
  try {
    const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    const now = new Date().toISOString();

    const newMsg: Message = {
      ...messageData,
      id: msgRef.id,
      conversationId,
      status: 'sent',
      createdAt: now,
    };

    await setDoc(msgRef, newMsg);

    // Update conversation summary
    let snippet = newMsg.text || '';
    if (newMsg.mediaType === 'audio') snippet = '🎤 Voice message';
    else if (newMsg.mediaType === 'image') snippet = '📷 Photo';
    else if (newMsg.mediaType === 'video') snippet = '🎥 Video';
    else if (newMsg.mediaType === 'file') snippet = `📎 ${newMsg.fileName || 'Attachment'}`;

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: snippet,
      lastMessageTime: now,
      lastMessageSenderId: newMsg.senderId,
    });

    return newMsg;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages`);
  }
};

export const markMessageAsRead = async (conversationId: string, messageId: string) => {
  try {
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
      status: 'read',
    });
  } catch {
    // silently catch for read receipts
  }
};

export const deleteMessageForMe = async (conversationId: string, messageId: string, currentUserId: string) => {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data() as Message;
      const currentDeleted = data.deletedFor || [];
      if (!currentDeleted.includes(currentUserId)) {
        await updateDoc(msgRef, {
          deletedFor: [...currentDeleted, currentUserId],
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
};

export const deleteMessageForEveryone = async (conversationId: string, messageId: string) => {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      deletedForEveryone: true,
      text: 'This message was deleted',
      mediaUrl: '',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
};
