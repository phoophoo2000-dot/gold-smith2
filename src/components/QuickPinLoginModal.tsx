import React, { useState } from 'react';
import { useGoldShop, isAssistantManagerProfile, isProfileDeleted, getCanonicalProfileKey, loadStorage, getExpectedProfilePin } from '../context/GoldShopContext';
import { ShieldCheck, UserCheck, KeyRound, Lock, AlertCircle, Sparkles, Building2, Mail, Key, Cloud, Trash2, Check, X } from 'lucide-react';
import { UserRole } from '../types/gold';

interface QuickPinLoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  isLockScreen?: boolean;
  initialUserId?: string;
}

export const QuickPinLoginModal: React.FC<QuickPinLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isLockScreen = false,
  initialUserId,
}) => {
  const {
    currentUser,
    userProfiles,
    loginWithPin,
    loginWithSupabase,
    isSupabaseConnected,
    unlockSession,
    settings,
    switchUserRole,
    deleteStaffMember,
    purgeStaffAccounts,
  } = useGoldShop();

  const [loginMode, setLoginMode] = useState<'pin' | 'cloud'>('pin');
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  const [isCleanupMode, setIsCleanupMode] = useState(false);
  const [purgeSuccessNotice, setPurgeSuccessNotice] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return initialUserId || currentUser?.id || 'staff_phoo';
  });
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initialUserId when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialUserId) {
        setSelectedUserId(initialUserId);
      } else if (currentUser?.id) {
        setSelectedUserId(currentUser.id);
      }
      setPin('');
      setError(null);
    }
  }, [isOpen, initialUserId, currentUser?.id]);

  if (!isOpen) return null;

  // Build staff list combining default profiles and any customized profiles from Supabase/Storage
  const isPhoo = (idOrEmail?: string, name?: string) => {
    const s = `${idOrEmail || ''} ${name || ''}`.toLowerCase();
    return s.includes('phoo');
  };

  const matchStaffId = (st: { id: string; email?: string; name: string; role: UserRole }, target?: string) => {
    if (!target) return false;
    const t = target.toLowerCase();
    const sId = st.id.toLowerCase();
    const sEmail = (st.email || '').toLowerCase();
    const sName = st.name.toLowerCase();

    if (sId === t || sEmail === t) return true;
    if (t === 'staff_phoo' || t === 'usr_phoo' || t.includes('phoo')) {
      return sId.includes('phoo') || sEmail.includes('phoo') || sName.includes('phoo');
    }
    if (t.includes('assistant') || t.includes('asst') || t.includes('လက်ထောက်') || t.includes('အကူမန်နေဂျာ')) {
      return (
        sId.includes('assistant') ||
        sId.includes('asst') ||
        sEmail.includes('assistant') ||
        sEmail.includes('asst') ||
        sName.includes('assistant') ||
        sName.includes('asst') ||
        sName.includes('လက်ထောက်') ||
        sName.includes('အကူမန်နေဂျာ')
      );
    }
    if (t === 'usr_staff' || t === 'staff_1') {
      return (
        (sId === 'usr_staff' || sId === 'staff_1' || sName.includes('နွယ်နွယ်')) &&
        !isPhoo(sId, sName) &&
        !isAssistantManagerProfile({ full_name: sName, email: sEmail, id: sId })
      );
    }
    if (t === 'usr_admin' || t === 'admin_1') {
      return sId === 'usr_admin' || sId === 'admin_1' || sEmail === 'admin@goldshop.com';
    }
    if (t === 'usr_manager' || t === 'manager_1') {
      return sId === 'usr_manager' || sId === 'manager_1' || sEmail === 'manager@goldshop.com';
    }
    return false;
  };

  interface ModalStaffItem {
    id: string;
    name: string;
    role: UserRole;
    email?: string;
    pin: string;
    desc: string;
  }

  const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});

  const rawStaffList: ModalStaffItem[] = userProfiles && userProfiles.length > 0
    ? userProfiles
        .filter((p) => !isProfileDeleted(p))
        .map(p => {
        const isAsst = isAssistantManagerProfile(p);
        const effectiveRole = isAsst && p.role === 'Staff' ? 'Manager' : p.role;
        const emailKey = p.email ? p.email.trim().toLowerCase() : '';
        const nameKey = p.full_name ? p.full_name.trim().toLowerCase() : '';
        const activePin = getExpectedProfilePin({ ...p, role: effectiveRole });

        return {
          id: p.id,
          name: p.full_name,
          role: effectiveRole,
          email: p.email,
          pin: activePin,
          desc: effectiveRole === 'Admin' 
            ? 'အဆင့်မြင့် အစီရင်ခံစာများ၊ အမြတ်/အရှုံး၊ စနစ်ဆက်တင်' 
            : effectiveRole === 'Manager' 
            ? 'နေ့စဉ်စာရင်း၊ စတော့ခ်လက်ကျန်၊ ဈေးနှုန်းပြင်ဆင်ခြင်း' 
            : 'အရောင်း/အဝယ် POS၊ ဘောက်ချာထုတ်ပေးခြင်း',
        };
      })
    : [
        {
          id: 'admin_1',
          name: 'Admin',
          role: 'Admin' as UserRole,
          email: 'admin@goldshop.com',
          desc: 'အဆင့်မြင့် အစီရင်ခံစာများ၊ အမြတ်/အရှုံး၊ စနစ်ဆက်တင်၊ ဝန်ထမ်းခန့်ထားမှု',
          pin: '1111',
        },
        {
          id: 'manager_1',
          name: 'Manager',
          role: 'Manager' as UserRole,
          email: 'manager@goldshop.com',
          desc: 'နေ့စဉ်စာရင်း၊ စတော့ခ်လက်ကျန်၊ ဈေးနှုန်းပြင်ဆင်ခြင်း၊ Staff ခွင့်ပြုချက် (Override)',
          pin: '2222',
        },
        {
          id: 'staff_phoo',
          name: 'Phoo (Staff / အရောင်းစာရေး)',
          role: 'Staff' as UserRole,
          email: 'phoophoo.2000@gmail.com',
          desc: 'အရောင်း/အဝယ် POS၊ ဘောက်ချာထုတ်ပေးခြင်း၊ ရွှေထည်ရှာဖွေခြင်း',
          pin: '4444',
        },
        {
          id: 'staff_1',
          name: 'မနွယ်နွယ် (အရောင်းစာရေး)',
          role: 'Staff' as UserRole,
          email: 'staff@goldshop.com',
          desc: 'အရောင်း/အဝယ် POS၊ ဘောက်ချာထုတ်ပေးခြင်း၊ ရွှေထည်ရှာဖွေခြင်း',
          pin: '3333',
        },
      ];

  // Deduplicate by canonical profile key so duplicate aliases are never rendered twice
  const staffList: ModalStaffItem[] = (() => {
    const seen = new Set<string>();
    const res: ModalStaffItem[] = [];
    for (const s of rawStaffList) {
      const cKey = getCanonicalProfileKey({ id: s.id, email: s.email, full_name: s.name });
      if (!seen.has(cKey)) {
        seen.add(cKey);
        res.push(s);
      }
    }
    return res;
  })();

  // Match the user selected by ID, falling back to currentUser, or first staff
  const selectedStaff =
    (selectedUserId ? staffList.find((s) => s.id === selectedUserId || matchStaffId(s, selectedUserId)) : null) ||
    (currentUser?.id ? staffList.find((s) => s.id === currentUser.id || matchStaffId(s, currentUser.id)) : null) ||
    staffList.find((s) => isPhoo(s.id || s.email, s.name)) ||
    staffList[0];

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      // Auto submit if 4 digits reached
      if (nextPin.length === 4) {
        setTimeout(() => {
          handleDirectLogin(nextPin, selectedStaff.id);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleDirectLogin = async (pinToTry: string, targetId: string) => {
    if (!pinToTry) {
      setError('PIN နံပါတ် ရိုက်ထည့်ပေးပါ');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await loginWithPin(pinToTry, targetId);
    setIsLoading(false);

    if (res.success) {
      setPin('');
      unlockSession();
      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
    } else {
      setError(res.error || 'PIN နံပါတ် မှားယွင်းနေပါသည်');
      setPin('');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleDirectLogin(pin, selectedStaff.id);
  };

  const isTestOrDeletableAccount = (st: ModalStaffItem) => {
    const n = st.name.toLowerCase();
    const id = st.id.toLowerCase();
    const e = (st.email || '').toLowerCase();
    // Protect core default accounts
    if (id === 'admin_1' || id === 'usr_admin' || e === 'admin@goldshop.com') return false;
    if (id === 'manager_1' || id === 'usr_manager' || (e === 'manager@goldshop.com' && !n.includes('asst'))) return false;
    if (id === 'staff_phoo' || id === 'usr_phoo' || e.includes('phoo') || n.includes('phoo')) return false;
    if (id === 'staff_1' || id === 'usr_staff' || (n.includes('နွယ်နွယ်') && !e.includes('phoo'))) return false;
    return true;
  };

  const handlePurgeAllTestStaff = async () => {
    const testProfiles = userProfiles.filter((p) => {
      const n = (p.full_name || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const e = (p.email || '').toLowerCase();
      if (id === 'admin_1' || id === 'usr_admin' || e === 'admin@goldshop.com') return false;
      if (id === 'manager_1' || id === 'usr_manager' || (e === 'manager@goldshop.com' && !n.includes('asst'))) return false;
      if (id === 'staff_phoo' || id === 'usr_phoo' || e.includes('phoo') || n.includes('phoo')) return false;
      if (id === 'staff_1' || id === 'usr_staff' || (n.includes('နွယ်နွယ်') && !e.includes('phoo'))) return false;
      return true;
    });

    if (testProfiles.length === 0) {
      setPurgeSuccessNotice('ရှင်းလင်းရန် စမ်းသပ်အကောင့်ဟောင်း မရှိပါ');
      setTimeout(() => setPurgeSuccessNotice(null), 3000);
      return;
    }

    await purgeStaffAccounts(testProfiles);
    setSelectedUserId('admin_1');
    setPurgeSuccessNotice(`စမ်းသပ်အကောင့်ဟောင်း (${testProfiles.length}) ခုကို Cloud Database နှင့် စနစ်မှ အပြီးတိုင် ရှင်းလင်းပြီးပါပြီ`);
    setIsCleanupMode(false);
    setTimeout(() => setPurgeSuccessNotice(null), 4000);
  };

  const handleDeleteSingleStaff = async (e: React.MouseEvent, st: ModalStaffItem) => {
    e.stopPropagation();
    await deleteStaffMember(st.id, st.email);
    if (selectedUserId === st.id) {
      setSelectedUserId('admin_1');
    }
    setPurgeSuccessNotice(`"${st.name}" ကို Cloud နှင့် စနစ်မှ အပြီးတိုင် ဖျက်ပစ်ပြီးပါပြီ`);
    setTimeout(() => setPurgeSuccessNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full max-h-[96vh] flex flex-col my-auto overflow-hidden">
        {/* Header - Fixed at top */}
        <div className="bg-stone-900 text-white p-3.5 sm:p-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20 shrink-0">
                <Lock className="w-5 h-5 text-stone-950" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>{settings?.shopNameMm || settings?.shopName || 'ရွှေဆိုင် POS'}</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  {isLockScreen ? 'မျက်နှာပြင်သော့ခတ်ထားပါသည် (Screen Locked)' : 'ဝန်ထမ်းဝင်ပေါက် (Staff Entry / PIN Login)'}
                </p>
              </div>
            </div>
            {!isLockScreen && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
          {/* Lock Screen Active User Highlight Banner */}
          {isLockScreen && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 font-bold shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                    သော့ခတ်ထားသောအကောင့် (Locked User):
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-stone-900 truncate">
                    {selectedStaff.name}
                  </div>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {selectedStaff.role}
              </span>
            </div>
          )}

          {/* User Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                {isLockScreen ? 'အကောင့် ရွေးချယ်နိုင်သည် (Switch User):' : 'အသုံးပြုသူ ရွေးချယ်ပါ (User Profile):'}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCleanupMode(!isCleanupMode)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    isCleanupMode
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-300'
                  }`}
                  title="မလိုလားအပ်သော အကောင့်ဟောင်းများ ဖျက်ရန်"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isCleanupMode ? 'ရှင်းလင်းမှု ပိတ်မည်' : 'အကောင့်ဟောင်းများ ရှင်းလင်းရန်'}</span>
                </button>
              </div>
            </div>

            {/* Cleanup Mode Banner */}
            {isCleanupMode && (
              <div className="p-2.5 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5 text-rose-700 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>မလိုလားအပ်သော စမ်းသပ်အကောင့်များ ရှင်းလင်းခြင်း:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handlePurgeAllTestStaff}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                  >
                    စမ်းသပ်အကောင့်အားလုံး တစ်ခါတည်း ဖျက်မည်
                  </button>
                </div>
                <p className="text-[10.5px] text-rose-700/90 leading-relaxed">
                  အကောင့်ကတ်များ၏ ညာဘက်ထောင့်ရှိ <span className="font-bold text-rose-800 bg-rose-200 px-1 rounded">✕</span> ကို နှိပ်၍ မိမိမလိုလားသော အကောင့်များကို Cloud Database နှင့် ကွန်ပျူတာပေါ်မှ အပြီးတိုင် ဖျက်ထုတ်နိုင်ပါသည်။
                </p>
              </div>
            )}

            {purgeSuccessNotice && (
              <div className="p-2 mb-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{purgeSuccessNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {staffList.map((st) => {
                const isSelected = st.id === selectedStaff.id;
                const roleBadgeClass =
                  st.role === 'Admin'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : st.role === 'Manager'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                // Display a clean name label
                const displayName = st.name.replace(/\(.*\)/, '').trim() || st.name;
                const canPurge = isTestOrDeletableAccount(st);

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(st.id);
                      setPin('');
                      setError(null);
                    }}
                    className={`relative p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/40 shadow-xs'
                        : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    {/* Delete button in cleanup mode */}
                    {isCleanupMode && canPurge && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleStaff(e, st)}
                        className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-transform hover:scale-110 cursor-pointer"
                        title="ဤအကောင့်ကို အပြီးတိုင် ဖျက်ပစ်မည်"
                      >
                        ✕
                      </button>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadgeClass}`}
                        >
                          {st.role}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300"></span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-stone-900 truncate" title={st.name}>
                        {displayName}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-500 font-medium mt-1 truncate">
                      {isPhoo(st.id || st.email, st.name)
                        ? 'Phoo (Staff)'
                        : st.role === 'Admin'
                        ? 'အုပ်ချုပ်သူ'
                        : st.role === 'Manager'
                        ? 'မန်နေဂျာ'
                        : 'အရောင်း/POS'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: PIN Input Field */}
          <form onSubmit={handleLogin} className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-semibold text-stone-700 truncate">
                  <strong className="text-stone-900">{selectedStaff.name.replace(/\(.*\)/, '').trim()}</strong> ၏ လျှို့ဝှက် PIN နံပါတ် ရိုက်ထည့်ပါ:
                </span>
              </div>

              {/* Dots representation */}
              <div className="flex items-center justify-center gap-3 py-2 bg-stone-50 border border-stone-200 rounded-xl">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border transition-all ${
                        isFilled
                          ? 'bg-amber-600 border-amber-600 scale-125 shadow-xs'
                          : 'bg-white border-stone-300'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Prevent browser auto-fill managers */}
              <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                name="gold_pos_pin_unrestricted"
                id="gold_pos_pin_field"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setError(null);
                  if (val.length === 4) {
                    setTimeout(() => {
                      handleDirectLogin(val, selectedStaff.id);
                    }, 120);
                  }
                }}
                placeholder="••••"
                className="w-full mt-1.5 text-center tracking-widest text-lg font-mono font-bold py-2 border border-amber-400 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 bg-white"
              />
            </div>

            {error && (
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitClick(num)}
                  className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-bold text-base sm:text-lg transition-colors cursor-pointer border border-stone-200/90 shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer border border-stone-200/90"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick('0')}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-bold text-base sm:text-lg transition-colors cursor-pointer border border-stone-200/90 shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer border border-stone-200/90"
              >
                ⌫ ပြန်ဖျက်
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || pin.length < 1}
              className="w-full mt-1.5 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>စနစ်သို့ ဝင်ရောက်မည် (Unlock & Enter)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
