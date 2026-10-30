import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  increment,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Post, Comment, Reaction } from '../types';

export const createPost = async (postData: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'createdAt'>) => {
  try {
    const postRef = doc(collection(db, 'posts'));
    const newPost: Post = {
      ...postData,
      id: postRef.id,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(postRef, newPost);
    return newPost;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'posts');
  }
};

export const subscribeToPosts = (onUpdate: (posts: Post[]) => void) => {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const posts: Post[] = [];
      snapshot.forEach((doc) => {
        posts.push(doc.data() as Post);
      });
      onUpdate(posts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'posts');
    return () => {};
  }
};

export const deletePost = async (postId: string) => {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
  }
};

export const toggleReaction = async (postId: string, userId: string, type: 'like' | 'love' | 'fire' | 'laugh' = 'like') => {
  try {
    const reactionRef = doc(db, 'posts', postId, 'reactions', userId);
    const postRef = doc(db, 'posts', postId);
    
    // Check if already reacted
    const reactions = await getDocs(query(collection(db, 'posts', postId, 'reactions'), where('userId', '==', userId)));
    if (!reactions.empty) {
      // Remove reaction
      await deleteDoc(reactionRef);
      await updateDoc(postRef, {
        likesCount: increment(-1),
      });
      return false; // unliked
    } else {
      const newReaction: Reaction = {
        id: userId,
        postId,
        userId,
        type,
        createdAt: new Date().toISOString(),
      };
      await setDoc(reactionRef, newReaction);
      await updateDoc(postRef, {
        likesCount: increment(1),
      });
      return true; // liked
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `posts/${postId}/reactions`);
    return false;
  }
};

export const addComment = async (postId: string, authorId: string, authorName: string, authorPhotoURL: string, content: string) => {
  try {
    const commentRef = doc(collection(db, 'posts', postId, 'comments'));
    const comment: Comment = {
      id: commentRef.id,
      postId,
      authorId,
      authorName,
      authorPhotoURL,
      content,
      createdAt: new Date().toISOString(),
    };
    await setDoc(commentRef, comment);
    await updateDoc(doc(db, 'posts', postId), {
      commentsCount: increment(1),
    });
    return comment;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/comments`);
  }
};

export const subscribeToComments = (postId: string, onUpdate: (comments: Comment[]) => void) => {
  try {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const comments: Comment[] = [];
      snapshot.forEach((doc) => {
        comments.push(doc.data() as Comment);
      });
      onUpdate(comments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `posts/${postId}/comments`);
    return () => {};
  }
};

export const subscribeToUserReactions = (postId: string, onUpdate: (reactions: Reaction[]) => void) => {
  try {
    return onSnapshot(collection(db, 'posts', postId, 'reactions'), (snapshot) => {
      const reactions: Reaction[] = [];
      snapshot.forEach((doc) => {
        reactions.push(doc.data() as Reaction);
      });
      onUpdate(reactions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/reactions`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `posts/${postId}/reactions`);
    return () => {};
  }
};
