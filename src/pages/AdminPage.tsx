import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReportItem, UserProfile } from '../types';
import { 
  getPlatformStats, 
  getAllUsersList, 
  subscribeToReports, 
  updateReportStatus, 
  toggleUserRole 
} from '../services/adminService';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Check, 
  X, 
  ShieldAlert, 
  UserPlus, 
  UserMinus 
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalPosts: 0,
    totalConversations: 0,
    pendingReports: 0,
  });
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'moderation' | 'users'>('moderation');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    // Load actual real statistics from Firestore
    getPlatformStats().then(setStats);
    getAllUsersList().then((u) => {
      setUsersList(u);
      setLoading(false);
    });

    const unsub = subscribeToReports((reps) => {
      setReports(reps);
    });

    return () => unsub();
  }, [isAdmin]);

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    await updateReportStatus(reportId, status);
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Are you sure you want to change @${targetUser.username}'s role to ${newRole.toUpperCase()}?`)) {
      await toggleUserRole(targetUser.uid, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full p-12 text-center select-none space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          You do not have administrative privileges to access the Nexus Admin Dashboard. Access is restricted to authorized platform architects.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
              Nexus Console
            </span>
          </div>
          <h1 className="text-2xl font-black">
            Platform Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, moderation queue, and role authorization
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white/10 px-3.5 py-2 rounded-2xl w-fit backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Logged in as Admin ({profile?.displayName})</span>
        </div>
      </div>

      {/* Real Platform Analytics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
          <p className="text-[10px] text-emerald-500 font-bold">{stats.onlineUsers} currently online</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Feed Posts</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalPosts}</p>
          <p className="text-[10px] text-slate-400">Total published</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Conversations</span>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalConversations}</p>
          <p className="text-[10px] text-slate-400">Direct & groups</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Reports</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.pendingReports}</p>
          <p className="text-[10px] text-rose-500 font-bold">Requires review</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'moderation'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Content Moderation Queue ({reports.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          User Role & Access Directory ({usersList.length})
        </button>
      </div>

      {/* Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {rep.targetType}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rep.status === 'pending'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                  }`}>
                    {rep.status.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Reported by {rep.reporterName || 'User'}
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                  Reason: <span className="font-semibold text-rose-600 dark:text-rose-400">{rep.reason}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Target ID: {rep.targetId}
                </p>
              </div>

              {rep.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResolveReport(rep.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleResolveReport(rep.id, 'resolved')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                  >
                    Resolve & Take Action
                  </button>
                </div>
              )}
            </div>
          ))}

          {reports.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Moderation queue is clean. No reported violations found.
            </div>
          )}
        </div>
      )}

      {/* Users Role Management Table */}
      {activeTab === 'users' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Posts</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200 font-medium">
                {usersList.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 border border-purple-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">{u.postsCount || 0}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          u.role === 'admin'
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40'
                        }`}
                      >
                        {u.role === 'admin' ? 'Demote to User' : 'Grant Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
