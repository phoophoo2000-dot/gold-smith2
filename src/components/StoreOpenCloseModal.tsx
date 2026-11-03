import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { formatMMK } from '../services/calculationEngine';
import {
  Store,
  DoorOpen,
  DoorClosed,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  ShieldCheck,
  UserCheck,
  Receipt,
  Coins,
  Lock,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

interface StoreOpenCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToGoldPrices?: () => void;
}

export const StoreOpenCloseModal: React.FC<StoreOpenCloseModalProps> = ({
  isOpen,
  onClose,
  onNavigateToGoldPrices,
}) => {
  const {
    storeOperation,
    openStore,
    closeStore,
    currentUser,
    sales,
    goldPrices,
    verifyManagerPin,
  } = useGoldShop();

  const [closeNote, setCloseNote] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Permission check
  const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Calculate today's sales stats
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.date === todayStr && s.status !== 'Void');
  }, [sales, todayStr]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  }, [todaySales]);

  const todayCash = useMemo(() => {
    return todaySales.reduce((sum, s) => {
      const cashPayments = (s.payments || []).filter((p) => p.method === 'Cash');
      if (cashPayments.length > 0) {
        return sum + cashPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
      }
      return sum + (s.paidAmount || 0);
    }, 0);
  }, [todaySales]);

  const todayDigital = useMemo(() => {
    return todaySales.reduce((sum, s) => {
      const digitalPayments = (s.payments || []).filter((p) => p.method !== 'Cash' && p.method !== 'Credit');
      return sum + digitalPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
    }, 0);
  }, [todaySales]);

  if (!isOpen) return null;

  const handleToggleStore = async () => {
    setPinError(null);
    setActionSuccess(null);

    let actorName = currentUser?.name || 'Admin';
    let actorId = currentUser?.id;

    // If current role is Staff, require Manager/Admin PIN verification
    if (!isAuthorized) {
      if (!managerPin.trim()) {
        setPinError('မန်နေဂျာ/Admin ခွင့်ပြုချက် PIN နံပါတ် ရိုက်ထည့်ပေးပါ');
        return;
      }
      const verified = verifyManagerPin(managerPin.trim());
      if (!verified.verified) {
        setPinError('PIN နံပါတ် မှားယွင်းနေပါသည်။ မန်နေဂျာ သို့မဟုတ် Admin PIN ကို အသုံးပြုပါ');
        return;
      }
      actorName = `${verified.managerName || 'Manager'} (Verified via PIN)`;
    }

    setLoading(true);
    try {
      if (storeOperation.isOpen) {
        // Close Store
        const res = await closeStore(actorName, actorId, closeNote.trim() || undefined);
        setActionSuccess(res.message);
        setCloseNote('');
      } else {
        // Open Store
        const res = await openStore(actorName, actorId);
        setActionSuccess(res.message);
      }
      setManagerPin('');
      setTimeout(() => {
        setActionSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setPinError(err?.message || 'လုပ်ဆောင်မှု မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('my-MM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-800 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                storeOperation.isOpen
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {storeOperation.isOpen ? <DoorOpen className="w-5 h-5" /> : <DoorClosed className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ဆိုင်ဖွင့် / ဆိုင်ပိတ် စီမံခန့်ခွဲမှု</span>
              </h2>
              <p className="text-xs text-stone-400">Daily Store Operating Status & Shift Control</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar-y">
          {/* Current Status Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              storeOperation.isOpen
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/20'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      storeOperation.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
                    {storeOperation.isOpen ? '🟢 လက်ရှိ ဆိုင်ဖွင့်ထားပါသည် (OPEN)' : '🔴 လက်ရှိ ဆိုင်ပိတ်ထားပါသည် (CLOSED)'}
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {storeOperation.isOpen
                    ? 'အရောင်းကောင်တာများ အားလုံး ပုံမှန်အလုပ်လုပ်နေပြီး ဘောက်ချာဖွင့်ခွင့် ပေးထားပါသည်။'
                    : 'အရောင်းကောင်တာများ (POS) ခေတ္တရပ်နားထားပြီး ဝန်ထမ်းများ ဘောက်ချာဖွင့်ခွင့်ကို ပိတ်ပင်ထားပါသည်။'}
                </p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border ${
                  storeOperation.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                }`}
              >
                {storeOperation.isOpen ? 'ACTIVE' : 'OFF / CLOSED'}
              </span>
            </div>

            {/* Timestamps */}
            <div className="mt-4 pt-3 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  {storeOperation.isOpen ? 'နောက်ဆုံး ဖွင့်လှစ်ချိန်' : 'နောက်ဆုံး ပိတ်သိမ်းချိန်'}:{' '}
                  <strong className="text-stone-200 font-mono">
                    {formatDateTime(storeOperation.isOpen ? storeOperation.openedAt : storeOperation.closedAt)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  တာဝန်ခံ:{' '}
                  <strong className="text-stone-200">
                    {storeOperation.isOpen ? storeOperation.openedBy || 'Admin' : storeOperation.closedBy || 'Admin'}
                  </strong>
                </span>
              </div>
              {storeOperation.closeNote && !storeOperation.isOpen && (
                <div className="sm:col-span-2 text-stone-400 italic">
                  မှတ်ချက်: "{storeOperation.closeNote}"
                </div>
              )}
            </div>
          </div>

          {/* If Shop is OPEN: Show today's sales summary before closing */}
          {storeOperation.isOpen && (
            <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>ယနေ့ စာရင်းအကျဉ်းချုပ် (Today's Snapshot)</span>
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">
                  ဘောက်ချာ ({todaySales.length}) စောင်
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <div className="text-[10px] text-stone-400">ယနေ့ ရောင်းရငွေစုစုပေါင်း</div>
                  <div className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-0.5">
                    {formatMMK(todayRevenue)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <div className="text-[10px] text-stone-400">ငွေသား (Cash)</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {formatMMK(todayCash)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <div className="text-[10px] text-stone-400">Digital (KPay/Wave)</div>
                  <div className="text-xs sm:text-sm font-bold text-sky-400 font-mono mt-0.5">
                    {formatMMK(todayDigital)}
                  </div>
                </div>
              </div>

              {/* Close Note Field */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  ဆိုင်ပိတ်သိမ်းခြင်း မှတ်ချက် (Close Note - ရွေးချယ်နိုင်သည်)
                </label>
                <input
                  type="text"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="ဥပမာ- ညနေ ၅ နာရီ စာရင်းချုပ်၍ ဆိုင်ပိတ်သိမ်းပါသည်..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-rose-500 placeholder-stone-500"
                />
              </div>
            </div>
          )}

          {/* If Shop is CLOSED: Morning checklist before opening */}
          {!storeOperation.isOpen && (
            <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>နံနက် ဆိုင်ဖွင့်စစ်ဆေးချက် (Morning Opening Checklist)</span>
              </h3>
              <div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ယနေ့ ရွှေပေါက်ဈေးနှုန်းများ စစ်ဆေး/ပြင်ဆင်ပြီး</span>
                  </div>
                  {onNavigateToGoldPrices && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToGoldPrices();
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                    >
                      ဈေးနှုန်းပြင်ရန်
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900 border border-stone-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ငွေရှင်းကောင်တာများနှင့် အံဆွဲများ အဆင်သင့်ရှိပါသည်</span>
                </div>
              </div>
            </div>
          )}

          {/* Staff Manager PIN Verification (if user is Staff) */}
          {!isAuthorized && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Lock className="w-4 h-4" />
                <span>မန်နေဂျာ/Admin အတည်ပြုချက် လိုအပ်ပါသည်</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                အရောင်းစာရေး (Staff) အကောင့်ဖြင့် ဆိုင်ဖွင့်/ပိတ် မပြုလုပ်နိုင်ပါ။ မန်နေဂျာ သို့မဟုတ် Admin ၏ PIN နံပါတ် (၄ လုံး) ရိုက်ထည့်ပေးပါ -
              </p>
              <input
                type="password"
                maxLength={6}
                value={managerPin}
                onChange={(e) => {
                  setManagerPin(e.target.value.replace(/\D/g, ''));
                  setPinError(null);
                }}
                placeholder="Manager / Admin PIN (ဂဏန်း ၄ လုံး)"
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 font-mono text-center text-sm tracking-widest focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Error Message */}
          {pinError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Success Message */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            မလုပ်တော့ပါ (Cancel)
          </button>

          <button
            type="button"
            onClick={handleToggleStore}
            disabled={loading}
            className={`flex-1 sm:flex-none sm:min-w-[180px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              storeOperation.isOpen
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {storeOperation.isOpen ? (
              <>
                <DoorClosed className="w-4 h-4" />
                <span>{loading ? 'ဆိုင်ပိတ်နေပါသည်...' : 'ယနေ့အတွက် ဆိုင်ပိတ်မည် (Close Store)'}</span>
              </>
            ) : (
              <>
                <DoorOpen className="w-4 h-4" />
                <span>{loading ? 'ဆိုင်ဖွင့်နေပါသည်...' : 'ယနေ့အတွက် ဆိုင်ဖွင့်မည် (Open Store)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
