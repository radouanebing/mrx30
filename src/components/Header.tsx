import React from "react";
import { Activity, RefreshCw, LogOut, Shield } from "lucide-react";
import { Employee, UserRole } from "../types.js";
import AppLogo from "./AppLogo";

interface HeaderProps {
  currentUser: Employee | null;
  employees: Employee[];
  onUserChange: (user: Employee) => void;
  syncStatus: "idle" | "syncing" | "error";
  onTriggerSync: () => void;
  onLogout: () => void;
}

export default function Header({
  currentUser,
  employees,
  onUserChange,
  syncStatus,
  onTriggerSync,
  onLogout,
}: HeaderProps) {
  return (
    <nav className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm gap-4 transition-all" id="sleek-top-nav" dir="rtl">
      <div className="flex items-center gap-4">
        <AppLogo size="sm" className="shrink-0" />
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 font-sans leading-none flex items-center gap-2">
            <span className="bg-gradient-to-r from-teal-600 to-sky-600 bg-clip-text text-transparent">MRX_RN</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black font-sans uppercase">Platform</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">منصة التسيير الذكي والتحكم المتقدم الوردي والمهني لمصلحة الأشعة</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Sync & Cloud status */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs">
          <span className="relative flex h-2 w-2">
            {syncStatus === "syncing" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              syncStatus === "syncing" ? "bg-sky-500" : syncStatus === "error" ? "bg-red-500" : "bg-emerald-500"
            }`}></span>
          </span>
          <span className="text-slate-600 font-medium select-none">
            {syncStatus === "syncing" ? "جاري الحفظ السحابي..." : syncStatus === "error" ? "خطأ في الاتصال" : "البيانات مؤمنة بالسحابة"}
          </span>
          <button 
            onClick={onTriggerSync} 
            disabled={syncStatus === "syncing"}
            title="تحديث ومزامنة البيانات"
            className="text-slate-400 hover:text-sky-600 disabled:opacity-50 transition-colors p-1"
            id="sync-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* Profile Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">المنصب:</span>
            <span className="text-xs text-slate-800 font-black flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-sky-600" />
              {currentUser?.role === UserRole.MANAGER 
                ? "مدير مصلحة" 
                : currentUser?.role === UserRole.SUPERVISOR 
                ? "مشرف مناوبات" 
                : "موظف مصلحة (محدود)"}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <div className="flex items-center gap-3">
            <div className="text-left font-sans hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight block text-left text-sans">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 font-medium inline-block bg-slate-100 rounded px-1.5 py-0.5 mt-0.5">
                {currentUser?.email}
              </p>
            </div>
            <div className="w-10 h-10 bg-sky-100 text-sky-700 rounded-full border border-sky-200 flex items-center justify-center font-black text-sm select-none shadow-inner" title={currentUser?.name}>
              {currentUser?.name ? currentUser.name.substring(0, 2) : "SA"}
            </div>
            
            {/* Logout Trigger */}
            <button
              onClick={onLogout}
              className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer shadow-xs transition-all"
              title="تسجيل الخروج من الحساب"
              id="header-logout-btn"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
