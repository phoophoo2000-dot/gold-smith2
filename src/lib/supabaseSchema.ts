/**
 * ==========================================================
 * MYANMAR GOLD SHOP POS & MANAGEMENT SYSTEM
 * COMPLETE & ROBUST SUPABASE POSTGRESQL SCHEMA (ALL-IN-ONE)
 * ==========================================================
 * This script is 100% idempotent and safe to run multiple times:
 * - Uses CREATE TABLE IF NOT EXISTS
 * - Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS for existing tables
 * - Safely replaces RLS policies
 * - Fixes check constraints without failing
 * - Handles auth signup triggers safely
 * ==========================================================
 */

export const SUPABASE_ALL_IN_ONE_FIX_SQL = `-- ==========================================================
-- MYANMAR GOLD SHOP POS: ALL-IN-ONE COMPLETE DATABASE SCRIPT
-- Copy this ENTIRE script and run in Supabase SQL Editor
-- (Dashboard > SQL Editor > New query > Paste & Run)
-- ==========================================================

-- 1. PROFILES TABLE (User Management & Roles: Admin, Manager, Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff',
  phone TEXT,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin TEXT;

DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS user_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'Manager', 'Staff'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;
CREATE POLICY "Allow delete profiles" ON public.profiles FOR DELETE TO anon, authenticated USING (true);

-- 2. PRODUCTS TABLE (Inventory & Stock)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purity TEXT NOT NULL,
  weight_kyat NUMERIC NOT NULL DEFAULT 0,
  weight_pe NUMERIC NOT NULL DEFAULT 0,
  weight_yway NUMERIC NOT NULL DEFAULT 0,
  stone_weight_yway NUMERIC DEFAULT 0,
  stone_charge NUMERIC DEFAULT 0,
  making_charge NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'In Stock',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stone_weight_yway NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stone_charge NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS making_charge NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  -- Drop rigid unique constraint on sku so duplicate barcodes/item codes never abort uploads
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_unique;
  ALTER TABLE public.products ALTER COLUMN sku DROP NOT NULL;
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
  ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (status IN ('In Stock', 'Sold', 'Reserved'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on products for authenticated" ON public.products;
DROP POLICY IF EXISTS "Allow all actions on products" ON public.products;
CREATE POLICY "Allow all actions on products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. SALES TABLE (POS Receipts & Transactions)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_gold NUMERIC NOT NULL DEFAULT 0,
  total_making_charge NUMERIC NOT NULL DEFAULT 0,
  total_stone_charge NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_remaining NUMERIC NOT NULL DEFAULT 0,
  cashier_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS total_discount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';

DO $$
BEGIN
  ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
  ALTER TABLE public.sales ADD CONSTRAINT sales_status_check CHECK (status IN ('Completed', 'Pending Balance', 'Void'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on sales for authenticated" ON public.sales;
DROP POLICY IF EXISTS "Allow all actions on sales" ON public.sales;
CREATE POLICY "Allow all actions on sales" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. GOLD PRICES TABLE (Daily Market Prices)
CREATE TABLE IF NOT EXISTS public.gold_prices (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  purity TEXT NOT NULL,
  purity_label TEXT NOT NULL,
  buy_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
ALTER TABLE public.gold_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on gold_prices for authenticated" ON public.gold_prices;
DROP POLICY IF EXISTS "Allow all actions on gold_prices" ON public.gold_prices;
CREATE POLICY "Allow all actions on gold_prices" ON public.gold_prices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. CUSTOMERS TABLE (Customer CRM & Ledger)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  total_purchased NUMERIC DEFAULT 0,
  total_sold_back NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_purchased NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_sold_back NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on customers for authenticated" ON public.customers;
DROP POLICY IF EXISTS "Allow all actions on customers" ON public.customers;
CREATE POLICY "Allow all actions on customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. PURCHASES TABLE (Old Gold Buybacks / Scrap Purchases)
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  voucher_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  party_type TEXT NOT NULL DEFAULT 'Customer',
  party_name TEXT NOT NULL,
  party_phone TEXT,
  item_description TEXT NOT NULL,
  purity TEXT NOT NULL,
  gross_weight JSONB NOT NULL DEFAULT '{}'::jsonb,
  deduction JSONB NOT NULL DEFAULT '{}'::jsonb,
  net_weight JSONB NOT NULL DEFAULT '{}'::jsonb,
  buy_price_per_kyat NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  cashier_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS party_type TEXT DEFAULT 'Customer';
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS party_phone TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS deduction JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on purchases" ON public.purchases;
CREATE POLICY "Allow all actions on purchases" ON public.purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. EXPENSES TABLE (Shop Operating Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  recorded_by TEXT NOT NULL DEFAULT 'Staff',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Staff';

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on expenses" ON public.expenses;
CREATE POLICY "Allow all actions on expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. DEBT SETTLEMENTS TABLE (Customer Credit Payments)
CREATE TABLE IF NOT EXISTS public.debt_settlements (
  id TEXT PRIMARY KEY,
  receipt_no TEXT NOT NULL UNIQUE,
  sale_id TEXT,
  invoice_no TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  previous_balance NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_reference TEXT,
  cashier_name TEXT NOT NULL,
  notes TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.debt_settlements ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.debt_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on debt_settlements" ON public.debt_settlements;
CREATE POLICY "Allow all actions on debt_settlements" ON public.debt_settlements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. SUPPLIERS TABLE (Gold Suppliers & Wholesalers)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  total_supplied NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS total_supplied NUMERIC DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on suppliers" ON public.suppliers;
CREATE POLICY "Allow all actions on suppliers" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. WORKSHOP ORDERS TABLE (Goldsmith Custom Jobs & Orders)
CREATE TABLE IF NOT EXISTS public.workshop_orders (
  id TEXT PRIMARY KEY,
  job_no TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  purity TEXT NOT NULL,
  goldsmith_id TEXT NOT NULL,
  goldsmith_name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  deposit_amount NUMERIC DEFAULT 0,
  order_date TEXT NOT NULL,
  due_date TEXT,
  given_weight JSONB NOT NULL DEFAULT '{}'::jsonb,
  given_description TEXT,
  allowed_wastage JSONB NOT NULL DEFAULT '{}'::jsonb,
  labor_charge_type TEXT NOT NULL DEFAULT 'Fixed',
  labor_rate NUMERIC DEFAULT 0,
  total_labor_charge NUMERIC DEFAULT 0,
  paid_labor_charge NUMERIC DEFAULT 0,
  balance_labor_charge NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Issued',
  received_date TEXT,
  finished_weight JSONB,
  scrap_weight JSONB,
  stone_weight_yway NUMERIC DEFAULT 0,
  stone_cost NUMERIC DEFAULT 0,
  actual_loss_weight JSONB,
  wastage_variance_yway NUMERIC DEFAULT 0,
  shortage_penalty NUMERIC DEFAULT 0,
  assigned_by TEXT NOT NULL DEFAULT 'Staff',
  received_by TEXT,
  linked_product_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS labor_charge_type TEXT DEFAULT 'Fixed';
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS labor_rate NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS total_labor_charge NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS paid_labor_charge NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS balance_labor_charge NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS finished_weight JSONB;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS scrap_weight JSONB;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS stone_weight_yway NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS stone_cost NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS actual_loss_weight JSONB;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS wastage_variance_yway NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS shortage_penalty NUMERIC DEFAULT 0;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS assigned_by TEXT DEFAULT 'Staff';
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE public.workshop_orders ADD COLUMN IF NOT EXISTS linked_product_id TEXT;

ALTER TABLE public.workshop_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on workshop_orders" ON public.workshop_orders;
CREATE POLICY "Allow all actions on workshop_orders" ON public.workshop_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 11. GOLDSMITHS TABLE (Workshop Goldsmith Directory)
CREATE TABLE IF NOT EXISTS public.goldsmiths (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  workshop_name TEXT NOT NULL,
  address TEXT,
  specialty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  total_gold_with_goldsmith JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_jobs_completed INTEGER DEFAULT 0,
  total_labor_paid NUMERIC DEFAULT 0,
  pending_labor NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.goldsmiths ADD COLUMN IF NOT EXISTS total_gold_with_goldsmith JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.goldsmiths ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE public.goldsmiths ADD COLUMN IF NOT EXISTS total_labor_paid NUMERIC DEFAULT 0;
ALTER TABLE public.goldsmiths ADD COLUMN IF NOT EXISTS pending_labor NUMERIC DEFAULT 0;

ALTER TABLE public.goldsmiths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on goldsmiths" ON public.goldsmiths;
CREATE POLICY "Allow all actions on goldsmiths" ON public.goldsmiths FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 12. SHOP SETTINGS TABLE (Store Profile, Multi-device Synchronization)
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id TEXT PRIMARY KEY DEFAULT 'current_shop',
  shop_name TEXT NOT NULL,
  shop_name_mm TEXT,
  address TEXT,
  phone TEXT,
  tagline TEXT,
  invoice_prefix TEXT DEFAULT 'GSP-',
  default_wastage_yway NUMERIC DEFAULT 2,
  auto_lock_minutes NUMERIC DEFAULT 3,
  scanner_suffix TEXT DEFAULT 'ENTER',
  scanner_beep BOOLEAN DEFAULT true,
  scanner_type TEXT DEFAULT 'USB_GUN',
  scanner_auto_cart BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'MMK',
  language TEXT DEFAULT 'my',
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS shop_name_mm TEXT;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS raw_json JSONB;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS auto_lock_minutes NUMERIC DEFAULT 3;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS scanner_suffix TEXT DEFAULT 'ENTER';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS scanner_beep BOOLEAN DEFAULT true;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS scanner_type TEXT DEFAULT 'USB_GUN';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS scanner_auto_cart BOOLEAN DEFAULT false;

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions on shop_settings" ON public.shop_settings;
CREATE POLICY "Allow all actions on shop_settings" ON public.shop_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- SAFE AUTH TRIGGER (Sync Supabase Auth Signups to Profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, pin)
    VALUES (
      new.id::text, 
      COALESCE(new.email, 'user_' || substr(new.id::text, 1, 8) || '@goldshop.local'), 
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, 'User'), '@', 1)), 
      COALESCE(new.raw_user_meta_data->>'role', 'Staff'),
      CASE 
        WHEN COALESCE(new.raw_user_meta_data->>'role', 'Staff') = 'Admin' THEN '1111'
        WHEN COALESCE(new.raw_user_meta_data->>'role', 'Staff') = 'Manager' THEN '2222'
        ELSE '3333'
      END
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user exception: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- SYNC EXISTING AUTH USERS TO PROFILES (SAFE)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') 
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    INSERT INTO public.profiles (id, email, full_name, role, pin)
    SELECT 
      id::text, 
      COALESCE(email, 'user_' || substr(id::text, 1, 8) || '@goldshop.local'), 
      COALESCE(raw_user_meta_data->>'full_name', split_part(COALESCE(email, 'User'), '@', 1)), 
      COALESCE(raw_user_meta_data->>'role', 'Staff'),
      CASE 
        WHEN COALESCE(raw_user_meta_data->>'role', 'Staff') = 'Admin' THEN '1111'
        WHEN COALESCE(raw_user_meta_data->>'role', 'Staff') = 'Manager' THEN '2222'
        ELSE '3333'
      END
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 12. INITIAL SEED DATA (SAFE & IDEMPOTENT - ADDS INITIAL STOCK & RECORDS)
-- Gold Prices
INSERT INTO public.gold_prices (id, date, purity, purity_label, buy_price, sell_price, updated_at)
VALUES 
  ('gp_12', CURRENT_DATE::text, '12_PE', '၁၂ ပဲရည်', 5500000, 5700000, '09:30 AM'),
  ('gp_13', CURRENT_DATE::text, '13_PE', '၁၃ ပဲရည်', 5750000, 6000000, '09:30 AM'),
  ('gp_14', CURRENT_DATE::text, '14_PE', '၁၄ ပဲရည်', 6250000, 6500000, '09:30 AM'),
  ('gp_15', CURRENT_DATE::text, '15_PE', '၁၅ ပဲရည် (အခေါက်)', 6750000, 7000000, '09:30 AM'),
  ('gp_16', CURRENT_DATE::text, '16_PE', '၁၆ ပဲရည် (ရွှေစင်)', 7200000, 7500000, '09:30 AM')
ON CONFLICT (id) DO UPDATE SET
  buy_price = EXCLUDED.buy_price,
  sell_price = EXCLUDED.sell_price;

-- Initial Products (Inventory)
INSERT INTO public.products (id, sku, name, category, purity, weight_kyat, weight_pe, weight_yway, stone_weight_yway, stone_charge, making_charge, cost_price, status, notes)
VALUES
  ('prd_001', 'RNG-15-01', 'ပန်းခက်ပုံ ၁၅ ပဲရည် ရွှေလက်စွပ် (Floral Ring)', 'Ring', '15_PE', 0, 3, 2, 0, 0, 80000, 1350000, 'In Stock', 'နန်းဆွဲလက်ရာ သေသပ်သည်'),
  ('prd_002', 'RNG-15-02', 'စိန်ပွင့်စီ ၁၅ ပဲရည် ကျောက်လက်စွပ် (Gemstone Ring)', 'Ring', '15_PE', 0, 4, 4, 2, 95000, 120000, 1950000, 'In Stock', 'သဘာဝကျောက်နီ စီခြယ်ထားသည်'),
  ('prd_003', 'NCK-15-01', 'ကြယ်ပုံ ၁၅ ပဲရည် လည်ဆွဲကြိုး (Star Necklace)', 'Necklace', '15_PE', 1, 2, 0, 0, 0, 180000, 7600000, 'In Stock', 'ပွဲတက်ဝတ် အထူးဒီဇိုင်း'),
  ('prd_004', 'BRC-15-01', '၁၅ ပဲရည် ပန်းကုံး လက်ကောက် (Floral Bracelet)', 'Bracelet', '15_PE', 0, 12, 4, 0, 0, 160000, 5300000, 'In Stock', 'အကြမ်းခံ ခိုင်ခံ့သည်'),
  ('prd_005', 'EAR-15-01', 'မိုးရေစက်ပုံ ၁၅ ပဲရည် နားကပ် (Raindrop Earrings)', 'Earring', '15_PE', 0, 2, 2, 0, 40000, 60000, 1020000, 'In Stock', 'နေ့စဉ်ဝတ် သက်တောင့်သက်သာ'),
  ('prd_006', 'BAR-16-01', '၁၆ ပဲရည် အကယ်ဒမီ ရွှေပြား (Academy 1-Kyat Bar)', 'Gold Bar', '16_PE', 1, 0, 0, 0, 0, 25000, 7200000, 'In Stock', 'တုံးတံဆိပ် အထူးရွှေစင် ၉၉.၉၉%'),
  ('prd_007', 'BNG-15-01', '၁၅ ပဲရည် ခေါင်းလောင်းထိုး ဟင်္သာရုပ် လကျ္ခစွပ် ကွင်း', 'Bangle', '15_PE', 1, 8, 0, 0, 0, 220000, 10100000, 'In Stock', 'ရိုးရာရှေးဟောင်းပုံစံ လက်ရာ'),
  ('prd_wsp_2601', 'WSP-15-2601', '၁၅ ပဲရည် နဂါးခေါင်း စိန်လက်စွပ် (Men Dragon Diamond Ring)', 'Ring', '15_PE', 0, 7, 4, 1.5, 150000, 85000, 235000, 'In Stock', 'ပန်းထိမ်အပ်ထည် JOB-2601 (ဆရာဦးကျော် - ကျော်ဇင် ရွှေပန်းထိမ်) မှ တိုက်ရိုက် စတော့သွင်းထားသော ရွှေလက်စွပ်'),
  ('prd_wsp_2602', 'WSP-16-2602', '၁၆ ပဲရည် အခေါက်ရွှေတုံး (ကျိုချက်သွန်းလုပ်ပြီး - Gold Bar Ingot)', 'Gold Bar', '16_PE', 2, 15, 5, 0, 0, 105000, 105000, 'In Stock', 'ရွှေကျိုအော်ဒါ JOB-2602 (ဆရာဦးဘလွင် - ရွှေရောင်လင်း ရွှေကျိုဖို) မှ တိုက်ရိုက် စတော့သွင်းထားသော အခေါက်ရွှေတုံး')
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  purity = EXCLUDED.purity,
  weight_kyat = EXCLUDED.weight_kyat,
  weight_pe = EXCLUDED.weight_pe,
  weight_yway = EXCLUDED.weight_yway,
  stone_weight_yway = EXCLUDED.stone_weight_yway,
  stone_charge = EXCLUDED.stone_charge,
  making_charge = EXCLUDED.making_charge,
  cost_price = EXCLUDED.cost_price,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- Initial Customers
INSERT INTO public.customers (id, name, phone, address, notes, total_purchased, total_sold_back, outstanding_balance)
VALUES
  ('cst_001', 'ဒေါ်ခင်လှ', '09-420011223', 'ဗဟန်းမြို့နယ်၊ ရန်ကုန်။', 'VIP ဖောက်သည်ဟောင်း', 15000000, 0, 0),
  ('cst_002', 'ဦးတင်မောင်', '09-510044556', 'မရမ်းကုန်းမြို့နယ်၊ ရန်ကုန်။', 'အရစ်ကျပေးချေလေ့ရှိသည်', 22000000, 0, 450000),
  ('cst_003', 'ဒေါ်သန်းသန်းစိုး', '09-790077889', 'လမ်းမတော်မြို့နယ်၊ ရန်ကုန်။', 'လက်စွပ်အဝယ်များ', 8500000, 1200000, 0),
  ('cst_004', 'ဦးကျော်ဝင်း', '09-970033445', 'စမ်းချောင်းမြို့နယ်၊ ရန်ကုန်။', 'အဝယ်ပုံမှန်ရှိ', 12000000, 0, 0),
  ('cst_005', 'ဒေါ်နီလာ', '09-250066778', 'ကမာရွတ်မြို့နယ်၊ ရန်ကုန်။', 'အထည်သစ် အမြဲအားပေး', 6000000, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Initial Profiles (Staff & Roles)
INSERT INTO public.profiles (id, email, full_name, role, phone, pin)
VALUES
  ('usr_admin', 'admin@goldshop.com', 'Admin', 'Admin', '09-450012345', '1111'),
  ('usr_manager', 'manager@goldshop.com', 'Manager', 'Manager', '09-790012345', '2222'),
  ('usr_staff', 'staff@goldshop.com', 'မနွယ်နွယ် (အရောင်းစာရေး)', 'Staff', '09-970012345', '3333'),
  ('staff_phoo', 'phoophoo.2000@gmail.com', 'Phoo (အရောင်းစာရေး / Staff)', 'Staff', '09-980012345', '4444')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Initial Goldsmiths
INSERT INTO public.goldsmiths (id, name, phone, workshop_name, address, specialty, status, total_gold_with_goldsmith, total_jobs_completed, total_labor_paid, pending_labor, notes)
VALUES
  ('gld_001', 'ဦးလှရွှေ', '09-420099881', 'ရွှေမင်းသမီး ပန်းထိမ်', 'မန္တလေးလမ်း၊ အလုံမြို့နယ်', 'နန်းဆွဲ၊ လက်ကောက်၊ လက်စွပ်', 'Active', '{"kyat": 0, "pe": 8, "yway": 4}'::jsonb, 42, 3850000, 120000, 'လက်ရာသေသပ် ခိုင်ခံ့သည်'),
  ('gld_002', 'ကိုသန်းထိုက်', '09-510077662', 'ရတနာရွှေလက် ပန်းထိမ်ဖို', 'ကုန်သည်လမ်း၊ ကျောက်တံတား', 'ကျောက်စီ၊ စိန်ထည်၊ ဆွဲသီး', 'Active', '{"kyat": 1, "pe": 2, "yway": 0}'::jsonb, 28, 2900000, 85000, 'ကျောက်စီအထူးကျွမ်းကျင်'),
  ('gld_003', 'ဦးကျော်ဆွေ', '09-790033221', 'ကျော်ဆွေ ရွှေသွန်းနှင့် ပန်းထိမ်', 'ရွှေဘုံသာလမ်း၊ ပန်းဘဲတန်း', 'ရွှေကျို၊ ရွှေသွန်း၊ ရွှေပြား', 'Active', '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 65, 5400000, 0, 'ရွှေအရည်အကျို တိကျသည်')
ON CONFLICT (id) DO NOTHING;

-- Initial Workshop Orders
INSERT INTO public.workshop_orders (
  id, job_no, order_type, title, category, purity, goldsmith_id, goldsmith_name,
  customer_name, customer_phone, deposit_amount, order_date, due_date,
  given_weight, allowed_wastage, labor_charge_type, labor_rate, total_labor_charge, paid_labor_charge, balance_labor_charge,
  status, received_date, finished_weight, scrap_weight, stone_weight_yway, stone_cost, actual_loss_weight,
  assigned_by, received_by, linked_product_id, notes
)
VALUES
  (
    'wjo_001', 'JOB-2601', 'ShopStock', 'နဂါးခေါင်း ၁၅ ပဲရည် လက်ကောက်', 'Bangle', '15_PE', 'gld_001', 'ဦးလှရွှေ',
    NULL, NULL, 0, '2026-09-01', '2026-09-07',
    '{"kyat": 1, "pe": 4, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 4}'::jsonb, 'Fixed', 250000, 250000, 250000, 0,
    'Stocked', '2026-09-06', '{"kyat": 1, "pe": 4, "yway": 0}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 0, 0, '{"kyat": 0, "pe": 0, "yway": 4}'::jsonb,
    'Admin', 'Admin', 'prd_wsp_2601', 'ဆိုင်တွင်း စတော့သို့ သွင်းပြီး'
  ),
  (
    'wjo_002', 'JOB-2602', 'ShopStock', 'နဝရတ် ကိုးမျက် ရွှေလက်စွပ်', 'Ring', '15_PE', 'gld_002', 'ကိုသန်းထိုက်',
    NULL, NULL, 0, '2026-09-02', '2026-09-08',
    '{"kyat": 0, "pe": 5, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb, 'Fixed', 150000, 150000, 150000, 0,
    'Stocked', '2026-09-07', '{"kyat": 0, "pe": 5, "yway": 2}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 4, 180000, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb,
    'Admin', 'Admin', 'prd_wsp_2602', 'ဆိုင်တွင်း စတော့သို့ သွင်းပြီး'
  ),
  (
    'wjo_003', 'JOB-2603', 'CustomOrder', 'စိန်ပွင့်စီ လည်ဆွဲဆွဲသီး', 'Pendant', '15_PE', 'gld_002', 'ကိုသန်းထိုက်',
    'ဒေါ်သန်းသန်းစိုး', '09-790077889', 500000, '2026-09-07', '2026-09-14',
    '{"kyat": 0, "pe": 6, "yway": 0}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb, 'Fixed', 120000, 120000, 50000, 70000,
    'InProgress', NULL, NULL, NULL, 3, 90000, NULL,
    'Staff', NULL, NULL, 'အထည်အပ်ထည် အမြန်လို'
  ),
  (
    'wjo_004', 'JOB-2604', 'ShopStock', '၁၆ ပဲရည် သုံးပတ်နန်းဆွဲ လက်ကောက်', 'Bracelet', '16_PE', 'gld_001', 'ဦးလှရွှေ',
    NULL, NULL, 0, '2026-09-08', '2026-09-15',
    '{"kyat": 0, "pe": 8, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 3}'::jsonb, 'Fixed', 160000, 160000, 0, 160000,
    'Issued', NULL, NULL, NULL, 0, 0, NULL,
    'Admin', NULL, NULL, 'ပုံစံသစ် နမူနာလုပ်ခိုင်းထားခြင်း'
  )
ON CONFLICT (job_no) DO UPDATE SET
  title = EXCLUDED.title,
  order_type = EXCLUDED.order_type,
  status = EXCLUDED.status,
  finished_weight = EXCLUDED.finished_weight,
  scrap_weight = EXCLUDED.scrap_weight,
  notes = EXCLUDED.notes;

-- Initial Suppliers
INSERT INTO public.suppliers (id, name, phone, address, total_supplied, outstanding_balance)
VALUES
  ('sup_001', 'ဦးအောင်မြင့် (ရွှေစင်ကုန်သည်ကြီး)', '09-450077889', 'ရွှေဘုံသာလမ်း၊ ပန်းဘဲတန်း', 85000000, 0),
  ('sup_002', 'ရွှေနဂါး ရတနာ ရွှေတုံးလုပ်ငန်း', '09-250088990', '၂၉ လမ်း၊ ကျောက်တံတား', 120000000, 0)
ON CONFLICT (id) DO NOTHING;

-- Initial Expenses
INSERT INTO public.expenses (id, date, category, amount, note, recorded_by)
VALUES
  ('exp_001', '2026-09-05', 'Utilities', 185000, 'စက်တင်ဘာလ မီတာခ', 'Admin'),
  ('exp_002', '2026-09-06', 'Printing', 95000, 'အရောင်းပြေစာ အုပ်ရေ ၂၀', 'Staff'),
  ('exp_003', '2026-09-07', 'Security', 250000, 'လစဉ် လုံခြုံရေးစရိတ်', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- ENABLE REALTIME ON ALL TABLES (SAFE)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'products', 'sales', 'gold_prices', 'customers', 
    'profiles', 'purchases', 'expenses', 'debt_settlements', 
    'suppliers', 'workshop_orders', 'goldsmiths'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- RELOAD SUPABASE POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SEED_DATA_SQL = `-- ==========================================================
-- MYANMAR GOLD SHOP POS: SEED INITIAL STORE DATA SCRIPT
-- Run this in Supabase SQL Editor if tables exist but are empty
-- ==========================================================

-- Gold Prices
INSERT INTO public.gold_prices (id, date, purity, purity_label, buy_price, sell_price, updated_at)
VALUES 
  ('gp_12', CURRENT_DATE::text, '12_PE', '၁၂ ပဲရည်', 5500000, 5700000, '09:30 AM'),
  ('gp_13', CURRENT_DATE::text, '13_PE', '၁၃ ပဲရည်', 5750000, 6000000, '09:30 AM'),
  ('gp_14', CURRENT_DATE::text, '14_PE', '၁၄ ပဲရည်', 6250000, 6500000, '09:30 AM'),
  ('gp_15', CURRENT_DATE::text, '15_PE', '၁၅ ပဲရည် (အခေါက်)', 6750000, 7000000, '09:30 AM'),
  ('gp_16', CURRENT_DATE::text, '16_PE', '၁၆ ပဲရည် (ရွှေစင်)', 7200000, 7500000, '09:30 AM')
ON CONFLICT (id) DO UPDATE SET
  buy_price = EXCLUDED.buy_price,
  sell_price = EXCLUDED.sell_price;

-- Initial Products (Inventory)
INSERT INTO public.products (id, sku, name, category, purity, weight_kyat, weight_pe, weight_yway, stone_weight_yway, stone_charge, making_charge, cost_price, status, notes)
VALUES
  ('prd_001', 'RNG-15-01', 'ပန်းခက်ပုံ ၁၅ ပဲရည် ရွှေလက်စွပ် (Floral Ring)', 'Ring', '15_PE', 0, 3, 2, 0, 0, 80000, 1350000, 'In Stock', 'နန်းဆွဲလက်ရာ သေသပ်သည်'),
  ('prd_002', 'RNG-15-02', 'စိန်ပွင့်စီ ၁၅ ပဲရည် ကျောက်လက်စွပ် (Gemstone Ring)', 'Ring', '15_PE', 0, 4, 4, 2, 95000, 120000, 1950000, 'In Stock', 'သဘာဝကျောက်နီ စီခြယ်ထားသည်'),
  ('prd_003', 'NCK-15-01', 'ကြယ်ပုံ ၁၅ ပဲရည် လည်ဆွဲကြိုး (Star Necklace)', 'Necklace', '15_PE', 1, 2, 0, 0, 0, 180000, 7600000, 'In Stock', 'ပွဲတက်ဝတ် အထူးဒီဇိုင်း'),
  ('prd_004', 'BRC-15-01', '၁၅ ပဲရည် ပန်းကုံး လက်ကောက် (Floral Bracelet)', 'Bracelet', '15_PE', 0, 12, 4, 0, 0, 160000, 5300000, 'In Stock', 'အကြမ်းခံ ခိုင်ခံ့သည်'),
  ('prd_005', 'EAR-15-01', 'မိုးရေစက်ပုံ ၁၅ ပဲရည် နားကပ် (Raindrop Earrings)', 'Earring', '15_PE', 0, 2, 2, 0, 40000, 60000, 1020000, 'In Stock', 'နေ့စဉ်ဝတ် သက်တောင့်သက်သာ'),
  ('prd_006', 'BAR-16-01', '၁၆ ပဲရည် အကယ်ဒမီ ရွှေပြား (Academy 1-Kyat Bar)', 'Gold Bar', '16_PE', 1, 0, 0, 0, 0, 25000, 7200000, 'In Stock', 'တုံးတံဆိပ် အထူးရွှေစင် ၉၉.၉၉%'),
  ('prd_007', 'BNG-15-01', '၁၅ ပဲရည် ခေါင်းလောင်းထိုး ဟင်္သာရုပ် လကျ္ခစွပ် ကွင်း', 'Bangle', '15_PE', 1, 8, 0, 0, 0, 220000, 10100000, 'In Stock', 'ရိုးရာရှေးဟောင်းပုံစံ လက်ရာ'),
  ('prd_wsp_2601', 'WSP-15-2601', '၁၅ ပဲရည် နဂါးခေါင်း စိန်လက်စွပ် (Men Dragon Diamond Ring)', 'Ring', '15_PE', 0, 7, 4, 1.5, 150000, 85000, 235000, 'In Stock', 'ပန်းထိမ်အပ်ထည် JOB-2601 (ဆရာဦးကျော် - ကျော်ဇင် ရွှေပန်းထိမ်) မှ တိုက်ရိုက် စတော့သွင်းထားသော ရွှေလက်စွပ်'),
  ('prd_wsp_2602', 'WSP-16-2602', '၁၆ ပဲရည် အခေါက်ရွှေတုံး (ကျိုချက်သွန်းလုပ်ပြီး - Gold Bar Ingot)', 'Gold Bar', '16_PE', 2, 15, 5, 0, 0, 105000, 105000, 'In Stock', 'ရွှေကျိုအော်ဒါ JOB-2602 (ဆရာဦးဘလွင် - ရွှေရောင်လင်း ရွှေကျိုဖို) မှ တိုက်ရိုက် စတော့သွင်းထားသော အခေါက်ရွှေတုံး')
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  purity = EXCLUDED.purity,
  weight_kyat = EXCLUDED.weight_kyat,
  weight_pe = EXCLUDED.weight_pe,
  weight_yway = EXCLUDED.weight_yway,
  stone_weight_yway = EXCLUDED.stone_weight_yway,
  stone_charge = EXCLUDED.stone_charge,
  making_charge = EXCLUDED.making_charge,
  cost_price = EXCLUDED.cost_price,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- Initial Customers
INSERT INTO public.customers (id, name, phone, address, notes, total_purchased, total_sold_back, outstanding_balance)
VALUES
  ('cst_001', 'ဒေါ်ခင်လှ', '09-420011223', 'ဗဟန်းမြို့နယ်၊ ရန်ကုန်။', 'VIP ဖောက်သည်ဟောင်း', 15000000, 0, 0),
  ('cst_002', 'ဦးတင်မောင်', '09-510044556', 'မရမ်းကုန်းမြို့နယ်၊ ရန်ကုန်။', 'အရစ်ကျပေးချေလေ့ရှိသည်', 22000000, 0, 450000),
  ('cst_003', 'ဒေါ်သန်းသန်းစိုး', '09-790077889', 'လမ်းမတော်မြို့နယ်၊ ရန်ကုန်။', 'လက်စွပ်အဝယ်များ', 8500000, 1200000, 0),
  ('cst_004', 'ဦးကျော်ဝင်း', '09-970033445', 'စမ်းချောင်းမြို့နယ်၊ ရန်ကုန်။', 'အဝယ်ပုံမှန်ရှိ', 12000000, 0, 0),
  ('cst_005', 'ဒေါ်နီလာ', '09-250066778', 'ကမာရွတ်မြို့နယ်၊ ရန်ကုန်။', 'အထည်သစ် အမြဲအားပေး', 6000000, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Initial Profiles (Staff & Roles)
INSERT INTO public.profiles (id, email, full_name, role, phone, pin)
VALUES
  ('usr_admin', 'admin@goldshop.com', 'Admin', 'Admin', '09-450012345', '1111'),
  ('usr_manager', 'manager@goldshop.com', 'Manager', 'Manager', '09-790012345', '2222'),
  ('usr_staff', 'staff@goldshop.com', 'မနွယ်နွယ် (အရောင်းစာရေး)', 'Staff', '09-970012345', '3333'),
  ('staff_phoo', 'phoophoo.2000@gmail.com', 'Phoo (အရောင်းစာရေး / Staff)', 'Staff', '09-980012345', '4444')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Initial Goldsmiths
INSERT INTO public.goldsmiths (id, name, phone, workshop_name, address, specialty, status, total_gold_with_goldsmith, total_jobs_completed, total_labor_paid, pending_labor, notes)
VALUES
  ('gld_001', 'ဦးလှရွှေ', '09-420099881', 'ရွှေမင်းသမီး ပန်းထိမ်', 'မန္တလေးလမ်း၊ အလုံမြို့နယ်', 'နန်းဆွဲ၊ လက်ကောက်၊ လက်စွပ်', 'Active', '{"kyat": 0, "pe": 8, "yway": 4}'::jsonb, 42, 3850000, 120000, 'လက်ရာသေသပ် ခိုင်ခံ့သည်'),
  ('gld_002', 'ကိုသန်းထိုက်', '09-510077662', 'ရတနာရွှေလက် ပန်းထိမ်ဖို', 'ကုန်သည်လမ်း၊ ကျောက်တံတား', 'ကျောက်စီ၊ စိန်ထည်၊ ဆွဲသီး', 'Active', '{"kyat": 1, "pe": 2, "yway": 0}'::jsonb, 28, 2900000, 85000, 'ကျောက်စီအထူးကျွမ်းကျင်'),
  ('gld_003', 'ဦးကျော်ဆွေ', '09-790033221', 'ကျော်ဆွေ ရွှေသွန်းနှင့် ပန်းထိမ်', 'ရွှေဘုံသာလမ်း၊ ပန်းဘဲတန်း', 'ရွှေကျို၊ ရွှေသွန်း၊ ရွှေပြား', 'Active', '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 65, 5400000, 0, 'ရွှေအရည်အကျို တိကျသည်')
ON CONFLICT (id) DO NOTHING;

-- Initial Workshop Orders
INSERT INTO public.workshop_orders (
  id, job_no, order_type, title, category, purity, goldsmith_id, goldsmith_name,
  customer_name, customer_phone, deposit_amount, order_date, due_date,
  given_weight, allowed_wastage, labor_charge_type, labor_rate, total_labor_charge, paid_labor_charge, balance_labor_charge,
  status, received_date, finished_weight, scrap_weight, stone_weight_yway, stone_cost, actual_loss_weight,
  assigned_by, received_by, linked_product_id, notes
)
VALUES
  (
    'wjo_001', 'JOB-2601', 'ShopStock', 'နဂါးခေါင်း ၁၅ ပဲရည် လက်ကောက်', 'Bangle', '15_PE', 'gld_001', 'ဦးလှရွှေ',
    NULL, NULL, 0, '2026-09-01', '2026-09-07',
    '{"kyat": 1, "pe": 4, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 4}'::jsonb, 'Fixed', 250000, 250000, 250000, 0,
    'Stocked', '2026-09-06', '{"kyat": 1, "pe": 4, "yway": 0}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 0, 0, '{"kyat": 0, "pe": 0, "yway": 4}'::jsonb,
    'Admin', 'Admin', 'prd_wsp_2601', 'ဆိုင်တွင်း စတော့သို့ သွင်းပြီး'
  ),
  (
    'wjo_002', 'JOB-2602', 'ShopStock', 'နဝရတ် ကိုးမျက် ရွှေလက်စွပ်', 'Ring', '15_PE', 'gld_002', 'ကိုသန်းထိုက်',
    NULL, NULL, 0, '2026-09-02', '2026-09-08',
    '{"kyat": 0, "pe": 5, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb, 'Fixed', 150000, 150000, 150000, 0,
    'Stocked', '2026-09-07', '{"kyat": 0, "pe": 5, "yway": 2}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 0}'::jsonb, 4, 180000, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb,
    'Admin', 'Admin', 'prd_wsp_2602', 'ဆိုင်တွင်း စတော့သို့ သွင်းပြီး'
  ),
  (
    'wjo_003', 'JOB-2603', 'CustomOrder', 'စိန်ပွင့်စီ လည်ဆွဲဆွဲသီး', 'Pendant', '15_PE', 'gld_002', 'ကိုသန်းထိုက်',
    'ဒေါ်သန်းသန်းစိုး', '09-790077889', 500000, '2026-09-07', '2026-09-14',
    '{"kyat": 0, "pe": 6, "yway": 0}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 2}'::jsonb, 'Fixed', 120000, 120000, 50000, 70000,
    'InProgress', NULL, NULL, NULL, 3, 90000, NULL,
    'Staff', NULL, NULL, 'အထည်အပ်ထည် အမြန်လို'
  ),
  (
    'wjo_004', 'JOB-2604', 'ShopStock', '၁၆ ပဲရည် သုံးပတ်နန်းဆွဲ လက်ကောက်', 'Bracelet', '16_PE', 'gld_001', 'ဦးလှရွှေ',
    NULL, NULL, 0, '2026-09-08', '2026-09-15',
    '{"kyat": 0, "pe": 8, "yway": 4}'::jsonb, '{"kyat": 0, "pe": 0, "yway": 3}'::jsonb, 'Fixed', 160000, 160000, 0, 160000,
    'Issued', NULL, NULL, NULL, 0, 0, NULL,
    'Admin', NULL, NULL, 'ပုံစံသစ် နမူနာလုပ်ခိုင်းထားခြင်း'
  )
ON CONFLICT (job_no) DO UPDATE SET
  title = EXCLUDED.title,
  order_type = EXCLUDED.order_type,
  status = EXCLUDED.status,
  finished_weight = EXCLUDED.finished_weight,
  scrap_weight = EXCLUDED.scrap_weight,
  notes = EXCLUDED.notes;

-- Initial Suppliers
INSERT INTO public.suppliers (id, name, phone, address, total_supplied, outstanding_balance)
VALUES
  ('sup_001', 'ဦးအောင်မြင့် (ရွှေစင်ကုန်သည်ကြီး)', '09-450077889', 'ရွှေဘုံသာလမ်း၊ ပန်းဘဲတန်း', 85000000, 0),
  ('sup_002', 'ရွှေနဂါး ရတနာ ရွှေတုံးလုပ်ငန်း', '09-250088990', '၂၉ လမ်း၊ ကျောက်တံတား', 120000000, 0)
ON CONFLICT (id) DO NOTHING;

-- Initial Expenses
INSERT INTO public.expenses (id, date, category, amount, note, recorded_by)
VALUES
  ('exp_001', '2026-09-05', 'Utilities', 185000, 'စက်တင်ဘာလ မီတာခ', 'Admin'),
  ('exp_002', '2026-09-06', 'Printing', 95000, 'အရောင်းပြေစာ အုပ်ရေ ၂၀', 'Staff'),
  ('exp_003', '2026-09-07', 'Security', 250000, 'လစဉ် လုံခြုံရေးစရိတ်', 'Admin')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SQL_SCHEMA = SUPABASE_ALL_IN_ONE_FIX_SQL;
export const SUPABASE_MISSING_TABLES_SQL = SUPABASE_ALL_IN_ONE_FIX_SQL;
export const SUPABASE_RLS_FIX_SQL = SUPABASE_ALL_IN_ONE_FIX_SQL;
