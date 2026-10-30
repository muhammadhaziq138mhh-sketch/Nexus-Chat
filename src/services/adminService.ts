import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { ReportItem, UserProfile } from '../types';

export const submitReport = async (
  reporterId: string,
  targetType: 'post' | 'user' | 'message',
  targetId: string,
  reason: string,
  reporterName?: string
) => {
  try {
    const reportRef = doc(collection(db, 'reports'));
    const report: ReportItem = {
      id: reportRef.id,
      reporterId,
      reporterName: reporterName || 'Anonymous',
      targetType,
      targetId,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(reportRef, report);
    return report;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reports');
  }
};

export const subscribeToReports = (onUpdate: (reports: ReportItem[]) => void) => {
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const reports: ReportItem[] = [];
      snapshot.forEach((d) => reports.push(d.data() as ReportItem));
      onUpdate(reports);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reports');
    });
  } catch {
    return () => {};
  }
};

export const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
};

export const getPlatformStats = async () => {
  try {
    const [usersSnap, postsSnap, convsSnap, reportsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), limit(500))),
      getDocs(query(collection(db, 'posts'), limit(500))),
      getDocs(query(collection(db, 'conversations'), limit(500))),
      getDocs(query(collection(db, 'reports'), limit(500))),
    ]);

    let onlineUsers = 0;
    usersSnap.forEach((u) => {
      if ((u.data() as UserProfile).isOnline) onlineUsers++;
    });

    return {
      totalUsers: usersSnap.size,
      onlineUsers,
      totalPosts: postsSnap.size,
      totalConversations: convsSnap.size,
      pendingReports: reportsSnap.docs.filter(d => (d.data() as ReportItem).status === 'pending').length,
    };
  } catch (err) {
    console.error('Failed to get platform stats:', err);
    return {
      totalUsers: 0,
      onlineUsers: 0,
      totalPosts: 0,
      totalConversations: 0,
      pendingReports: 0,
    };
  }
};

export const getAllUsersList = async (): Promise<UserProfile[]> => {
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(100)));
    const list: UserProfile[] = [];
    snap.forEach((d) => list.push(d.data() as UserProfile));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
};

export const toggleUserRole = async (userId: string, newRole: 'user' | 'admin') => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
    // Also update admins collection for zero-trust rules
    const adminRef = doc(db, 'admins', userId);
    if (newRole === 'admin') {
      await setDoc(adminRef, { grantedAt: new Date().toISOString() });
    } else {
      await updateDoc(adminRef, { revoked: true }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
};
