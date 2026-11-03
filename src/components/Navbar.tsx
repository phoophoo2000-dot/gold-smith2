import React, { useState, useMemo } from 'react';
import { useGoldShop, isProfileDeleted } from '../context/GoldShopContext';
import { formatMMK, sortGoldPricesAscending } from '../services/calculationEngine';
import { getPurityTheme } from '../utils/purityTheme';
import { ConnectSupabaseModal } from './ConnectSupabaseModal';
import { DeveloperGateModal, isDeveloperSessionActive } from './DeveloperGateModal';
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowDownCircle,
  Gem,
  Coins,
  Users,
  ReceiptText,
  BarChart3,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCog,
  Globe,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff,
  Lock,
  LogOut,
  DoorClosed,
  DoorOpen,
  KeyRound,
  Menu,
  X,
  Store,
  Hammer,
  Maximize2,
  Minimize2,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { KioskModeModal } from './KioskModeModal';
import { MobileCloudConnectModal } from './MobileCloudConnectModal';
import { useKioskMode } from '../hooks/useKioskMode';
import { UserRole } from '../types/gold';

export type NavTab =
  | 'dashboard'
  | 'sales'
  | 'buy'
  | 'inventory'
  | 'workshop'
  | 'gold-prices'
  | 'customers'
  | 'users'
  | 'expenses'
  | 'reports'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenQuickPriceModal: () => void;
  onOpenPinLoginModal: (targetUserId?: string) => void;
  onOpenShiftModal?: () => void;
  onOpenCounterModal?: () => void;
  onOpenStoreModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickPriceModal,
  onOpenPinLoginModal,
  onOpenShiftModal,
  onOpenCounterModal,
  onOpenStoreModal,
}) => {
  const {
    settings,
    currentUser,
    userProfiles,
    currentCounter,
    storeOperation,
    switchUserRole,
    language,
    setLanguage,
    goldPrices,
    isSupabaseConnected,
    isOnline,
    isSyncing,
    lastSyncedTime,
    lockSession,
  } = useGoldShop();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showDeveloperGate, setShowDeveloperGate] = useState(false);
  const [showMobileCloudModal, setShowMobileCloudModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const { isFullscreen, toggleKiosk } = useKioskMode();

  const handleOpenDeveloperPortal = () => {
    if (isDeveloperSessionActive()) {
      setShowSupabaseModal(true);
    } else {
      setShowDeveloperGate(true);
    }
  };

  const handleClickDbBadge = () => {
    if (!isSupabaseConnected) {
      // Direct, one-tap mobile and desktop connection without passcode roadblock
      setShowMobileCloudModal(true);
    } else {
      handleOpenDeveloperPortal();
    }
  };

  // Global Developer Shortcut: Ctrl + Shift + D (or Cmd + Shift + D)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        handleOpenDeveloperPortal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const headerActionsScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = React.useCallback(() => {
    if (headerActionsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = headerActionsScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  }, []);

  React.useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    // Also recheck on mount after layouts have settled
    const timer = setTimeout(checkScroll, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [checkScroll]);

  const scrollHeaderActions = (direction: 'left' | 'right') => {
    if (headerActionsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      headerActionsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  const safeGoldPrices = Array.isArray(goldPrices) ? goldPrices : [];
  const sortedTickerPrices = useMemo(() => sortGoldPricesAscending(safeGoldPrices), [safeGoldPrices]);

  const userRole = currentUser?.role || 'Staff';
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager';
  const isStaff = userRole === 'Staff';

  const navItems: {
    id: NavTab;
    labelMm: string;
    labelEn: string;
    icon: React.ElementType;
    minRole?: 'Admin' | 'Manager' | 'Staff';
  }[] = [
    { id: 'dashboard', labelMm: 'ပင်မစာမျက်နှာ', labelEn: 'Dashboard', icon: LayoutDashboard, minRole: 'Staff' },
    { id: 'sales', labelMm: 'အရောင်း (POS)', labelEn: 'Sales (POS)', icon: ShoppingCart, minRole: 'Staff' },
    { id: 'buy', labelMm: 'ရွှေဝယ်ယူခြင်း', labelEn: 'Buy Gold', icon: ArrowDownCircle, minRole: 'Staff' },
    { id: 'inventory', labelMm: 'ပစ္စည်းလက်ကျန် (Stock)', labelEn: 'Inventory', icon: Gem, minRole: 'Staff' },
    { id: 'workshop', labelMm: 'ပန်းထိမ်နှင့် ရွှေကျို', labelEn: 'Workshop & Orders', icon: Hammer, minRole: 'Staff' },
    { id: 'gold-prices', labelMm: 'နေ့စဉ်ရွှေဈေး', labelEn: 'Gold Prices', icon: Coins, minRole: 'Staff' },
    { id: 'customers', labelMm: 'ဖောက်သည်များ', labelEn: 'Customers', icon: Users, minRole: 'Staff' },
    { id: 'users', labelMm: 'အသုံးပြုသူ/Database', labelEn: 'Users & DB', icon: UserCog, minRole: 'Manager' },
    { id: 'expenses', labelMm: 'အသုံးစရိတ်', labelEn: 'Expenses', icon: ReceiptText, minRole: 'Manager' },
    { id: 'reports', labelMm: 'အစီရင်ခံစာများ', labelEn: 'Reports', icon: BarChart3, minRole: 'Manager' },
    { id: 'settings', labelMm: 'ဆက်တင်', labelEn: 'Settings', icon: Settings, minRole: 'Admin' },
  ];

  const isTabAllowed = (minRole?: 'Admin' | 'Manager' | 'Staff') => {
    if (!minRole || minRole === 'Staff') return true;
    if (minRole === 'Manager') return isAdmin || isManager;
    if (minRole === 'Admin') return isAdmin;
    return false;
  };

  // Helper to format clean display name from currentUser for Staff
  const getStaffDisplayName = () => {
    const raw = (currentUser?.name || '').trim();
    if (!raw) return 'Staff (အရောင်းစာရေး)';

    // If already contains (အရောင်းစာရေး), clean redundant brackets if any
    if (raw.includes('အရောင်းစာရေး')) {
      const cleanPrefix = raw.replace(/\s*\([^)]*အရောင်းစာရေး[^)]*\)/gi, '').trim();
      return cleanPrefix ? `${cleanPrefix} (အရောင်းစာရေး)` : raw;
    }

    // Strip any generic "(Staff)" or "/ Staff"
    const clean = raw.replace(/\s*\((Staff|\/ Staff|Staff Member)[^)]*\)/gi, '').trim();
    if (!clean || clean.toLowerCase() === 'staff') {
      return 'Staff (အရောင်းစာရေး)';
    }

    return `${clean} (အရောင်းစာရေး)`;
  };

  const getRoleBadge = () => {
    const rawName = (currentUser?.name || '').trim();

    if (isAdmin) {
      const cleanAdmin = rawName.replace(/\s*\((အုပ်ချုပ်သူ|Admin)[^)]*\)/gi, '').trim();
      const label = !cleanAdmin || cleanAdmin.toLowerCase() === 'admin'
        ? 'Admin (အုပ်ချုပ်သူ)'
        : `${cleanAdmin} (Admin)`;
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30',
        icon: ShieldCheck,
        label,
      };
    }
    if (isManager) {
      const cleanManager = rawName.replace(/\s*\((မန်နေဂျာ|Manager)[^)]*\)/gi, '').trim();
      const label = !cleanManager || cleanManager.toLowerCase() === 'manager'
        ? 'Manager (မန်နေဂျာ)'
        : `${cleanManager} (Manager)`;
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30',
        icon: UserCog,
        label,
      };
    }

    return {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30',
      icon: UserCheck,
      label: getStaffDisplayName(),
    };
  };

  // Dynamic Staff members list for switching
  const staffList = useMemo(() => {
    const list: { id: string; full_name: string; email?: string }[] = [];
    const seen = new Set<string>();

    if (userProfiles && userProfiles.length > 0) {
      userProfiles
        .filter((p) => !isProfileDeleted(p) && p.role === 'Staff')
        .forEach((p) => {
          const key = (p.id || p.email || p.full_name).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id: p.id, full_name: p.full_name, email: p.email });
          }
        });
    }

    if (list.length === 0) {
      list.push(
        { id: 'usr_staff', full_name: 'မနွယ်နွယ် (အရောင်းစာရေး)', email: 'staff@goldshop.com' },
        { id: 'staff_phoo', full_name: 'Phoo (အရောင်းစာရေး)', email: 'phoophoo.2000@gmail.com' }
      );
    }

    return list;
  }, [userProfiles]);

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  return (
    <header className="sticky top-0 z-50 bg-stone-950 text-stone-100 shadow-md border-b border-stone-800 pt-[env(safe-area-inset-top,0px)]">
      {/* Mobile Top Safe-Area Backdrop Shield - Prevents page elements from bleeding through above the header */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top,0px)] bg-stone-950 z-50 pointer-events-none" />

      {/* Row 1: Today's Gold Prices Live Ticker */}
      <div className="bg-stone-950 border-b border-stone-800/90 px-3 sm:px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 overflow-x-auto py-0.5 custom-scrollbar-x whitespace-nowrap min-w-0 flex-1"
            onWheel={(e) => {
              if (e.deltaY !== 0 && !e.deltaX) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('gold-prices')}
              className="flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0 cursor-pointer text-xs"
              title="နေ့စဉ်ရွှေဈေးသို့ သွားမည်"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">ယနေ့ရွှေဈေး:</span>
            </button>

            {sortedTickerPrices.map((gp, idx) => {
              const theme = getPurityTheme(gp?.purity || '16_PE', idx);
              return (
                <div
                  key={gp.id || idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] whitespace-nowrap shrink-0 shadow-sm border ${theme.tickerPill}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${theme.tickerDot}`} />
                  <span className={`font-bold ${theme.tickerLabel} whitespace-nowrap`}>
                    {gp?.purityLabel || gp?.purity}
                  </span>
                  <span className="text-stone-300 font-semibold whitespace-nowrap">ရောင်း:</span>
                  <span className="font-mono font-black text-amber-300 text-xs tracking-wider whitespace-nowrap drop-shadow-sm">
                    {formatMMK(gp.sellPrice)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Price Update Shortcut */}
          {(isAdmin || isManager) && (
            <button
              type="button"
              onClick={onOpenQuickPriceModal}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-800/80 hover:bg-stone-750 text-amber-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-stone-700 shrink-0 whitespace-nowrap"
              title="ရွှေဈေးပြင်ရန်"
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>ဈေးနှုန်းပြင်</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Brand Logo + System Controls (Status, Language, Lock, PIN, Role) */}
      <div className="bg-stone-900 px-3 sm:px-6 py-2 border-b border-stone-800/70">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Shop Name */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0 min-w-0"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20 shrink-0">
              <Coins className="w-5 h-5 text-stone-950" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
                <span className="truncate">{settings.shopNameMm || settings.shopName}</span>
              </div>
              <p className="text-[10px] text-stone-400 leading-none truncate hidden sm:block">
                Gold POS & Shop Management
              </p>
            </div>
          </div>

          {/* System Control Badges with Smooth Horizontal Scrolling and Grab Bar */}
          <div className="relative min-w-0 flex-1 flex items-center justify-end max-w-full">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollHeaderActions('left')}
                className="hidden sm:flex items-center justify-center w-6 h-6 bg-stone-800/95 hover:bg-stone-750 text-amber-400 rounded-md shrink-0 transition-all cursor-pointer mr-1.5 border border-stone-700 shadow-sm z-10"
                title="ဘယ်ဘက်သို့ ရွှေ့ရန် (Scroll Left)"
                aria-label="Scroll header buttons left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              ref={headerActionsScrollRef}
              onScroll={checkScroll}
              className="flex-1 min-w-0 overflow-x-auto custom-scrollbar-x py-1 pb-1.5 scroll-smooth"
              onWheel={(e) => {
                if (e.deltaY !== 0 && !e.deltaX) {
                  e.currentTarget.scrollLeft += e.deltaY;
                  checkScroll();
                }
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 w-max min-w-full justify-end">
            {/* Supabase Cloud Connectivity Status Badge */}
            <button
              type="button"
              onClick={handleClickDbBadge}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 whitespace-nowrap cursor-pointer hover:scale-102 active:scale-98 ${
                isSupabaseConnected
                  ? isOnline
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-amber-500/50 hover:text-amber-300'
              }`}
              title={
                isSupabaseConnected
                  ? `Supabase Cloud ချိတ်ဆက်ထားသည် ${lastSyncedTime ? `(Last sync: ${lastSyncedTime})` : ''} • Developer Portal ဖွင့်ရန် နှိပ်ပါ (Shortcut: Ctrl + Shift + D)`
                  : 'Local Storage မုဒ် (Supabase ချိတ်ဆက်မထားပါ) • Developer Portal ဖွင့်ရန် နှိပ်ပါ (Shortcut: Ctrl + Shift + D)'
              }
            >
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-400" />
              )}
              <span>{isSupabaseConnected ? (isSyncing ? 'Syncing...' : 'Cloud DB') : 'Local DB'}</span>
            </button>

            {/* Full-screen Kiosk Mode Button */}
            <button
              type="button"
              onClick={() => setShowKioskModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap shadow-xs ${
                isFullscreen
                  ? 'bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/60 shadow-emerald-500/10'
                  : 'bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-amber-300 border-stone-700'
              }`}
              title={isFullscreen ? 'Kiosk Mode ဖွင့်ထားသည် (နှိပ်၍ စီမံရန် သို့မဟုတ် ထွက်ရန်)' : 'Full-screen Kiosk Mode သို့ ပြောင်းလဲရန်'}
            >
              {isFullscreen ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kiosk On</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kiosk Mode</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'my' ? 'en' : 'my')}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-750 rounded-lg text-[11px] text-stone-300 font-medium transition-colors cursor-pointer border border-stone-700 shrink-0 whitespace-nowrap"
              title="ဘာသာစကားပြောင်းလဲရန်"
            >
              <Globe className="w-3 h-3 text-stone-400" />
              <span>{language === 'my' ? 'မြန်မာ (MY)' : 'English (EN)'}</span>
            </button>

            {/* Screen Lock Button */}
            <button
              type="button"
              onClick={lockSession}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-amber-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border border-stone-700 shrink-0 whitespace-nowrap"
              title="စနစ်လုံခြုံရေး သော့ခတ်မည် (Lock Screen)"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Lock</span>
            </button>

            {/* Shift Handover & Logout Button */}
            {onOpenShiftModal && (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-rose-950/80 text-stone-300 hover:text-rose-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border border-stone-700 shrink-0 whitespace-nowrap"
                title="အဆိုင်းသိမ်း စာရင်းချုပ် / Logout"
              >
                <DoorClosed className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">အဆိုင်းသိမ်း</span>
                <span className="sm:hidden">Logout</span>
              </button>
            )}

            {/* Daily Store Open/Close Status Button */}
            {onOpenStoreModal && (
              <button
                type="button"
                onClick={onOpenStoreModal}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap shadow-xs ${
                  storeOperation?.isOpen
                    ? 'bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border-emerald-500/50'
                    : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-500/60 animate-pulse'
                }`}
                title="နေ့စဉ် ဆိုင်ဖွင့်/ဆိုင်ပိတ် စီမံရန် (Daily Store Operating Control)"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    storeOperation?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {storeOperation?.isOpen ? (
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <DoorClosed className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className="hidden sm:inline">{storeOperation?.isOpen ? 'ဆိုင်ဖွင့်ထားသည်' : 'ဆိုင်ပိတ်ထားသည်'}</span>
                <span className="sm:hidden">{storeOperation?.isOpen ? 'ဖွင့်' : 'ပိတ်'}</span>
              </button>
            )}

            {/* Terminal / Counter Selector Chip */}
            {onOpenCounterModal && (
              <button
                type="button"
                onClick={onOpenCounterModal}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-amber-600/50 shrink-0 whitespace-nowrap"
                title="ငွေရှင်းကောင်တာ လဲလှယ်သတ်မှတ်ရန် (Terminal / Counter)"
              >
                <Store className="w-3 h-3 text-amber-400" />
                <span className="hidden md:inline">{currentCounter?.name || 'ကောင်တာ'}</span>
                <span className="font-mono text-[10px] bg-amber-500/30 text-amber-200 px-1 rounded font-extrabold">
                  {currentCounter?.id || 'C1'}
                </span>
              </button>
            )}

            {/* PIN Entry / Switch User */}
            <button
              type="button"
              onClick={() => onOpenPinLoginModal()}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-amber-500/40 shrink-0 whitespace-nowrap"
              title="PIN ဖြင့် အကောင့်ပြောင်းဝင်ရန်"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>PIN ဝင်ပေါက်</span>
            </button>

            {/* Role Switcher Badge */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${roleBadge.bg}`}
                title={`လက်ရှိ PIN ဖြင့် ဝင်ရောက်ထားသူ: ${currentUser?.name || roleBadge.label} (${currentUser?.role || 'Staff'}) - နှိပ်၍ အကောင့်/Role လဲလှယ်ရန်`}
              >
                <RoleIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[170px] sm:max-w-xs">{roleBadge.label}</span>
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-1.5 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl py-1.5 z-[60] text-xs">
                  <div className="px-3 py-1.5 border-b border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>Role လဲလှယ်အသုံးပြုပါ:</span>
                    <span className="font-mono text-emerald-300 font-bold text-[10px] truncate max-w-[130px]" title={currentUser.name}>
                      {currentUser.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleDropdown(false);
                      onOpenPinLoginModal('usr_admin');
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-800 cursor-pointer ${
                      isAdmin ? 'text-rose-400 font-bold bg-stone-800/60' : 'text-stone-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-rose-300">Admin (ဆိုင်ရှင်/အုပ်ချုပ်သူ)</div>
                      <div className="text-[10px] text-stone-400">အပြည့်အဝ စီမံခွင့်၊ ဆက်တင်၊ အမြတ်/အရှုံး</div>
                    </div>
                    {isAdmin ? (
                      <span className="text-rose-400 font-bold text-sm shrink-0">✓</span>
                    ) : (
                      <KeyRound className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleDropdown(false);
                      onOpenPinLoginModal('usr_manager');
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-800 cursor-pointer border-t border-stone-800/70 ${
                      isManager ? 'text-amber-400 font-bold bg-stone-800/60' : 'text-stone-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-amber-300">Manager (ဆိုင်မန်နေဂျာ)</div>
                      <div className="text-[10px] text-stone-400">စတော့ခ်၊ ဈေးနှုန်း၊ Override ခွင့်ပြုချက်</div>
                    </div>
                    {isManager ? (
                      <span className="text-amber-400 font-bold text-sm shrink-0">✓</span>
                    ) : (
                      <KeyRound className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    )}
                  </button>

                  {/* Dynamic Staff accounts list */}
                  <div className="max-h-56 overflow-y-auto custom-scrollbar-y">
                    {staffList.map((st) => {
                      const isCurrent =
                        isStaff &&
                        (currentUser.id === st.id ||
                          currentUser.name?.toLowerCase() === st.full_name?.toLowerCase() ||
                          (currentUser.email && st.email && currentUser.email.toLowerCase() === st.email.toLowerCase()));
                      const cleanName = st.full_name?.replace(/\s*\((အရောင်းစာရေး|Staff)[^)]*\)/gi, '').trim() || st.full_name;

                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setShowRoleDropdown(false);
                            onOpenPinLoginModal(st.id);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-800 cursor-pointer border-t border-stone-800/70 ${
                            isCurrent ? 'text-emerald-400 font-bold bg-stone-800/60' : 'text-stone-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-emerald-300 truncate">Staff: {cleanName} (အရောင်းစာရေး)</div>
                            <div className="text-[10px] text-stone-400 truncate">အရောင်း/အဝယ် POS၊ ဘောက်ချာထုတ်ပေးခြင်း</div>
                          </div>
                          {isCurrent ? (
                            <span className="text-emerald-400 font-bold text-sm shrink-0">✓</span>
                          ) : (
                            <KeyRound className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {onOpenShiftModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenShiftModal();
                      }}
                      className="w-full text-left px-3 py-2 flex items-center justify-between text-rose-300 hover:bg-rose-950/40 cursor-pointer border-t border-stone-800"
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <DoorClosed className="w-3.5 h-3.5 text-rose-400" />
                        <span>အဆိုင်းသိမ်း စာရင်းချုပ် / Logout</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Shift End</span>
                    </button>
                  )}

                  <div className="border-t border-stone-800 p-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenPinLoginModal();
                      }}
                      className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded text-[11px] font-semibold text-center cursor-pointer"
                    >
                      PIN ရိုက်ထည့်ဝင်မည်
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleDropdown(false);
                        lockSession();
                      }}
                      className="py-1.5 px-2.5 bg-stone-800 hover:bg-stone-750 text-amber-400 rounded text-[11px] font-semibold text-center cursor-pointer flex items-center gap-1"
                      title="Lock Screen"
                    >
                      <Lock className="w-3.5 h-3.5 inline" />
                      <span>Lock</span>
                    </button>
                  </div>

                  <div className="px-3 py-1 bg-stone-950/70 border-t border-stone-800/80 text-[10px] text-stone-400 flex items-center justify-between">
                    <span>Auto-Lock Timer:</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {settings?.autoLockMinutes && settings.autoLockMinutes > 0
                        ? settings.autoLockMinutes < 1
                          ? `${Math.round(settings.autoLockMinutes * 60)} စက္ကန့်`
                          : `${settings.autoLockMinutes} မိနစ်`
                        : 'ပိတ်ထားသည်'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollHeaderActions('right')}
                className="hidden sm:flex items-center justify-center w-6 h-6 bg-stone-800/95 hover:bg-stone-750 text-amber-400 rounded-md shrink-0 transition-all cursor-pointer ml-1.5 border border-stone-700 shadow-sm z-10"
                title="ညာဘက်သို့ ရွှေ့ရန် (Scroll Right)"
                aria-label="Scroll header buttons right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Navigation Menu Tabs (Clean, uncompressed horizontal scrollable bar) */}
      <div className="bg-stone-950/95 border-b border-stone-800/80 px-2 sm:px-6">
        <div
          className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-2.5 custom-scrollbar-x"
          onWheel={(e) => {
            if (e.deltaY !== 0 && !e.deltaX) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const allowed = isTabAllowed(item.minRole);
            if (!allowed) return null;

            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer leading-relaxed ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span className="whitespace-nowrap py-0.5">{language === 'my' ? item.labelMm : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Kiosk Quick Indicator / Exit Pill (Only shown when in Fullscreen) */}
      {isFullscreen && (
        <div className="fixed bottom-3 right-3 z-[60] flex items-center gap-2 px-3 py-1.5 bg-stone-900/95 text-stone-200 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-xs text-xs animate-in fade-in transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-300 text-[11px]">Kiosk Mode (F11 / Esc)</span>
          <button
            type="button"
            onClick={toggleKiosk}
            className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-[10px] font-bold border border-stone-600 cursor-pointer ml-1"
            title="Kiosk Mode မှ ပြန်ထွက်မည်"
          >
            Exit Kiosk
          </button>
        </div>
      )}

      {showSupabaseModal && (
        <ConnectSupabaseModal
          isOpen={showSupabaseModal}
          onClose={() => setShowSupabaseModal(false)}
        />
      )}

      {showDeveloperGate && (
        <DeveloperGateModal
          isOpen={showDeveloperGate}
          onClose={() => setShowDeveloperGate(false)}
          onSuccess={() => setShowSupabaseModal(true)}
        />
      )}

      {showMobileCloudModal && (
        <MobileCloudConnectModal
          isOpen={showMobileCloudModal}
          onClose={() => setShowMobileCloudModal(false)}
          onOpenDeveloperPortal={handleOpenDeveloperPortal}
        />
      )}

      {showKioskModal && (
        <KioskModeModal
          isOpen={showKioskModal}
          onClose={() => setShowKioskModal(false)}
        />
      )}
    </header>
  );
};
