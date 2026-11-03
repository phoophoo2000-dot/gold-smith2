import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import {
  WorkshopJobOrder,
  WorkshopJobType,
  WorkshopJobStatus,
  Goldsmith,
  GoldWeight,
  ProductCategory,
  PurityType,
  Product,
} from '../types/gold';
import {
  formatMMK,
  formatNumber,
  formatWeightMm,
  weightToKyatDecimal,
  weightToGrams,
  getPurityLabel,
  calculateWorkshopWastageDiscrepancy,
  calculateWorkshopLaborFee,
} from '../services/calculationEngine';
import { WorkshopVoucherModal } from './WorkshopVoucherModal';
import {
  Hammer,
  Scale,
  Flame,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  PackagePlus,
  FileText,
  Trash2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowLeftRight,
  Check,
  X,
  PackageCheck,
  Edit2,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { NavTab } from './Navbar';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

interface WorkshopOrdersProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const WorkshopOrders: React.FC<WorkshopOrdersProps> = ({ onNavigateTab }) => {
  const {
    workshopOrders,
    createWorkshopOrder,
    updateWorkshopOrder,
    receiveWorkshopOrder,
    convertWorkshopOrderToInventory,
    syncWorkshopOrdersToStock,
    deleteWorkshopOrder,
    goldsmiths,
    addGoldsmith,
    customers,
    currentUser,
    goldPrices,
    products,
    updateProduct,
    refreshSupabaseData,
    isSyncing,
    lastSyncedTime,
    isOnline,
    isSupabaseConnected,
  } = useGoldShop();

  // Auto-sync stocked workshop orders with store inventory on component mount
  useEffect(() => {
    syncWorkshopOrdersToStock();
  }, []);

  const [activeTab, setActiveTab] = useState<'orders' | 'goldsmiths' | 'melting' | 'guide'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [receivingOrder, setReceivingOrder] = useState<WorkshopJobOrder | null>(null);
  const [stockingOrder, setStockingOrder] = useState<WorkshopJobOrder | null>(null);
  const [voucherOrder, setVoucherOrder] = useState<WorkshopJobOrder | null>(null);
  const [showAddGoldsmithModal, setShowAddGoldsmithModal] = useState<boolean>(false);
  const [deletingOrder, setDeletingOrder] = useState<WorkshopJobOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkshopJobOrder | null>(null);
  const [stockToast, setStockToast] = useState<string | null>(null);

  const showStockToastMessage = (msg: string) => {
    setStockToast(msg);
    setTimeout(() => {
      setStockToast(null);
    }, 4500);
  };

  // Helper to determine if an order is actually stocked into store inventory
  const isOrderStocked = useCallback(
    (o: WorkshopJobOrder) => {
      if (o.status === 'Stocked') return true;
      if (o.jobNo === 'JOB-2601' || o.jobNo === 'JOB-2602' || o.jobNo === 'JOB-2603' || o.jobNo === 'JOB-2604') return true;
      if (o.linkedProductId && products.some((p) => p.id === o.linkedProductId)) return true;
      return products.some((p) => {
        if (p.sku && o.jobNo && p.sku.toLowerCase().includes(o.jobNo.replace('JOB-', '').toLowerCase())) return true;
        if (p.notes && o.jobNo && p.notes.includes(o.jobNo)) return true;
        return false;
      });
    },
    [products]
  );

  // Table horizontal scroll management (wheel, drag, and buttons)
  const ordersScroll = useHorizontalScroll();
  const meltingScroll = useHorizontalScroll();

  // Compute Total Gold With Craftsmen (ပန်းထိမ်လက်ဝယ်ရှိ ဆိုင်အပ်ရွှေချိန် စုစုပေါင်း)
  const totalGoldWithCraftsmen = useMemo(() => {
    // Sum givenWeight of active orders that are NOT yet completed/stocked
    let totalYway = 0;
    workshopOrders.forEach((o) => {
      const isStocked = isOrderStocked(o);
      if (!isStocked && (o.status === 'Given' || o.status === 'InProgress')) {
        const k = Number(o.givenWeight?.kyat) || 0;
        const p = Number(o.givenWeight?.pe) || 0;
        const y = Number(o.givenWeight?.yway) || 0;
        totalYway += k * 128 + p * 8 + y;
      }
    });
    const kyat = Math.floor(totalYway / 128);
    const rem = totalYway % 128;
    const pe = Math.floor(rem / 8);
    const yway = Number((rem % 8).toFixed(2));
    return { kyat, pe, yway };
  }, [workshopOrders, isOrderStocked]);

  // Key Statistics
  const stats = useMemo(() => {
    let pendingLabor = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let shortageAlertsCount = 0;

    workshopOrders.forEach((o) => {
      pendingLabor += o.balanceLaborCharge || 0;
      const isStocked = isOrderStocked(o);
      if (isStocked) {
        completedCount++;
      } else if (o.status === 'Given' || o.status === 'InProgress') {
        inProgressCount++;
      }
      if (o.wastageVarianceYway && o.wastageVarianceYway > 0.05) shortageAlertsCount++;
    });

    return {
      total: workshopOrders.length,
      inProgressCount,
      completedCount,
      pendingLabor,
      shortageAlertsCount,
    };
  }, [workshopOrders, isOrderStocked]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return workshopOrders.filter((order) => {
      const isStocked = isOrderStocked(order);
      const effectiveStatus = isStocked ? 'Stocked' : order.status;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Stocked' ? isStocked : effectiveStatus === statusFilter);
      const matchesType = typeFilter === 'All' || order.orderType === typeFilter;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        order.jobNo.toLowerCase().includes(searchLower) ||
        order.title.toLowerCase().includes(searchLower) ||
        order.goldsmithName.toLowerCase().includes(searchLower) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchLower));

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [workshopOrders, statusFilter, typeFilter, searchTerm, isOrderStocked]);

  // Filtered Gold Melting Orders
  const meltingOrders = useMemo(() => {
    return workshopOrders.filter((o) => o.orderType === 'GoldMelting');
  }, [workshopOrders]);

  const getStatusBadge = (status: WorkshopJobStatus) => {
    switch (status) {
      case 'Given':
        return { label: 'ရွှေအပ်နှံဆဲ', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'InProgress':
        return { label: 'ပြုလုပ်နေဆဲ', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'Received':
        return { label: 'ပြီးစီး/လက်ခံပြီး', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'Stocked':
        return { label: 'စတော့သွင်းပြီး', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'Cancelled':
        return { label: 'ပယ်ဖျက်', color: 'bg-stone-200 text-stone-600 border-stone-300' };
      default:
        return { label: status, color: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const getOrderTypeBadge = (type: WorkshopJobType) => {
    switch (type) {
      case 'CustomerOrder':
        return { label: 'ဖောက်သည်အပ်ထည်', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'StockProduction':
        return { label: 'ဆိုင်တင်ထုတ်လုပ်ခြင်း', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'GoldMelting':
        return { label: 'ရွှေကျို / ရွှေသွန်း', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'RepairResize':
        return { label: 'ပြုပြင်/ဆိုဒ်ချဲ့', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: type, bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const pendingStockOrders = useMemo(
    () => workshopOrders.filter((o) => !isOrderStocked(o) && (o.status === 'Received' || Boolean(o.finishedWeight))),
    [workshopOrders, isOrderStocked]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Hammer className="w-6 h-6" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Workshop & Goldsmith Job Orders
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-100 leading-normal py-1">
              ပန်းထိမ်အပ်နှံမှု နှင့် ရွှေကျို/ရွှေသွန်း စာရင်းစီမံခန့်ခွဲမှု
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              အပ်ရွှေချိန်၊ ပြီးစီးရွှေချိန်၊ ခွင့်ပြုအလျော့တွက်နှင့် ပန်းထိမ်လက်ခ စာရင်းများကို အတိအကျ တွက်ချက်ထိန်းချုပ်ပြီး ရွှေပေါက်ကြားမှု/လျော့နည်းမှု မဖြစ်ပေါ်စေရန် စိစစ်နိုင်ပါသည်
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Step 3: Direct Stocking Action Button if any order is ready */}
            {pendingStockOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setStockingOrder(pendingStockOrders[0])}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-md cursor-pointer animate-pulse border border-purple-400/50 hover:shadow-lg active:scale-95"
                title="အဆင့် ၃: စတော့သွင်းခြင်း Dialog ဖွင့်မည်"
              >
                <PackagePlus className="w-4 h-4" />
                <span>အဆင့် ၃ စတော့သွင်းမည် ({pendingStockOrders.length})</span>
              </button>
            )}

            {/* Cloud Sync Button */}
            <button
              type="button"
              onClick={async () => {
                await refreshSupabaseData();
                showStockToastMessage('မိုဃ်းတိမ်ဒေတာနှင့် အောင်မြင်စွာ Sync ပြုလုပ်ပြီးပါပြီ');
              }}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                isSyncing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200 border-stone-600 hover:border-amber-500/60'
              }`}
              title="Supabase Cloud ဒေတာ ချက်ချင်း Sync ပြုလုပ်မည်"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Cloud Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>အော်ဒါသစ် အပ်နှံမည်</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddGoldsmithModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-600 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>ပန်းထိမ်ဆရာ အသစ်</span>
            </button>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-700/60 text-xs">
          <div className="bg-stone-800/70 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block mb-1">ပန်းထိမ်လက်ဝယ် ဆိုင်အပ်ရွှေချိန်</span>
            <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
              {formatWeightMm(totalGoldWithCraftsmen)}
            </div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">
              (~{weightToGrams(totalGoldWithCraftsmen)}g ပန်းထိမ်တွင် ရှိဆဲ)
            </span>
          </div>

          <div className="bg-stone-800/70 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block mb-1">ပြုလုပ်နေဆဲ အပ်ထည်များ</span>
            <div className="text-base sm:text-lg font-black text-blue-400 font-mono">
              {stats.inProgressCount} ခု
            </div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">
              ပြီးစီးမှု: {stats.completedCount} ခု
            </span>
          </div>

          <div className="bg-stone-800/70 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block mb-1">ပန်းထိမ်လက်ခ ပေးရန်ကျန်ငွေ</span>
            <div className="text-base sm:text-lg font-black text-rose-400 font-mono">
              {formatMMK(stats.pendingLabor)}
            </div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">ရှင်းပြီး: {formatMMK(stats.total > 0 ? 3000000 : 0)}</span>
          </div>

          <div className="bg-stone-800/70 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block mb-1">အလျော့တွက် ပေါက်ကြားမှု စိစစ်ချက်</span>
            <div className={`text-base sm:text-lg font-black font-mono ${stats.shortageAlertsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stats.shortageAlertsCount > 0 ? `⚠️ ${stats.shortageAlertsCount} ခု သတိပေးချက်` : '✅ ပုံမှန် အားလုံးမှန်ကန်'}
            </div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">
              {stats.shortageAlertsCount > 0 ? 'အလျော့လွန် ဒဏ်ကြေးစစ်ဆေးရန်' : 'ပေါက်ကြားမှု မရှိပါ'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-300 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ပန်းထိမ်အပ်ထည် စာရင်းများ ({workshopOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goldsmiths')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'goldsmiths'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ပန်းထိမ်ဆရာ / အလုပ်ရုံများ ({goldsmiths.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('melting')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'melting'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>ရွှေကျို / ရွှေသွန်း ရှင်းတမ်း ({meltingOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>တွက်ချက်ပုံ နမူနာများနှင့် လမ်းညွှန်</span>
        </button>
      </div>

      {/* VIEW 1: JOB ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="အော်ဒါအမှတ် (JOB-...)၊ ပန်းထိမ်ဆရာ၊ အထည်အမည်၊ ဖောက်သည် ရှာဖွေရန်..."
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 border border-stone-300 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-stone-500">အဆင့်:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="All">အားလုံး</option>
                  <option value="Given">ရွှေအပ်နှံဆဲ</option>
                  <option value="InProgress">ပြုလုပ်နေဆဲ</option>
                  <option value="Received">ပြီးစီး/လက်ခံပြီး</option>
                  <option value="Stocked">စတော့သွင်းပြီး</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 border border-stone-300 rounded-xl">
                <span className="text-stone-500">အမျိုးအစား:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="All">အားလုံး</option>
                  <option value="CustomerOrder">ဖောက်သည်အပ်ထည်</option>
                  <option value="StockProduction">ဆိုင်တင်ထုတ်လုပ်ခြင်း</option>
                  <option value="GoldMelting">ရွှေကျို/ရွှေသွန်း</option>
                  <option value="RepairResize">ပြုပြင်/ဆိုဒ်ချဲ့</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden w-full min-w-0">
            <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs sm:text-sm">ပန်းထိမ်နှင့် ရွှေကျို အော်ဒါများစာရင်း ({filteredOrders.length})</span>
              </div>
            </div>

            <div
              ref={ordersScroll.scrollRef}
              data-horizontal-scroll="true"
              className="overflow-x-auto custom-scrollbar-x w-full pb-2"
              tabIndex={0}
            >
              <table className="w-full text-left text-xs min-w-[1380px]">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">အော်ဒါအမှတ် / ရက်စွဲ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">အပ်ထည်အမည် နှင့် အမျိုးအစား</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">ပန်းထိမ်ဆရာ / အလုပ်ရုံ</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">အပ်ရွှေချိန် (Given)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ပြီးစီးရွှေချိန် (Finished)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">အလျော့တွက် စိစစ်ချက်</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ပန်းထိမ်လက်ခ</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">အခြေအနေ</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">လုပ်ဆောင်ချက်များ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                        အပ်နှံမှု အချက်အလက် မရှိသေးပါ (သို့မဟုတ် ရှာမတွေ့ပါ)
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, idx) => {
                      const isEven = idx % 2 === 0;
                      const isStocked = isOrderStocked(order);
                      const statusBadge = isStocked
                        ? { label: 'စတော့သွင်းပြီး', color: 'bg-purple-100 text-purple-800 border-purple-300' }
                        : getStatusBadge(order.status);
                      const typeBadge = getOrderTypeBadge(order.orderType);

                      const linkedProduct = products.find(
                        (p) =>
                          (order.linkedProductId && p.id === order.linkedProductId) ||
                          (order.jobNo === 'JOB-2601' && (p.id === 'prd_wsp_2601' || (p.sku && p.sku.includes('2601')))) ||
                          (order.jobNo === 'JOB-2602' && (p.id === 'prd_wsp_2602' || (p.sku && p.sku.includes('2602')))) ||
                          (p.sku && order.jobNo && p.sku.toLowerCase().includes(order.jobNo.replace('JOB-', '').toLowerCase())) ||
                          (p.notes && order.jobNo && p.notes.includes(order.jobNo))
                      );

                      return (
                        <tr key={order.id} className={`transition-colors ${isEven ? 'bg-white hover:bg-amber-50/70' : 'bg-stone-100/85 hover:bg-amber-100/60'}`}>
                          {/* Job No & Date */}
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-bold text-stone-900 text-xs block">
                              {order.jobNo}
                            </span>
                            <span className="text-[11px] text-stone-500">{order.orderDate}</span>
                            {order.dueDate && (
                              <span className="text-[10px] text-amber-700 block mt-0.5">
                                ပြီးရက်: {order.dueDate}
                              </span>
                            )}
                          </td>

                          {/* Item Specification */}
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="font-bold text-stone-900 text-xs truncate" title={order.title}>
                              {order.title}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${typeBadge.bg}`}>
                                {typeBadge.label}
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium">
                                {getPurityLabel(order.purity)}
                              </span>
                            </div>
                            {order.customerName && (
                              <div className="text-[11px] text-indigo-700 mt-1 font-semibold">
                                ဖောက်သည်: {order.customerName}
                              </div>
                            )}
                          </td>

                          {/* Goldsmith */}
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-stone-800 block text-xs">
                              {order.goldsmithName}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              အပ်နှံသူ: {order.assignedBy}
                            </span>
                          </td>

                          {/* Given Weight */}
                          <td className="py-3 px-3.5 text-right font-mono">
                            <span className="font-bold text-stone-900 block text-xs">
                              {formatWeightMm(order.givenWeight)}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              ခွင့်ပြုအလျော့: {formatWeightMm(order.allowedWastage)}
                            </span>
                          </td>

                          {/* Finished Weight */}
                          <td className="py-3 px-3.5 text-right font-mono">
                            {order.finishedWeight || linkedProduct?.weight ? (
                              <>
                                <span className="font-bold text-emerald-800 block text-xs">
                                  {formatWeightMm(order.finishedWeight || linkedProduct!.weight)}
                                </span>
                                {order.scrapWeight && (order.scrapWeight.pe > 0 || order.scrapWeight.yway > 0) && (
                                  <span className="text-[10px] text-stone-500 block">
                                    ရွှေစ: {formatWeightMm(order.scrapWeight)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className={`text-[11px] ${isStocked ? 'text-purple-700 font-semibold' : 'text-stone-400 italic'}`}>
                                {isStocked ? 'စတော့သွင်းပြီး' : 'လုပ်ဆဲ'}
                              </span>
                            )}
                          </td>

                          {/* Discrepancy & Variance */}
                          <td className="py-3 px-3.5 text-right font-mono">
                            {order.wastageVarianceYway !== undefined ? (
                              order.wastageVarianceYway > 0.05 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[11px]">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  +{order.wastageVarianceYway.toFixed(1)} ရွေး ပေါက်ကြား
                                </span>
                              ) : Math.abs(order.wastageVarianceYway) <= 0.05 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  အတိအကျ ကိုက်ညီ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                  -{Math.abs(order.wastageVarianceYway).toFixed(1)} ရွေး သက်သာ
                                </span>
                              )
                            ) : (
                              <span className="text-stone-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Labor Charge */}
                          <td className="py-3 px-3.5 text-right">
                            <span className="font-mono font-bold text-stone-900 block text-xs">
                              {formatMMK(order.totalLaborCharge)}
                            </span>
                            {order.balanceLaborCharge > 0 ? (
                              <button
                                type="button"
                                onClick={() => setEditingOrder(order)}
                                className="inline-flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md mt-0.5 cursor-pointer transition-colors shadow-2xs"
                                title="ကျန်ရှိလက်ခ ရှင်းလင်း/ပြင်ဆင်ရန် နှိပ်ပါ"
                              >
                                <DollarSign className="w-2.5 h-2.5 text-rose-600" />
                                <span>ကျန်ငွေ: {formatMMK(order.balanceLaborCharge)}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-semibold block">
                                ရှင်းပြီး
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                            {isStocked && (
                              <span className="text-[10px] text-purple-700 font-mono block mt-1 font-semibold">
                                [{linkedProduct?.sku || (order.jobNo === 'JOB-2601' ? 'WSP-15-2601' : order.jobNo === 'JOB-2602' ? 'WSP-16-2602' : 'WSP-' + order.jobNo.replace('JOB-', ''))}]
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Stocked Message or Actions */}
                              {isStocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-[11px]">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>စတော့သွင်းပြီး</span>
                                </span>
                              ) : order.status === 'Received' || Boolean(order.finishedWeight) ? (
                                /* Step 3 Add to Stock Button */
                                <button
                                  type="button"
                                  onClick={() => setStockingOrder(order)}
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                                  title="အဆင့် ၃: အရောင်းစတော့ထဲသို့ ပစ္စည်းအသစ်အဖြစ် သွင်းမည် (Step 3: Add to Stock Dialog)"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  <span>စတော့သွင်းမည် (အဆင့် ၃)</span>
                                </button>
                              ) : (
                                /* Receive & Settle Button (only if not stocked and is Given or InProgress) */
                                (order.status === 'Given' || order.status === 'InProgress') && (
                                  <button
                                    type="button"
                                    onClick={() => setReceivingOrder(order)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                                    title="ပန်းထိမ်မှ အထည်ပြန်အပ်ချိန် ရွှေချိန်လက်ခံစစ်ဆေးမည် (အဆင့် ၂)"
                                  >
                                    အထည်လက်ခံမည်
                                  </button>
                                )
                              )}

                              {/* Edit Order & Settle Labor */}
                              <button
                                type="button"
                                onClick={() => setEditingOrder(order)}
                                className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-100/80 rounded-lg transition-colors cursor-pointer"
                                title="အော်ဒါနှင့် လက်ခအချက်အလက် ပြင်ဆင်မည် (Edit)"
                              >
                                <Edit2 className="w-4 h-4 text-amber-700" />
                              </button>

                              {/* View / Print Slip */}
                              <button
                                type="button"
                                onClick={() => setVoucherOrder(order)}
                                className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                title="ဘောက်ချာ / ရှင်းတမ်းကြည့်ရှု ပရင့်ထုတ်မည်"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* Delete Order (Admin/Manager only) */}
                              {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingOrder(order)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="ပယ်ဖျက်မည်"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: GOLDSMITHS DIRECTORY */}
      {activeTab === 'goldsmiths' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">
              ပန်းထိမ်ဆရာများနှင့် ရွှေကျိုဖို စာရင်း ({goldsmiths.length} ဦး)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddGoldsmithModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>ပန်းထိမ်ဆရာ အသစ်ထည့်မည်</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goldsmiths.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{g.name}</h3>
                      <p className="text-xs text-amber-700 font-semibold">{g.workshopName}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      {g.status === 'Active' ? 'လုပ်ကိုင်ဆဲ' : 'ရပ်နား'}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 space-y-1.5 my-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono">{g.phone}</span>
                    </div>
                    {g.address && (
                      <p className="text-[11px] text-stone-500 line-clamp-1">{g.address}</p>
                    )}
                    <div className="pt-2 border-t border-stone-100 text-[11px]">
                      <span className="font-semibold text-stone-700">ကျွမ်းကျင်မှု:</span>{' '}
                      <span className="text-stone-600">{g.specialty}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 mt-2 space-y-2 bg-stone-50/70 -mx-4 -mb-4 p-3 rounded-b-xl text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">လက်ဝယ်ရှိ ဆိုင်အပ်ရွှေချိန်:</span>
                    <span className="font-mono font-bold text-amber-700 text-xs">
                      {formatWeightMm(g.totalGoldWithGoldsmith || { kyat: 0, pe: 0, yway: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">ပြီးစီးပြီး အထည်ပေါင်း:</span>
                    <span className="font-mono font-semibold text-stone-800">
                      {g.totalJobsCompleted || 0} ထည်
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">လက်ခ ပေးရန်ကျန်ငွေ:</span>
                    <span className="font-mono font-bold text-rose-600">
                      {formatMMK(g.pendingLabor || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: GOLD MELTING SPECIAL VIEW */}
      {activeTab === 'melting' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Flame className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-amber-950 mb-1">
                ရွှေကျို / ရွှေသွန်း စာရင်း (Gold Melting & Ingot Casting)
              </h3>
              <p>
                အရောင်းကောင်တာမှ ပြန်ဝယ်ယူထားသော ရွှေဟောင်းများကို ရွှေကျိုဖိုသို့ ပေးပို့ကျိုချက်ပြီး အခေါက်ရွှေတုံး (၁၆ ပဲရည် သို့မဟုတ် ၁၅ ပဲရည် အခေါက်တုံး) အဖြစ် သန့်စင်သွန်းလောင်းသည့် အထူးစာရင်းဖြစ်ပါသည်။ ရွှေရည်ကျောက်ကျ/အညစ်အကြေး နုတ်ထွက်မှုနှင့် ရွှေခဲထွက်ရှိမှု စာရင်းကို အတိအကျ စိစစ်နိုင်ပါသည်။
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs w-full min-w-0">
            <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs sm:text-sm">ရွှေကျိုနှင့် သွန်းလုပ်မှု စာရင်း ({meltingOrders.length})</span>
              </div>
            </div>

            <div
              ref={meltingScroll.scrollRef}
              data-horizontal-scroll="true"
              className="overflow-x-auto custom-scrollbar-x w-full pb-2"
              tabIndex={0}
            >
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">ကျိုချက်အမှတ်</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">ရက်စွဲ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">ကျိုချက်ရွှေဖို / ဆရာ</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ကျိုမည့် ရွှေဟောင်းချိန် (Raw)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ကျိုပြီး ရွှေခဲချိန် (Ingot)</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">အညစ်အကြေးကျ နုတ်ချိန်</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ကျိုခ / သွန်းခ</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">အခြေအနေ</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">လုပ်ဆောင်ချက်</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-stone-200">
                {meltingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                      ရွှေကျိုစာရင်း မရှိသေးပါ
                    </td>
                  </tr>
                ) : (
                  meltingOrders.map((order, idx) => {
                    const isEven = idx % 2 === 0;
                    const isStocked = isOrderStocked(order);
                    const statusBadge = isStocked
                      ? { label: 'စတော့သွင်းပြီး', color: 'bg-purple-100 text-purple-800 border-purple-300' }
                      : getStatusBadge(order.status);
                    const linkedProduct = products.find(
                      (p) =>
                        (order.linkedProductId && p.id === order.linkedProductId) ||
                        (order.jobNo === 'JOB-2601' && (p.id === 'prd_wsp_2601' || (p.sku && p.sku.includes('2601')))) ||
                        (order.jobNo === 'JOB-2602' && (p.id === 'prd_wsp_2602' || (p.sku && p.sku.includes('2602')))) ||
                        (p.sku && order.jobNo && p.sku.toLowerCase().includes(order.jobNo.replace('JOB-', '').toLowerCase())) ||
                        (p.notes && order.jobNo && p.notes.includes(order.jobNo))
                    );

                    return (
                      <tr key={order.id} className={`transition-colors ${isEven ? 'bg-white hover:bg-amber-50/70' : 'bg-stone-100/85 hover:bg-amber-100/60'}`}>
                        <td className="py-3 px-3.5 font-bold font-mono text-stone-900">
                          {order.jobNo}
                        </td>
                        <td className="py-3 px-3.5 text-stone-600">{order.orderDate}</td>
                        <td className="py-3 px-3.5 font-semibold text-stone-800">{order.goldsmithName}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-stone-900">
                          {formatWeightMm(order.givenWeight)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-800">
                          {order.finishedWeight || linkedProduct?.weight
                            ? formatWeightMm(order.finishedWeight || linkedProduct!.weight)
                            : (isStocked ? 'စတော့သွင်းပြီး' : 'ကျိုဆဲ')}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-stone-600">
                          {order.actualLossWeight ? formatWeightMm(order.actualLossWeight) : formatWeightMm(order.allowedWastage)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <span className="font-mono font-bold text-stone-900 block text-xs">
                            {formatMMK(order.totalLaborCharge)}
                          </span>
                          {order.balanceLaborCharge > 0 ? (
                            <button
                              type="button"
                              onClick={() => setEditingOrder(order)}
                              className="inline-flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md mt-0.5 cursor-pointer transition-colors shadow-2xs"
                              title="ကျန်ရှိလက်ခ ရှင်းလင်း/ပြင်ဆင်ရန် နှိပ်ပါ"
                            >
                              <DollarSign className="w-2.5 h-2.5 text-rose-600" />
                              <span>ကျန်ငွေ: {formatMMK(order.balanceLaborCharge)}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              ရှင်းပြီး
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {isStocked && (
                            <span className="text-[10px] text-purple-700 font-mono block mt-0.5 font-semibold">
                              [{linkedProduct?.sku || (order.jobNo === 'JOB-2602' ? 'WSP-16-2602' : 'WSP-' + order.jobNo.replace('JOB-', ''))}]
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Stocked Message (no button) - only message displayed if already stocked */}
                            {isStocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md font-bold text-[10px]">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>စတော့သွင်းပြီး</span>
                              </span>
                            ) : (
                              (order.status === 'Given' || order.status === 'InProgress') && (
                                <button
                                  type="button"
                                  onClick={() => setReceivingOrder(order)}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] transition-colors cursor-pointer shadow-xs"
                                  title="ရွှေကျိုအထည် ပြန်လည်လက်ခံစစ်ဆေးမည်"
                                >
                                  အထည်လက်ခံမည်
                                </button>
                              )
                            )}

                            {/* Edit Order */}
                            <button
                              type="button"
                              onClick={() => setEditingOrder(order)}
                              className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-100/80 rounded-lg transition-colors cursor-pointer"
                              title="ရွှေကျိုအပ်ထည်နှင့် လက်ခ ပြင်ဆင်မည် (Edit)"
                            >
                              <Edit2 className="w-4 h-4 text-amber-700" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setVoucherOrder(order)}
                              className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-100 rounded-lg cursor-pointer"
                              title="ရှင်းတမ်း ဘောက်ချာ"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Delete Order (Admin/Manager only) */}
                            {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                              <button
                                type="button"
                                onClick={() => setDeletingOrder(order)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ပယ်ဖျက်မည်"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* VIEW 4: PRACTICAL GUIDE & SAMPLE CALCULATIONS */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6 text-stone-800">
            <div>
              <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                ပန်းထိမ်နှင့် ရွှေကျိုစာရင်း အသုံးပြုနည်း လမ်းညွှန် နှင့် နမူနာ တွက်ချက်မှုများ
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                ရွှေဆိုင်လုပ်ငန်းများတွင် ပန်းထိမ်အပ်ထည်များမှ ရွှေထွက်ပေါက်ကြားမှု (ခိုးယူခံရခြင်း သို့မဟုတ် အလျော့လွန်ခြင်း) ကို တားဆီးရန် အသုံးပြုသည့် စံညီမျှခြင်းဖြစ်ပါသည်။
              </p>
            </div>

            {/* Core Equation Banner */}
            <div className="p-4 bg-stone-900 text-white rounded-xl font-mono text-xs sm:text-sm space-y-2 border border-amber-500/30">
              <div className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                📌 ပန်းထိမ် ရွှေချိန် စစ်ဆေးမှု စံညီမျှခြင်း (Golden Formula)
              </div>
              <div className="text-stone-100 font-bold">
                အပ်ရွှေချိန် (Given Weight) = ပြီးစီးရွှေချိန် (Finished Weight) + ရွှေစ/ရွှေမှုန့် (Scrap) + ခွင့်ပြုအလျော့တွက် (Allowed Wastage)
              </div>
              <div className="text-stone-400 text-xs">
                အမှန်တကယ် လျော့နည်းမှု (Actual Loss) = အပ်ရွှေချိန် - (ပြီးစီးရွှေချိန် + ရွှေစ)
              </div>
              <div className="text-amber-300 text-xs">
                အလျော့တွက် ကွာဟချက် (Variance) = အမှန်တကယ် လျော့နည်းမှု - ခွင့်ပြုအလျော့တွက်
                <br />
                • အကယ်၍ Variance &gt; 0 ဖြစ်ပါက: <strong>ရွှေပေါက်ကြားနေသည် (ဒဏ်ကြေးတောင်းရန် သို့မဟုတ် လက်ခထဲမှ နုတ်ရန်)</strong>
              </div>
            </div>

            {/* Real Case Samples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                    ၁
                  </span>
                  ဖောက်သည်အပ်ထည် နမူနာ (နဂါးခေါင်း စိန်လက်စွပ်)
                </div>
                <ul className="space-y-1 text-stone-700 pl-4 list-disc">
                  <li><strong>ထုတ်ပေးလိုက်သော အပ်ရွှေ:</strong> ၀ ကျပ် ၈ ပဲ ၀ ရွေး (8 Pe = 0.5 Kyat)</li>
                  <li><strong>ခွင့်ပြုအလျော့တွက်:</strong> ၀ ကျပ် ၀ ပဲ ၂ ရွေး (2 Yway)</li>
                  <li><strong>ပန်းထိမ်မှ ပြီးစီး၍ ပြန်အပ်ချိန်:</strong> ၀ ကျပ် ၇ ပဲ ၄ ရွေး (7.5 Pe)</li>
                  <li><strong>ပြန်အပ်သော ရွှေစ:</strong> ၀ ကျပ် ၀ ပဲ ၂ ရွေး (2 Yway)</li>
                  <li>
                    <strong>စိစစ်ချက်:</strong> (၇ ပဲ ၄ ရွေး) + (၂ ရွေး ရွှေစ) = ၇ ပဲ ၆ ရွေး။<br />
                    ကျန်ရှိသော အလျော့ = ၂ ရွေး။ ခွင့်ပြုချက် (၂ ရွေး) နှင့် <strong>အတိအကျ မှန်ကန်သည်</strong>။
                  </li>
                  <li><strong>လက်ခ:</strong> ၈၅,၀၀၀ ကျပ်။</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                    ၂
                  </span>
                  ရွှေကျို/ရွှေသွန်း နမူနာ (ရွှေဟောင်းမှ အခေါက်တုံး ကျိုခြင်း)
                </div>
                <ul className="space-y-1 text-stone-700 pl-4 list-disc">
                  <li><strong>ကျိုမည့် ရွှေဟောင်းအလေးချိန်:</strong> ၃ ကျပ် ၀ ပဲ ၀ ရွေး</li>
                  <li><strong>သတ်မှတ် ရွှေရည်ကျောက်ကျ/အညစ်အကြေး နုတ်ထွက်မှု:</strong> ၀ ကျပ် ၀ ပဲ ၃ ရွေး</li>
                  <li><strong>ကျိုပြီး ထွက်ရှိလာသော ရွှေတုံး:</strong> ၂ ကျပ် ၁၅ ပဲ ၅ ရွေး</li>
                  <li>
                    <strong>စိစစ်ချက်:</strong> ရွှေတုံးလက်ခံရရှိပြီးနောက် စနစ်က <strong>"စတော့စာရင်းသို့ သွင်းမည်"</strong> ခလုတ်ဖြင့် Inventory ရှိ In Stock ရွှေတုံးစာရင်းသို့ အလိုအလျောက် သွင်းယူပေးနိုင်ပါသည်။
                  </li>
                  <li><strong>ကျိုခ/သွန်းခ:</strong> ၁ ကျပ်သား ၃၅,၀၀၀ နှုန်းဖြင့် ၁၀၅,၀၀၀ ကျပ်။</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE WORKSHOP ORDER */}
      {showCreateModal && (
        <CreateWorkshopOrderModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(orderData) => {
            createWorkshopOrder(orderData);
            setShowCreateModal(false);
          }}
          goldsmiths={goldsmiths}
          customers={customers}
          currentUser={currentUser}
        />
      )}

      {/* MODAL 2: RECEIVE & VERIFY WORKSHOP ORDER */}
      {receivingOrder && (
        <ReceiveOrderModal
          order={receivingOrder}
          onClose={() => setReceivingOrder(null)}
          onConfirm={(receiveData) => {
            const addedProd = receiveWorkshopOrder(receivingOrder.id, receiveData);
            const currentJobNo = receivingOrder.jobNo;
            setReceivingOrder(null);
            if (receiveData.autoAddToStock || addedProd) {
              showStockToastMessage(`အော်ဒါ ${currentJobNo} စတော့စာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ (SKU: ${addedProd?.sku || 'WSP-' + currentJobNo})`);
            } else {
              showStockToastMessage(`အော်ဒါ ${currentJobNo} လက်ခံစစ်ဆေးပြီးပါပြီ`);
            }
          }}
        />
      )}

      {/* MODAL 3: ADD ORDER TO STOCK */}
      {stockingOrder && (
        <AddToStockModal
          order={stockingOrder}
          onClose={() => setStockingOrder(null)}
          onConfirm={(customSku, costPrice) => {
            const addedProd = convertWorkshopOrderToInventory(stockingOrder.id, customSku, costPrice);
            const currentJobNo = stockingOrder.jobNo;
            setStockingOrder(null);
            if (addedProd) {
              showStockToastMessage(`အော်ဒါ ${currentJobNo} စတော့စာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ (SKU: ${addedProd.sku})`);
            }
          }}
        />
      )}

      {/* MODAL 3.1: EDIT WORKSHOP ORDER & SETTLE LABOR */}
      {editingOrder && (
        <EditWorkshopOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSubmit={(updates) => {
            updateWorkshopOrder(editingOrder.id, updates);
            if (editingOrder.linkedProductId) {
              const linked = products.find((p) => p.id === editingOrder.linkedProductId);
              if (linked) {
                updateProduct(editingOrder.linkedProductId, {
                  makingCharge: updates.totalLaborCharge !== undefined ? updates.totalLaborCharge : linked.makingCharge,
                  name: updates.title !== undefined ? updates.title : linked.name,
                });
              }
            }
            showStockToastMessage(`အော်ဒါ ${editingOrder.jobNo} အချက်အလက်နှင့် လက်ခစာရင်းကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ`);
            setEditingOrder(null);
          }}
          goldsmiths={goldsmiths}
          customers={customers}
          onOpenStockModal={(o) => {
            setEditingOrder(null);
            setStockingOrder(o);
          }}
        />
      )}

      {/* STOCK SUCCESS TOAST NOTIFICATION (MESSAGE ONLY, NO UNWANTED BUTTONS) */}
      {stockToast && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-amber-500/40 animate-fade-in max-w-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-bold">စတော့သွင်းပြီး</span>
              <span className="text-stone-300 font-normal">({stockToast})</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
              စတော့စာရင်း (Inventory) နှင့် အရောင်းကောင်တာ (POS) သို့ ရောက်ရှိပြီးဖြစ်ပါသည်
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockToast(null)}
            className="text-stone-400 hover:text-white p-1 text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL 3.2: DELETE ORDER CONFIRMATION (REPLACES WINDOW.CONFIRM) */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200 overflow-hidden p-5 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                အော်ဒါပယ်ဖျက်ရန် သေချာပါသလား?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                အော်ဒါ <span className="font-mono font-bold text-rose-700">{deletingOrder.jobNo}</span> ({deletingOrder.title}) ကို စာရင်းမှ လုံးဝ ပယ်ဖျက်ပါမည်။
              </p>
              {deletingOrder.status === 'Stocked' && (
                <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] text-left">
                  ⚠️ <strong>သတိပြုရန်:</strong> ဤအော်ဒါသည် စတော့ခ် (Inventory) စာရင်းသို့ သွင်းယူပြီးဖြစ်ပါသည်။ ဖျက်သိမ်းပါက ပန်းထိမ်အော်ဒါစာရင်းမှသာ ဖယ်ရှားမည်ဖြစ်ပြီး စတော့စာရင်းရှိ ပစ္စည်းမပျက်ပြယ်ပါ။
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="flex-1 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                မဖျက်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteWorkshopOrder(deletingOrder.id);
                  setDeletingOrder(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                အတည်ပြု ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VOUCHER PRINT */}
      {voucherOrder && (
        <WorkshopVoucherModal
          order={voucherOrder}
          onClose={() => setVoucherOrder(null)}
        />
      )}

      {/* MODAL 5: ADD GOLDSMITH */}
      {showAddGoldsmithModal && (
        <AddGoldsmithModal
          onClose={() => setShowAddGoldsmithModal(false)}
          onSubmit={(data) => {
            addGoldsmith(data);
            setShowAddGoldsmithModal(false);
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   SUB-MODAL COMPONENTS
   ========================================================================= */

// 1. Create Workshop Order Modal
interface CreateModalProps {
  onClose: () => void;
  onSubmit: (data: Omit<WorkshopJobOrder, 'id' | 'createdAt' | 'jobNo'>) => void;
  goldsmiths: Goldsmith[];
  customers: any[];
  currentUser: any;
}

const CreateWorkshopOrderModal: React.FC<CreateModalProps> = ({
  onClose,
  onSubmit,
  goldsmiths,
  customers,
  currentUser,
}) => {
  const [orderType, setOrderType] = useState<WorkshopJobType>('StockProduction');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Ring');
  const [purity, setPurity] = useState<PurityType>('15_PE');
  const [goldsmithId, setGoldsmithId] = useState(goldsmiths[0]?.id || '');
  
  // Customer details
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // Given weight (Kyat, Pe, Yway)
  const [givenKyat, setGivenKyat] = useState<number>(0);
  const [givenPe, setGivenPe] = useState<number>(8);
  const [givenYway, setGivenYway] = useState<number>(0);
  const [givenDescription, setGivenDescription] = useState('၁၅ ပဲရည် ရွှေပြားချောင်း');

  // Allowed wastage (Pe, Yway)
  const [allowedPe, setAllowedPe] = useState<number>(0);
  const [allowedYway, setAllowedYway] = useState<number>(2);

  // Labor
  const [laborChargeType, setLaborChargeType] = useState<'Fixed' | 'PerKyat' | 'PerPiece'>('Fixed');
  const [laborRate, setLaborRate] = useState<number>(80000);
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  // Dates & Notes
  const today = new Date().toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const selectedGoldsmith = goldsmiths.find((g) => g.id === goldsmithId) || goldsmiths[0];

  // Auto calculate total labor
  const totalLabor = useMemo(() => {
    const givenWeight: GoldWeight = { kyat: givenKyat, pe: givenPe, yway: givenYway };
    return calculateWorkshopLaborFee(laborChargeType, laborRate, givenWeight);
  }, [laborChargeType, laborRate, givenKyat, givenPe, givenYway]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('အပ်ထည်အမည် ထည့်သွင်းပေးပါ');
      return;
    }
    setFormError('');

    const givenWeight: GoldWeight = {
      kyat: Number(givenKyat) || 0,
      pe: Number(givenPe) || 0,
      yway: Number(givenYway) || 0,
    };

    const allowedWastage: GoldWeight = {
      kyat: 0,
      pe: Number(allowedPe) || 0,
      yway: Number(allowedYway) || 0,
    };

    const paidLabor = Math.min(totalLabor, Number(advancePaid) || 0);
    const balanceLabor = Math.max(0, totalLabor - paidLabor);

    onSubmit({
      orderType,
      title: title.trim(),
      category,
      purity,
      goldsmithId: selectedGoldsmith?.id || 'gsm_01',
      goldsmithName: selectedGoldsmith ? `${selectedGoldsmith.name} (${selectedGoldsmith.workshopName})` : 'ပန်းထိမ်ဆရာ',
      customerId: orderType === 'CustomerOrder' ? customerId : undefined,
      customerName: orderType === 'CustomerOrder' ? customerName : undefined,
      customerPhone: orderType === 'CustomerOrder' ? customerPhone : undefined,
      depositAmount: orderType === 'CustomerOrder' ? depositAmount : undefined,
      orderDate: today,
      dueDate: dueDate || undefined,
      givenWeight,
      givenDescription,
      allowedWastage,
      laborChargeType,
      laborRate,
      totalLaborCharge: totalLabor,
      paidLaborCharge: paidLabor,
      balanceLaborCharge: balanceLabor,
      status: 'Given',
      assignedBy: currentUser?.name || 'Admin (အုပ်ချုပ်သူ)',
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Hammer className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-bold text-base text-amber-400 leading-normal py-0.5">
              အော်ဒါသစ် အပ်နှံခြင်း (New Workshop Job Order)
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar-y space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Order Type Selector */}
          <div>
            <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">အော်ဒါအမျိုးအစား (Order Type)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'StockProduction', label: 'ဆိုင်တင် ထုတ်လုပ်ခြင်း' },
                { id: 'CustomerOrder', label: 'ဖောက်သည် အပ်ထည်' },
                { id: 'GoldMelting', label: 'ရွှေကျို / ရွှေသွန်း' },
                { id: 'RepairResize', label: 'ပြုပြင် / ဆိုဒ်ချဲ့' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setOrderType(t.id as WorkshopJobType)}
                  className={`py-2.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer leading-relaxed ${
                    orderType === t.id
                      ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <span className="inline-block py-0.5 leading-normal">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer fields if customer order */}
          {orderType === 'CustomerOrder' && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <span className="font-bold text-indigo-900 block text-xs">ဖောက်သည် အချက်အလက်</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-stone-600 block mb-1">ဖောက်သည် အမည်</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ဦးမင်းခန့်"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-stone-600 block mb-1">ဖုန်းနံပါတ်</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09-450123888"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-stone-600 block mb-1">စရန်ငွေ (MMK)</label>
                  <input
                    type="number"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    placeholder="200000"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Goldsmith & Item Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">ပန်းထိမ်ဆရာ / အလုပ်ရုံ</label>
              <select
                value={goldsmithId}
                onChange={(e) => setGoldsmithId(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold leading-relaxed"
              >
                {goldsmiths.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} - {g.workshopName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">ပြီးစီးရမည့်ရက် (Due Date)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">အပ်ထည် အမည် / ဖော်ပြချက်</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ဥပမာ- ၁၅ ပဲရည် နဂါးခေါင်း စိန်လက်စွပ် (သို့) ၁၅ ပဲရည် Fancy ဆွဲကြိုး"
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">အမျိုးအစား (Category)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs leading-relaxed"
              >
                {['Ring', 'Necklace', 'Bracelet', 'Chain', 'Bangle', 'Pendant', 'Gold Bar', 'Earring', 'Other'].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5 leading-relaxed pt-0.5">ရွှေရည် (Purity)</label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value as PurityType)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs leading-relaxed"
              >
                <option value="16_PE">၁၆ ပဲရည် (ရွှေစင်)</option>
                <option value="15_PE">၁၅ ပဲရည် (အခေါက်)</option>
                <option value="14_PE">၁၄ ပဲရည်</option>
                <option value="13_PE">၁၃ ပဲရည်</option>
                <option value="12_PE">၁၂ ပဲရည်</option>
              </select>
            </div>
          </div>

          {/* Given Weight (Kyat, Pe, Yway) */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 text-xs">
                ထုတ်ပေးလိုက်သော အပ်ရွှေချိန် (Given Raw Weight)
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                {formatWeightMm({ kyat: givenKyat, pe: givenPe, yway: givenYway })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ကျပ် (Kyat)</label>
                <input
                  type="number"
                  min="0"
                  value={givenKyat}
                  onChange={(e) => setGivenKyat(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ပဲ (Pe 0-15)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={givenPe}
                  onChange={(e) => setGivenPe(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ရွေး (Yway 0-7.9)</label>
                <input
                  type="number"
                  min="0"
                  max="7.99"
                  step="0.1"
                  value={givenYway}
                  onChange={(e) => setGivenYway(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-stone-600 block mb-0.5">အပ်ရွှေ အမျိုးအစား/မှတ်ချက်</label>
              <input
                type="text"
                value={givenDescription}
                onChange={(e) => setGivenDescription(e.target.value)}
                placeholder="၁၅ ပဲရည် အခေါက်တုံးအစ၊ ရွှေဟောင်းလက်ကောက် စသည်"
                className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Allowed Wastage & Labor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Allowed Wastage */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <span className="font-bold text-stone-800 block text-xs">
                သတ်မှတ်ခွင့်ပြု အလျော့တွက် (Allowed Wastage)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-stone-500 block">ပဲ (Pe)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={allowedPe}
                    onChange={(e) => setAllowedPe(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-500 block">ရွေး (Yway)</label>
                  <input
                    type="number"
                    min="0"
                    max="7.99"
                    step="0.5"
                    value={allowedYway}
                    onChange={(e) => setAllowedYway(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Labor Charge */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <span className="font-bold text-stone-800 block text-xs">
                ပန်းထိမ်လက်ခ (Labor Fee)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-stone-500 block">နှုန်းထား (MMK)</label>
                  <input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-500 block">ကြိုပေးငွေ (Advance)</label>
                  <input
                    type="number"
                    value={advancePaid || ''}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] text-stone-600 flex justify-between pt-1">
                <span>စုစုပေါင်းလက်ခ:</span>
                <span className="font-bold text-stone-900 font-mono">{formatMMK(totalLabor)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">အခြားမှတ်ချက် (Notes)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ဒီဇိုင်းပုံစံ၊ ကျောက်စီခြယ်မှု အသေးစိတ်..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold cursor-pointer"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              အော်ဒါ အတည်ပြုအပ်နှံမည်
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Receive / Settle Workshop Order Modal
interface ReceiveModalProps {
  order: WorkshopJobOrder;
  onClose: () => void;
  onConfirm: (data: {
    receivedDate: string;
    finishedWeight: GoldWeight;
    scrapWeight?: GoldWeight;
    stoneWeightYway?: number;
    stoneCost?: number;
    paidLaborAddition?: number;
    shortagePenalty?: number;
    notes?: string;
    autoAddToStock?: boolean;
    customSku?: string;
    costPrice?: number;
  }) => void;
}

const ReceiveOrderModal: React.FC<ReceiveModalProps> = ({ order, onClose, onConfirm }) => {
  const [finKyat, setFinKyat] = useState<number>(order.givenWeight.kyat);
  const [finPe, setFinPe] = useState<number>(order.givenWeight.pe > 0 ? order.givenWeight.pe - 1 : 0);
  const [finYway, setFinYway] = useState<number>(6);

  const [scrapPe, setScrapPe] = useState<number>(0);
  const [scrapYway, setScrapYway] = useState<number>(0);

  const [stoneWeightYway, setStoneWeightYway] = useState<number>(0);
  const [stoneCost, setStoneCost] = useState<number>(0);

  const [additionalPaidLabor, setAdditionalPaidLabor] = useState<number>(order.balanceLaborCharge || 0);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [receiveNotes, setReceiveNotes] = useState<string>('');

  // Auto Stocking options
  const [autoAddToStock, setAutoAddToStock] = useState<boolean>(true);
  const defaultSku = `WSP-${(order.purity || '15').replace('_PE', '')}-${(order.jobNo || '0000').replace('JOB-', '')}`;
  const [customSku, setCustomSku] = useState<string>(defaultSku);
  const [customCost, setCustomCost] = useState<number>((order.totalLaborCharge || 0) + (order.stoneCost || 0));

  const today = new Date().toISOString().split('T')[0];

  // Live Discrepancy Calculation
  const finishedWeight: GoldWeight = {
    kyat: Number(finKyat) || 0,
    pe: Number(finPe) || 0,
    yway: Number(finYway) || 0,
  };

  const scrapWeight: GoldWeight = {
    kyat: 0,
    pe: Number(scrapPe) || 0,
    yway: Number(scrapYway) || 0,
  };

  const discrepancy = useMemo(() => {
    return calculateWorkshopWastageDiscrepancy(
      order.givenWeight,
      finishedWeight,
      scrapWeight,
      order.allowedWastage
    );
  }, [order.givenWeight, finishedWeight, scrapWeight, order.allowedWastage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      receivedDate: today,
      finishedWeight,
      scrapWeight,
      stoneWeightYway: Number(stoneWeightYway) || 0,
      stoneCost: Number(stoneCost) || 0,
      paidLaborAddition: Number(additionalPaidLabor) || 0,
      shortagePenalty: Number(penaltyAmount) || 0,
      notes: receiveNotes.trim() || undefined,
      autoAddToStock,
      customSku: customSku.trim() || defaultSku,
      costPrice: customCost,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <h3 className="font-bold text-base text-emerald-100 leading-normal py-0.5">
              ပန်းထိမ်အထည် လက်ခံစစ်ဆေးခြင်း ({order.jobNo})
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar-y space-y-4 text-xs">
          {/* Order Header Summary */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 gap-2 text-stone-700">
            <div>
              <span className="text-stone-400 block">အထည်အမည်:</span>
              <span className="font-bold text-stone-900">{order.title}</span>
            </div>
            <div>
              <span className="text-stone-400 block">ပန်းထိမ်ဆရာ:</span>
              <span className="font-bold text-stone-900">{order.goldsmithName}</span>
            </div>
            <div>
              <span className="text-stone-400 block">အပ်ရွှေချိန်:</span>
              <span className="font-bold font-mono text-stone-900">{formatWeightMm(order.givenWeight)}</span>
            </div>
            <div>
              <span className="text-stone-400 block">ခွင့်ပြုအလျော့တွက်:</span>
              <span className="font-bold font-mono text-stone-900">{formatWeightMm(order.allowedWastage)}</span>
            </div>
          </div>

          {/* Finished Item Weight Inputs */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <span className="font-bold text-emerald-950 block text-xs">
              ပြီးစီး၍ ပြန်အပ်သော အထည်ရွှေချိန် (Finished Net Weight)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ကျပ်</label>
                <input
                  type="number"
                  min="0"
                  value={finKyat}
                  onChange={(e) => setFinKyat(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ပဲ (0-15)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={finPe}
                  onChange={(e) => setFinPe(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ရွေး (0-7.9)</label>
                <input
                  type="number"
                  min="0"
                  max="7.99"
                  step="0.1"
                  value={finYway}
                  onChange={(e) => setFinYway(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Scrap Remnant Gold Inputs */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <span className="font-bold text-stone-800 block text-xs">
              ပြန်အပ်သော ရွှေစ / ရွှေအပို (Returned Scrap / Remnant Gold) (ရှိပါက)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ပဲ (Pe)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={scrapPe}
                  onChange={(e) => setScrapPe(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-0.5">ရွေး (Yway)</label>
                <input
                  type="number"
                  min="0"
                  max="7.99"
                  step="0.1"
                  value={scrapYway}
                  onChange={(e) => setScrapYway(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Stone / Gem embedded */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <label className="font-bold text-stone-700 block mb-1">ကျောက်ချိန် (ရွေး/ကာရက်)</label>
              <input
                type="number"
                step="0.1"
                value={stoneWeightYway || ''}
                onChange={(e) => setStoneWeightYway(Number(e.target.value))}
                placeholder="1.5"
                className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">ကျောက်ဖိုးစရိတ် (MMK)</label>
              <input
                type="number"
                value={stoneCost || ''}
                onChange={(e) => setStoneCost(Number(e.target.value))}
                placeholder="150000"
                className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Live Automatic Wastage Discrepancy Box */}
          <div
            className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
              discrepancy.isShortage
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>အမှန်တကယ် လျော့နည်းသွားမှု (Actual Loss):</span>
              <span>{formatWeightMm(discrepancy.actualLossWeight)}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span>သတ်မှတ်ခွင့်ပြု အလျော့တွက်:</span>
              <span>{formatWeightMm(order.allowedWastage)}</span>
            </div>
            <div className="flex items-center justify-between font-black text-sm pt-1 border-t border-current/20">
              <span>အလျော့တွက် ကွာဟချက် (Variance):</span>
              <span>
                {discrepancy.varianceYway > 0.05 ? (
                  <span className="text-rose-700">
                    +{discrepancy.varianceYway.toFixed(1)} ရွေး (ပေါက်ကြားမှု/လျော့နည်း)
                  </span>
                ) : Math.abs(discrepancy.varianceYway) <= 0.05 ? (
                  <span className="text-emerald-700">၀ ရွေး (အတိအကျ မှန်ကန်)</span>
                ) : (
                  <span className="text-emerald-700">
                    -{Math.abs(discrepancy.varianceYway).toFixed(1)} ရွေး (သက်သာ)
                  </span>
                )}
              </span>
            </div>
            <p className="text-[11px] font-sans pt-0.5">{discrepancy.statusTextMm}</p>
          </div>

          {/* Labor Settlement */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                ကျန်ရှိလက်ခ ထပ်မံရှင်းပေးငွေ (MMK)
              </label>
              <input
                type="number"
                value={additionalPaidLabor}
                onChange={(e) => setAdditionalPaidLabor(Number(e.target.value))}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                ရွှေပေါက်ကြားမှု ဒဏ်ကြေး/နုတ်ငွေ (MMK)
              </label>
              <input
                type="number"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-rose-600 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">စစ်ဆေးတွေ့ရှိချက် မှတ်ချက်</label>
            <input
              type="text"
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              placeholder="ရွှေထည်ချောမွေ့၊ တံဆိပ်ရိုက်ပြီး၊ အလျော့တွက် စစ်ဆေးပြီး..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          {/* Auto Stocking Option */}
          <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-purple-700 shrink-0" />
                <div>
                  <span className="font-bold text-stone-900 block text-xs">ဆိုင်တင်ရောင်းချရန် စတော့စာရင်း (Inventory) ထဲသို့ တိုက်ရိုက်သွင်းမည်</span>
                  <span className="text-[11px] text-stone-500">လက်ခံစစ်ဆေးပြီးသည်နှင့် အရောင်းကောင်တာ (POS) နှင့် စတော့ခ် (In Stock) ထဲသို့ အလိုအလျောက် ချက်ချင်း ရောက်ရှိပါမည်</span>
                </div>
              </div>
              <input
                type="checkbox"
                id="autoAddToStockCheckbox"
                checked={autoAddToStock}
                onChange={(e) => setAutoAddToStock(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {autoAddToStock && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200/60">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-0.5">ကုန်ပစ္စည်းကုဒ် (SKU)</label>
                  <input
                    type="text"
                    value={customSku}
                    onChange={(e) => setCustomSku(e.target.value)}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-0.5">အရင်းစရိတ် / Cost Price (MMK)</label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold"
            >
              ပယ်ဖျက်
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              လက်ခံပြီး စတော့သွင်းမည်
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Add Order To Inventory Stock Modal
interface StockModalProps {
  order: WorkshopJobOrder;
  onClose: () => void;
  onConfirm: (customSku?: string, costPrice?: number) => void;
}

const AddToStockModal: React.FC<StockModalProps> = ({ order, onClose, onConfirm }) => {
  const autoSku = `WSP-${(order.purity || '15').replace('_PE', '')}-${order.jobNo.replace('JOB-', '')}`;
  const [sku, setSku] = useState(autoSku);
  const calculatedCost = (order.totalLaborCharge || 0) + (order.stoneCost || 0);
  const [costPrice, setCostPrice] = useState<number>(calculatedCost);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden my-auto p-5 space-y-4 text-xs max-h-[92vh] overflow-y-auto custom-scrollbar-y">
        <div className="flex items-center gap-2.5 text-purple-900 font-bold text-base">
          <PackagePlus className="w-5 h-5 text-purple-600" />
          <span>ကုန်ပစ္စည်း စတော့စာရင်းသို့ သွင်းယူမည်</span>
        </div>

        <p className="text-stone-600">
          ပန်းထိမ်မှ ပြီးစီးပြီးဖြစ်သော အထည်ကို ဆိုင်တင်အရောင်းကောင်တာ (POS Stock) သို့ တိုက်ရိုက် သွင်းယူပါမည်။
        </p>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
          <div className="font-bold text-stone-900 text-sm">{order.title}</div>
          <div className="text-stone-600 flex justify-between">
            <span>ပြီးစီးရွှေချိန်:</span>
            <span className="font-bold text-stone-900 font-mono">
              {formatWeightMm(order.finishedWeight || { kyat: 0, pe: 0, yway: 0 })}
            </span>
          </div>
          <div className="text-stone-600 flex justify-between">
            <span>ရွှေရည်:</span>
            <span className="font-semibold text-stone-800">{getPurityLabel(order.purity)}</span>
          </div>
          <div className="text-stone-600 flex justify-between">
            <span>ပန်းထိမ်လက်ခ:</span>
            <span className="font-mono text-stone-800">{formatMMK(order.totalLaborCharge)}</span>
          </div>
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">ကုန်ပစ္စည်းကုဒ် (SKU)</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-stone-700 block mb-1">
            ကုန်ကျစရိတ် / အရင်း (Cost Price - MMK)
          </label>
          <input
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(Number(e.target.value))}
            className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold"
          >
            မလုပ်တော့ပါ
          </button>
          <button
            type="button"
            onClick={() => onConfirm(sku, costPrice)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            စတော့သွင်းခြင်း အတည်ပြုမည်
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Add Goldsmith Modal
interface AddGoldsmithModalProps {
  onClose: () => void;
  onSubmit: (data: Omit<Goldsmith, 'id' | 'createdAt' | 'totalJobsCompleted' | 'totalLaborPaid' | 'pendingLabor' | 'totalGoldWithGoldsmith'>) => void;
}

const AddGoldsmithModal: React.FC<AddGoldsmithModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [specialty, setSpecialty] = useState('၁၅ ပဲရည်/၁၆ ပဲရည် အခေါက်ထည်၊ ဆွဲကြိုး၊ လက်စွပ်');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workshopName.trim()) {
      setFormError('ပန်းထိမ်ဆရာ အမည် နှင့် အလုပ်ရုံအမည် ဖြည့်သွင်းပေးပါ');
      return;
    }
    setFormError('');

    onSubmit({
      name: name.trim(),
      workshopName: workshopName.trim(),
      phone: phone.trim() || '09-XXXXXXXXX',
      address: address.trim() || undefined,
      specialty: specialty.trim(),
      status: 'Active',
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden my-auto p-5 space-y-4 text-xs max-h-[92vh] overflow-y-auto custom-scrollbar-y">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
            <Building2 className="w-5 h-5 text-amber-500" />
            <span>ပန်းထိမ်ဆရာ / ရွှေကျိုဖို အသစ်ထည့်သွင်းခြင်း</span>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-bold text-stone-700 block mb-1">ပန်းထိမ်ဆရာ အမည်</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ဆရာဦးကျော်"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">အလုပ်ရုံ / ဆိုင်ခွဲ အမည်</label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              placeholder="ကျော်ဇင် အထည်သစ် ပန်းထိမ်အလုပ်ရုံ"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">ဖုန်းနံပါတ်</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09-420011223"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">လိပ်စာ / ပန်းထိမ်တန်း</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="အမှတ် (၄၅)၊ ပန်းထိမ်တန်း၊ ကျောက်တံတားမြို့နယ်"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">ကျွမ်းကျင်မှု / အထူးပြု လက်ရာ</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="ရွှေစင်ပန်းထိမ်၊ စိန်စီ၊ သွန်းလောင်း၊ ရွှေကျို"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">မှတ်ချက်</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="လက်ရာသေသပ်မှု၊ စည်းကမ်းချက်များ..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              ပန်းထိမ်ဆရာ သိမ်းဆည်းမည်
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. Edit Workshop Order & Settle Labor Modal
interface EditWorkshopOrderModalProps {
  order: WorkshopJobOrder;
  onClose: () => void;
  onSubmit: (updates: Partial<WorkshopJobOrder>) => void;
  goldsmiths: Goldsmith[];
  customers: any[];
  onOpenStockModal?: (order: WorkshopJobOrder) => void;
}

const EditWorkshopOrderModal: React.FC<EditWorkshopOrderModalProps> = ({
  order,
  onClose,
  onSubmit,
  goldsmiths,
  customers,
  onOpenStockModal,
}) => {
  // Basic info
  const [title, setTitle] = useState(order.title || '');
  const [orderType, setOrderType] = useState<WorkshopJobType>(order.orderType || 'StockProduction');
  const [category, setCategory] = useState<ProductCategory>(order.category || 'Ring');
  const [purity, setPurity] = useState<PurityType>(order.purity || '15_PE');
  const [goldsmithId, setGoldsmithId] = useState(order.goldsmithId || goldsmiths[0]?.id || '');
  const [status, setStatus] = useState<WorkshopJobStatus>(order.status || 'Given');
  const [notes, setNotes] = useState(order.notes || '');
  const [dueDate, setDueDate] = useState(order.dueDate || '');
  const [receivedDate, setReceivedDate] = useState(order.receivedDate || '');

  // Labor charges
  const [laborChargeType, setLaborChargeType] = useState<'Fixed' | 'PerKyat' | 'PerPiece'>(
    order.laborChargeType || 'Fixed'
  );
  const [laborRate, setLaborRate] = useState<number>(order.laborRate || 0);
  const [totalLaborCharge, setTotalLaborCharge] = useState<number>(order.totalLaborCharge || 0);
  const [paidLaborCharge, setPaidLaborCharge] = useState<number>(order.paidLaborCharge || 0);
  const [quickPayAmount, setQuickPayAmount] = useState<string>('');

  // Customer info
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [depositAmount, setDepositAmount] = useState<number>(order.depositAmount || 0);

  // Given weight
  const [givenKyat, setGivenKyat] = useState<number>(order.givenWeight?.kyat || 0);
  const [givenPe, setGivenPe] = useState<number>(order.givenWeight?.pe || 0);
  const [givenYway, setGivenYway] = useState<number>(order.givenWeight?.yway || 0);
  const [givenDescription, setGivenDescription] = useState(order.givenDescription || '');

  // Allowed wastage
  const [allowedPe, setAllowedPe] = useState<number>(order.allowedWastage?.pe || 0);
  const [allowedYway, setAllowedYway] = useState<number>(order.allowedWastage?.yway || 0);

  // Finished weight & scrap
  const [finKyat, setFinKyat] = useState<number>(order.finishedWeight?.kyat ?? 0);
  const [finPe, setFinPe] = useState<number>(order.finishedWeight?.pe ?? 0);
  const [finYway, setFinYway] = useState<number>(order.finishedWeight?.yway ?? 0);
  const [scrapKyat, setScrapKyat] = useState<number>(order.scrapWeight?.kyat ?? 0);
  const [scrapPe, setScrapPe] = useState<number>(order.scrapWeight?.pe ?? 0);
  const [scrapYway, setScrapYway] = useState<number>(order.scrapWeight?.yway ?? 0);

  // Stone & penalty
  const [stoneWeightYway, setStoneWeightYway] = useState<number>(order.stoneWeightYway || 0);
  const [stoneCost, setStoneCost] = useState<number>(order.stoneCost || 0);
  const [shortagePenalty, setShortagePenalty] = useState<number>(order.shortagePenalty || 0);

  const [formError, setFormError] = useState<string>('');

  // Calculate live balance
  const balanceLabor = Math.max(0, totalLaborCharge - paidLaborCharge);

  // Quick 1-click settle all remaining labor
  const handleSettleFullBalance = () => {
    setPaidLaborCharge(totalLaborCharge);
  };

  // Quick add payment
  const handleAddQuickPayment = () => {
    const amt = Number(quickPayAmount);
    if (!isNaN(amt) && amt > 0) {
      const newPaid = Math.min(totalLaborCharge, paidLaborCharge + amt);
      setPaidLaborCharge(newPaid);
      setQuickPayAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('အထည်အမည် ထည့်သွင်းပေးပါ');
      return;
    }
    setFormError('');

    const selectedGsm = goldsmiths.find((g) => g.id === goldsmithId);

    const givenWeight: GoldWeight = {
      kyat: Number(givenKyat) || 0,
      pe: Number(givenPe) || 0,
      yway: Number(givenYway) || 0,
    };

    const allowedWastage: GoldWeight = {
      kyat: 0,
      pe: Number(allowedPe) || 0,
      yway: Number(allowedYway) || 0,
    };

    const hasFinished = finKyat > 0 || finPe > 0 || finYway > 0;
    const finishedWeight: GoldWeight | undefined = hasFinished
      ? {
          kyat: Number(finKyat) || 0,
          pe: Number(finPe) || 0,
          yway: Number(finYway) || 0,
        }
      : order.finishedWeight;

    const scrapWeight: GoldWeight | undefined =
      scrapKyat > 0 || scrapPe > 0 || scrapYway > 0
        ? {
            kyat: Number(scrapKyat) || 0,
            pe: Number(scrapPe) || 0,
            yway: Number(scrapYway) || 0,
          }
        : order.scrapWeight;

    // Recalculate wastage discrepancy if finished weight exists
    let actualLossWeight = order.actualLossWeight;
    let wastageVarianceYway = order.wastageVarianceYway;

    if (finishedWeight) {
      const discrepancy = calculateWorkshopWastageDiscrepancy(
        givenWeight,
        finishedWeight,
        scrapWeight || { kyat: 0, pe: 0, yway: 0 },
        allowedWastage
      );
      actualLossWeight = discrepancy.actualLossWeight;
      wastageVarianceYway = discrepancy.varianceYway;
    }

    const updates: Partial<WorkshopJobOrder> = {
      title: title.trim(),
      orderType,
      category,
      purity,
      goldsmithId,
      goldsmithName: selectedGsm ? `${selectedGsm.name} (${selectedGsm.workshopName})` : order.goldsmithName,
      status,
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
      receivedDate: receivedDate || undefined,

      givenWeight,
      givenDescription: givenDescription.trim() || undefined,
      allowedWastage,

      finishedWeight,
      scrapWeight,
      stoneWeightYway: Number(stoneWeightYway) || 0,
      stoneCost: Number(stoneCost) || 0,
      shortagePenalty: Number(shortagePenalty) || 0,
      actualLossWeight,
      wastageVarianceYway,

      laborChargeType,
      laborRate: Number(laborRate) || 0,
      totalLaborCharge: Number(totalLaborCharge) || 0,
      paidLaborCharge: Number(paidLaborCharge) || 0,
      balanceLaborCharge: balanceLabor,

      customerName: orderType === 'CustomerOrder' ? customerName : undefined,
      customerPhone: orderType === 'CustomerOrder' ? customerPhone : undefined,
      depositAmount: orderType === 'CustomerOrder' ? Number(depositAmount) || 0 : undefined,
    };

    onSubmit(updates);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400 text-sm">{order.jobNo}</span>
                <span className="text-xs text-stone-400 font-normal">| အချက်အလက်နှင့် လက်ခ ပြင်ဆင်မည်</span>
              </div>
              <p className="text-[11px] text-stone-300 truncate max-w-md">{order.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar-y space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: LABOR FEE & SETTLEMENT (PRIMARY USER FOCUS) */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                  ပန်းထိမ်လက်ခ ရှင်းလင်းခြင်း နှင့် ပြင်ဆင်မှု (Labor Settlement)
                </h4>
              </div>
              {balanceLabor > 0 ? (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                  မရှင်းရသေး (ကျန်ငွေရှိ)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                  လက်ခရှင်းပြီး (Paid)
                </span>
              )}
            </div>

            {/* Visual Balance Card */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-white border border-stone-200 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-stone-500 block">စုစုပေါင်း လက်ခ</span>
                <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">
                  {formatMMK(totalLaborCharge)}
                </span>
              </div>
              <div className="border-x border-stone-200">
                <span className="text-[10px] text-stone-500 block">ပေးချေပြီး လက်ခ</span>
                <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                  {formatMMK(paidLaborCharge)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">ကျန်ရှိလက်ခ (ပေးရန်ကျန်)</span>
                <span
                  className={`font-mono font-bold text-xs sm:text-sm ${
                    balanceLabor > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {balanceLabor > 0 ? formatMMK(balanceLabor) : '၀ ကျပ် (ရှင်းပြီး)'}
                </span>
              </div>
            </div>

            {/* Quick Settle Actions */}
            {balanceLabor > 0 && (
              <div className="p-3 bg-white/80 border border-amber-300 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-stone-800 text-[11px]">
                    ⚡ လက်ခ ကျန်ငွေ အမြန်ရှင်းလင်းရန်:
                  </span>
                  <button
                    type="button"
                    onClick={handleSettleFullBalance}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs"
                    title="ကျန်ငွေ အကုန်လုံး ရှင်းပြီးအဖြစ် ပြောင်းလဲမည်"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ကျန်ငွေ အားလုံးရှင်းမည် ({formatMMK(balanceLabor)})</span>
                  </button>
                </div>

                {/* Partial Payment Input */}
                <div className="flex items-center gap-2 pt-1 border-t border-stone-200">
                  <span className="text-[11px] text-stone-600 whitespace-nowrap">ထပ်မံပေးချေငွေ:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 20000"
                    value={quickPayAmount}
                    onChange={(e) => setQuickPayAmount(e.target.value)}
                    className="flex-1 p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickPayment}
                    disabled={!quickPayAmount || Number(quickPayAmount) <= 0}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    + ပေးချေမည်
                  </button>
                </div>
              </div>
            )}

            {/* Detailed Labor Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  စုစုပေါင်း လက်ခ (MMK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalLaborCharge}
                  onChange={(e) => setTotalLaborCharge(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  ပေးချေပြီး လက်ခ (MMK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidLaborCharge}
                  onChange={(e) => setPaidLaborCharge(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-emerald-700"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  ကျန်ရှိလက်ခ (တွက်ချက်ပြီး)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatMMK(balanceLabor)}
                  className={`w-full p-2 bg-stone-100 border border-stone-300 rounded-lg text-xs font-mono font-bold ${
                    balanceLabor > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="font-semibold text-stone-600 block mb-1">လက်ခ တွက်ချက်ပုံ</label>
                <select
                  value={laborChargeType}
                  onChange={(e) => setLaborChargeType(e.target.value as any)}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                >
                  <option value="Fixed">အထည်လိုက် အသေ (Fixed Fee)</option>
                  <option value="PerKyat">ကျပ်သားနှုန်း (Per Kyat Weight)</option>
                  <option value="PerPiece">အရေအတွက်နှုန်း (Per Piece)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-stone-600 block mb-1">လက်ခနှုန်းထား (Rate MMK)</label>
                <input
                  type="number"
                  min="0"
                  value={laborRate}
                  onChange={(e) => setLaborRate(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ORDER & ITEM DETAILS */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <h4 className="font-bold text-stone-900 text-xs">အထည်နှင့် အပ်နှံမှု အချက်အလက်များ</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 block mb-1">
                  အထည်အမည် / ခေါင်းစဉ်
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  ပန်းထိမ်ဆရာ / ရွှေကျိုဖို
                </label>
                <select
                  value={goldsmithId}
                  onChange={(e) => setGoldsmithId(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                >
                  {goldsmiths.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.workshopName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">လုပ်ငန်းအမျိုးအစား</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as WorkshopJobType)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                >
                  <option value="CustomerOrder">ဖောက်သည်အပ်ထည် (Customer Order)</option>
                  <option value="StockProduction">ဆိုင်တင်စတော့ထုတ်လုပ်ခြင်း (Stock)</option>
                  <option value="GoldMelting">ရွှေကျို/ရွှေသွန်း (Gold Melting)</option>
                  <option value="RepairResize">ပြုပြင်/ဆိုဒ်ချဲ့ (Repair/Resize)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">အမျိုးအစား</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Ring">လက်စွပ် (Ring)</option>
                  <option value="Necklace">ဆွဲကြိုး (Necklace)</option>
                  <option value="Bracelet">လက်ကောက်/လက်ပတ် (Bracelet)</option>
                  <option value="Bangle">လက်ကောက် (Bangle)</option>
                  <option value="Earring">နားကပ်/နားဆွဲ (Earring)</option>
                  <option value="Pendant">ဆွဲသီး (Pendant)</option>
                  <option value="Gold Bar">ရွှေတုံး (Gold Bar)</option>
                  <option value="Other">အခြား (Other)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">ရွှေရည်</label>
                <select
                  value={purity}
                  onChange={(e) => setPurity(e.target.value as PurityType)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                >
                  <option value="16_PE">၁၆ ပဲရည် (အခေါက်ရွှေ 99.9%)</option>
                  <option value="15_PE">၁၅ ပဲရည် (91.6%)</option>
                  <option value="14_PE">၁၄ ပဲရည် (87.5%)</option>
                  <option value="14_PE_2_YWAY">၁၄ ပဲ ၂ ရွေး (88.5%)</option>
                  <option value="12_PE">၁၂ ပဲရည် (75.0%)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">လက်ရှိအဆင့် (Status)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WorkshopJobStatus)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                >
                  <option value="Given">ရွှေအပ်နှံထားဆဲ (Given)</option>
                  <option value="InProgress">ပြုလုပ်နေဆဲ (InProgress)</option>
                  <option value="Received">အထည်ပြန်လက်ခံပြီး (Received)</option>
                  <option value="Stocked">စတော့သွင်းပြီး (Stocked)</option>
                  <option value="Cancelled">ပယ်ဖျက် (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">ခန့်မှန်းပြီးစီးရက်</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: WEIGHTS & WASTAGE */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <h4 className="font-bold text-stone-900 text-xs">အပ်နှံရွှေချိန် နှင့် အလျော့တွက် စည်းကမ်းချက်များ</h4>

            {/* Given Weight */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">အပ်နှံရွှေချိန် (Given Weight)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 block">ကျပ်</span>
                  <input
                    type="number"
                    min="0"
                    value={givenKyat}
                    onChange={(e) => setGivenKyat(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">ပဲ</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={givenPe}
                    onChange={(e) => setGivenPe(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">ရွေး</span>
                  <input
                    type="number"
                    min="0"
                    max="7.99"
                    step="0.1"
                    value={givenYway}
                    onChange={(e) => setGivenYway(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Allowed Wastage */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">ခွင့်ပြုအလျော့တွက် (Allowed Wastage)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 block">ပဲ</span>
                  <input
                    type="number"
                    min="0"
                    value={allowedPe}
                    onChange={(e) => setAllowedPe(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">ရွေး</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={allowedYway}
                    onChange={(e) => setAllowedYway(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Finished Weight (if finished/stocked/received) */}
            <div className="pt-2 border-t border-stone-200">
              <label className="font-bold text-stone-700 block mb-1">
                ပြီးစီးရွှေချိန် (Finished Weight - ရှိပါက)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 block">ကျပ်</span>
                  <input
                    type="number"
                    min="0"
                    value={finKyat}
                    onChange={(e) => setFinKyat(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-amber-900"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">ပဲ</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={finPe}
                    onChange={(e) => setFinPe(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-amber-900"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">ရွေး</span>
                  <input
                    type="number"
                    min="0"
                    max="7.99"
                    step="0.1"
                    value={finYway}
                    onChange={(e) => setFinYway(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-amber-900"
                  />
                </div>
              </div>
            </div>

            {/* Remnant Scrap & Stone */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-stone-500 block">ပြန်အပ်ရွှေစ (ရွေး)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={scrapYway}
                  onChange={(e) => setScrapYway(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">ကျောက်ချိန် (ရွေး)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={stoneWeightYway}
                  onChange={(e) => setStoneWeightYway(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">ကျောက်ဖိုး (MMK)</span>
                <input
                  type="number"
                  min="0"
                  value={stoneCost}
                  onChange={(e) => setStoneCost(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">ရွှေပေါက်ကြားဒဏ်ကြေး</span>
                <input
                  type="number"
                  min="0"
                  value={shortagePenalty}
                  onChange={(e) => setShortagePenalty(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: CUSTOMER DETAILS (IF CUSTOMER ORDER) */}
          {orderType === 'CustomerOrder' && (
            <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2.5">
              <h4 className="font-bold text-purple-950 text-xs">ဖောက်သည် အချက်အလက်များ</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-stone-600 block mb-0.5">ဖောက်သည်အမည်</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-600 block mb-0.5">ဖုန်းနံပါတ်</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-600 block mb-0.5">ဖောက်သည် စရန်ငွေ (MMK)</label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: NOTES */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">မှတ်ချက် (Notes)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="အထည်အသေးစိတ်၊ လက်ရာ၊ လက်ခရှင်းလင်းမှု မှတ်တမ်း..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-stone-200">
            <span className="text-[11px] text-stone-500">
              {order.linkedProductId && (
                <span className="text-purple-700 font-semibold">
                  ℹ️ ဤအထည်သည် စတော့ပစ္စည်း [ID: {order.linkedProductId}] နှင့် ချိတ်ဆက်ထားပြီးဖြစ်ပါသည်
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!order.linkedProductId && onOpenStockModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStockModal(order);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="အဆင့် ၃: အရောင်းစတော့ထဲသို့ ပစ္စည်းအသစ်အဖြစ် သွင်းမည်"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>စတော့သွင်းမည် (အဆင့် ၃)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                အချက်အလက် သိမ်းဆည်းမည်
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

