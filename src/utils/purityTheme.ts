export interface PurityTheme {
  purity: string;
  label: string;
  // Ticker (Dark mode header)
  tickerPill: string;
  tickerDot: string;
  tickerLabel: string;
  tickerPrice: string;
  // Card (Light mode)
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  accentBar: string;
  badge: string;
  sellPriceText: string;
  sellPriceBox: string;
  buyPriceBox: string;
}

export const PURITY_THEMES: Record<string, PurityTheme> = {
  '16_PE': {
    purity: '16_PE',
    label: '၁၆ ပဲရည်',
    tickerPill: 'bg-amber-500/15 border border-amber-500/40 hover:border-amber-400/70 text-amber-200',
    tickerDot: 'bg-amber-400 ring-2 ring-amber-400/30',
    tickerLabel: 'text-amber-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-amber-50/70',
    cardBorder: 'border-amber-200/90',
    cardHoverBorder: 'hover:border-amber-400 hover:shadow-amber-500/10',
    accentBar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900 border border-amber-300/80 font-bold',
    sellPriceText: 'text-amber-950',
    sellPriceBox: 'bg-amber-100/60 border-amber-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  '15_PE': {
    purity: '15_PE',
    label: '၁၅ ပဲရည်',
    tickerPill: 'bg-emerald-500/15 border border-emerald-500/40 hover:border-emerald-400/70 text-emerald-200',
    tickerDot: 'bg-emerald-400 ring-2 ring-emerald-400/30',
    tickerLabel: 'text-emerald-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-emerald-50/70',
    cardBorder: 'border-emerald-200/90',
    cardHoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-500/10',
    accentBar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80 font-bold',
    sellPriceText: 'text-emerald-950',
    sellPriceBox: 'bg-emerald-100/60 border-emerald-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  '14_PE': {
    purity: '14_PE',
    label: '၁၄ ပဲရည်',
    tickerPill: 'bg-sky-500/15 border border-sky-500/40 hover:border-sky-400/70 text-sky-200',
    tickerDot: 'bg-sky-400 ring-2 ring-sky-400/30',
    tickerLabel: 'text-sky-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-sky-50/70',
    cardBorder: 'border-sky-200/90',
    cardHoverBorder: 'hover:border-sky-400 hover:shadow-sky-500/10',
    accentBar: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-900 border border-sky-300/80 font-bold',
    sellPriceText: 'text-sky-950',
    sellPriceBox: 'bg-sky-100/60 border-sky-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  '12_PE': {
    purity: '12_PE',
    label: '၁၂ ပဲရည်',
    tickerPill: 'bg-purple-500/15 border border-purple-500/40 hover:border-purple-400/70 text-purple-200',
    tickerDot: 'bg-purple-400 ring-2 ring-purple-400/30',
    tickerLabel: 'text-purple-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-purple-50/70',
    cardBorder: 'border-purple-200/90',
    cardHoverBorder: 'hover:border-purple-400 hover:shadow-purple-500/10',
    accentBar: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-900 border border-purple-300/80 font-bold',
    sellPriceText: 'text-purple-950',
    sellPriceBox: 'bg-purple-100/60 border-purple-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  '18K': {
    purity: '18K',
    label: '၁၈ ကာရက် (18K)',
    tickerPill: 'bg-rose-500/15 border border-rose-500/40 hover:border-rose-400/70 text-rose-200',
    tickerDot: 'bg-rose-400 ring-2 ring-rose-400/30',
    tickerLabel: 'text-rose-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-rose-50/70',
    cardBorder: 'border-rose-200/90',
    cardHoverBorder: 'hover:border-rose-400 hover:shadow-rose-500/10',
    accentBar: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-900 border border-rose-300/80 font-bold',
    sellPriceText: 'text-rose-950',
    sellPriceBox: 'bg-rose-100/60 border-rose-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
};

const FALLBACK_PALETTES: PurityTheme[] = [
  {
    purity: 'OTHER_1',
    label: 'ရွှေဈေး',
    tickerPill: 'bg-teal-500/15 border border-teal-500/40 text-teal-200',
    tickerDot: 'bg-teal-400 ring-2 ring-teal-400/30',
    tickerLabel: 'text-teal-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-teal-50/70',
    cardBorder: 'border-teal-200/90',
    cardHoverBorder: 'hover:border-teal-400',
    accentBar: 'bg-teal-500',
    badge: 'bg-teal-100 text-teal-900 border border-teal-300/80 font-bold',
    sellPriceText: 'text-teal-950',
    sellPriceBox: 'bg-teal-100/60 border-teal-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  {
    purity: 'OTHER_2',
    label: 'ရွှေဈေး',
    tickerPill: 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-200',
    tickerDot: 'bg-indigo-400 ring-2 ring-indigo-400/30',
    tickerLabel: 'text-indigo-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-indigo-50/70',
    cardBorder: 'border-indigo-200/90',
    cardHoverBorder: 'hover:border-indigo-400',
    accentBar: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-900 border border-indigo-300/80 font-bold',
    sellPriceText: 'text-indigo-950',
    sellPriceBox: 'bg-indigo-100/60 border-indigo-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
  {
    purity: 'OTHER_3',
    label: 'ရွှေဈေး',
    tickerPill: 'bg-orange-500/15 border border-orange-500/40 text-orange-200',
    tickerDot: 'bg-orange-400 ring-2 ring-orange-400/30',
    tickerLabel: 'text-orange-300 font-bold',
    tickerPrice: 'text-white font-extrabold tracking-wide',
    cardBg: 'bg-orange-50/70',
    cardBorder: 'border-orange-200/90',
    cardHoverBorder: 'hover:border-orange-400',
    accentBar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-900 border border-orange-300/80 font-bold',
    sellPriceText: 'text-orange-950',
    sellPriceBox: 'bg-orange-100/60 border-orange-200/70',
    buyPriceBox: 'bg-stone-50 border-stone-200',
  },
];

export function getPurityTheme(purity?: string | null, index = 0): PurityTheme {
  const safeIndex = Math.abs(Number(index) || 0);
  if (!purity || typeof purity !== 'string') {
    return FALLBACK_PALETTES[safeIndex % FALLBACK_PALETTES.length];
  }
  const normalized = purity.trim().toUpperCase().replace('-', '_');
  if (PURITY_THEMES[normalized]) {
    return PURITY_THEMES[normalized];
  }
  return FALLBACK_PALETTES[safeIndex % FALLBACK_PALETTES.length];
}
