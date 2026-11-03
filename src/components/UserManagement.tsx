import React, { useState } from 'react';
import { useGoldShop, getCanonicalProfileKey, loadStorage, getExpectedProfilePin } from '../context/GoldShopContext';
import { UserRole } from '../types/gold';
import { SUPABASE_SQL_SCHEMA, SUPABASE_RLS_FIX_SQL } from '../lib/supabaseSchema';
import {
  Users,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Copy,
  Check,
  UserPlus,
  LogIn,
  LogOut,
  AlertCircle,
  FileCode2,
  ChevronRight,
  ShieldAlert,
  Wrench,
  ExternalLink,
  Mail,
  Send,
  Info,
  Sparkles,
  Trash2,
  Edit,
  Phone,
  X,
  Download,
  Terminal,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuditLogsModal } from './AuditLogsModal';
import { ConnectSupabaseModal } from './ConnectSupabaseModal';
import {
  downloadSystemLogs,
  copySystemLogsToClipboard,
  getSystemLogs,
} from '../services/loggerService';
import { NavTab } from './Navbar';

interface UserManagementProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    switchUserRole,
    isSupabaseConnected,
    supabaseUser,
    userProfiles,
    addStaffMember,
    deleteStaffMember,
    purgeStaffAccounts,
    updateStaffProfile,
    loginWithSupabase,
    registerWithSupabase,
    resendConfirmationEmail,
    logoutSupabase,
    updateStaffRole,
    syncAllToSupabase,
    refreshSupabaseData,
    loginWithPin,
  } = useGoldShop();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Staff');
  const [signUpPin, setSignUpPin] = useState('3333');
  const [showSignUpPin, setShowSignUpPin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [lastFailedEmail, setLastFailedEmail] = useState<string>('');

  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success: boolean; msg: string } | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlModalTab, setSqlModalTab] = useState<'rls' | 'full'>('rls');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Direct Staff Addition / Editing State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Staff');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('3333');
  const [showNewStaffPin, setShowNewStaffPin] = useState(true);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [addStaffLoading, setAddStaffLoading] = useState(false);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);
  const [addStaffSuccess, setAddStaffSuccess] = useState<string | null>(null);

  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<any | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editStaffLoading, setEditStaffLoading] = useState(false);
  const [editStaffError, setEditStaffError] = useState<string | null>(null);
  const [editStaffSuccess, setEditStaffSuccess] = useState<string | null>(null);
  const [showEditPin, setShowEditPin] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [copiedAuditLogs, setCopiedAuditLogs] = useState(false);

  const handleStartEditStaff = (user: any) => {
    const currentPin = getExpectedProfilePin(user);

    setEditingStaff({
      ...user,
      pin: currentPin,
    });
    setEditStaffLoading(false);
    setEditStaffError(null);
    setEditStaffSuccess(null);
    setShowEditPin(false);
  };

  const handleOpenAddStaffModal = () => {
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole('Staff');
    setNewStaffPhone('');
    setNewStaffPin('3333');
    setNewStaffPassword('');
    setShowNewStaffPin(true);
    setAddStaffError(null);
    setAddStaffSuccess(null);
    setShowAddStaffModal(true);
  };

  const handleRoleChange = async (user: any, newRole: UserRole) => {
    try {
      await updateStaffRole(user.id, newRole);
      const pinMsg = newRole === 'Manager' ? ' (Default PIN: 2222)' : newRole === 'Admin' ? ' (Default PIN: 1111)' : ' (Default PIN: 3333)';
      setRoleChangeNotice(`ဝန်ထမ်း "${user.full_name}" ၏ ရာထူးကို "${newRole}" သို့ အောင်မြင်စွာ ပြောင်းလဲသတ်မှတ်ပြီးပါပြီ${pinMsg}`);
      setTimeout(() => setRoleChangeNotice(null), 5000);
    } catch (err) {
      console.error('Role change error:', err);
    }
  };

  const handleCopyAuditLogs = async () => {
    const ok = await copySystemLogsToClipboard();
    if (ok) {
      setCopiedAuditLogs(true);
      setTimeout(() => setCopiedAuditLogs(false), 2500);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      setAddStaffError('ဝန်ထမ်းအမည် ဖြည့်သွင်းပေးပါ');
      return;
    }
    if (!newStaffEmail.trim()) {
      setAddStaffError('အီးမေးလ် ဖြည့်သွင်းပေးပါ');
      return;
    }
    const cleanPin = newStaffPin.trim();
    if (cleanPin && cleanPin.length > 0 && cleanPin.length < 4) {
      setAddStaffError('PIN နံပါတ်သည် အနည်းဆုံး ၄ လုံး (ဂဏန်း ၄ လုံးမှ ၆ လုံး) ဖြစ်ရပါမည်');
      return;
    }
    setAddStaffLoading(true);
    setAddStaffError(null);
    setAddStaffSuccess(null);

    const defaultRolePin = newStaffRole === 'Admin' ? '1111' : newStaffRole === 'Manager' ? '2222' : '3333';
    const effectivePin = cleanPin || defaultRolePin;

    const res = await addStaffMember({
      full_name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      phone: newStaffPhone.trim() || undefined,
      pin: effectivePin,
      password: newStaffPassword.trim() || undefined,
    });

    if (res.success) {
      setAddStaffSuccess(`ဝန်ထမ်း "${newStaffName}" ကို စာရင်းသို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ! (သတ်မှတ် PIN: ${effectivePin})`);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPin('3333');
      setNewStaffPassword('');
      setNewStaffRole('Staff');
      setTimeout(() => {
        setShowAddStaffModal(false);
        setAddStaffSuccess(null);
      }, 1500);
    } else {
      setAddStaffError(res.error || 'ဝန်ထမ်းထည့်သွင်းခြင်း မအောင်မြင်ပါ');
    }
    setAddStaffLoading(false);
  };

  const handleRefreshStaff = async () => {
    setRefreshLoading(true);
    setRefreshNotice(null);
    try {
      await refreshSupabaseData();
      setRefreshNotice(`စနစ်ရှိ ဝန်ထမ်းစာရင်း (${userProfiles.length} ဦး) ကို အောင်မြင်စွာ ပြန်လည်ဆွဲယူစစ်ဆေးပြီးပါပြီ`);
    } catch (e: any) {
      setRefreshNotice('အချက်အလက် ပြန်လည်ဆွဲယူရာတွင် အခက်အခဲရှိပါသည်');
    } finally {
      setRefreshLoading(false);
      setTimeout(() => setRefreshNotice(null), 4000);
    }
  };

  const handleRequestDeleteStaff = (user: any) => {
    setStaffToDelete(user);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    const target = staffToDelete;
    setDeletingId(target.id);
    try {
      await deleteStaffMember(target.id, target.email);
      setDeleteNotice(`ဝန်ထမ်း "${target.full_name}" ကို စာရင်းမှ အောင်မြင်စွာ ဖျက်ပစ်ပြီးပါပြီ`);
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error('Delete staff error:', err);
    } finally {
      setDeletingId(null);
      setStaffToDelete(null);
    }
  };

  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  const testStaffList = React.useMemo(() => {
    return userProfiles.filter((p) => {
      const n = (p.full_name || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const e = (p.email || '').toLowerCase();
      if (id === 'admin_1' || id === 'usr_admin' || e === 'admin@goldshop.com') return false;
      if (id === 'manager_1' || id === 'usr_manager' || (e === 'manager@goldshop.com' && !n.includes('asst'))) return false;
      if (id === 'staff_phoo' || id === 'usr_phoo' || e.includes('phoo') || n.includes('phoo')) return false;
      if (id === 'staff_1' || id === 'usr_staff' || (n.includes('နွယ်နွယ်') && !e.includes('phoo'))) return false;
      return true;
    });
  }, [userProfiles]);

  const handlePurgeAllTestAccounts = async () => {
    if (testStaffList.length === 0) return;
    setPurgeLoading(true);
    try {
      await purgeStaffAccounts(testStaffList);
      setPurgeNotice(`စမ်းသပ်အကောင့်ဟောင်း (${testStaffList.length}) ခုကို Cloud Database နှင့် စနစ်မှ အပြီးတိုင် ဖျက်ပစ်ပြီးပါပြီ`);
      setTimeout(() => setPurgeNotice(null), 5000);
    } catch (e: any) {
      console.error('Purge error:', e);
    } finally {
      setPurgeLoading(false);
    }
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editingStaff.full_name || !editingStaff.full_name.trim()) {
      setEditStaffError('ဝန်ထမ်းအမည် ဖြည့်သွင်းပေးပါ');
      return;
    }

    const cleanPin = editingStaff.pin ? String(editingStaff.pin).trim() : '';
    if (cleanPin && cleanPin.length > 0 && cleanPin.length < 4) {
      setEditStaffError('PIN နံပါတ်သည် အနည်းဆုံး ၄ လုံး (ဂဏန်း ၄ လုံးမှ ၆ လုံး) ရှိရပါမည်');
      return;
    }

    setEditStaffLoading(true);
    setEditStaffError(null);
    setEditStaffSuccess(null);

    const targetStaff = {
      ...editingStaff,
      full_name: editingStaff.full_name.trim(),
      email: editingStaff.email ? editingStaff.email.trim() : '',
      phone: editingStaff.phone ? editingStaff.phone.trim() : '',
      pin: cleanPin,
    };

    try {
      await updateStaffProfile(targetStaff);
      const pinMsg = cleanPin ? ` (PIN: ${cleanPin})` : '';
      setEditingStaff(targetStaff);
      setEditStaffLoading(false);
      setEditStaffSuccess(`ဝန်ထမ်း "${targetStaff.full_name}" ၏ အချက်အလက်နှင့် PIN နံပါတ်${pinMsg} ကို အောင်မြင်စွာ ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ!`);
      setRoleChangeNotice(`ဝန်ထမ်း "${targetStaff.full_name}" ၏ အချက်အလက်နှင့် PIN နံပါတ်${pinMsg} ကို အောင်မြင်စွာ ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ`);
      setTimeout(() => setRoleChangeNotice(null), 5000);
      // Dialog remains open so user can verify the new PIN and close at their own leisure
    } catch (err: any) {
      console.error('Save staff edit error:', err);
      setEditStaffError(err?.message || 'အချက်အလက် ပြင်ဆင်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်');
      setEditStaffLoading(false);
    }
  };

  const handleResendConfirmation = async (targetEmail: string) => {
    const toEmail = targetEmail || email || lastFailedEmail;
    if (!toEmail) return;
    setResendLoading(true);
    setResendStatus(null);
    const res = await resendConfirmationEmail(toEmail.trim());
    if (res.success) {
      setResendStatus({
        success: true,
        msg: `အတည်ပြုအီးမေးလ်ကို ${toEmail} သို့ ပြန်လည်ပေးပို့ပြီးပါပြီ။ Gmail Inbox (သို့မဟုတ် Spam folder) ကို စစ်ဆေးပေးပါ။`,
      });
    } else {
      setResendStatus({
        success: false,
        msg: res.error || 'အီးမေးလ် ပြန်လည်ပေးပို့ခြင်း မအောင်မြင်ပါ',
      });
    }
    setResendLoading(false);
  };

  const getReadableAuthError = (err: string) => {
    const lower = err.toLowerCase();
    if (lower.includes('database error saving new user') || lower.includes('database error')) {
      return 'Supabase Database တွင် Manager Role သတ်မှတ်ချက် သို့မဟုတ် SQL Trigger အမှားဖြစ်ပေါ်နေပါသည် (Database Error)';
    }
    if (lower.includes('email not confirmed')) {
      return 'အီးမေးလ် အတည်ပြုရန် လိုအပ်နေပါသည် (Email not confirmed)';
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'အီးမေးလ် သို့မဟုတ် လျှို့ဝှက်နံပါတ် မှားယွင်းနေပါသည် (Invalid credentials)';
    }
    if (lower.includes('user already registered')) {
      return 'ဤအီးမေးလ်ဖြင့် အကောင့်ဖွင့်ပြီးသား ဖြစ်ပါသည် (User already registered)';
    }
    if (lower.includes('password should be at least')) {
      return 'လျှို့ဝှက်နံပါတ်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်';
    }
    return err;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    setResendStatus(null);

    if (authMode === 'signin') {
      const res = await loginWithSupabase(email, password);
      if (res.success) {
        setAuthSuccess('အောင်မြင်စွာ အကောင့်ဝင်ရောက်ပြီးပါပြီ!');
        setLastFailedEmail('');
        setEmail('');
        setPassword('');
      } else {
        const errorMsg = res.error || 'အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ';
        setAuthError(errorMsg);
        setLastFailedEmail(email);
      }
    } else {
      if (!fullName.trim()) {
        setAuthError('အမည် အပြည့်အစုံ ဖြည့်သွင်းပေးပါ');
        setAuthLoading(false);
        return;
      }
      const cleanPin = signUpPin.trim();
      if (cleanPin && cleanPin.length > 0 && cleanPin.length < 4) {
        setAuthError('PIN နံပါတ်သည် အနည်းဆုံး ၄ လုံး (ဂဏန်း ၄ လုံးမှ ၆ လုံး) ဖြစ်ရပါမည်');
        setAuthLoading(false);
        return;
      }
      const res = await registerWithSupabase(email, password, fullName, selectedRole, cleanPin || undefined);
      if (res.success) {
        const assignedPin = cleanPin || (selectedRole === 'Admin' ? '1111' : selectedRole === 'Manager' ? '2222' : '3333');
        if (res.warning) {
          setAuthSuccess(res.warning);
          setEmail('');
          setPassword('');
          setFullName('');
          setSignUpPin('3333');
          setLastFailedEmail('');
        } else if (res.needsConfirmation) {
          setAuthSuccess(
            `အကောင့်သစ် ဖန်တီးပြီးပါပြီ! (PIN: ${assignedPin}) သင်၏ အီးမေးလ် (${email}) သို့ အတည်ပြုလင့်ခ် (Confirmation link) ပေးပို့ထားပါသည်။ အီးမေးလ် Inbox (သို့မဟုတ် Spam folder) တွင် လင့်ခ်ကို နှိပ်ပြီးမှ ဝင်ရောက်နိုင်ပါမည်။`
          );
          setLastFailedEmail(email);
        } else {
          setAuthSuccess(`ဝန်ထမ်းအကောင့်သစ် အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ! (PIN: ${assignedPin})`);
          setEmail('');
          setPassword('');
          setFullName('');
          setSignUpPin('3333');
          setLastFailedEmail('');
        }
      } else {
        setAuthError(res.error || 'အကောင့်ဖွင့်ခြင်း မအောင်မြင်ပါ');
      }
    }
    setAuthLoading(false);
  };

  const handleSyncData = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    const res = await syncAllToSupabase();
    setSyncMessage(res.message);
    setSyncLoading(false);
  };

  const handleCopySql = (scriptText?: string) => {
    const textToCopy =
      typeof scriptText === 'string'
        ? scriptText
        : sqlModalTab === 'rls'
        ? SUPABASE_RLS_FIX_SQL
        : SUPABASE_SQL_SCHEMA;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // User profiles list for display (deduplicated by canonical profile key)
  const displayProfiles = React.useMemo(() => {
    const seen = new Set<string>();
    const res: typeof userProfiles = [];
    for (const p of userProfiles) {
      const cKey = getCanonicalProfileKey(p);
      if (!seen.has(cKey)) {
        seen.add(cKey);
        res.push(p);
      }
    }
    return res;
  }, [userProfiles]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Supabase Status & Schema Tools */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm text-stone-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl ${
                isSupabaseConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isSupabaseConnected ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Supabase Database & User Management
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isSupabaseConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isSupabaseConnected ? 'Supabase ချိတ်ဆက်ထားသည်' : 'Local Storage Mode'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
                {isSupabaseConnected
                  ? 'Supabase PostgreSQL Cloud Database နှင့် Auth စနစ်ဖြင့် တိုက်ရိုက်ချိတ်ဆက်ထားပါသည်။ အရောင်း၊ ပစ္စည်းလက်ကျန်၊ ဈေးနှုန်းများနှင့် ဝန်ထမ်းအကောင့်များကို Cloud တွင် လုံခြုံစွာ သိမ်းဆည်းပေးထားပါသည်။'
                  : 'လက်ရှိတွင် Local Storage Mode ဖြင့် အလုပ်လုပ်နေပါသည်။ Supabase သို့ တိုက်ရိုက်ချိတ်ဆက်လိုပါက Settings > Secrets (သို့မဟုတ် .env) တွင် VITE_SUPABASE_URL နှင့် VITE_SUPABASE_ANON_KEY တို့ကို ထည့်သွင်းပေးပါ။'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              title="Supabase Database Project အသစ် ချိတ်ဆက်ရန်"
            >
              <Cloud className="w-4 h-4" />
              <span>Project အသစ် ချိတ်ဆက်မည်</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSqlModalTab('rls');
                setShowSqlModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Fix 42501 row-level security policy violation"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>RLS Fix Script (Error 42501)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSqlModalTab('full');
                setShowSqlModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span>Full SQL Schema</span>
            </button>

            {isSupabaseConnected && (
              <>
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={syncLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  <span>{syncLoading ? 'Sync လုပ်နေသည်...' : 'Local စာရင်းများ Supabase သို့ တင်မည်'}</span>
                </button>
                <button
                  type="button"
                  onClick={refreshSupabaseData}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl border border-stone-700 transition-colors cursor-pointer"
                  title="Refresh from Supabase"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {syncMessage && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              syncMessage.includes('အောင်မြင်စွာ')
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium leading-relaxed">{syncMessage}</span>
                {syncMessage.includes('42501') && (
                  <p className="text-[11px] text-stone-400">
                    Database တွင် anon role အတွက် RLS Policy ခွင့်ပြုချက်မရှိသောကြောင့် ဖြစ်ပါသည်။ အောက်ပါခလုတ်ဖြင့် RLS Fix Script ကို ကူးယူပြီး Supabase SQL Editor တွင် Run ပေးပါ။
                  </p>
                )}
              </div>
            </div>

            {syncMessage.includes('42501') && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopySql(SUPABASE_RLS_FIX_SQL)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'ကူးယူပြီးပါပြီ (Copied!)' : 'RLS Fix SQL ကူးယူမည်'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSqlModalTab('rls');
                    setShowSqlModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-lg text-xs transition-colors cursor-pointer border border-stone-700"
                >
                  Script ကြည့်မည်
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Authentication & Current Session */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Session Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>လက်ရှိ အကောင့် (Current Session)</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  currentUser.role === 'Admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {currentUser.role}
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <p className="text-xs text-stone-400">အသုံးပြုသူ အမည်</p>
                <p className="text-sm font-bold text-white">{currentUser.name}</p>
                {currentUser.email && (
                  <p className="text-xs text-stone-400 font-mono mt-0.5">{currentUser.email}</p>
                )}
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <p className="text-xs text-stone-400">စနစ်သုံးစွဲခွင့် (Permissions)</p>
                <p className="text-xs text-stone-200 mt-1 leading-relaxed">
                  {currentUser.role === 'Admin'
                    ? '✓ အရောင်း၊ အဝယ်၊ ပစ္စည်းလက်ကျန်၊ နေ့စဉ်ရွှေဈေး၊ အသုံးစရိတ်၊ အစီရင်ခံစာနှင့် ဆက်တင်များအားလုံးကို စီမံနိုင်ပါသည်။'
                    : currentUser.role === 'Manager'
                    ? '✓ စတော့ခ်၊ နေ့စဉ်ရွှေဈေးပြင်ဆင်ခြင်း၊ အစီရင်ခံစာများ၊ အသုံးစရိတ်နှင့် Void Sale ခွင့်ပြုချက် (PIN Override) ဆောင်ရွက်နိုင်ပါသည်။'
                    : '✓ အရောင်း (POS)၊ ရွှေဝယ်ယူခြင်း၊ ဘောက်ချာထုတ်ခြင်းနှင့် ပစ္စည်းလက်ကျန်ကြည့်ရှုခြင်းများကို ဆောင်ရွက်နိုင်ပါသည်။'}
                </p>
              </div>

              {supabaseUser ? (
                <button
                  type="button"
                  onClick={logoutSupabase}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 rounded-xl text-xs font-bold transition-colors cursor-pointer mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Supabase အကောင့်မှ ထွက်မည် (Sign Out)</span>
                </button>
              ) : (
                <div className="pt-2">
                  <p className="text-[11px] text-stone-400 mb-2">
                    စမ်းသပ်ရန် Role လဲလှယ်အသုံးပြုနိုင်ပါသည် (Quick Switch):
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => switchUserRole('Staff')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border cursor-pointer transition-colors text-center ${
                        currentUser.role === 'Staff'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                      }`}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUserRole('Manager')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border cursor-pointer transition-colors text-center ${
                        currentUser.role === 'Manager'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                      }`}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUserRole('Admin')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border cursor-pointer transition-colors text-center ${
                        currentUser.role === 'Admin'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Diagnostic & Audit Logs Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>စနစ်မှတ်တမ်း (Error / Audit Logs)</span>
              </h3>
              <span className="text-[11px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
                {getSystemLogs().length} Logs
              </span>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              စနစ် Error များနှင့် အရေးကြီးလုပ်ဆောင်ချက်များ (ဘောက်ချာထုတ်ခြင်း၊ ပယ်ဖျက်ခြင်း၊ ဆိုင်ဖွင့်/ပိတ်) ကို နောက်ကွယ်တွင် တိတ်တဆိတ် မှတ်တမ်းတင်ထားပါသည်။
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadSystemLogs('txt')}
                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                title="စနစ် Diagnostic Log ဖိုင်ကို တစ်ချက်နှိပ် ဒေါင်းလုဒ်ရယူမည်"
              >
                <Download className="w-4 h-4" />
                <span>📥 Log ဖိုင် ဒေါင်းလုဒ်ဆွဲမည် (.txt)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAuditLogs}
                  className="flex-1 py-2 px-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedAuditLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                  <span>{copiedAuditLogs ? 'ကူးပြီးပါပြီ' : 'Log ကူးမည်'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAuditModal(true)}
                  className="flex-1 py-2 px-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>အသေးစိတ်ကြည့်</span>
                </button>
              </div>
            </div>
          </div>

          {/* Supabase Auth Form */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex border-b border-stone-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  authMode === 'signin'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>အကောင့်ဝင်ရန် (Sign In)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  authMode === 'signup'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>အကောင့်သစ်ဖွင့် (Sign Up)</span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    အမည် အပြည့်အစုံ (Full Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ဥပမာ - မနွယ်နွယ်"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  အီးမေးလ် (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@goldshop.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  လျှို့ဝှက်နံပါတ် (Password)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="အနည်းဆုံး ၆ လုံး"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    ရာထူး သတ်မှတ်ချက် (Role)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Staff');
                        if (signUpPin === '1111' || signUpPin === '2222' || !signUpPin) setSignUpPin('3333');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer text-center ${
                        selectedRole === 'Staff'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-stone-950 text-stone-400 border-stone-800'
                      }`}
                    >
                      Staff (အရောင်း)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Manager');
                        if (signUpPin === '1111' || signUpPin === '3333' || !signUpPin) setSignUpPin('2222');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer text-center ${
                        selectedRole === 'Manager'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-stone-950 text-stone-400 border-stone-800'
                      }`}
                    >
                      Manager (မန်နေဂျာ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Admin');
                        if (signUpPin === '2222' || signUpPin === '3333' || !signUpPin) setSignUpPin('1111');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer text-center ${
                        selectedRole === 'Admin'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                          : 'bg-stone-950 text-stone-400 border-stone-800'
                      }`}
                    >
                      Admin (ဆိုင်ရှင်)
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300 leading-relaxed">
                      POS လျှို့ဝှက် PIN နံပါတ် (ဂဏန်း ၄ လုံးမှ ၆ လုံး) <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      PIN: {signUpPin ? (showSignUpPin ? signUpPin : '••••') : 'မသတ်မှတ်ရသေး'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showSignUpPin ? 'text' : 'password'}
                      maxLength={6}
                      value={signUpPin}
                      onChange={(e) => setSignUpPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="PIN နံပါတ် ရိုက်ထည့်ပါ (ဥပမာ- 1111, 2222, 3333)"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-xs tracking-widest font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignUpPin(!showSignUpPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
                      title={showSignUpPin ? 'PIN ဝှက်မည်' : 'PIN ကြည့်မည်'}
                    >
                      {showSignUpPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <span className="text-[10px] text-stone-500">အမြန်ရွေးရန်:</span>
                    <button
                      type="button"
                      onClick={() => setSignUpPin('1111')}
                      className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Admin: 1111
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpPin('2222')}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Manager: 2222
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpPin('3333')}
                      className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Staff: 3333
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpPin('4444')}
                      className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Phoo: 4444
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    💡 POS စနစ်သို့ လျင်မြန်စွာ Login ဝင်ရောက်ရန်နှင့် အရောင်းစာရေး/မန်နေဂျာ ခွင့်ပြုချက်များအတွက် အသုံးပြုပါမည်
                  </p>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800 text-[11px] text-stone-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    မှတ်ချက် - Supabase တွင် "Confirm email" ဖွင့်ထားပါက အကောင့်ဖွင့်ပြီးနောက် Gmail သို့ ပေးပို့သော အတည်ပြုလင့်ခ်ကို ဦးစွာနှိပ်ပေးရပါမည်။ (Supabase Settings တွင် Confirm email ကို ပိတ်ထားပါက တိုက်ရိုက်ဝင်ရောက်နိုင်ပါသည်)
                  </span>
                </div>
              )}

              {authError && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">{getReadableAuthError(authError)}</p>
                      <p className="text-[11px] text-rose-300/80 font-mono">
                        {authError}
                      </p>
                    </div>
                  </div>

                  {(authError.toLowerCase().includes('database error') || authError.toLowerCase().includes('saving new user')) && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 text-xs">
                      <div className="flex items-start gap-2 text-amber-300">
                        <Wrench className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-bold text-amber-200">Database error ဖြေရှင်းနည်း (Quick Solution):</p>
                          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                            Supabase Database ရှိ <span className="font-mono text-amber-300">profiles</span> table တွင် <span className="text-white font-bold">Manager</span> role check constraint သို့မဟုတ် auth trigger မအပ်ဒိတ်မဖြစ်သေးသောကြောင့် ဖြစ်ပေါ်ခြင်း ဖြစ်ပါသည်။
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSqlModalTab('rls');
                            setShowSqlModal(true);
                          }}
                          className="flex-1 min-w-[200px] flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ RLS & Trigger Fix Script ရယူရန်</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!email.trim() || !fullName.trim()) {
                              setAuthError('အမည်နှင့် အီးမေးလ် ဖြည့်သွင်းပေးပါ');
                              return;
                            }
                            setAuthLoading(true);
                            setAuthError(null);
                            const res = await addStaffMember({
                              full_name: fullName,
                              email: email,
                              role: selectedRole,
                              password: password || undefined,
                              pin: selectedRole === 'Admin' ? '1111' : selectedRole === 'Manager' ? '2222' : '3333',
                            });
                            setAuthLoading(false);
                            if (res.success) {
                              setAuthSuccess(`မန်နေဂျာ အကောင့် "${fullName}" ကို စနစ်အတွင်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ (PIN: 2222 ဖြင့် တိုက်ရိုက်ဝင်နိုင်ပါသည်)`);
                              setEmail('');
                              setPassword('');
                              setFullName('');
                            }
                          }}
                          className="flex-1 min-w-[200px] flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg text-xs border border-stone-700 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>စနစ်အတွင်း Manager တိုက်ရိုက်ဖန်တီးမည် (Direct Add)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {authError.toLowerCase().includes('email not confirmed') && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 text-xs">
                      <div className="flex items-start gap-2 text-amber-300">
                        <Mail className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-bold text-amber-200">အီးမေးလ် အတည်ပြုရန် လိုအပ်နေပါသည်</p>
                          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                            Supabase တွင် အီးမေးလ်အတည်ပြုခြင်း (Email Confirmation) ဖွင့်ထားသောကြောင့် <span className="font-mono text-amber-300 font-bold">{lastFailedEmail || email}</span> သို့ ပေးပို့ထားသော အတည်ပြုလင့်ခ်ကို Gmail Inbox (သို့မဟုတ် Spam folder) တွင် နှိပ်ပေးရန် လိုအပ်ပါသည်။
                          </p>
                        </div>
                      </div>

                      {/* Resend Action */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleResendConfirmation(lastFailedEmail || email)}
                          disabled={resendLoading}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Send className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                          <span>
                            {resendLoading
                              ? 'အီးမေးလ် ပေးပို့နေပါသည်...'
                              : 'အတည်ပြုလင့်ခ် ထပ်မံပေးပို့မည် (Resend Confirmation Email)'}
                          </span>
                        </button>

                        {resendStatus && (
                          <p
                            className={`mt-2 text-[11px] font-medium leading-relaxed ${
                              resendStatus.success ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {resendStatus.msg}
                          </p>
                        )}
                      </div>

                      {/* Quick Fix in Supabase */}
                      <div className="p-2.5 bg-stone-950/80 rounded-lg border border-stone-800 text-[11px] text-stone-300 space-y-1.5">
                        <p className="font-bold text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Supabase Dashboard တွင် အီးမေးလ်အတည်ပြုနည်း / ပိတ်နည်း:</span>
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-stone-400 pl-1 leading-relaxed">
                          <li>
                            <strong className="text-stone-300">အီးမေးလ်မစစ်ဘဲ တိုက်ရိုက်ဝင်နိုင်ရန် -</strong> Supabase Dashboard &gt; <strong>Authentication</strong> &gt; <strong>Providers</strong> &gt; <strong>Email</strong> သို့သွား၍ <strong>"Confirm email"</strong> ကို <span className="text-amber-300 font-bold">OFF (ပိတ်)</span> ပြီး Save နှိပ်ပါ။
                          </li>
                          <li>
                            <strong className="text-stone-300">အသုံးပြုသူကို တိုက်ရိုက်အတည်ပြုရန် -</strong> <strong>Authentication</strong> &gt; <strong>Users</strong> တွင် <span className="font-mono text-stone-200">{lastFailedEmail || email}</span> ၏ ဘေးရှိ <span className="font-bold">...</span> ကိုနှိပ်၍ <span className="text-emerald-400 font-bold">"Confirm user"</span> ကို နှိပ်ပါ။
                          </li>
                        </ol>
                      </div>

                      {/* Immediate switch to explore */}
                      <div className="border-t border-stone-800/80 pt-2 text-[11px] text-stone-400">
                        <p className="mb-1.5">သို့မဟုတ် အခုချက်ချင်း စမ်းသပ်ရန် Role လဲလှယ်သုံးနိုင်ပါသည်:</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => switchUserRole('Staff')}
                            className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded-lg font-bold cursor-pointer text-center text-[10px]"
                          >
                            Staff
                          </button>
                          <button
                            type="button"
                            onClick={() => switchUserRole('Manager')}
                            className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg font-bold cursor-pointer text-center text-[10px]"
                          >
                            Manager
                          </button>
                          <button
                            type="button"
                            onClick={() => switchUserRole('Admin')}
                            className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-rose-300 rounded-lg font-bold cursor-pointer text-center text-[10px]"
                          >
                            Admin
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {authSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {authLoading
                  ? 'ဆောင်ရွက်နေပါသည်...'
                  : authMode === 'signin'
                  ? 'အကောင့်ဝင်မည် (Sign In)'
                  : 'အကောင့်သစ်ဖန်တီးမည် (Register)'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: User Management Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>ဝန်ထမ်းနှင့် အသုံးပြုသူများ စာရင်း (User Management)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  စနစ်သုံး ဝန်ထမ်းအကောင့်များ၊ ရာထူးခွဲဝေမှုနှင့် Supabase Profiles စာရင်း
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshStaff}
                  disabled={refreshLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 hover:border-stone-600 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="Supabase profiles မှ အချက်အလက်များ ပြန်လည်ဆွဲယူရန်"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshLoading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{refreshLoading ? 'စစ်ဆေးနေဆဲ...' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddStaffModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ ဝန်ထမ်းသစ် ထည့်သွင်းမည်</span>
                </button>
                {testStaffList.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePurgeAllTestAccounts}
                    disabled={purgeLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                    title="စမ်းသပ်အကောင့်ဟောင်းများ အားလုံးကို Cloud DB နှင့် Local မှ အပြီးတိုင် ဖျက်မည်"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{purgeLoading ? 'ရှင်းလင်းနေသည်...' : `အကောင့်ဟောင်း (${testStaffList.length}) ခု ရှင်းလင်းမည်`}</span>
                  </button>
                )}
                <span className="px-2.5 py-1 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-300 font-mono">
                  Total: {displayProfiles.length}
                </span>
              </div>
            </div>

            {/* Purge Notice Banner */}
            {purgeNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{purgeNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPurgeNotice(null)}
                  className="text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Refresh Notice Banner */}
            {refreshNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{refreshNotice}</span>
              </div>
            )}

            {/* Delete Notice Banner */}
            {deleteNotice && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{deleteNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteNotice(null)}
                  className="text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Role Change Notice Banner */}
            {roleChangeNotice && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{roleChangeNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRoleChangeNotice(null)}
                  className="text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="overflow-x-auto pb-1 custom-scrollbar-x">
              <table className="w-full text-left text-xs text-stone-300 min-w-[720px]">
                <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-3">အသုံးပြုသူ အမည်</th>
                    <th className="py-3 px-3">အီးမေးလ်</th>
                    <th className="py-3 px-3">ရာထူး (Role)</th>
                    <th className="py-3 px-3">စနစ်ခွင့်ပြုချက်</th>
                    <th className="py-3 px-3 text-right">စီမံခန့်ခွဲရန်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70">
                  {displayProfiles.map((user, idx) => {
                    const isUserAdmin = user.role === 'Admin';
                    const isUserManager = user.role === 'Manager';
                    const userPin = getExpectedProfilePin(user);
                    const isSelf = Boolean(
                      (user.id && currentUser.id && (
                        user.id === currentUser.id ||
                        (user.id === 'usr_admin' && currentUser.id === 'admin_1') ||
                        (user.id === 'admin_1' && currentUser.id === 'usr_admin') ||
                        (user.id === 'usr_manager' && currentUser.id === 'manager_1') ||
                        (user.id === 'manager_1' && currentUser.id === 'usr_manager')
                      )) ||
                      (user.email && currentUser.email && user.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
                    );

                    const canDelete =
                      !isSelf &&
                      (currentUser.role === 'Admin' || (currentUser.role === 'Manager' && user.role === 'Staff'));

                    const roleBadgeClass = isUserAdmin
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : isUserManager
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                    const rolePrivilegeText = isUserAdmin
                      ? 'အပြည့်အဝ စီမံခွင့် (Admin Privileges)'
                      : isUserManager
                      ? 'စတော့ခ်၊ ဈေးနှုန်း၊ Override ခွင့်ပြုချက် (Manager)'
                      : 'အရောင်းနှင့် ဘောက်ချာ (POS Staff)';

                    return (
                      <tr
                        key={user.id || idx}
                        className={`transition-colors ${
                          idx % 2 === 0
                            ? 'bg-stone-900/50 hover:bg-stone-800/60'
                            : 'bg-stone-950/60 hover:bg-stone-800/70'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                              {user.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{user.full_name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-sans">
                                    လက်ရှိ
                                  </span>
                                )}
                              </div>
                              {user.phone && (
                                <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5 text-stone-500" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-400">
                          {user.email}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeClass}`}
                          >
                            {isUserAdmin ? (
                              <ShieldCheck className="w-3 h-3 text-rose-400" />
                            ) : isUserManager ? (
                              <UserCheck className="w-3 h-3 text-amber-400" />
                            ) : (
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                            )}
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-stone-400 max-w-[200px]">
                          {rolePrivilegeText}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {currentUser.role === 'Admin' && (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                                className="bg-stone-800 text-stone-200 border border-stone-700 text-[11px] rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-500"
                                title="ရာထူးပြောင်းလဲရန်"
                              >
                                <option value="Staff">Staff</option>
                                <option value="Manager">Manager</option>
                                <option value="Admin">Admin</option>
                              </select>
                            )}

                            {/* Direct Switch / Login Button */}
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await loginWithPin(userPin, user.id);
                                  if (onNavigateTab) {
                                    onNavigateTab('dashboard');
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer text-[11px] font-medium"
                                title="ဤအကောင့်ဖြင့် တိုက်ရိုက်ဝင်ရောက်မည်"
                              >
                                <LogIn className="w-3 h-3 text-amber-400" />
                                <span>ဝင်မည်</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEditStaff(user)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent hover:border-stone-700 transition-colors cursor-pointer"
                              title="အချက်အလက် ပြင်ဆင်ရန်"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteStaff(user)}
                                disabled={deletingId === user.id}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                                title="စာရင်းမှ ဖျက်ပစ်မည်"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick sync instruction tip */}
            <div className="mt-4 p-3 bg-stone-950/80 rounded-xl border border-stone-800 text-xs text-stone-400 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="text-stone-300 font-medium">
                  💡 ဝန်ထမ်းအကောင့်များ မပေါ်လာပါက အကြံပြုချက်:
                </p>
                <p>
                  အကယ်၍ Supabase Dashboard (Authentication &gt; Users) တွင် ဝန်ထမ်းအကောင့်များ ထည့်သွင်းထားသော်လည်း ဤနေရာတွင် မပေါ်သေးပါက <strong className="text-amber-400">+ ဝန်ထမ်းသစ် ထည့်သွင်းမည်</strong> ခလုတ်ဖြင့် အဆိုပါ ဝန်ထမ်း၏ အမည်နှင့် အီးမေးလ် ကို ထည့်သွင်းပေးပါက ချက်ချင်း ချိတ်ဆက်ပေါ်လာမည် ဖြစ်ပါသည်။ (သို့မဟုတ် အထက်ပါ <strong className="text-stone-200">"⚡ RLS Fix Script ရယူရန်"</strong> တွင်ပါသော SQL ကို Supabase SQL Editor တွင် Run နိုင်ပါသည်)
                </p>
              </div>
            </div>
          </div>

          {/* RBAC Role Permissions Matrix Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  ရာထူးအလိုက် လုပ်ပိုင်ခွင့် ဇယား (RBAC Role & Permissions Matrix)
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">စနစ်ဝင်ပေါက်နှင့် ခွင့်ပြုချက်များ</span>
            </div>

            <div className="overflow-x-auto pb-1 custom-scrollbar-x">
              <table className="w-full text-xs text-left text-stone-300 min-w-[580px]">
                <thead className="bg-stone-950 text-stone-400 border-b border-stone-800 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">လုပ်ဆောင်ချက် / စာမျက်နှာ (Module)</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">Staff (အရောင်းစာရေး)</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">Manager (မန်နေဂျာ)</th>
                    <th className="py-2.5 px-3 text-center text-rose-400">Admin (ဆိုင်ရှင်)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-medium">
                  <tr className="bg-stone-900/40 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">POS အရောင်း/အဝယ် ဘောက်ချာထုတ်ခြင်း</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-950/70 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">စတော့ခ်လက်ကျန်နှင့် ဖောက်သည်စာရင်း ကြည့်ရှုခြင်း</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-900/40 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">နေ့စဉ် ရွှေပေါက်ဈေး ပြင်ဆင်သတ်မှတ်ခြင်း</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">✕ ပိတ်ထား</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-950/70 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">အရောင်းဘောက်ချာ ပယ်ဖျက်ခြင်း (Void Sale)</td>
                    <td className="py-2.5 px-3 text-center text-amber-400 font-bold">🔑 PIN လိုအပ်</td>
                    <td className="py-2.5 px-3 text-center text-amber-400 font-bold">🔑 PIN ဖြင့် ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ တိုက်ရိုက်ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-900/40 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">ဆိုင်စရိတ်နှင့် အရောင်းအစီရင်ခံစာများ (Reports)</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">✕ ပိတ်ထား</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-950/70 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">စနစ်ဆိုင်ရာ ဆက်တင်နှင့် ဆိုင်ခွဲသတ်မှတ်ချက် (Settings)</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">✕ ပိတ်ထား</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">✕ ပိတ်ထား</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ ခွင့်ပြု</td>
                  </tr>
                  <tr className="bg-stone-900/40 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-white">ဝန်ထမ်းအကောင့်နှင့် အဆင့်ခွင့်ပြုချက် ပြင်ဆင်ခြင်း</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">✕ ပိတ်ထား</td>
                    <td className="py-2.5 px-3 text-center text-stone-400">ကြည့်ရှုခွင့်</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ အပြည့်အဝစီမံခွင့်</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Module Database Connection Guide */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Supabase Database Tables ဖွဲ့စည်းပုံ (Schema Overview)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                  <span>1. profiles</span>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 font-mono">auth.users</span>
                </div>
                <p className="text-stone-400">
                  ဝန်ထမ်းအကောင့်များ၊ အီးမေးလ်နှင့် Role (Admin/Staff) ခွင့်ပြုချက်များ သိမ်းဆည်းသည်။
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                  <span>2. products</span>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 font-mono">Inventory</span>
                </div>
                <p className="text-stone-400">
                  ရွှေထည်ပစ္စည်းများ၊ SKU၊ အမျိုးအစား၊ အလေးချိန် (ကျပ်/ပဲ/ရွေး)၊ လက်ခ၊ Status (In Stock/Sold)။
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                  <span>3. sales</span>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 font-mono">POS</span>
                </div>
                <p className="text-stone-400">
                  အရောင်းဘောက်ချာများ၊ ဘောက်ချာနံပါတ်၊ ပစ္စည်းစာရင်း (jsonb)၊ ငွေချေမှု၊ ကျန်ငွေ။
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                  <span>4. gold_prices</span>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 font-mono">Daily Rates</span>
                </div>
                <p className="text-stone-400">
                  ၁၆ ပဲရည်၊ ၁၅ ပဲရည် နေ့စဉ် အဝယ်ဈေး/အရောင်းဈေးနှုန်းများ တိုက်ရိုက်ချိတ်ဆက်ထားသည်။
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar-y backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between border-b border-stone-800 p-5 pb-3.5 shrink-0 bg-stone-900">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-normal">ဝန်ထမ်းသစ် ထည့်သွင်းခြင်း</h3>
                  <p className="text-[11px] text-stone-400">Add New Staff Member</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddStaffModal(false);
                  setAddStaffError(null);
                  setAddStaffSuccess(null);
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form wrapper with flex column layout */}
            <form onSubmit={handleAddStaffSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Scrollable form body with vertical scrollbar */}
              <div className="p-5 overflow-y-auto custom-scrollbar-y dark-scrollbar-y space-y-4 flex-1">
                {addStaffError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{addStaffError}</span>
                  </div>
                )}

                {addStaffSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{addStaffSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                    ဝန်ထမ်းအမည် (Full Name) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="ဥပမာ - မနွယ်နွယ်"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                    အီးမေးလ် (Email) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@goldshop.com"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                      ရာထူး (Role)
                    </label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => {
                        const r = e.target.value as UserRole;
                        setNewStaffRole(r);
                        if (!newStaffPin || newStaffPin === '1111' || newStaffPin === '2222' || newStaffPin === '3333') {
                          setNewStaffPin(r === 'Admin' ? '1111' : r === 'Manager' ? '2222' : '3333');
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="Staff">Staff (အရောင်းစာရေး)</option>
                      <option value="Manager">Manager (မန်နေဂျာ)</option>
                      <option value="Admin">Admin (ဆိုင်ရှင်/အုပ်ချုပ်သူ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                      ဖုန်းနံပါတ် (Phone)
                    </label>
                    <input
                      type="tel"
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                      placeholder="09..."
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300 leading-relaxed">
                      POS လျှို့ဝှက် PIN နံပါတ် (ဂဏန်း ၄ လုံးမှ ၆ လုံး) <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      PIN: {newStaffPin ? (showNewStaffPin ? newStaffPin : '••••') : 'မသတ်မှတ်ရသေး'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showNewStaffPin ? 'text' : 'password'}
                      maxLength={6}
                      value={newStaffPin}
                      onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="PIN နံပါတ် ရိုက်ထည့်ပါ (ဥပမာ- 1111, 2222, 3333)"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-xs tracking-widest font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewStaffPin(!showNewStaffPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
                      title={showNewStaffPin ? 'PIN ဝှက်မည်' : 'PIN ကြည့်မည်'}
                    >
                      {showNewStaffPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Quick Presets for Role PIN */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[10px] text-stone-500">အမြန်ရွေးချယ်ရန်:</span>
                    <button
                      type="button"
                      onClick={() => setNewStaffPin('1111')}
                      className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Admin: 1111
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStaffPin('2222')}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Manager: 2222
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStaffPin('3333')}
                      className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Staff: 3333
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStaffPin('4444')}
                      className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Phoo: 4444
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(1000 + Math.random() * 9000).toString();
                        setNewStaffPin(rand);
                      }}
                      className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      🎲 ကံစမ်း PIN
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    💡 ဤ PIN နံပါတ်ဖြင့် အရောင်းစာရေး/မန်နေဂျာ ဝင်ရောက်ခြင်း၊ ဘောက်ချာထုတ်ခြင်းနှင့် Shift Handover အတည်ပြုခြင်းများ ပြုလုပ်နိုင်ပါသည်
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                    စနစ်သို့ ဝင်ရောက်ရန် လျှို့ဝှက်နံပါတ် (Password)
                    <span className="text-stone-500 font-normal ml-1">(ရွေးချယ်ရန်)</span>
                  </label>
                  <input
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="အနည်းဆုံး ၆ လုံး (အကောင့်ဖွင့်ရန်)"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                    စကားဝှက် ထည့်သွင်းပါက Supabase Auth Account အဖြစ်ပါ တစ်ပါတည်း ဖန်တီးပေးမည် ဖြစ်ပါသည်။
                  </p>
                </div>
              </div>

              {/* Fixed Bottom Action Buttons Footer */}
              <div className="p-4 border-t border-stone-800 bg-stone-900/95 shrink-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStaffModal(false);
                    setAddStaffError(null);
                    setAddStaffSuccess(null);
                  }}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  ပယ်ဖျက်မည်
                </button>
                <button
                  type="submit"
                  disabled={addStaffLoading}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addStaffLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addStaffLoading ? 'ထည့်သွင်းနေပါသည်...' : '+ ဝန်ထမ်းသစ် ထည့်သွင်းမည်'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar-y backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 p-5 pb-3.5 shrink-0 bg-stone-900">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-stone-800 text-amber-400 rounded-xl border border-stone-700 shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-normal">ဝန်ထမ်း အချက်အလက် ပြင်ဆင်ရန်</h3>
                  <p className="text-[11px] text-stone-400">Edit Staff Profile & POS PIN</p>
                </div>
              </div>
              <button
                type="button"
                disabled={editStaffLoading}
                onClick={() => setEditingStaff(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="p-5 overflow-y-auto custom-scrollbar-y dark-scrollbar-y space-y-4 flex-1">
              {/* Error Banner */}
              {editStaffError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{editStaffError}</span>
                </div>
              )}

              {/* Success Banner */}
              {editStaffSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{editStaffSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                  ဝန်ထမ်းအမည် (Full Name) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editStaffLoading}
                  value={editingStaff.full_name || ''}
                  onChange={(e) =>
                    setEditingStaff((prev: any) => prev ? { ...prev, full_name: e.target.value } : null)
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-60 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                  အီးမေးလ် (Email)
                </label>
                <input
                  type="email"
                  disabled={editStaffLoading}
                  value={editingStaff.email || ''}
                  onChange={(e) =>
                    setEditingStaff((prev: any) => prev ? { ...prev, email: e.target.value } : null)
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-60 font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                    ရာထူး (Role)
                  </label>
                  <select
                    disabled={editStaffLoading}
                    value={editingStaff.role || 'Staff'}
                    onChange={(e) =>
                      setEditingStaff((prev: any) => prev ? { ...prev, role: e.target.value as UserRole } : null)
                    }
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-60 leading-relaxed"
                  >
                    <option value="Staff">Staff (အရောင်းစာရေး)</option>
                    <option value="Manager">Manager (မန်နေဂျာ)</option>
                    <option value="Admin">Admin (ဆိုင်ရှင်/အုပ်ချုပ်သူ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 leading-relaxed">
                    ဖုန်းနံပါတ် (Phone)
                  </label>
                  <input
                    type="tel"
                    disabled={editStaffLoading}
                    value={editingStaff.phone || ''}
                    onChange={(e) =>
                      setEditingStaff((prev: any) => prev ? { ...prev, phone: e.target.value } : null)
                    }
                    placeholder="09..."
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-60 leading-relaxed"
                  />
                </div>
              </div>

              {/* PIN Code Field */}
              <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-xl space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300 leading-relaxed">
                    POS လျှို့ဝှက် PIN နံပါတ် (ဂဏန်း ၄ လုံးမှ ၆ လုံး)
                  </label>
                  {editingStaff.pin && (
                    <span className="text-[10px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      လက်ရှိ PIN: {showEditPin ? editingStaff.pin : '••••'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showEditPin ? 'text' : 'password'}
                    maxLength={6}
                    disabled={editStaffLoading}
                    value={editingStaff.pin || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEditingStaff((prev: any) => prev ? { ...prev, pin: val } : null);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onSelect={(e) => e.stopPropagation()}
                    placeholder="PIN နံပါတ် အသစ်ရိုက်ထည့်ပါ (ဥပမာ- 1111, 2222, 3333)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-xs tracking-widest font-mono focus:outline-none focus:border-amber-500 disabled:opacity-60 leading-relaxed select-text"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditPin(!showEditPin);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
                    title={showEditPin ? 'PIN ဝှက်မည်' : 'PIN ကြည့်မည်'}
                  >
                    {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Quick Presets for Role PIN */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-stone-500">အမြန်ရွေးချယ်ရန်:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingStaff((prev: any) => prev ? { ...prev, pin: '1111' } : null);
                    }}
                    className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    Admin: 1111
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingStaff((prev: any) => prev ? { ...prev, pin: '2222' } : null);
                    }}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    Manager: 2222
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingStaff((prev: any) => prev ? { ...prev, pin: '3333' } : null);
                    }}
                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    Staff: 3333
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingStaff((prev: any) => prev ? { ...prev, pin: '4444' } : null);
                    }}
                    className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    Phoo: 4444
                  </button>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed">
                  💡 ဤ PIN ဖြင့် အရောင်းစာရေး/မန်နေဂျာ ဝင်ရောက်ခြင်းနှင့် Shift Handover အတည်ပြုခြင်းများ ပြုလုပ်နိုင်ပါသည်
                </p>
              </div>

              {/* Sticky Footer Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-800 sticky bottom-0 bg-stone-900/95 py-2 -mx-1 px-1">
                <button
                  type="button"
                  disabled={editStaffLoading}
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editStaffSuccess ? 'ပြီးပါပြီ (ပိတ်မည်)' : 'ပယ်ဖျက်မည်'}
                </button>
                <button
                  type="submit"
                  disabled={editStaffLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editStaffLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editStaffLoading ? 'သိမ်းဆည်းနေပါသည်...' : editStaffSuccess ? 'ထပ်မံသိမ်းဆည်းမည်' : 'သိမ်းဆည်းမည်'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ဝန်ထမ်းအကောင့် ဖျက်ပစ်ရန် အတည်ပြုပါ</h3>
                <p className="text-xs text-stone-400">Delete Staff Profile</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">ဝန်ထမ်းအမည်:</span>
                <span className="font-bold text-white text-sm">{staffToDelete.full_name}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-stone-400">အီးမေးလ်:</span>
                <span className="text-stone-300">{staffToDelete.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">ရာထူး (Role):</span>
                <span className="font-semibold text-amber-400">{staffToDelete.role}</span>
              </div>
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed">
              ⚠️ ဤဝန်ထမ်းအကောင့်ကို စာရင်းမှ ဖျက်ပစ်ပါက POS စနစ်အတွင်း ဝင်ရောက်ခွင့်နှင့် စာရင်းများမှ လုံးဝ ဖယ်ရှားသွားမည် ဖြစ်ပါသည်။
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                မဖျက်တော့ပါ (Cancel)
              </button>
              <button
                type="button"
                disabled={deletingId === staffToDelete.id}
                onClick={handleConfirmDeleteStaff}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                {deletingId === staffToDelete.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deletingId === staffToDelete.id ? 'ဖျက်နေပါသည်...' : 'ဖျက်မည် (Confirm Delete)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Supabase SQL Database Script
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopySql()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'ကူးယူပြီးပါပြီ (Copied!)' : sqlModalTab === 'rls' ? 'RLS Fix SQL ကူးယူမည်' : 'Full SQL ကူးယူမည်'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-stone-800 bg-stone-950/80 px-4 pt-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSqlModalTab('rls')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
                  sqlModalTab === 'rls'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>⚡ RLS Fix Script (Error 42501 ဖြေရှင်းရန်)</span>
              </button>
              <button
                type="button"
                onClick={() => setSqlModalTab('full')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
                  sqlModalTab === 'full'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>📋 Full Database Setup (ဇယားများ အသစ်ဆောက်ရန်)</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-stone-300 bg-stone-950 rounded-b-2xl">
              {sqlModalTab === 'rls' ? (
                <div>
                  <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-sans text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>✓ Error 42501 (new row violates row-level security policy) အတွက် ဖြေရှင်းနည်း:</span>
                    </p>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      ဤ Script သည် ရှိပြီးသား Table များနှင့် စာရင်းများကို မပျက်စီးစေဘဲ၊ client (anon key) နှင့် ဝန်ထမ်းအကောင့်များအား စာရင်းသွင်း/ပြင်ဆင်ခွင့် ပေးလိုက်ခြင်း ဖြစ်ပါသည်။ အထက်ပါ <strong className="text-amber-400">"RLS Fix SQL ကူးယူမည်"</strong> ကို နှိပ်ပြီး Supabase Dashboard &gt; SQL Editor တွင် Paste လုပ်ကာ <strong>"RUN"</strong> နှိပ်ပေးပါ။
                    </p>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed">{SUPABASE_RLS_FIX_SQL}</pre>
                </div>
              ) : (
                <div>
                  <p className="text-amber-400 mb-2 font-sans text-xs">
                    💡 အသုံးပြုနည်း: Supabase Dashboard &gt; SQL Editor သို့ သွား၍ အောက်ပါ Script ကို Paste လုပ်ကာ "RUN" နှိပ်ပေးပါ။
                  </p>
                  <pre className="whitespace-pre-wrap leading-relaxed">{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <AuditLogsModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {showConnectModal && (
        <ConnectSupabaseModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      )}
    </div>
  );
};
