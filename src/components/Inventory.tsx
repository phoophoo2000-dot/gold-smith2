import React, { useState } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Product, PurityType, ProductCategory, GoldWeight } from '../types/gold';
import { WeightInput } from './WeightInput';
import {
  formatMMK,
  formatNumber,
  formatWeightMm,
  getPurityLabel,
  weightToTotalYway,
  totalYwayToWeight,
  weightToKyatDecimal,
} from '../services/calculationEngine';
import { getPurityTheme } from '../utils/purityTheme';
import {
  Gem,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  Tag,
  Package,
  Layers,
  Scale,
  Coins,
  RotateCw,
  QrCode,
  Printer,
  Sparkles,
  UploadCloud,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';
import { BarcodeLabelModal } from './BarcodeLabelModal';

export const Inventory: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    deduplicateStock,
    syncProductsToSupabase,
    goldPrices,
    currentUser,
    language,
    isSupabaseConnected,
    syncWorkshopOrdersToStock,
    refreshSupabaseData,
    isSyncing,
  } = useGoldShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPurity, setSelectedPurity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('In Stock');
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Auto-sync workshop orders on mount to guarantee all items are in stock
  React.useEffect(() => {
    syncWorkshopOrdersToStock();
  }, []);

  // Table horizontal scroll helper
  const inventoryScroll = useHorizontalScroll();

  // Modal for Add/Edit product
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [labelProducts, setLabelProducts] = useState<Product[] | null>(null);

  // Form states
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Ring');
  const [formPurity, setFormPurity] = useState<PurityType>('15_PE');
  const [formWeight, setFormWeight] = useState<GoldWeight>({ kyat: 0, pe: 3, yway: 0 });
  const [formStoneWeightYway, setFormStoneWeightYway] = useState<number>(0);
  const [formStoneCharge, setFormStoneCharge] = useState<number>(0);
  const [formMakingCharge, setFormMakingCharge] = useState<number>(60000);
  const [formCostPrice, setFormCostPrice] = useState<number>(1500000);
  const [formNotes, setFormNotes] = useState('');

  const generateUniqueSku = (cat: ProductCategory, purity: PurityType): string => {
    const prefixMap: Record<ProductCategory, string> = {
      Ring: 'RNG',
      Necklace: 'NCK',
      Bracelet: 'BRC',
      Earring: 'EAR',
      Chain: 'CHN',
      Bangle: 'BNG',
      Pendant: 'PDT',
      'Gold Bar': 'BAR',
      Other: 'OTH',
    };
    const pfx = prefixMap[cat] || cat.substring(0, 3).toUpperCase();
    const purityNum = purity.replace('_PE', '');

    let maxNum = 0;
    products.forEach((p) => {
      if (!p.sku) return;
      const match = p.sku.toUpperCase().match(new RegExp(`^${pfx}-${purityNum}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `${pfx}-${purityNum}-${String(maxNum + 1).padStart(2, '0')}`;
  };

  const openAddModal = () => {
    setEditingProductId(null);
    const initialSku = generateUniqueSku('Ring', '15_PE');
    setFormSku(initialSku);
    setFormName('');
    setFormCategory('Ring');
    setFormPurity('15_PE');
    setFormWeight({ kyat: 0, pe: 3, yway: 0 });
    setFormStoneWeightYway(0);
    setFormStoneCharge(0);
    setFormMakingCharge(60000);
    setFormCostPrice(1500000);
    setFormNotes('');
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormSku(product.sku);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPurity(product.purity);
    setFormWeight(product.weight);
    setFormStoneWeightYway(product.stoneWeightYway || 0);
    setFormStoneCharge(product.stoneCharge || 0);
    setFormMakingCharge(product.makingCharge || 0);
    setFormCostPrice(product.costPrice || 0);
    setFormNotes(product.notes || '');
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('ပစ္စည်းအမည် ဖြည့်သွင်းပါ');
      return;
    }

    const cleanSku = formSku.trim() || generateUniqueSku(formCategory, formPurity);
    const isDup = products.some(
      (p) =>
        (!editingProductId || p.id !== editingProductId) &&
        p.sku &&
        p.sku.toLowerCase() === cleanSku.toLowerCase()
    );
    if (isDup) {
      alert(`သတိပေးချက်: SKU "${cleanSku}" ဖြင့် ပစ္စည်းရှိနှင့်ပြီး ဖြစ်ပါသည်။ ကျေးဇူးပြု၍ SKU နံပါတ် အသစ်တစ်ခု သတ်မှတ်ပေးပါ`);
      return;
    }

    if (editingProductId) {
      updateProduct(editingProductId, {
        sku: cleanSku,
        name: formName.trim(),
        category: formCategory,
        purity: formPurity,
        weight: formWeight,
        stoneWeightYway: formStoneWeightYway,
        stoneCharge: formStoneCharge,
        makingCharge: formMakingCharge,
        costPrice: formCostPrice,
        notes: formNotes,
      });
      setSyncToast(`✓ ရွှေထည်ပစ္စည်း "${formName.trim()}" (${cleanSku}) ၏ အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ!`);
    } else {
      addProduct({
        sku: cleanSku,
        name: formName.trim(),
        category: formCategory,
        purity: formPurity,
        weight: formWeight,
        stoneWeightYway: formStoneWeightYway,
        stoneCharge: formStoneCharge,
        makingCharge: formMakingCharge,
        costPrice: formCostPrice,
        status: 'In Stock',
        notes: formNotes,
      });
      // Reset filters so the new product is immediately visible
      setSearchTerm('');
      setSelectedCategory('all');
      setSelectedPurity('all');
      setSelectedStatus('In Stock');
      setSyncToast(`✓ ရွှေထည်ပစ္စည်းအသစ် "${formName.trim()}" (${cleanSku}) ကို စတော့စာရင်းသို့ အောင်မြင်စွာ ထည့်သွင်းသိမ်းဆည်းပြီးပါပြီ!`);
    }

    setShowProductModal(false);
    setTimeout(() => setSyncToast(null), 5000);
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesPurity = selectedPurity === 'all' || p.purity === selectedPurity;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;

    return matchesSearch && matchesCat && matchesPurity && matchesStatus;
  });

  // Summary Metrics
  const inStockItems = products.filter((p) => p.status === 'In Stock');
  const totalStockYway = inStockItems.reduce(
    (sum, p) => sum + weightToTotalYway(p.weight),
    0
  );
  const totalStockWeight = totalYwayToWeight(totalStockYway);

  // Approximate current market value
  const price15 = goldPrices.find((p) => p.purity === '15_PE')?.sellPrice || 7000000;
  const totalStockValue = Math.round(weightToKyatDecimal(totalStockWeight) * price15);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <Gem className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
                ပစ္စည်းလက်ကျန် စီမံခန့်ခွဲမှု (Stock & Inventory)
              </h2>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isSupabaseConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-stone-100 text-stone-600 border-stone-300'
                }`}
              >
                {isSupabaseConnected ? '☁ Supabase Synced' : 'Local Storage'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              ဆိုင်တွင်း ရွှေထည်လက်ဝတ်ရတနာများ၊ အလေးချိန်နှင့် လက်ကျန်စာရင်း
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isDeduplicating || isSyncing}
            onClick={async () => {
              setIsDeduplicating(true);
              try {
                const res = await deduplicateStock();
                if (res.removedCount > 0) {
                  setSyncToast(`ထပ်နေသော ပစ္စည်း ${res.removedCount} ခုကို အောင်မြင်စွာ ဖယ်ရှားပြီး စတော့လက်ကျန် ${res.remainingCount} ထည် တိကျစွာ ညှိနှိုင်းပြီးပါပြီ`);
                } else {
                  setSyncToast(`စတော့စာရင်းတွင် ထပ်နေသော ပစ္စည်းမရှိပါ (စုစုပေါင်း ${res.remainingCount} ထည် တိကျမှန်ကန်ပါသည်)`);
                }
              } catch (err: any) {
                setSyncToast(`စတော့ သန့်စင်ရာတွင် အမှား: ${err?.message || 'Error'}`);
              } finally {
                setIsDeduplicating(false);
                setTimeout(() => setSyncToast(null), 5000);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold rounded-xl text-xs sm:text-sm border border-purple-300 shadow-xs transition-all cursor-pointer"
            title="စတော့တွင် ထပ်နေသော ပစ္စည်းများကို စစ်ဆေးဖယ်ရှားပြီး လက်ကျန်စာရင်း အမှန်ကို ပြန်ညှိမည်"
          >
            <Sparkles className={`w-4 h-4 text-purple-600 ${isDeduplicating ? 'animate-spin' : ''}`} />
            <span>{isDeduplicating ? 'ညှိနှိုင်းနေသည်...' : 'စတော့ ထပ်နေမှု ရှင်းလင်းမည် (Clean)'}</span>
          </button>

          {isSupabaseConnected && (
            <button
              type="button"
              disabled={isCloudSyncing || isSyncing}
              onClick={async () => {
                setIsCloudSyncing(true);
                try {
                  const res = await syncProductsToSupabase();
                  if (res.success) {
                    setSyncToast(`စတော့ပစ္စည်း ${res.count} ထည်ကို Supabase Cloud Database သို့ တိုက်ရိုက် Upload တင်ပြီးပါပြီ`);
                  } else {
                    setSyncToast(`Cloud Sync အမှား: ${res.error || 'Failed'}`);
                  }
                } catch (err: any) {
                  setSyncToast(`Cloud Sync Error: ${err?.message || 'Error'}`);
                } finally {
                  setIsCloudSyncing(false);
                  setTimeout(() => setSyncToast(null), 5000);
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs sm:text-sm border border-emerald-300 shadow-xs transition-all cursor-pointer"
              title="လက်ရှိ စတော့ပစ္စည်းများကို Supabase Cloud Database သို့ အပြည့်အစုံ တင်မည်"
            >
              <UploadCloud className={`w-4 h-4 text-emerald-600 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing ? 'တင်နေသည်...' : 'Cloud သို့ Stock အပြည့်တင်မည်'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSyncing}
            onClick={async () => {
              try {
                await refreshSupabaseData();
              } catch {}
              const added = syncWorkshopOrdersToStock();
              if (added > 0) {
                setSyncToast(`ပန်းထိမ်နှင့် ရွှေကျိုအပ်ထည်များမှ စတော့ ${added} ထည်ကို စတော့ထဲသို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ`);
              } else {
                setSyncToast(`ပန်းထိမ်စတော့များ အားလုံး စတော့စာရင်းထဲတွင် အပြည့်အစုံ ရောက်ရှိပြီးဖြစ်ပါသည်`);
              }
              setTimeout(() => setSyncToast(null), 4000);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs sm:text-sm border border-stone-300 shadow-xs transition-all cursor-pointer"
            title="မိုဃ်းတိမ်ဒေတာမှ ပန်းထိမ်စတော့များ စတော့စာရင်းထဲ ရောက်/မရောက် စစ်ဆေးပြီး ပြန်လည်သွင်းယူမည်"
          >
            <RotateCw className={`w-4 h-4 text-purple-700 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'ပန်းထိမ်စတော့ ပြန်စစ်မည်'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const inStock = filteredProducts.filter((p) => p.status === 'In Stock');
              if (inStock.length > 0) {
                setLabelProducts(inStock);
              } else if (products.length > 0) {
                setLabelProducts(products.slice(0, 10));
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs sm:text-sm border border-stone-800 shadow-xs transition-all cursor-pointer"
            title="လက်ရှိ စတော့စာရင်းရှိ ပစ္စည်းများအတွက် Barcode & QR Code စတစ်ကာ ရိုက်ထုတ်မည်"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>စတစ်ကာ ထုတ်မည် (Labels)</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ပစ္စည်းအသစ် ထည့်မည် (Add Item)</span>
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-amber-500/40 animate-fade-in max-w-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 font-medium text-stone-200">
            {syncToast}
          </div>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-stone-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* DUPLICATE DETECTOR BANNER */}
      {products.length > inStockItems.length && products.filter((p) => p.status === 'In Stock').length !== products.length && (
        <div className="hidden" />
      )}

      {/* Summary KPI Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>ဆိုင်တွင်း ရွှေလက်ကျန်နှင့် ခန့်မှန်းတန်ဖိုး အကျဉ်းချုပ် (Stock Overview & Valuation)</span>
          </span>
          <span className="text-xs text-amber-300 font-bold bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700">
            ၁၅ ပဲရည် ယနေ့ပေါက်ဈေး: {formatMMK(price15)}
          </span>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50/40">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Total In Stock Items
            </span>
            <div className="text-2xl font-extrabold text-stone-900">
              {inStockItems.length} <span className="text-sm font-normal text-stone-500">ထည်</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">
              ရောင်းချပြီး: {products.filter((p) => p.status === 'Sold').length} ထည်
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Total Gold Stock Weight
            </span>
            <div className="text-xl font-extrabold text-amber-950">
              {formatWeightMm(totalStockWeight)}
            </div>
            <div className="text-xs text-stone-400 mt-1 font-mono">
              = {weightToKyatDecimal(totalStockWeight).toFixed(4)} ကျပ်သား
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Estimated Market Value
            </span>
            <div className="text-2xl font-extrabold text-amber-900">
              {formatMMK(totalStockValue)}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              ၁၅ ပဲရည် ပေါက်ဈေးဖြင့် တွက်ချက်ထားသည်
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>ပစ္စည်းရှာဖွေခြင်းနှင့် အမျိုးအစားစစ်ထုတ်ခြင်း (Search & Filters)</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-300">ကိုက်ညီသော ပစ္စည်း:</span>
            <span className="font-bold text-amber-300 bg-stone-800 px-2.5 py-0.5 rounded border border-stone-700 font-mono">
              {filteredProducts.length} ထည်
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Search box */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="ပစ္စည်းအမည် သို့မဟုတ် SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Category filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">အမျိုးအစားအားလုံး (All Categories)</option>
                <option value="Ring">လက်စွပ် (Ring)</option>
                <option value="Necklace">ဆွဲကြိုး (Necklace)</option>
                <option value="Bracelet">လက်ကောက် (Bracelet)</option>
                <option value="Earring">နားကပ် (Earring)</option>
                <option value="Chain">ကြိုး (Chain)</option>
                <option value="Bangle">လက်စွပ်ကွင်း / ဘီးကွင်း (Bangle)</option>
                <option value="Pendant">ဆွဲသီး (Pendant)</option>
                <option value="Gold Bar">ရွှေတုံး/ပြား (Gold Bar)</option>
                <option value="Other">အခြား (Other)</option>
              </select>
            </div>

            {/* Purity filter */}
            <div>
              <select
                value={selectedPurity}
                onChange={(e) => setSelectedPurity(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">ပဲရည်အားလုံး (All Purities)</option>
                <option value="12_PE">၁၂ ပဲရည်</option>
                <option value="13_PE">၁၃ ပဲရည်</option>
                <option value="14_PE">၁၄ ပဲရည်</option>
                <option value="15_PE">၁၅ ပဲရည် (အခေါက်)</option>
                <option value="16_PE">၁၆ ပဲရည် (ရွှေစင်)</option>
              </select>
            </div>

            {/* Status filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">အခြေအနေ အားလုံး</option>
                <option value="In Stock">ဆိုင်တွင်းလက်ကျန် (In Stock)</option>
                <option value="Sold">ရောင်းချပြီး (Sold)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden w-full min-w-0">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span>ဆိုင်တွင်း ရွှေထည်လက်ကျန်စာရင်း (Current Stock Items)</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-300">ဇယားတွင် ပြသထားမှု:</span>
            <span className="font-bold text-amber-300 bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700">
              {filteredProducts.length} ထည်
            </span>
            {filteredProducts.length !== inStockItems.length && (
              <span className="text-stone-400 text-[11px]">
                (ဆိုင်တွင်း စုစုပေါင်း: {inStockItems.length} ထည်)
              </span>
            )}
            <span className="text-stone-400 font-mono text-[11px] hidden sm:inline">
              | {formatWeightMm(totalStockWeight)}
            </span>
          </div>
        </div>
        <div
          ref={inventoryScroll.scrollRef}
          data-horizontal-scroll="true"
          className="overflow-x-auto pb-2 custom-scrollbar-x w-full"
          tabIndex={0}
        >
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead className="bg-stone-950 text-stone-200 font-bold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 text-amber-400 whitespace-nowrap">SKU / Code</th>
                <th className="py-3 px-4 text-white whitespace-nowrap">ပစ္စည်းအမည် (Product Name)</th>
                <th className="py-3 px-4 text-stone-300 whitespace-nowrap">အမျိုးအစား</th>
                <th className="py-3 px-4 text-stone-300 whitespace-nowrap">ပဲရည်</th>
                <th className="py-3 px-4 text-amber-400 whitespace-nowrap">ရွှေအလေးချိန် (Weight)</th>
                <th className="py-3 px-4 text-right text-stone-300 whitespace-nowrap">လက်ခ (Making)</th>
                <th className="py-3 px-4 text-right text-stone-300 whitespace-nowrap">ကျောက်ဖိုး (Stone)</th>
                <th className="py-3 px-4 text-center text-stone-300 whitespace-nowrap">အခြေအနေ</th>
                <th className="py-3 px-4 text-center text-stone-300 whitespace-nowrap">လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400 text-xs bg-white">
                    ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ (No matching inventory found)
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const isEven = idx % 2 === 0;
                  const purityTheme = getPurityTheme(p.purity);
                  return (
                    <tr
                      key={`${p.id}_${p.sku || ''}_${idx}`}
                      className={`transition-colors ${
                        isEven
                          ? 'bg-white hover:bg-amber-50/70'
                          : 'bg-stone-100/85 hover:bg-amber-100/60'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-stone-700">
                        {p.sku}
                        {(p.sku.startsWith('WSP-') || p.notes?.includes('ပန်းထိမ်') || p.notes?.includes('JOB-')) && (
                          <span className="block text-[9px] text-purple-700 font-sans font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                            🔨 ရွှေကျို/ပန်းထိမ်ထည်
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{p.name}</div>
                        {p.notes && <div className="text-[11px] text-stone-500">{p.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-medium">{p.category}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${purityTheme.badge}`}>
                          {getPurityLabel(p.purity, language)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{formatWeightMm(p.weight)}</div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {weightToKyatDecimal(p.weight).toFixed(4)} ကျပ်
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-stone-700">
                        {p.makingCharge ? formatNumber(p.makingCharge) : '0'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-stone-700">
                        {p.stoneCharge ? formatNumber(p.stoneCharge) : '0'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'In Stock'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-stone-200 text-stone-600 border border-stone-300'
                          }`}
                        >
                          {p.status === 'In Stock' ? 'ဆိုင်တွင်းလက်ကျန်' : 'ရောင်းပြီး'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabelProducts([p])}
                            className="text-stone-600 hover:text-amber-800 hover:bg-amber-100 p-1.5 rounded-lg cursor-pointer transition-colors"
                            title="Barcode &amp; QR Code စတစ်ကာ ထုတ်မည် (Print Tag)"
                          >
                            <QrCode className="w-4 h-4 text-amber-700" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="text-stone-500 hover:text-amber-800 p-1.5 rounded-lg cursor-pointer transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="text-stone-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="Delete Item"
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden border border-stone-200">
            {/* Modal Header - Always pinned at top */}
            <div className="shrink-0 bg-stone-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-stone-800">
              <h3 className="font-bold text-base sm:text-lg text-amber-300 leading-normal">
                {editingProductId ? 'ပစ္စည်းအချက်အလက် ပြင်ဆင်မည်' : 'ရွှေထည်ပစ္စည်း အသစ်ထည့်မည်'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
                title="ပိတ်မည်"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body with dedicated vertical scrollbar */}
            <form id="inventory-product-form" onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm custom-scrollbar-y">
              {/* Section 1: Item Info */}
              <div className="space-y-3">
                <div className="bg-stone-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs border border-stone-800">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>အခြေခံ အချက်အလက်များ (Item Details)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      SKU / Code
                    </label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      အမျိုးအစား (Category)
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        const newCat = e.target.value as ProductCategory;
                        setFormCategory(newCat);
                        if (!editingProductId) {
                          setFormSku(generateUniqueSku(newCat, formPurity));
                        }
                      }}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Ring">လက်စွပ် (Ring)</option>
                      <option value="Necklace">ဆွဲကြိုး (Necklace)</option>
                      <option value="Bracelet">လက်ကောက် (Bracelet)</option>
                      <option value="Earring">နားကပ် (Earring)</option>
                      <option value="Chain">ကြိုး (Chain)</option>
                      <option value="Bangle">လက်စွပ်ကွင်း (Bangle)</option>
                      <option value="Pendant">ဆွဲသီး (Pendant)</option>
                      <option value="Gold Bar">ရွှေတုံး/ပြား (Gold Bar)</option>
                      <option value="Other">အခြား (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    ပစ္စည်းအမည် (Product Title)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ဥပမာ- ပန်းခက်ပုံ ၁၅ ပဲရည် လက်စွပ်"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    ပဲရည် (Purity)
                  </label>
                  <select
                    value={formPurity}
                    onChange={(e) => {
                      const newPurity = e.target.value as PurityType;
                      setFormPurity(newPurity);
                      if (!editingProductId) {
                        setFormSku(generateUniqueSku(formCategory, newPurity));
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="12_PE">၁၂ ပဲရည်</option>
                    <option value="13_PE">၁၃ ပဲရည်</option>
                    <option value="14_PE">၁၄ ပဲရည်</option>
                    <option value="15_PE">၁၅ ပဲရည် (အခေါက်ရွှေ)</option>
                    <option value="16_PE">၁၆ ပဲရည် (ရွှေစင် ၉၉.၉၉%)</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Weight */}
              <div className="space-y-3 pt-1">
                <div className="bg-stone-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs border border-stone-800">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>ရွှေအလေးချိန် သတ်မှတ်ခြင်း (Weight Input)</span>
                </div>

                <WeightInput
                  label="ရွှေအလေးချိန် (Weight)"
                  value={formWeight}
                  onChange={setFormWeight}
                />
              </div>

              {/* Section 3: Charges & Notes */}
              <div className="space-y-3 pt-1">
                <div className="bg-stone-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs border border-stone-800">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>လက်ခ၊ ကျောက်ဖိုးနှင့် မှတ်ချက် (Charges & Notes)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      လက်ခ (Making Charge MMK)
                    </label>
                    <input
                      type="number"
                      value={formMakingCharge}
                      onChange={(e) => setFormMakingCharge(Number(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      ကျောက်ဖိုး (Stone Charge MMK)
                    </label>
                    <input
                      type="number"
                      value={formStoneCharge}
                      onChange={(e) => setFormStoneCharge(Number(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    မှတ်ချက် (Notes)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    placeholder="လက်ရာ သို့မဟုတ် ပန်းထိမ်ဆရာအမည်"
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer - Separate pinned container outside scroll area, never obscuring form content */}
            <div className="shrink-0 bg-stone-50 px-5 sm:px-6 py-3.5 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg font-medium text-xs sm:text-sm cursor-pointer transition-colors"
              >
                မလုပ်တော့ပါ (Cancel)
              </button>
              <button
                type="submit"
                form="inventory-product-form"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm cursor-pointer transition-colors"
              >
                သိမ်းဆည်းမည် (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">ပစ္စည်း ဖျက်ပစ်ရန် သေချာပါသလား?</h4>
                <p className="text-xs text-stone-400 truncate max-w-[220px]">
                  {productToDelete.name} ({productToDelete.sku || productToDelete.code || productToDelete.id})
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              ⚠️ ဤရွှေထည်ပစ္စည်းကို လက်ကျန်စာရင်းမှ လုံးဝ ဖယ်ရှားပစ်မည် ဖြစ်ပါသည်။
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold cursor-pointer"
              >
                မဖျက်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE & QR CODE LABEL PRINT MODAL */}
      {labelProducts && (
        <BarcodeLabelModal
          isOpen={Boolean(labelProducts)}
          onClose={() => setLabelProducts(null)}
          products={labelProducts}
        />
      )}
    </div>
  );
};
