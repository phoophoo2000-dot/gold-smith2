import React, { Component, ReactNode, ErrorInfo } from 'react';
import { recordLog, downloadSystemLogs } from '../services/loggerService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    recordLog('error', 'SYSTEM', `React Crash: ${error?.message || 'Unknown error'}`, {
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-stone-850 border border-stone-700/80 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl">
              👑
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-amber-400">
                ရွှေရတနာ ရွှေဆိုင် POS
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Myanmar Gold Shop POS & Management System
              </p>
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left">
              <p className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>စနစ်ဖွင့်လှစ်ရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ပါသည်</span>
              </p>
              <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                Browser ၏ Cache သို့မဟုတ် မကိုက်ညီသော Data ဟောင်းများကြောင့် ဖြစ်နိုင်ပါသည်။ အောက်ပါ Reset ခလုတ်ကို နှိပ်၍ အချက်အလက်များကို ပြန်လည်စတင်နိုင်ပါသည်။
              </p>
              {this.state.error && (
                <div className="mt-2 text-[10px] font-mono text-rose-400 bg-stone-950/80 p-2 rounded border border-rose-500/20 overflow-x-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                အချက်အလက်များ Reset ပြုလုပ်၍ ပြန်ဖွင့်မည် (Clear & Reload)
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs rounded-xl border border-stone-700 transition-all cursor-pointer"
              >
                ပုံမှန် ပြန်လည်စတင်မည် (Reload Page)
              </button>
              <button
                type="button"
                onClick={() => downloadSystemLogs('txt')}
                className="w-full py-2 px-4 bg-stone-900 hover:bg-stone-800 text-amber-400 font-semibold text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📥 Error Log ဖိုင် ဒေါင်းလုဒ်ရယူမည် (Download Logs)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
