import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useGoldShop } from '../context/GoldShopContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { isSyncing, syncAllToSupabase, isSupabaseConnected } = useGoldShop();
  const [justReconnected, setJustReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setJustReconnected(false);
    } else if (wasOffline && isOnline) {
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
        setWasOffline(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // If online and not just reconnected, don't show the bottom floating banner
  if (isOnline && !justReconnected) {
    return null;
  }

  // Just reconnected state
  if (justReconnected) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-emerald-200">အင်တာနက်လိုင်း ပြန်လည်ရရှိပါပြီ (Online)</div>
          <div className="text-emerald-300/80 text-[11px] mt-0.5">
            Local စာရင်းများကို Cloud သို့ အလိုအလျောက် Sync ပြုလုပ်နေပါသည်...
          </div>
        </div>
      </div>
    );
  }

  // Offline mode
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 bg-stone-900/95 backdrop-blur-md border border-amber-500/40 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <span>Offline စက်တွင်းသီးသန့်မုဒ်</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-stone-300 text-[11px] mt-0.5">
            အရောင်းစာရင်းများကို စက်ထဲတွင် လုံခြုံစွာသိမ်းဆည်းနေပါသည်။ အင်တာနက်ပြန်ရပါက အလိုအလျောက် Cloud သို့ တင်ပေးပါမည်။
          </div>
        </div>
      </div>

      {isSupabaseConnected && (
        <button
          type="button"
          onClick={() => syncAllToSupabase()}
          disabled={isSyncing}
          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 border border-stone-700"
          title="ပြန်လည်ချိတ်ဆက်စမ်းသပ်ရန်"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>စစ်ဆေး</span>
        </button>
      )}
    </div>
  );
};
