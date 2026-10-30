import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  limit,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FriendRequest, Follower, UserProfile } from '../types';

export const sendFriendRequest = async (sender: UserProfile, receiverId: string) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', sender.uid),
      where('receiverId', '==', receiverId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    const reqRef = doc(collection(db, 'friendRequests'));
    const newReq: FriendRequest = {
      id: reqRef.id,
      senderId: sender.uid,
      receiverId,
      senderProfile: sender,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(reqRef, newReq);
    return newReq;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'friendRequests');
  }
};

export const respondToFriendRequest = async (
  requestId: string, 
  status: 'accepted' | 'rejected',
  senderId: string,
  receiverId: string
) => {
  try {
    const reqRef = doc(db, 'friendRequests', requestId);
    if (status === 'accepted') {
      await updateDoc(reqRef, {
        status: 'accepted',
        updatedAt: new Date().toISOString(),
      });
      // Automatically follow each other
      await followUser(senderId, receiverId);
      await followUser(receiverId, senderId);
    } else {
      await deleteDoc(reqRef);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `friendRequests/${requestId}`);
  }
};

export const subscribeToIncomingFriendRequests = (userId: string, onUpdate: (reqs: FriendRequest[]) => void) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const reqs: FriendRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FriendRequest;
        if (data.status === 'pending') {
          reqs.push(data);
        }
      });
      onUpdate(reqs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'friendRequests');
    });
  } catch {
    return () => {};
  }
};

export const followUser = async (followerId: string, targetId: string) => {
  try {
    const followId = `${followerId}_${targetId}`;
    const followRef = doc(db, 'followers', followId);
    const newFollow: Follower = {
      id: followId,
      followerId,
      targetId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(followRef, newFollow);

    // Update counts
    await updateDoc(doc(db, 'users', followerId), {
      followingCount: increment(1),
    }).catch(() => {});

    await updateDoc(doc(db, 'users', targetId), {
      followersCount: increment(1),
    }).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'followers');
  }
};

export const unfollowUser = async (followerId: string, targetId: string) => {
  try {
    const followId = `${followerId}_${targetId}`;
    await deleteDoc(doc(db, 'followers', followId));

    await updateDoc(doc(db, 'users', followerId), {
      followingCount: increment(-1),
    }).catch(() => {});

    await updateDoc(doc(db, 'users', targetId), {
      followersCount: increment(-1),
    }).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `followers/${followerId}_${targetId}`);
  }
};

export const checkIsFollowing = async (followerId: string, targetId: string): Promise<boolean> => {
  try {
    const snap = await getDocs(query(
      collection(db, 'followers'),
      where('followerId', '==', followerId),
      where('targetId', '==', targetId),
      limit(1)
    ));
    return !snap.empty;
  } catch {
    return false;
  }
};

export const searchUsers = async (searchQuery: string): Promise<UserProfile[]> => {
  if (!searchQuery.trim()) return [];
  const normalized = searchQuery.toLowerCase().trim();
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(25)));
    const results: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (
        u.displayName?.toLowerCase().includes(normalized) ||
        u.username?.toLowerCase().includes(normalized) ||
        u.email?.toLowerCase().includes(normalized)
      ) {
        results.push(u);
      }
    });
    return results;
  } catch {
    return [];
  }
};
