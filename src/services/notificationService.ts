import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { NotificationItem } from '../types';

export const sendNotification = async (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    const item: NotificationItem = {
      ...notif,
      id: notifRef.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(notifRef, item);
    return item;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'notifications');
  }
};

export const subscribeToNotifications = (userId: string, onUpdate: (items: NotificationItem[]) => void) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const items: NotificationItem[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as NotificationItem));
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(items.slice(0, 50));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });
  } catch {
    return () => {};
  }
};

export const markNotificationAsRead = async (notifId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notifId), {
      isRead: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'notifications');
  }
};
