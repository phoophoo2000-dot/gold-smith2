import React, { useState, useMemo } from 'react';
import {
  getSystemLogs,
  clearSystemLogs,
  downloadSystemLogs,
  copySystemLogsToClipboard,
  SystemLogEntry,
  LogLevel,
} from '../services/loggerService';
import {
  FileText,
  Download,
  Copy,
  Trash2,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Search,
  RefreshCw,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>(() => getSystemLogs());
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const refreshLogs = () => {
    setLogs(getSystemLogs());
  };

  const handleCopy = async () => {
    const success = await copySystemLogsToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    clearSystemLogs();
    setLogs([]);
    setShowClearConfirm(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchMsg = log.message.toLowerCase().includes(q);
        const matchCat = log.category.toLowerCase().includes(q);
        const matchUser = (log.userName || '').toLowerCase().includes(q);
        const matchCounter = (log.counterId || '').toLowerCase().includes(q);
        return matchMsg || matchCat || matchUser || matchCounter;
      }
      return true;
    });
  }, [logs, levelFilter, searchTerm]);

  const errorCount = useMemo(() => logs.filter((l) => l.level === 'error').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'warn').length, [logs]);
  const infoCount = useMemo(() => logs.filter((l) => l.level === 'info').length, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-800 bg-stone-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>စနစ်မှတ်တမ်းနှင့် Error/Audit Logs</span>
              </h2>
              <p className="text-xs text-stone-400">System Activity, Diagnostic Logs & Troubleshooting Export</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshLogs}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="ပြန်လည်ဆွဲယူမည် (Refresh)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setLevelFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                levelFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : 'bg-stone-850 text-stone-300 border-stone-700 hover:bg-stone-800'
              }`}
            >
              အားလုံး ({logs.length})
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter('error')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                levelFilter === 'error'
                  ? 'bg-rose-500 text-white border-rose-400'
                  : errorCount > 0
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                  : 'bg-stone-850 text-stone-400 border-stone-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>အမှားများ ({errorCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter('warn')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                levelFilter === 'warn'
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : warnCount > 0
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
                  : 'bg-stone-850 text-stone-400 border-stone-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>သတိပေးချက် ({warnCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter('info')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                levelFilter === 'info'
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-stone-850 text-stone-400 border-stone-700 hover:bg-stone-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>လုပ်ဆောင်ချက် ({infoCount})</span>
            </button>
          </div>

          {/* Export / Download Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              title="မှတ်တမ်း စာသားအဖြစ် ကူးယူမည်"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
              <span>{copied ? 'ကူးယူပြီးပါပြီ (Copied)' : 'Log ကူးယူမည်'}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSystemLogs('txt')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Log File (.txt) ဒေါင်းလုဒ်ဆွဲမည်"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Log ဖိုင် ဒေါင်းလုဒ် (.txt)</span>
            </button>

            {logs.length > 0 &&
              (showClearConfirm ? (
                <div className="flex items-center gap-1.5 p-1 bg-rose-950/80 border border-rose-700 rounded-xl">
                  <span className="text-[11px] text-rose-200 px-1.5 font-medium">အားလုံးဖျက်မည်လား?</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    အတည်ပြု ဖျက်မည်
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 text-stone-400 hover:text-white rounded-lg text-xs cursor-pointer"
                  >
                    မဖျက်တော့ပါ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="စနစ်မှတ်တမ်းများ ရှင်းလင်းဖျက်ပစ်မည်"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>မှတ်တမ်းဖျက်မည်</span>
                </button>
              ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-2.5 bg-stone-950/30 border-b border-stone-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="မှတ်တမ်းများ ရှာရန် (ဥပမာ- error, sale, void, pin, counter, sync)..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Logs List Area */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar-y flex-1 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-stone-600" />
              <p className="text-sm font-medium">ရှာဖွေတွေ့ရှိသော မှတ်တမ်း မရှိပါ</p>
              <p className="text-xs text-stone-600">No log entries matched your filter.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isError = log.level === 'error';
              const isWarn = log.level === 'warn';

              return (
                <div
                  key={log.id}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-xs ${
                    isError
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      : isWarn
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-stone-950/60 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Level badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono border ${
                            isError
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                              : isWarn
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          }`}
                        >
                          {log.level}
                        </span>

                        {/* Category */}
                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono text-[10px] font-semibold border border-stone-700">
                          {log.category}
                        </span>

                        {/* Counter */}
                        {log.counterId && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold">
                            {log.counterId}
                          </span>
                        )}

                        {/* User */}
                        {log.userName && (
                          <span className="text-stone-400 text-[11px]">
                            by <strong className="text-stone-200">{log.userName}</strong>
                          </span>
                        )}

                        {/* Timestamp */}
                        <span className="text-[10px] text-stone-500 font-mono ml-auto">
                          {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Log Message */}
                      <p className="font-semibold text-stone-100 text-xs sm:text-sm mt-1 leading-relaxed break-words">
                        {log.message}
                      </p>
                    </div>

                    {/* Expand Details Button */}
                    {log.details && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[10px] font-mono shrink-0 transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    )}
                  </div>

                  {/* Expanded JSON Details */}
                  {isExpanded && log.details && (
                    <div className="mt-2.5 p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-300 overflow-x-auto custom-scrollbar-x">
                      <pre className="whitespace-pre-wrap break-all">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>မှတ်တမ်းများကို ဤစက် (Local Buffer) တွင် နောက်ဆုံး ၂၀၀ အထိ အလိုအလျောက် သိမ်းဆည်းထားပါသည်။</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-colors cursor-pointer shrink-0"
          >
            ပိတ်မည် (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
