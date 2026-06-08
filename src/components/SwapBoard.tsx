import React from "react";
import { MessageSquare, RefreshCw, CheckCircle2, XCircle, Clock, Heart, ShieldAlert, ArrowLeftRight } from "lucide-react";
import { Employee, ShiftSwapRequest, SwapStatus, UserRole } from "../types.js";

interface SwapBoardProps {
  swapRequests: ShiftSwapRequest[];
  employees: Employee[];
  currentUser: Employee | null;
  onUpdateSwapRequest: (id: string, status: SwapStatus) => void;
}

export default function SwapBoard({
  swapRequests,
  employees,
  currentUser,
  onUpdateSwapRequest,
}: SwapBoardProps) {
  const isManager = currentUser?.role === UserRole.MANAGER;

  const getEmployeeName = (id?: string) => {
    return employees.find(e => e.id === id)?.name || "غير محدد";
  };

  const getSpecialtyLabel = (id?: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return "";
    switch (emp.specialty) {
      case "RADIOLOGIST": return "طبيب أشعة";
      case "TECHNOLOGIST": return "تقني أشعة";
      case "NURSE": return "ممرض مصلحة";
      case "SECRETARY": return "سكرتير الإستقبال";
    }
  };

  const getShiftTypeArabic = (type?: string) => {
    switch (type) {
      case "MORNING": return "صباحية (08:00 - 14:00)";
      case "EVENING": return "مسائية (14:00 - 20:00)";
      case "NIGHT": return "ليلية (20:00 - 08:00)";
      default: return "";
    }
  };

  const pendingSwaps = swapRequests.filter((rq) => rq.status === SwapStatus.PENDING);
  const resolvedSwaps = swapRequests.filter((rq) => rq.status !== SwapStatus.PENDING);

  return (
    <div className="space-y-6" id="swaps-tab-content">
      
      {/* Tab Banner */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between items-start gap-2">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-teal-600" />
          طلبات التبادل المتبادلة بين عمال دوق الأشعة
        </h2>
        <p className="text-xs text-slate-500">
          لمراعاة الظروف الشخصية والاجتماعية للزملاء وموازنتها بدقة، تتيح هذه اللوحة تداول المناوبات. تتطلب الموافقة موافقة الطرف الآخر أو مدير المصلحة لتغيير جدول المناوبات رسمياً.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active pending swaps list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            طلبات تبادل الفراغات المناوبة الجارية والقيد المعالجة ({pendingSwaps.length})
          </h3>

          <div className="space-y-4">
            {pendingSwaps.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center text-slate-400 text-xs">
                لا توجد طلبات تبادل معلقة حالياً. زملاء مصلحة الأشعة يعملون بنظام وراحة.
              </div>
            ) : (
              pendingSwaps.map((req) => {
                const requesterId = req.requesterId;
                const proposedId = req.proposedEmployeeId;
                
                // Permission logic to approve or reject:
                // - Only the proposed companion OR the Manager can approve!
                // - Requesters cannot approve their own swap
                const isProposedColleague = currentUser?.id === proposedId;
                const canResolve = isManager || isProposedColleague;

                return (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-teal-200 transition-all">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600">
                          <RefreshCw className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold">بواسطة الأخصائي المتقدم:</span>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                            {getEmployeeName(requesterId)} <span className="font-normal text-xs text-slate-500">({getSpecialtyLabel(requesterId)})</span>
                          </h4>
                        </div>
                      </div>
                      
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        بانتظار الإعتماد
                      </span>
                    </div>

                    {/* Content Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                      <div>
                        <span className="text-slate-400 block font-normal">المناوبة المراد التنازل عنها:</span>
                        <strong className="text-slate-800">{req.shiftDate} — {getShiftTypeArabic(req.shiftType)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal text-right">الزميل المقترح للحلول محلها:</span>
                        <strong className="text-teal-700">{getEmployeeName(proposedId)} <span className="text-slate-500">({getSpecialtyLabel(proposedId)})</span></strong>
                      </div>
                      
                      {req.notes && (
                        <div className="md:col-span-2 border-t border-slate-200/50 pt-2 flex gap-1.5 items-start">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                          <span className="text-slate-600 italic">" {req.notes} "</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom actions */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-sans">
                        تم تقديم الطلب: {new Date(req.createdAt).toLocaleDateString("ar-EG")} | {new Date(req.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {canResolve ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onUpdateSwapRequest(req.id, SwapStatus.REJECTED)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                          >
                            رفض الطلب
                          </button>
                          <button
                            onClick={() => onUpdateSwapRequest(req.id, SwapStatus.APPROVED)}
                            className="bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/10 hover:scale-[1.02]"
                          >
                            <CheckCircle2 className="h-4 w-4 text-slate-950" />
                            <span>موافقة وإبدال المناوبة</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic bg-amber-50 px-2 py-1 rounded border border-amber-150">
                          {isProposedColleague ? "صلاحيات تبادل متاحة لك" : `بانتظار موافقة ${getEmployeeName(proposedId)} أو مدير المصلحة`}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Historical swapping records */}
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pt-6">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            سجل التبادلات المنجزة ({resolvedSwaps.length})
          </h3>

          <div className="space-y-2">
            {resolvedSwaps.map((req) => (
              <div key={req.id} className="bg-slate-50 opacity-75 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center text-xs gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{getEmployeeName(req.requesterId)}</span>
                    <span className="text-slate-400">بدّل مناوبته مع:</span>
                    <span className="font-bold text-teal-800">{getEmployeeName(req.proposedEmployeeId)}</span>
                  </div>
                  <p className="text-[11px] font-sans text-slate-500">
                    مناوبة تاريخ: {req.shiftDate} / {getShiftTypeArabic(req.shiftType)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === SwapStatus.APPROVED ? (
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      مقبول ومتكامل
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-rose-500" />
                      مرفوض
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Sidebar details */}
        <div className="space-y-4">
          <div className="bg-teal-900 text-white p-5 rounded-2xl shadow-sm space-y-4 border border-teal-800">
            <h4 className="font-bold text-sm text-center">خطوات تبادل المناوبات الذاتي</h4>
            <ol className="text-xs space-y-3 leading-relaxed text-slate-200 list-decimal list-inside pr-1">
              <li>يقوم الموظف بالنقر على إحدى مناوباته المجدولة له في الصفحة الأولى وتحديد طلب التبديل.</li>
              <li>يقوم باختيار الزميل المقترح للتنازل له وكتابة عذره.</li>
              <li>يرسل التطبيق إشعاراً لتبادل المناوبة على لوحة الموظف المقابل ومدير المصلحة.</li>
              <li>بمجرد موافقة الموظف المقابل أو اعتماد مدير مصلحة الأشعة يتم تعديل المناوبة فورياً.</li>
            </ol>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 font-sans text-xs text-blue-900 leading-relaxed flex items-start gap-1.5">
            <ShieldAlert className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              نظام معزز بأمن وشفافية البيانات: يتم تسجيل كافة التغييرات باسم الـموافق والتوقيت السيرفر لمنع أي خلافات في مناوبات الطوارئ.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
