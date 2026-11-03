import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import {
  Product,
  GoldWeight,
  PurityType,
  SaleItem,
  PaymentRecord,
  PaymentMethod,
  Sale,
  Customer,
} from '../types/gold';
import { WeightInput } from './WeightInput';
import { getPurityTheme } from '../utils/purityTheme';
import {
  calculateSaleItem,
  formatMMK,
  formatNumber,
  formatWeightMm,
  formatWeightEn,
  getPurityLabel,
  weightToTotalYway,
  addWeights,
  weightToKyatDecimal,
  sortGoldPricesAscending,
} from '../services/calculationEngine';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Receipt,
  Search,
  UserPlus,
  CreditCard,
  Printer,
  Check,
  AlertCircle,
  History,
  Tag,
  Gem,
  Layers,
  Sparkles,
  Coins,
  Info,
  Ban,
  RotateCcw,
  Store,
  DoorOpen,
  DoorClosed,
  Scan,
  Camera,
  QrCode,
  CheckCircle2,
  HelpCircle,
  Laptop,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { DebtSettlementModal } from './DebtSettlementModal';
import { VoidSaleModal } from './VoidSaleModal';
import { VoidSaleDetailsModal } from './VoidSaleDetailsModal';
import { CounterSelectModal } from './CounterSelectModal';
import { StoreOpenCloseModal } from './StoreOpenCloseModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { BarcodeToPcHelpModal } from './BarcodeToPcHelpModal';
import {
  scannerSounds,
  matchProductByBarcode,
  normalizeMyanmarDigits,
} from '../services/barcodeService';

interface PosSaleProps {
  onOpenInvoice: (sale: Sale) => void;
}

interface LightCardPalette {
  bg: string;
  hover: string;
  border: string;
  selectedBg: string;
  selectedBorder: string;
  selectedRing: string;
  accentBar: string;
  badge: string;
  purityBadge: string;
  weightText: string;
  divider: string;
}

const PRODUCT_LIGHT_PALETTES: LightCardPalette[] = [
  {
    // 1. Soft Amber / Warm Sand (ရွှေဝါရောင်နု)
    bg: 'bg-amber-50/80',
    hover: 'hover:bg-amber-100/80 hover:border-amber-300',
    border: 'border-amber-200/80',
    selectedBg: 'bg-amber-100',
    selectedBorder: 'border-amber-500',
    selectedRing: 'ring-amber-500/30',
    accentBar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    purityBadge: 'bg-amber-200/70 text-amber-900',
    weightText: 'text-amber-950',
    divider: 'border-amber-200/70',
  },
  {
    // 2. Soft Rose / Blush Pink (ပန်းရောင်နု)
    bg: 'bg-rose-50/80',
    hover: 'hover:bg-rose-100/80 hover:border-rose-300',
    border: 'border-rose-200/80',
    selectedBg: 'bg-rose-100',
    selectedBorder: 'border-rose-500',
    selectedRing: 'ring-rose-500/30',
    accentBar: 'bg-rose-400',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    purityBadge: 'bg-rose-200/70 text-rose-900',
    weightText: 'text-rose-950',
    divider: 'border-rose-200/70',
  },
  {
    // 3. Soft Sky / Ice Blue (မိုးပြာရောင်နု)
    bg: 'bg-sky-50/80',
    hover: 'hover:bg-sky-100/80 hover:border-sky-300',
    border: 'border-sky-200/80',
    selectedBg: 'bg-sky-100',
    selectedBorder: 'border-sky-500',
    selectedRing: 'ring-sky-500/30',
    accentBar: 'bg-sky-400',
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
    purityBadge: 'bg-sky-200/70 text-sky-900',
    weightText: 'text-sky-950',
    divider: 'border-sky-200/70',
  },
  {
    // 4. Soft Emerald / Mint Sage (စိမ်းပြာမြရောင်နု)
    bg: 'bg-emerald-50/80',
    hover: 'hover:bg-emerald-100/80 hover:border-emerald-300',
    border: 'border-emerald-200/80',
    selectedBg: 'bg-emerald-100',
    selectedBorder: 'border-emerald-500',
    selectedRing: 'ring-emerald-500/30',
    accentBar: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    purityBadge: 'bg-emerald-200/70 text-emerald-900',
    weightText: 'text-emerald-950',
    divider: 'border-emerald-200/70',
  },
  {
    // 5. Soft Purple / Lavender (ခရမ်းရောင်နု)
    bg: 'bg-purple-50/80',
    hover: 'hover:bg-purple-100/80 hover:border-purple-300',
    border: 'border-purple-200/80',
    selectedBg: 'bg-purple-100',
    selectedBorder: 'border-purple-500',
    selectedRing: 'ring-purple-500/30',
    accentBar: 'bg-purple-400',
    badge: 'bg-purple-100 text-purple-900 border-purple-200',
    purityBadge: 'bg-purple-200/70 text-purple-900',
    weightText: 'text-purple-950',
    divider: 'border-purple-200/70',
  },
  {
    // 6. Soft Orange / Apricot Peach (လိမ္မော်ရောင်နု)
    bg: 'bg-orange-50/80',
    hover: 'hover:bg-orange-100/80 hover:border-orange-300',
    border: 'border-orange-200/80',
    selectedBg: 'bg-orange-100',
    selectedBorder: 'border-orange-500',
    selectedRing: 'ring-orange-500/30',
    accentBar: 'bg-orange-400',
    badge: 'bg-orange-100 text-orange-900 border-orange-200',
    purityBadge: 'bg-orange-200/70 text-orange-900',
    weightText: 'text-orange-950',
    divider: 'border-orange-200/70',
  },
  {
    // 7. Soft Teal / Jade (ပင်လယ်စိမ်းရောင်နု)
    bg: 'bg-teal-50/80',
    hover: 'hover:bg-teal-100/80 hover:border-teal-300',
    border: 'border-teal-200/80',
    selectedBg: 'bg-teal-100',
    selectedBorder: 'border-teal-500',
    selectedRing: 'ring-teal-500/30',
    accentBar: 'bg-teal-400',
    badge: 'bg-teal-100 text-teal-900 border-teal-200',
    purityBadge: 'bg-teal-200/70 text-teal-900',
    weightText: 'text-teal-950',
    divider: 'border-teal-200/70',
  },
  {
    // 8. Soft Indigo / Periwinkle (အပြာရင့်နု)
    bg: 'bg-indigo-50/80',
    hover: 'hover:bg-indigo-100/80 hover:border-indigo-300',
    border: 'border-indigo-200/80',
    selectedBg: 'bg-indigo-100',
    selectedBorder: 'border-indigo-500',
    selectedRing: 'ring-indigo-500/30',
    accentBar: 'bg-indigo-400',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    purityBadge: 'bg-indigo-200/70 text-indigo-900',
    weightText: 'text-indigo-950',
    divider: 'border-indigo-200/70',
  },
];

const getProductCardPalette = (index: number): LightCardPalette => {
  return PRODUCT_LIGHT_PALETTES[index % PRODUCT_LIGHT_PALETTES.length];
};

export const PosSale: React.FC<PosSaleProps> = ({ onOpenInvoice }) => {
  const {
    products,
    workshopOrders,
    convertWorkshopOrderToInventory,
    goldPrices,
    customers,
    addCustomer,
    createSale,
    sales,
    voidSale,
    settings,
    currentUser,
    currentCounter,
    storeOperation,
    language,
    isSupabaseConnected,
  } = useGoldShop();

  const [activeSubTab, setActiveSubTab] = useState<'new_sale' | 'history'>('new_sale');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [settleSale, setSettleSale] = useState<Sale | null>(null);
  const [voidSaleTarget, setVoidSaleTarget] = useState<Sale | null>(null);
  const [viewVoidDetailsSale, setViewVoidDetailsSale] = useState<Sale | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'Completed' | 'Pending Balance' | 'Void'>('all');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const filteredHistorySales = useMemo(() => {
    return sales.filter((s) => {
      if (historyStatusFilter !== 'all' && s.status !== historyStatusFilter) {
        return false;
      }
      if (historySearchTerm.trim()) {
        const q = historySearchTerm.toLowerCase();
        const matchInvoice = s.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = s.customerName?.toLowerCase().includes(q);
        const matchPhone = s.customerPhone?.toLowerCase().includes(q);
        const matchStaff = s.cashierName?.toLowerCase().includes(q) || s.voidedBy?.toLowerCase().includes(q);
        const matchManager = s.voidApprovedBy?.toLowerCase().includes(q);
        return matchInvoice || matchCustomer || matchPhone || matchStaff || matchManager;
      }
      return true;
    });
  }, [sales, historyStatusFilter, historySearchTerm]);

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Cart / Line items
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);

  // Item entry mode: 'from_stock' or 'custom'
  const [entryMode, setEntryMode] = useState<'from_stock' | 'custom'>('from_stock');
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);

  // Form states for item - Before product selection, all settings are ZERO except default wastage
  const [itemName, setItemName] = useState('ရွှေထည်ပစ္စည်း (ရွေးချယ်ပါ)');
  const [itemCategory, setItemCategory] = useState<Product['category']>('Ring');
  const [itemPurity, setItemPurity] = useState<PurityType>('15_PE');
  const [itemWeight, setItemWeight] = useState<GoldWeight>({ kyat: 0, pe: 0, yway: 0 });
  const [itemWastage, setItemWastage] = useState<GoldWeight>({ kyat: 0, pe: 0, yway: settings.defaultWastageYway || 2 });
  const [itemMakingCharge, setItemMakingCharge] = useState<number>(0);
  const [itemStoneCharge, setItemStoneCharge] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Payments split states
  const [payments, setPayments] = useState<PaymentRecord[]>([
    { method: 'Cash', amount: 0 },
  ]);

  // Note
  const [saleNotes, setSaleNotes] = useState('');

  // Reset item form states - Before product selection, all settings are ZERO except default wastage
  const resetItemFormToZero = useCallback(() => {
    setSelectedStockProduct(null);
    setItemName('ရွှေထည်ပစ္စည်း (ရွေးချယ်ပါ)');
    setItemCategory('Ring');
    setItemPurity('15_PE');
    setItemWeight({ kyat: 0, pe: 0, yway: 0 });
    setItemMakingCharge(0);
    setItemStoneCharge(0);
    setItemDiscount(0);
    setItemWastage({ kyat: 0, pe: 0, yway: settings.defaultWastageYway || 2 });
  }, [settings.defaultWastageYway]);

  // When stock item is selected, autofill form into calculation engine
  const handleSelectStockProduct = (product: Product) => {
    setSelectedStockProduct(product);
    setItemName(product.name);
    setItemCategory(product.category);
    setItemPurity(product.purity);
    setItemWeight(product.weight);
    setItemMakingCharge(product.makingCharge || 0);
    setItemStoneCharge(product.stoneCharge || 0);
    setItemDiscount(0);
    setItemWastage({ kyat: 0, pe: 0, yway: settings.defaultWastageYway || 2 });
  };

  // Barcode & QR Code Scanner states
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showBarcodeHelpModal, setShowBarcodeHelpModal] = useState(false);
  const [liveScannedKeyPreview, setLiveScannedKeyPreview] = useState<string>('');
  const [isBarcodeInputFocused, setIsBarcodeInputFocused] = useState(false);
  const [scanNotification, setScanNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const barcodeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Focus barcode input and activate cursor
  const focusBarcodeInput = React.useCallback(() => {
    const el = barcodeInputRef.current;
    if (el) {
      el.focus();
      try {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch {}
    }
  }, []);

  // Keep references fresh for event handlers without re-triggering effects
  const productsRef = React.useRef(products);
  useEffect(() => {
    productsRef.current = products;
  });

  const workshopOrdersRef = React.useRef(workshopOrders);
  useEffect(() => {
    workshopOrdersRef.current = workshopOrders;
  });

  const handleProcessBarcodeScan = (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;

    // Search product using intelligent universal matcher (exact, alphanumeric, Myanmar digits, layout unmapping)
    let found = matchProductByBarcode(clean, productsRef.current);

    // Intelligent Fallback: Check if this corresponds to a workshop job order (e.g., WSP-15-2604 or JOB-2604)
    if (!found && workshopOrdersRef.current && workshopOrdersRef.current.length > 0) {
      const jobDigitsMatch = clean.match(/(?:JOB|WSP)?[^\d]*(\d{4,})/i);
      const targetJobNum = jobDigitsMatch ? jobDigitsMatch[1] : '';
      const matchingOrder = workshopOrdersRef.current.find((o) => {
        if (!o.jobNo) return false;
        const oJobNum = o.jobNo.replace('JOB-', '').trim();
        if (targetJobNum && oJobNum === targetJobNum) return true;
        if (clean.toUpperCase().includes(o.jobNo.toUpperCase())) return true;
        const autoSku = `WSP-${(o.purity || '15').replace('_PE', '')}-${oJobNum}`;
        if (clean.toUpperCase().includes(autoSku.toUpperCase())) return true;
        return false;
      });

      if (matchingOrder) {
        // If the order has a linked product or exists in products
        const existingProd = productsRef.current.find(
          (p) =>
            (matchingOrder.linkedProductId && p.id === matchingOrder.linkedProductId) ||
            (p.sku && p.sku.toLowerCase().includes(matchingOrder.jobNo.replace('JOB-', '').toLowerCase())) ||
            (p.notes && p.notes.includes(matchingOrder.jobNo))
        );
        if (existingProd) {
          found = existingProd;
        } else if (convertWorkshopOrderToInventory) {
          const newProd = convertWorkshopOrderToInventory(matchingOrder.id);
          if (newProd) found = newProd;
        }
      }
    }

    if (found) {
      if (found.status !== 'In Stock') {
        scannerSounds.playErrorBeep();
        setScanNotification({
          type: 'error',
          text: `⚠️ [${found.sku}] ဤပစ္စည်းသည် လက်ကျန်မရှိတော့ပါ (Status: ${found.status === 'Sold' ? 'ရောင်းချပြီး' : found.status})`,
        });
        setBarcodeQuery('');
        if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        setTimeout(() => setScanNotification(null), 4000);
        return;
      }

      scannerSounds.playSuccessBeep();
      setEntryMode('from_stock');
      handleSelectStockProduct(found);

      // Calculation Engine သို့ ပို့ဆောင်ပြီး တိုက်ရိုက်တွက်ချက်ပြသခြင်း (ဘောက်ချာထဲ တိုက်ရိုက်မထည့်ဘဲ အလျော့တွက် စစ်ဆေးခွင့်ပြုခြင်း)
      setScanNotification({
        type: 'success',
        text: `✓ [${found.sku}] ${found.name} (${formatWeightMm(found.weight)}) အား Calculation Engine သို့ ပို့ဆောင်ပြီးပါပြီ။ အလျော့တွက် စစ်ဆေးပြီး "ဘောက်ချာထဲသို့ ထည့်မည် (Add to Cart)" ခလုတ်ကို နှိပ်ပါ`,
      });

      setBarcodeQuery('');
      setLiveScannedKeyPreview('');
      if (barcodeInputRef.current) {
        barcodeInputRef.current.value = '';
      }
      setTimeout(() => setScanNotification(null), 4500);
    } else {
      scannerSounds.playErrorBeep();
      setScanNotification({
        type: 'error',
        text: `❌ စကင်ဖတ်ရရှိသောကုတ်: "${clean}" ဖြင့် ရွှေထည်ပစ္စည်း မတွေ့ရှိပါ (စတော့ထဲရှိ SKU: RNG-15-01, WSP-15-2604 စသည်ဖြင့် စစ်ဆေးပါ)`,
      });
      setBarcodeQuery('');
      if (barcodeInputRef.current) {
        barcodeInputRef.current.value = '';
      }
      setTimeout(() => setScanNotification(null), 5000);
    }
  };

  // Keep handleProcessBarcodeScan reference fresh without re-registering event listener
  const handleProcessBarcodeScanRef = React.useRef(handleProcessBarcodeScan);
  useEffect(() => {
    handleProcessBarcodeScanRef.current = handleProcessBarcodeScan;
  });

  // Hardware Scanner & "Barcode to PC" Wi-Fi Scanner Listener
  // Intercepts rapid barcode scanner keystrokes from PC apps, iPhone Wi-Fi scanners, or USB barcode guns
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();
    let idleDebounceTimer: any = null;
    let clearPreviewTimer: any = null;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular text inputs (except barcode input)
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isInput && target !== barcodeInputRef.current) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Handle Enter / Tab / Return keys from Scanner or Barcode to PC
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (idleDebounceTimer) clearTimeout(idleDebounceTimer);
        const codeToProcess = scanBuffer.trim() || barcodeInputRef.current?.value.trim() || '';
        if (codeToProcess.length >= 2) {
          e.preventDefault();
          handleProcessBarcodeScanRef.current(codeToProcess);
          scanBuffer = '';
          setLiveScannedKeyPreview('');
          return;
        }
      }

      // Printable single characters (excluding navigation/modifiers)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Reset buffer if gap between keystrokes exceeds 1200ms (human pause)
        // Over Wi-Fi, Barcode to PC can have 150-300ms network jitter, so 1200ms ensures complete SKU reception
        if (diff > 1200) {
          scanBuffer = e.key;
        } else {
          scanBuffer += e.key;
        }

        // Live preview of receiving keystrokes in UI
        setLiveScannedKeyPreview(scanBuffer);
        if (clearPreviewTimer) clearTimeout(clearPreviewTimer);
        clearPreviewTimer = setTimeout(() => {
          setLiveScannedKeyPreview('');
        }, 3000);

        // Auto-detect complete barcode even without Enter:
        // If 3+ characters entered, and then idle for 650ms (giving full time for Wi-Fi transmission like RIN-15-34),
        // check if it matches a product
        if (idleDebounceTimer) clearTimeout(idleDebounceTimer);
        if (scanBuffer.length >= 3) {
          idleDebounceTimer = setTimeout(() => {
            const candidate = scanBuffer.trim();
            if (candidate.length >= 3) {
              const matched = matchProductByBarcode(candidate, productsRef.current);
              if (matched) {
                handleProcessBarcodeScanRef.current(candidate);
                scanBuffer = '';
                setLiveScannedKeyPreview('');
              }
            }
          }, 650);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (idleDebounceTimer) clearTimeout(idleDebounceTimer);
      if (clearPreviewTimer) clearTimeout(clearPreviewTimer);
    };
  }, []);

  // Find rate for selected purity
  const sortedGoldPrices = useMemo(() => sortGoldPricesAscending(goldPrices), [goldPrices]);

  const currentPurityRate = useMemo(() => {
    const found = goldPrices.find((gp) => gp.purity === itemPurity);
    return found ? found.sellPrice : 7000000;
  }, [goldPrices, itemPurity]);

  // Calculate live preview for currently edited item
  const currentPreviewItem: SaleItem = useMemo(() => {
    return calculateSaleItem({
      productId: selectedStockProduct?.id,
      sku: selectedStockProduct?.sku,
      name: itemName,
      category: itemCategory,
      purity: itemPurity,
      actualWeight: itemWeight,
      wastage: itemWastage,
      goldPricePerKyat: currentPurityRate,
      makingCharge: itemMakingCharge,
      stoneCharge: itemStoneCharge,
      discount: itemDiscount,
    });
  }, [
    selectedStockProduct,
    itemName,
    itemCategory,
    itemPurity,
    itemWeight,
    itemWastage,
    currentPurityRate,
    itemMakingCharge,
    itemStoneCharge,
    itemDiscount,
  ]);

  // Check whether an item is ready to be added to cart (Active vs De-active)
  const isItemReadyToAddToCart = useMemo(() => {
    const totalYway = weightToTotalYway(itemWeight);
    const hasValidName = itemName.trim() !== '' && itemName !== 'ရွှေထည်ပစ္စည်း (ရွေးချယ်ပါ)';
    return totalYway > 0 && hasValidName;
  }, [itemWeight, itemName]);

  // Add calculated item to cart
  const handleAddToCart = () => {
    if (!isItemReadyToAddToCart) {
      alert('ကျေးဇူးပြု၍ ရွှေထည်ပစ္စည်း ရွေးချယ်ပြီး အလေးချိန် ထည့်ပါ (Please select product and enter weight)');
      return;
    }

    setCartItems((prev) => [...prev, currentPreviewItem]);
    scannerSounds.playSuccessBeep();

    setScanNotification({
      type: 'success',
      text: `✓ "${currentPreviewItem.name}" (${formatWeightMm(currentPreviewItem.actualWeight)} + အလျော့တွက် ${formatWeightMm(currentPreviewItem.wastage)}) ကို ဘောက်ချာထဲ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ!`,
    });
    setTimeout(() => setScanNotification(null), 3500);

    // Reset current item form for next item to zero setting (keeping default wastage)
    resetItemFormToZero();

    // Refocus barcode input for next scan
    focusBarcodeInput();
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals for all items in cart
  const subtotalGold = cartItems.reduce((sum, item) => sum + item.goldAmount, 0);
  const totalMakingCharge = cartItems.reduce((sum, item) => sum + item.makingCharge, 0);
  const totalStoneCharge = cartItems.reduce((sum, item) => sum + item.stoneCharge, 0);
  const totalDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0);
  const grandTotal = cartItems.reduce((sum, item) => sum + item.total, 0);

  // Auto set initial cash amount to match grandTotal if only 1 payment method
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceRemaining = Math.max(0, grandTotal - totalPaid);

  // Quick helper to fill exact full payment
  const handleFullPayment = (method: PaymentMethod) => {
    setPayments([{ method, amount: grandTotal }]);
  };

  const handleAddPaymentRow = () => {
    const diff = Math.max(0, grandTotal - totalPaid);
    setPayments((prev) => [...prev, { method: 'KBZPay', amount: diff }]);
  };

  const handleUpdatePayment = (index: number, updates: Partial<PaymentRecord>) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleRemovePaymentRow = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Complete and submit sale
  const handleCompleteSale = () => {
    if (!storeOperation?.isOpen) {
      setShowStoreModal(true);
      return;
    }

    if (cartItems.length === 0) {
      alert('ဘောက်ချာထဲသို့ ရွှေထည်ပစ္စည်း အနည်းဆုံး (၁) ခု ထည့်သွင်းပါ');
      return;
    }

    // Resolve customer info
    let finalCustName = customCustomerName.trim() || 'အထွေထွေ ဝယ်ယူသူ (General Customer)';
    let finalCustPhone = customCustomerPhone.trim();
    let finalCustId = selectedCustomerId;

    if (selectedCustomerId) {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (existing) {
        finalCustName = existing.name;
        finalCustPhone = existing.phone;
      }
    }

    const counterCode = currentCounter?.id ? `${currentCounter.id}-` : 'C1-';
    const nextInvoiceNum = `${settings.invoicePrefix || 'GSP-'}${counterCode}${String(
      sales.length + 101
    ).padStart(5, '0')}`;

    const newSale = createSale({
      invoiceNo: nextInvoiceNum,
      counterId: currentCounter?.id || 'C1',
      counterName: currentCounter?.name || 'ကောင်တာ (၁)',
      date: new Date().toISOString().split('T')[0],
      customerId: finalCustId || undefined,
      customerName: finalCustName,
      customerPhone: finalCustPhone || undefined,
      items: cartItems,
      subtotalGold,
      totalMakingCharge,
      totalStoneCharge,
      totalDiscount,
      grandTotal,
      payments: payments.filter((p) => p.amount > 0),
      paidAmount: totalPaid,
      balanceRemaining,
      cashierName: currentUser.name,
      notes: saleNotes,
      status: balanceRemaining > 0 ? 'Pending Balance' : 'Completed',
    });

    // Reset POS form and item settings to zero
    resetItemFormToZero();
    setCartItems([]);
    setPayments([{ method: 'Cash', amount: 0 }]);
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setSaleNotes('');

    // Open invoice immediately for printing
    onOpenInvoice(newSale);
  };

  // Available stock items that are in stock
  const availableStock = products.filter(
    (p) =>
      p.status === 'In Stock' &&
      (!stockSearch ||
        p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(stockSearch.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(stockSearch.toLowerCase())))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-header tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
                အရောင်းနှင့် ဘောက်ချာထုတ်ခြင်း (POS Sales)
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
              ရွှေအလေးချိန်၊ အလျော့တွက်၊ လက်ခ၊ ကျောက်ဖိုး အလိုအလျောက် တွက်ချက်စနစ်
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Terminal Counter Chip */}
          <button
            type="button"
            onClick={() => setShowCounterModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/90 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
            title="ငွေရှင်းကောင်တာ နံပါတ် ပြောင်းလဲသတ်မှတ်ရန် နှိပ်ပါ"
          >
            <Store className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span>{currentCounter.name}</span>
            <span className="font-mono text-[10.5px] bg-amber-200/90 text-amber-950 px-1.5 py-0.2 rounded font-extrabold border border-amber-300/80">
              {currentCounter.id}
            </span>
          </button>

          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('new_sale');
              resetItemFormToZero();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSubTab === 'new_sale'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>အရောင်းအသစ် (New Sale)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>အရောင်းမှတ်တမ်း ({sales.length})</span>
          </button>
        </div>
      </div>
    </div>

      {activeSubTab === 'history' ? (
        /* SALES HISTORY TABLE */
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <span>အရောင်းမှတ်တမ်းများ (Sales History)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono font-bold border border-stone-200">
                  {sales.length} စောင်
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                ယနေ့နှင့် ယခင်အရောင်းများ၊ ကျန်ငွေစာရင်းနှင့် ပယ်ဖျက်ထားသော ဘောက်ချာများ
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="Invoice, ဖောက်သည်, ဖုန်း, Staff ရှာရန်..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {historySearchTerm && (
                <button
                  type="button"
                  onClick={() => setHistorySearchTerm('')}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
            <button
              type="button"
              onClick={() => setHistoryStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyStatusFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>အားလုံး (All)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700 text-stone-200 font-mono">
                {sales.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryStatusFilter('Completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyStatusFilter === 'Completed'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <span>ရှင်းပြီး (Completed)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-800 text-emerald-100 font-mono">
                {sales.filter((s) => s.status === 'Completed').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryStatusFilter('Pending Balance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyStatusFilter === 'Pending Balance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <span>ကျန်ငွေရှိ (Pending)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-700 text-amber-100 font-mono">
                {sales.filter((s) => s.status === 'Pending Balance').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryStatusFilter('Void')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyStatusFilter === 'Void'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <span>ပယ်ဖျက်ပြီး (Voided)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-800 text-rose-100 font-mono">
                {sales.filter((s) => s.status === 'Void').length}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto pb-1 custom-scrollbar-x">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-stone-900 text-stone-100 font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-3 text-amber-400">Invoice No</th>
                  <th className="py-2.5 px-3">ရက်စွဲ (Date)</th>
                  <th className="py-2.5 px-3">ဖောက်သည် (Customer)</th>
                  <th className="py-2.5 px-3">ပစ္စည်းများ</th>
                  <th className="py-2.5 px-3 text-right">စုစုပေါင်းငွေ</th>
                  <th className="py-2.5 px-3 text-right">ရှင်းပြီးငွေ</th>
                  <th className="py-2.5 px-3 text-right">ကျန်ငွေ</th>
                  <th className="py-2.5 px-3 text-center">အခြေအနေ</th>
                  <th className="py-2.5 px-3 text-center">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {filteredHistorySales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 text-xs">
                      အရောင်းမှတ်တမ်း မရှိပါ
                    </td>
                  </tr>
                ) : (
                  filteredHistorySales.map((sale, idx) => {
                    const isVoid = sale.status === 'Void';

                    return (
                      <tr
                        key={sale.id}
                        className={`transition-colors ${
                          isVoid
                            ? 'bg-rose-50/40 hover:bg-rose-50/70 text-stone-500'
                            : idx % 2 === 0
                            ? 'bg-white hover:bg-amber-50/70'
                            : 'bg-stone-100/80 hover:bg-amber-100/60'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className={isVoid ? 'line-through text-stone-400' : 'text-stone-900'}>
                              {sale.invoiceNo}
                            </span>
                            {isVoid && (
                              <span className="text-[10px] px-1 py-0.2 bg-rose-100 text-rose-700 font-bold rounded">
                                VOID
                              </span>
                            )}
                          </div>
                          {sale.cashierName && (
                            <div className="text-[10px] text-stone-400 font-sans font-normal">
                              စာရေး: {sale.cashierName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-500 whitespace-nowrap">{sale.date}</td>
                        <td className="py-3 px-3 font-medium text-stone-800">
                          <div className={isVoid ? 'text-stone-500' : 'text-stone-900'}>
                            {sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}
                          </div>
                          {sale.customerPhone && (
                            <div className="text-[11px] text-stone-400">{sale.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {sale.items.map((it, i) => (
                            <div key={i} className="truncate max-w-[180px]">
                              • {it.name} ({formatWeightMm(it.actualWeight)})
                            </div>
                          ))}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isVoid ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {formatMMK(sale.grandTotal)}
                        </td>
                        <td className={`py-3 px-3 text-right font-medium ${isVoid ? 'text-stone-400' : 'text-emerald-700'}`}>
                          {formatMMK(sale.paidAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">
                          {sale.balanceRemaining > 0 && !isVoid ? formatMMK(sale.balanceRemaining) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isVoid
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : sale.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isVoid
                              ? 'ပယ်ဖျက်ပြီး'
                              : sale.status === 'Completed'
                              ? 'ရှင်းပြီး'
                              : 'ကျန်ငွေရှိ'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* View / Print Voucher */}
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(sale)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-[11px] border border-amber-200 cursor-pointer"
                              title="ဘောက်ချာ ကြည့်မည် / ထုတ်မည်"
                            >
                              ပြေစာထုတ်
                            </button>

                            {/* Settle Remaining Debt */}
                            {!isVoid && sale.balanceRemaining > 0 && (
                              <button
                                type="button"
                                onClick={() => setSettleSale(sale)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                                title="ကျန်ငွေရှင်းမည်"
                              >
                                <Coins className="w-3 h-3" />
                                <span>ကျန်ငွေရှင်း</span>
                              </button>
                            )}

                            {/* If Voided: View Void Details button */}
                            {isVoid && (
                              <button
                                type="button"
                                onClick={() => setViewVoidDetailsSale(sale)}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold rounded-lg text-[11px] border border-rose-300 cursor-pointer flex items-center gap-1"
                                title="ပယ်ဖျက်မှု အချက်အလက် ကြည့်ရှုရန်"
                              >
                                <Info className="w-3 h-3 text-rose-600" />
                                <span>အသေးစိတ်</span>
                              </button>
                            )}

                            {/* If Active: Void Sale button */}
                            {!isVoid && (
                              <button
                                type="button"
                                onClick={() => setVoidSaleTarget(sale)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 font-semibold rounded-lg text-[11px] border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                                title="အရောင်းဘောက်ချာ ပယ်ဖျက်မည် (Void Sale) - Staff/Manager PIN လိုအပ်သည်"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>ပယ်ဖျက်</span>
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
      ) : (
        /* POS WORKSPACE: 2 COLUMNS (LEFT: ITEM & ENGINE INPUT, RIGHT: CART & PAYMENT) */
        <div className="space-y-4">
          {!storeOperation?.isOpen && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0">
                  <DoorClosed className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-rose-900 flex items-center gap-2">
                    <span>ယနေ့အတွက် ဆိုင်ပိတ်ထားပါသည် (Shop Closed / After Hours)</span>
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    အရောင်းကောင်တာများ အားလုံး အရောင်းဘောက်ချာ ထုတ်ယူခွင့်ကို ရပ်တန့်ထားပါသည်။ ဆိုင်ဖွင့်ပြီးမှသာ အရောင်း ဆက်လက်ပြုလုပ်နိုင်ပါမည်။
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5"
              >
                <DoorOpen className="w-4 h-4" />
                <span>ဆိုင်ဖွင့်မည် / အခြေအနေ</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: ITEM INPUT & REAL-TIME CALCULATION ENGINE (7 COLS) */}
            <div className="lg:col-span-7 space-y-5">
            {/* 0. BARCODE & QR CODE SCANNER BAR */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-white shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-amber-300">
                        Barcode &amp; QR Scanner
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Scanner Ready
                      </span>
                      {isBarcodeInputFocused ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          ⚡ Cursor Active (နောက် Scan အသင့်)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={focusBarcodeInput}
                          className="inline-flex items-center gap-1 text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 px-2 py-0.5 rounded-full font-sans cursor-pointer transition-colors"
                          title="Input Box သို့ Cursor ရွှေ့မည်"
                        >
                          <span>Cursor Active ပြန်လုပ်ရန် နှိပ်ပါ</span>
                        </button>
                      )}
                      {liveScannedKeyPreview && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono animate-pulse">
                          📡 ဖတ်ယူရရှိနေသည်: "{liveScannedKeyPreview}"
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      iPhone "Barcode to PC", USB Barcode Gun သို့မဟုတ် ကင်မရာသုံး၍ တိုက်ရိုက်ဖတ်နိုင်ပါသည်
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs select-none px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Calculation Engine (အလျော့တွက် စစ်ဆေးပြီးမှ ဘောက်ချာသို့ ထည့်သွင်းမည်)</span>
                  </div>
                </div>
              </div>

              {/* Form with input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessBarcodeScan(barcodeQuery);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeQuery}
                    onFocus={() => setIsBarcodeInputFocused(true)}
                    onBlur={() => setIsBarcodeInputFocused(false)}
                    onChange={(e) => {
                      setBarcodeQuery(e.target.value);
                    }}
                    placeholder="Barcode / QR ဖတ်ပါ (သို့မဟုတ် SKU ရိုက်ပြီး Enter နှိပ်ပါ - ဥပမာ: RNG-15-01, RIN-15-34)..."
                    className={`w-full bg-stone-950 border rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-stone-500 focus:outline-none transition-all ${
                      isBarcodeInputFocused
                        ? 'border-amber-400 ring-2 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  ရှာဖွေမည်
                </button>
              </form>

              {/* Notification Banner */}
              {scanNotification && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                    scanNotification.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {scanNotification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold">{scanNotification.text}</span>
                </div>
              )}
            </div>

            {/* 1. Item Source Selector (From Stock) */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>ပစ္စည်းရွေးချယ်ခြင်း (Select Product)</span>
                </span>
                <span className="text-xs text-stone-300 font-medium">
                  ဆိုင်တွင်း စတော့လက်ကျန်မှ ရွေးချယ်ပါ
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="ပစ္စည်းအမည်၊ SKU ဖြင့် ရှာဖွေပါ (Search Stock by name or SKU)..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Selected Product Banner with Zero Reset */}
                  {selectedStockProduct && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          ရွေးချယ်ထားသော ပစ္စည်း: <strong className="text-stone-900">{selectedStockProduct.name}</strong>{' '}
                          <span className="font-mono text-[11px] text-stone-500">[{selectedStockProduct.sku}]</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStockProduct(null);
                          setItemName('ရွှေထည်ပစ္စည်း (ရွေးချယ်ပါ)');
                          setItemWeight({ kyat: 0, pe: 0, yway: 0 });
                          setItemMakingCharge(0);
                          setItemStoneCharge(0);
                          setItemDiscount(0);
                          setItemWastage({ kyat: 0, pe: 0, yway: settings.defaultWastageYway || 2 });
                        }}
                        className="text-stone-600 hover:text-rose-600 text-[11px] font-semibold cursor-pointer underline flex items-center gap-1 transition-colors"
                      >
                        <span>✕ ရွေးချယ်မှု ဖြုတ်မည် (Zero Reset)</span>
                      </button>
                    </div>
                  )}

                  {/* Stock items picker grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {availableStock.length === 0 ? (
                      <div className="col-span-2 sm:col-span-3 py-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                        ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ (No matching stock found)
                      </div>
                    ) : (
                      availableStock.map((prod, idx) => {
                        const isSelected = selectedStockProduct?.id === prod.id;
                        const palette = getProductCardPalette(idx);
                        return (
                          <button
                            type="button"
                            key={prod.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStockProduct(null);
                                setItemName('ရွှေထည်ပစ္စည်း (ရွေးချယ်ပါ)');
                                setItemWeight({ kyat: 0, pe: 0, yway: 0 });
                                setItemMakingCharge(0);
                                setItemStoneCharge(0);
                                setItemDiscount(0);
                                setItemWastage({ kyat: 0, pe: 0, yway: settings.defaultWastageYway || 2 });
                              } else {
                                handleSelectStockProduct(prod);
                              }
                            }}
                            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer text-xs flex flex-col justify-between relative overflow-hidden group shadow-xs ${
                              isSelected
                                ? `${palette.selectedBg} ${palette.selectedBorder} ring-2 ${palette.selectedRing} shadow-sm`
                                : `${palette.bg} ${palette.hover} ${palette.border}`
                            }`}
                          >
                            {/* Top subtle accent bar */}
                            <div
                              className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                                isSelected ? palette.accentBar : `${palette.accentBar} opacity-60 group-hover:opacity-100`
                              }`}
                            />

                            <div className="pt-0.5 w-full">
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <div className="font-bold text-stone-900 truncate flex-1 leading-snug group-hover:text-stone-950">
                                  {prod.name}
                                </div>
                                {isSelected && (
                                  <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1 text-[10px] text-stone-500">
                                <span className="font-mono">{prod.sku}</span>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${palette.badge}`}
                                >
                                  {prod.category}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`mt-2 pt-1.5 border-t ${palette.divider} flex items-center justify-between text-[11px]`}
                            >
                              <span className={`font-bold ${palette.weightText}`}>
                                {formatWeightMm(prod.weight)}
                              </span>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${palette.purityBadge}`}
                              >
                                {prod.purity.replace('_', ' ')}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CALCULATION ENGINE FORM (Weight + Purity + Wastage + Charges) */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ရွှေဈေးနှင့် တွက်ချက်မှုအင်ဂျင် (Calculation Engine)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-300">ပေါက်ဈေး:</span>
                  <span className="text-xs font-bold text-amber-300 bg-stone-800 border border-stone-700 px-2.5 py-0.5 rounded-md shadow-2xs">
                    {formatMMK(currentPurityRate)} / ကျပ်သား
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">

              {/* Purity selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  ရွှေအရည်အသွေး / ပဲရည် (Purity)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sortedGoldPrices.map((gp, idx) => {
                    const theme = getPurityTheme(gp.purity, idx);
                    const isSelected = itemPurity === gp.purity;
                    return (
                      <button
                        type="button"
                        key={gp.purity}
                        onClick={() => setItemPurity(gp.purity)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? `${theme.cardBg} ${theme.cardBorder} ring-2 ring-amber-500/40 shadow-xs`
                            : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100/80'
                        }`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar} ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                        <div className="flex items-center justify-between pt-0.5">
                          <span className={`text-xs font-bold ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                            {gp.purityLabel}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded ${theme.badge}`}>
                            {gp.purity}
                          </span>
                        </div>
                        <div className={`text-[11px] font-extrabold mt-1 ${theme.sellPriceText}`}>
                          {formatNumber(gp.sellPrice)} <span className="text-[9px] font-normal text-stone-500">MMK</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actual Gold Weight Input using the interactive WeightInput component */}
              <WeightInput
                label="ရွှေအမှန်အလေးချိန် (Actual Weight)"
                value={itemWeight}
                onChange={setItemWeight}
              />

              {/* Wastage & Additional Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Wastage Input */}
                <div className="space-y-1">
                  <WeightInput
                    label="အလျော့တွက် (Wastage)"
                    value={itemWastage}
                    onChange={setItemWastage}
                    compact={true}
                  />
                </div>

                {/* Making Charge (လက်ခ) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    လက်ခ (Making Charge MMK)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={itemMakingCharge === 0 ? '' : itemMakingCharge}
                    placeholder="0"
                    onChange={(e) => setItemMakingCharge(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1 mt-1">
                    {[30000, 50000, 80000, 120000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setItemMakingCharge(amt)}
                        className="px-1.5 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 rounded text-stone-700 cursor-pointer"
                      >
                        +{formatNumber(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stone Charge (ကျောက်ဖိုး) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ကျောက်ဖိုး (Stone Charge MMK)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={itemStoneCharge === 0 ? '' : itemStoneCharge}
                    placeholder="0"
                    onChange={(e) => setItemStoneCharge(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Discount (လျှော့ဈေး) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    လျှော့ငွေ (Discount MMK)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={itemDiscount === 0 ? '' : itemDiscount}
                    placeholder="0"
                    onChange={(e) => setItemDiscount(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* LIVE STEP-BY-STEP CALCULATION BREAKDOWN BOX */}
              <div
                className={`rounded-xl p-4 space-y-2.5 text-xs transition-all ${
                  isItemReadyToAddToCart
                    ? 'bg-stone-900 text-stone-100 border-2 border-amber-500/70 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-stone-900/90 text-stone-300 border border-stone-800'
                }`}
              >
                <div className="font-bold border-b border-stone-800 pb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">တွက်ချက်မှု အဆင့်ဆင့် (Calculation Breakdown):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-200 font-semibold">{itemName}</span>
                    {selectedStockProduct && (
                      <span className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-400 font-mono text-[10px] border border-stone-700">
                        {selectedStockProduct.sku}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-stone-300 pt-1">
                  <div className="bg-stone-950/70 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">အမှန်အလေးချိန်</span>
                    <strong className="text-white text-xs">{formatWeightMm(itemWeight)}</strong>
                  </div>
                  <div className="bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/50">
                    <span className="text-amber-300 block text-[10px] font-bold">+ အလျော့တွက် (Wastage)</span>
                    <strong className="text-amber-200 text-xs font-bold">{formatWeightMm(itemWastage)}</strong>
                  </div>
                  <div className="bg-stone-950/70 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">= တွက်ချက်အလေးချိန်</span>
                    <strong className="text-amber-300 text-xs">
                      {formatWeightMm(currentPreviewItem.billableWeight)}
                    </strong>
                    <span className="text-[9px] text-stone-400 block font-mono">
                      ({weightToKyatDecimal(currentPreviewItem.billableWeight).toFixed(4)} ကျပ်သား)
                    </span>
                  </div>
                  <div className="bg-stone-950/70 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">× နေ့စဉ်ပေါက်ဈေး ({itemPurity.replace('_PE', ' ပဲရည်')})</span>
                    <strong className="text-white text-xs">{formatNumber(currentPurityRate)} MMK</strong>
                  </div>
                </div>

                {(currentPreviewItem.makingCharge > 0 || currentPreviewItem.stoneCharge > 0 || currentPreviewItem.discount > 0) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-800/60 text-[11px] text-stone-300">
                    <span className="text-stone-400">အပိုဆောင်း အခကြေးငွေများ:</span>
                    {currentPreviewItem.makingCharge > 0 && (
                      <span className="bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                        လက်ခ: +{formatMMK(currentPreviewItem.makingCharge)}
                      </span>
                    )}
                    {currentPreviewItem.stoneCharge > 0 && (
                      <span className="bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                        ကျောက်ဖိုး: +{formatMMK(currentPreviewItem.stoneCharge)}
                      </span>
                    )}
                    {currentPreviewItem.discount > 0 && (
                      <span className="bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded text-rose-300 font-bold">
                        လျှော့ငွေ: -{formatMMK(currentPreviewItem.discount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="border-t border-stone-800 pt-2 flex items-center justify-between text-sm sm:text-base font-extrabold text-white">
                  <span className="flex items-center gap-2">
                    <span>ကျသင့်ငွေ (Item Total):</span>
                    {isItemReadyToAddToCart && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-sans font-semibold">
                        တွက်ချက်ပြီး
                      </span>
                    )}
                  </span>
                  <span className="text-amber-400 text-base sm:text-lg font-black">
                    {formatMMK(currentPreviewItem.total)}
                  </span>
                </div>
              </div>

              {/* DYNAMIC ACTIVE / DE-ACTIVE "ADD TO CART" BUTTON */}
              {isItemReadyToAddToCart ? (
                /* ACTIVE STATE: High-energy, highlighted, ready to add */
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-3.5 px-4 sm:px-5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/80 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 text-left">
                      <div className="w-8 h-8 rounded-lg bg-stone-950 text-amber-400 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        <Plus className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-stone-950 tracking-tight">
                            ဘောက်ချာထဲသို့ ထည့်မည် (Add to Cart)
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[10px] font-bold shadow-2xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                            Active (အသင့်ဖြစ်ပါပြီ)
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-900 font-semibold block">
                          အလျော့တွက် {formatWeightMm(itemWastage)} ထည့်သွင်းပြီး | တွက်ချက်အလေးချိန် {formatWeightMm(currentPreviewItem.billableWeight)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="text-sm sm:text-base font-black text-stone-950">
                        {formatMMK(currentPreviewItem.total)}
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-950 underline group-hover:text-stone-950 flex items-center justify-end gap-0.5">
                        <span>ထည့်သွင်းရန် နှိပ်ပါ</span>
                        <span>→</span>
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center justify-between px-1 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>အလျော့တွက်နှင့် ကျသင့်ငွေကို အတည်ပြုပြီးပါက နှိပ်ပါ</span>
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                      Enter နှိပ်၍လည်း ထည့်နိုင်ပါသည်
                    </span>
                  </div>
                </div>
              ) : (
                /* DE-ACTIVE STATE: Disabled, stone muted */
                <div className="space-y-1.5">
                  <button
                    type="button"
                    disabled={true}
                    className="w-full py-3.5 px-4 rounded-xl border border-dashed border-stone-300 bg-stone-100 text-stone-400 font-bold flex items-center justify-between cursor-not-allowed select-none transition-all text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-400 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-stone-500">
                          ရွှေထည်ပစ္စည်း ရွေးချယ်ပါ / အလေးချိန် မရှိသေးပါ
                        </span>
                        <span className="text-[10px] text-stone-400 block font-normal">
                          စတော့မှ ရွေးချယ်ပါ သို့မဟုတ် Barcode စကင်ဖတ်ပါ
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-stone-200/90 text-stone-500 border border-stone-300 px-2.5 py-1 rounded-full font-bold">
                      ⚪ Add to Cart (De-active)
                    </span>
                  </button>
                  <p className="text-[11px] text-center text-stone-400">
                    ရွှေထည်ပစ္စည်း ရွေးချယ်ပြီး အလျော့တွက်တွက်ချက်မှု ပေါ်လာမှသာ "Add to Cart" ခလုတ် Active ဖြစ်ပါမည်
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CART, CUSTOMER & MULTI-PAYMENT (5 COLS) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Customer Details Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex items-center justify-between border-b border-stone-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>ဖောက်သည် အချက်အလက် (Customer)</span>
                </span>
                <span className="text-xs text-stone-300">ရွေးချယ်ပါ သို့မဟုတ် ရိုက်ထည့်ပါ</span>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                {/* Select Existing Customer */}
                <div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) {
                        const c = customers.find((cust) => cust.id === e.target.value);
                        if (c) {
                          setCustomCustomerName(c.name);
                          setCustomCustomerPhone(c.phone);
                        }
                      } else {
                        setCustomCustomerName('');
                        setCustomCustomerPhone('');
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- ပုံမှန်ဖောက်သည်စာရင်းမှ ရွေးရန် --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'}) - ကျန်ငွေ:{' '}
                        {c.outstandingBalance > 0 ? formatNumber(c.outstandingBalance) : '0'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Or manual name/phone */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ဝယ်ယူသူအမည် (Name)"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="ဖုန်းနံပါတ် (Phone)"
                    value={customCustomerPhone}
                    onChange={(e) => setCustomCustomerPhone(e.target.value)}
                    className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* CART ITEMS LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex items-center justify-between border-b border-stone-800">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>ရွေးချယ်ထားသော ပစ္စည်းများ ({cartItems.length})</span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    အားလုံးဖျက်မည်
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5 space-y-3">

              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-stone-400 space-y-1">
                  <ShoppingCart className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">ဘောက်ချာထဲတွင် ပစ္စည်းမရှိသေးပါ</p>
                  <p className="text-[11px] text-stone-400">
                    ဘယ်ဘက်မှ ပစ္စည်းနှင့် အလေးချိန်ကို ဖြည့်ပြီး "ထည့်မည်" နှိပ်ပါ
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-stone-900">{item.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {formatWeightMm(item.actualWeight)} •{' '}
                          <span className="text-amber-900 font-medium">
                            {getPurityLabel(item.purity, language)}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600">
                          ရွှေ: {formatNumber(item.goldAmount)} + လက်ခ:{' '}
                          {formatNumber(item.makingCharge)}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div className="font-extrabold text-stone-900 text-sm">
                          {formatMMK(item.total)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Subtotal Summary */}
              {cartItems.length > 0 && (
                <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>ရွှေတန်ဖိုး:</span>
                    <span>{formatMMK(subtotalGold)}</span>
                  </div>
                  {totalMakingCharge > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>လက်ခ:</span>
                      <span>+{formatMMK(totalMakingCharge)}</span>
                    </div>
                  )}
                  {totalStoneCharge > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>ကျောက်ဖိုး:</span>
                      <span>+{formatMMK(totalStoneCharge)}</span>
                    </div>
                  )}
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>လျှော့ဈေး:</span>
                      <span>-{formatMMK(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-stone-950 pt-1 border-t border-stone-200">
                    <span>စုစုပေါင်း (Grand Total):</span>
                    <span className="text-amber-950">{formatMMK(grandTotal)}</span>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* MULTI-PAYMENT SECTION */}
            {cartItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>ငွေပေးချေမှု နည်းလမ်း (Payment Methods)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFullPayment('Cash')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 cursor-pointer transition-colors"
                    >
                      Cash အပြည့်
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFullPayment('KBZPay')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 cursor-pointer transition-colors"
                    >
                      KPay အပြည့်
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">

                {/* Split Payment Rows */}
                <div className="space-y-2">
                  {payments.map((pmt, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <select
                        value={pmt.method}
                        onChange={(e) =>
                          handleUpdatePayment(pIdx, { method: e.target.value as PaymentMethod })
                        }
                        className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                      >
                        <option value="Cash">ငွေသား (Cash)</option>
                        <option value="KBZPay">KBZPay</option>
                        <option value="AYA Pay">AYA Pay</option>
                        <option value="CB Pay">CB Pay</option>
                        <option value="WavePay">WavePay</option>
                        <option value="Bank Transfer">ဘဏ်လွှဲ (Bank)</option>
                        <option value="Credit">ကျန်ငွေ / အကြွေး (Credit)</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        placeholder="ပမာဏ (Amount)"
                        value={pmt.amount === 0 ? '' : pmt.amount}
                        onChange={(e) =>
                          handleUpdatePayment(pIdx, { amount: Number(e.target.value) || 0 })
                        }
                        className="flex-1 bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                      />

                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentRow(pIdx)}
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddPaymentRow}
                    className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ငွေပေးချေမှု နောက်တစ်ခုထပ်ထည့်မည် (Split Payment)</span>
                  </button>
                </div>

                {/* Paid vs Remaining Status */}
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>ပေးချေပြီးငွေ (Paid Amount):</span>
                    <span className="text-emerald-700 font-bold">{formatMMK(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>ကျန်ငွေ (Credit / Unpaid):</span>
                    <span className={balanceRemaining > 0 ? 'text-rose-600 font-bold' : 'text-stone-500'}>
                      {formatMMK(balanceRemaining)}
                    </span>
                  </div>
                </div>

                {/* Submit button / Store Closed Guard */}
                {!storeOperation?.isOpen ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                      <DoorClosed className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <p className="font-bold">ဆိုင်ပိတ်ထားပါသည် (Shop Closed / After Hours)</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          ယခုအချိန်တွင် အရောင်းစာရင်း ပိတ်ထားပါသဖြင့် ဘောက်ချာ အသစ်ဖွင့်၍ မရသေးပါ။ ကျေးဇူးပြု၍ ဆိုင်ဖွင့်ပေးပါ။
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStoreModal(true)}
                      className="w-full py-3 bg-stone-800 hover:bg-stone-750 text-amber-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm border border-stone-700 shadow-sm"
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>ဆိုင်ပြန်ဖွင့်ရန် ဤနေရာကို နှိပ်ပါ (Open Store)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                  >
                    <Check className="w-5 h-5" />
                    <span>အရောင်းပြီးဆုံးပြီး ပြေစာထုတ်မည် (Complete & Print)</span>
                  </button>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      {settleSale && (
        <DebtSettlementModal
          sale={settleSale}
          onClose={() => setSettleSale(null)}
        />
      )}
      {voidSaleTarget && (
        <VoidSaleModal
          isOpen={!!voidSaleTarget}
          sale={voidSaleTarget}
          onClose={() => setVoidSaleTarget(null)}
          onSuccess={() => {
            setVoidSaleTarget(null);
          }}
        />
      )}
      {viewVoidDetailsSale && (
        <VoidSaleDetailsModal
          sale={viewVoidDetailsSale}
          onClose={() => setViewVoidDetailsSale(null)}
        />
      )}
      {showCounterModal && (
        <CounterSelectModal
          isOpen={showCounterModal}
          onClose={() => setShowCounterModal(false)}
        />
      )}
      {showStoreModal && (
        <StoreOpenCloseModal
          isOpen={showStoreModal}
          onClose={() => setShowStoreModal(false)}
        />
      )}
      {showCameraScanner && (
        <CameraBarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onDetected={(code) => handleProcessBarcodeScan(code)}
        />
      )}
      {showBarcodeHelpModal && (
        <BarcodeToPcHelpModal
          isOpen={showBarcodeHelpModal}
          onClose={() => setShowBarcodeHelpModal(false)}
          onTestScan={(code) => handleProcessBarcodeScan(code)}
          products={products}
        />
      )}
    </div>
  );
};
