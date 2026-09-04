import React from 'react';
import { Shield, Upload, LogOut, User, Search, RefreshCw } from 'lucide-react';

export function Navbar({ username, onOpenUpload, onLogout, onRefresh, isRefreshing }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">DocVault</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Secure Document & Full-Text Search</p>
          </div>
        </div>

        {/* User & Actions */}
        <div className="flex items-center gap-3">
          {username ? (
            <>
              <button
                onClick={onRefresh}
                title="Refresh documents"
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Document</span>
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1" />

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium hidden sm:inline">{username}</span>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
