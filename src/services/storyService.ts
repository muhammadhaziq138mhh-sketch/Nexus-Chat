import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Story, UserProfile } from '../types';

export const createStory = async (
  author: UserProfile, 
  mediaUrl: string, 
  mediaType: 'text' | 'image', 
  caption: string = ''
) => {
  try {
    const storyRef = doc(collection(db, 'stories'));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newStory: Story = {
      id: storyRef.id,
      authorId: author.uid,
      authorName: author.displayName,
      authorPhotoURL: author.photoURL || '',
      mediaUrl,
      mediaType,
      caption: caption.trim(),
      expiresAt,
      createdAt: now.toISOString(),
    };

    await setDoc(storyRef, newStory);
    return newStory;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'stories');
  }
};

export const subscribeToStories = (onUpdate: (stories: Story[]) => void) => {
  try {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const nowIso = new Date().toISOString();
      const validStories: Story[] = [];
      snapshot.forEach((docSnap) => {
        const s = docSnap.data() as Story;
        // Filter active within 24 hours
        if (s.expiresAt > nowIso) {
          validStories.push(s);
        }
      });
      onUpdate(validStories);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'stories');
    });
  } catch {
    return () => {};
  }
};
