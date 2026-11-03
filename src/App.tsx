import React, { useState, useEffect, useRef } from 'react';
import { GoldShopProvider, useGoldShop } from './context/GoldShopContext';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sale } from './types/gold';

import { PosSale } from './components/PosSale';
import { BuyGold } from './components/BuyGold';
import { Inventory } from './components/Inventory';
import { WorkshopOrders } from './components/WorkshopOrders';
import { DailyGoldPrices } from './components/DailyGoldPrices';
import { CustomersSuppliers } from './components/CustomersSuppliers';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { ShopSettingsView } from './components/ShopSettingsView';
import { UserManagement } from './components/UserManagement';
import { InvoiceModal } from './components/InvoiceModal';
import { QuickPriceModal } from './components/QuickPriceModal';
import { QuickPinLoginModal } from './components/QuickPinLoginModal';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';
import { CounterSelectModal } from './components/CounterSelectModal';
import { StoreOpenCloseModal } from './components/StoreOpenCloseModal';
import { MobileCloudConnectModal } from './components/MobileCloudConnectModal';
import { useIdleAutoLock } from './hooks/useIdleAutoLock';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = sessionStorage.getItem('gold_pos_active_tab') || localStorage.getItem('gold_pos_active_tab');
      return (saved as NavTab) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Track the exact tab the user was working on prior to lock
  const lockedOriginalTabRef = useRef<NavTab>(activeTab);

  useEffect(() => {
    try {
      sessionStorage.setItem('gold_pos_active_tab', activeTab);
      localStorage.setItem('gold_pos_active_tab', activeTab);
    } catch {}
  }, [activeTab]);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [showQuickPrice, setShowQuickPrice] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showMobileCloudModal, setShowMobileCloudModal] = useState(false);
  const [targetPinUser, setTargetPinUser] = useState<string | undefined>(undefined);

  // Auto-sync notification banner (e.g. after camera QR scan on iPhone)
  const [autoSyncNotice, setAutoSyncNotice] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (window.localStorage.getItem('gold_shop_last_sync_method') === 'url_auto_import') {
          window.localStorage.removeItem('gold_shop_last_sync_method');
          return '✓ Supabase Cloud Database နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!';
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    if (autoSyncNotice) {
      const timer = setTimeout(() => setAutoSyncNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [autoSyncNotice]);

  const {
    settings,
    currentUser,
    storeOperation,
    isLocked,
    logout,
    lockSession,
    isSupabaseConnected,
  } = useGoldShop();

  // Inactivity auto-lock hook: Automatically locks screen after timeoutMinutes of no user interaction
  useIdleAutoLock({
    timeoutMinutes: settings?.autoLockMinutes ?? 3,
    isLocked,
    onLock: lockSession,
  });

  // Track activeTab while not locked
  useEffect(() => {
    if (!isLocked) {
      lockedOriginalTabRef.current = activeTab;
    }
  }, [activeTab, isLocked]);

  // When session unlocks, always restore the original activeTab exactly
  const wasLockedRef = useRef(isLocked);
  useEffect(() => {
    if (wasLockedRef.current && !isLocked) {
      const orig = lockedOriginalTabRef.current;
      if (orig) {
        setActiveTab(orig);
      }
    }
    wasLockedRef.current = isLocked;
  }, [isLocked]);

  const handleOpenPinLoginModal = (targetUserId?: string) => {
    setTargetPinUser(targetUserId);
    setShowPinLogin(true);
  };



  const role = currentUser?.role || 'Staff';
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';

  const isPhoo =
    (currentUser?.email || '').toLowerCase().includes('phoo') ||
    (currentUser?.name || '').toLowerCase().includes('phoo') ||
    (currentUser?.id || '').toLowerCase().includes('phoo');

  // Role-based permissions for pages
  const canAccessReports = isAdmin || isManager || isPhoo;
  const canAccessExpenses = isAdmin || isManager || isPhoo;
  const canAccessUsers = isAdmin || isManager || isPhoo || activeTab === 'users';
  const canAccessSettings = isAdmin || isPhoo;

  return (
    <div className="min-h-screen bg-stone-200 flex flex-col font-sans text-stone-900">
      {/* Top Navigation & Live Ticker */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickPriceModal={() => setShowQuickPrice(true)}
        onOpenPinLoginModal={handleOpenPinLoginModal}
        onOpenShiftModal={() => setShowShiftModal(true)}
        onOpenCounterModal={() => setShowCounterModal(true)}
        onOpenStoreModal={() => setShowStoreModal(true)}
      />

      {/* Instant Cloud Sync Confirmation Banner (e.g. Scanned on iPhone X) */}
      {autoSyncNotice && (
        <div className="no-print bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200">
          <span>{autoSyncNotice}</span>
          <button
            type="button"
            onClick={() => setAutoSyncNotice(null)}
            className="text-white/80 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Local DB Reminder Banner (for iPhone X Standalone or unconfigured clients) */}
      {!isSupabaseConnected && (
        <div className="no-print bg-stone-900 border-b border-amber-500/50 text-amber-200 px-3 sm:px-6 py-2 text-xs shadow-md animate-in slide-in-from-top-1">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-bold text-stone-100">
                ⚠️ Local DB မုဒ်ဖြစ်နေပါသည် (Offline Mock Data)
              </span>
              <span className="hidden sm:inline text-stone-300 text-[11px]">
                • Supabase Cloud DB သို့ ချိတ်ဆက်၍ စာရင်းများ တပြေးညီ အသုံးပြုနိုင်ပါသည်
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileCloudModal(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs shrink-0"
            >
              Cloud DB ချိတ်ဆက်မည်
            </button>
          </div>
        </div>
      )}

      {/* Store Closed Global Warning Banner */}
      {!storeOperation?.isOpen && (
        <div className="no-print bg-rose-950/95 border-b border-rose-800 text-rose-200 px-3 sm:px-6 py-2.5 text-xs shadow-md animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="font-bold text-rose-100">
                🔴 ယခုအချိန်တွင် ဆိုင်ပိတ်ထားပါသည် (Shop Closed / After Hours)
              </span>
              <span className="hidden sm:inline text-rose-300 text-[11px]">
                • အရောင်းဘောက်ချာနှင့် ငွေရှင်းကောင်တာများ ခေတ္တရပ်နားထားပါသည် (Transactions Locked)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowStoreModal(true)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shrink-0"
            >
              ဆိုင်ပြန်ဖွင့်မည် / အခြေအနေကြည့်ရန်
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-5 pb-8 overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            onSelectSaleForInvoice={setSelectedSaleForInvoice}
            onOpenQuickPriceModal={() => setShowQuickPrice(true)}
          />
        )}

        {activeTab === 'sales' && (
          <PosSale onOpenInvoice={setSelectedSaleForInvoice} />
        )}

        {activeTab === 'buy' && <BuyGold />}

        {activeTab === 'inventory' && <Inventory />}

        {activeTab === 'workshop' && <WorkshopOrders onNavigateTab={setActiveTab} />}

        {activeTab === 'gold-prices' && <DailyGoldPrices />}

        {activeTab === 'customers' && <CustomersSuppliers />}

        {activeTab === 'users' && canAccessUsers && <UserManagement onNavigateTab={setActiveTab} />}

        {activeTab === 'expenses' && canAccessExpenses && <Expenses />}

        {activeTab === 'reports' && canAccessReports && <Reports />}

        {activeTab === 'settings' && canAccessSettings && <ShopSettingsView />}
      </main>

      {/* Footer */}
      <footer className="no-print bg-stone-900 text-stone-400 text-xs py-4 border-t border-stone-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="text-stone-200 font-semibold">{settings?.shopName || 'ရွှေဆိုင် POS'}</span> •{' '}
            <span>{settings?.tagline || ''}</span>
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            Myanmar Gold POS & Management Engine (1 ကျပ် = 16 ပဲ = 128 ရွေး) • v1.0
          </div>
        </div>
      </footer>

      {/* Printable Invoice Modal */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          sale={selectedSaleForInvoice}
          onClose={() => setSelectedSaleForInvoice(null)}
        />
      )}

      {/* Quick Price Update Modal */}
      {showQuickPrice && (
        <QuickPriceModal
          isOpen={showQuickPrice}
          onClose={() => setShowQuickPrice(false)}
        />
      )}

      {/* PIN Login Modal (Unlocked or invoked by user) */}
      {showPinLogin && !isLocked && (
        <QuickPinLoginModal
          isOpen={showPinLogin}
          onClose={() => {
            setShowPinLogin(false);
            setTargetPinUser(undefined);
          }}
          onSuccess={() => {
            setActiveTab('dashboard');
            setShowPinLogin(false);
            setTargetPinUser(undefined);
          }}
          isLockScreen={false}
          initialUserId={targetPinUser}
        />
      )}

      {/* Locked Screen Mode (Full screen PIN lock: 3-minute timeout or manual lock) */}
      {isLocked && (
        <QuickPinLoginModal
          isOpen={isLocked}
          onSuccess={() => {
            // Screen lock ပြန်ဖွင့်ချိန်တွင် နဂိုမူလ ဝင်ရောက်လုပ်ကိုင်နေသော စာမျက်နှာ (activeTab) သို့ မပျက်မကွက် ပြန်လည်ရောက်ရှိစေပါသည်
            const orig = lockedOriginalTabRef.current;
            if (orig) {
              setActiveTab(orig);
            }
          }}
          isLockScreen={true}
          initialUserId={targetPinUser || currentUser?.id}
        />
      )}

      {/* Shift Handover & Logout Modal */}
      {showShiftModal && (
        <ShiftHandoverModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          onConfirmLogout={() => {
            setShowShiftModal(false);
            logout();
          }}
        />
      )}

      {/* Terminal / Counter Selection Modal */}
      {showCounterModal && (
        <CounterSelectModal
          isOpen={showCounterModal}
          onClose={() => setShowCounterModal(false)}
        />
      )}

      {/* Daily Store Open / Close Operation Modal */}
      {showStoreModal && (
        <StoreOpenCloseModal
          isOpen={showStoreModal}
          onClose={() => setShowStoreModal(false)}
          onNavigateToGoldPrices={() => setActiveTab('gold-prices')}
        />
      )}

      {/* Mobile Cloud Connect Modal (Quick reconnect for iPhone X Standalone or unconfigured clients) */}
      {showMobileCloudModal && (
        <MobileCloudConnectModal
          isOpen={showMobileCloudModal}
          onClose={() => setShowMobileCloudModal(false)}
        />
      )}

      {/* Connectivity & Offline Mode Indicator Banner */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GoldShopProvider>
        <MainContent />
      </GoldShopProvider>
    </ErrorBoundary>
  );
}
