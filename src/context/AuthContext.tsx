import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserSettings } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, username: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateSettingsData: (data: Partial<UserSettings>) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'muhammadhaziq138mhh@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndSettings = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let currentProfile: UserProfile;

      if (!userSnap.exists()) {
        const usernameBase = (
          firebaseUser.email?.split('@')[0] ||
          (firebaseUser.phoneNumber ? 'user_' + firebaseUser.phoneNumber.replace(/[^0-9]/g, '').slice(-4) : 'user')
        ).toLowerCase().replace(/[^a-z0-9_]/g, '');

        const isUserAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        currentProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 
            (firebaseUser.phoneNumber ? `User ${firebaseUser.phoneNumber}` : usernameBase),
          username: usernameBase + Math.floor(100 + Math.random() * 900),
          email: firebaseUser.email || (firebaseUser.phoneNumber ? `${firebaseUser.phoneNumber.replace(/[^0-9]/g, '')}@phone.nexus` : ''),
          phoneNumber: firebaseUser.phoneNumber || undefined,
          providerId: firebaseUser.providerData[0]?.providerId || 'password',
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          bio: 'Hey there! I am using Nexus.',
          role: isUserAdmin ? 'admin' : 'user',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        await setDoc(userRef, currentProfile);
      } else {
        currentProfile = userSnap.data() as UserProfile;
        // Keep online status updated
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: new Date().toISOString(),
        }).catch(() => {});
      }

      setProfile(currentProfile);

      // Load Settings
      const settingsRef = doc(db, 'userSettings', firebaseUser.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      } else {
        const initialSettings: UserSettings = {
          userId: firebaseUser.uid,
          whoCanMessage: 'everyone',
          whoCanSeeOnline: 'everyone',
          readReceipts: true,
          theme: 'dark',
          accentColor: '#6366F1',
          emailNotifications: true,
          updatedAt: new Date().toISOString()
        };
        await setDoc(settingsRef, initialSettings);
        setSettings(initialSettings);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfileAndSettings(currentUser);
      } else {
        setProfile(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence sync
  useEffect(() => {
    if (!user) return;

    const setOffline = () => {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        isOnline: false,
        lastSeen: new Date().toISOString(),
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', setOffline);
    return () => {
      window.removeEventListener('beforeunload', setOffline);
    };
  }, [user]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithFacebook = async () => {
    const provider = new FacebookAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const isUserAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      displayName: name,
      username: username.toLowerCase().trim(),
      email,
      providerId: 'password',
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
      bio: 'Hey there! I am using Nexus.',
      role: isUserAdmin ? 'admin' : 'user',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setProfile(newProfile);
  };

  const sendPhoneOtp = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const verifyPhoneOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
    await confirmationResult.confirm(otp);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      } catch {
        // proceed to sign out
      }
    }
    await signOut(auth);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updated = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(userRef, updated);
      setProfile((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateSettingsData = async (data: Partial<UserSettings>) => {
    if (!user || !settings) return;
    try {
      const settingsRef = doc(db, 'userSettings', user.uid);
      const updated = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(settingsRef, updated);
      setSettings((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userSettings/${user.uid}`);
    }
  };

  const deleteUserAccount = async () => {
    if (!user) return;
    const uid = user.uid;
    try {
      // Mark user profile deleted/inactive
      await updateDoc(doc(db, 'users', uid), {
        displayName: 'Deleted Account',
        bio: 'This account has been deleted.',
        isOnline: false,
      }).catch(() => {});
      
      await deleteUser(user);
    } catch (err) {
      console.error('Account deletion error:', err);
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndSettings(user);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        loading,
        isAdmin,
        loginWithGoogle,
        loginWithFacebook,
        loginWithApple,
        loginWithEmail,
        signupWithEmail,
        sendPhoneOtp,
        verifyPhoneOtp,
        sendPasswordReset,
        logout,
        updateProfileData,
        updateSettingsData,
        deleteUserAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
