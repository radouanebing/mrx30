import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  HelpCircle, 
  Sparkles, 
  Activity, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle
} from "lucide-react";
import { Employee, LeaveRequest, LeaveType, LeaveStatus, UserRole } from "../types.js";

interface VacationRequestsProps {
  leaves: LeaveRequest[];
  employees: Employee[];
  currentUser: Employee | null;
  onAddLeave: (leave: { leaveType: LeaveType; startDate: string; endDate: string; reason: string }) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus) => Promise<void>;
  onDeleteLeave: (id: string) => Promise<void>;
}

export default function VacationRequests({
  leaves,
  employees,
  currentUser,
  onAddLeave,
  onUpdateLeaveStatus,
  onDeleteLeave
}: VacationRequestsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.ANNUAL);
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-05");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [formError, setFormError] = useState("");

  const isManager = currentUser?.role === UserRole.MANAGER;

  // Limits
  const ANNUAL_LIMIT = 50;
  const CASUAL_LIMIT = 42;

  // Calculate stats for a given employee
  const getEmployeeStats = (empId: string) => {
    const empLeaves = leaves.filter(l => l.employeeId === empId);
    
    const approvedAnnualDays = empLeaves
      .filter(l => l.leaveType === LeaveType.ANNUAL && l.status === LeaveStatus.APPROVED)
      .reduce((sum, l) => sum + l.totalDays, 0);

    const approvedCasualDays = empLeaves
      .filter(l => l.leaveType === LeaveType.CASUAL && l.status === LeaveStatus.APPROVED)
      .reduce((sum, l) => sum + l.totalDays, 0);

    return {
      annualUsed: approvedAnnualDays,
      annualRemaining: Math.max(0, ANNUAL_LIMIT - approvedAnnualDays),
      casualUsed: approvedCasualDays,
      casualRemaining: Math.max(0, CASUAL_LIMIT - approvedCasualDays)
    };
  };

  const currentStats = currentUser ? getEmployeeStats(currentUser.id) : {
    annualUsed: 0,
    annualRemaining: ANNUAL_LIMIT,
    casualUsed: 0,
    casualRemaining: CASUAL_LIMIT
  };

  // Filtered leaves list
  const filteredLeaves = leaves.filter(l => {
    // If not manager, only see own leaves
    if (!isManager && l.employeeId !== currentUser?.id) {
      return false;
    }
    if (filter === "ALL") return true;
    return l.status === filter;
  });

  // Calculate live days count from input dates
  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return 0;
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const selectedDaysCount = calculateDays();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (selectedDaysCount <= 0) {
      setFormError("برجاء اختيار نطاق تواريخ صحيح. تاريخ البدء يجب أن يسبق أو يطابق تاريخ الانتهاء.");
      return;
    }

    // Client-side balance check
    const currentRemaining = leaveType === LeaveType.ANNUAL ? currentStats.annualRemaining : currentStats.casualRemaining;
    if (selectedDaysCount > currentRemaining) {
      const typeLabel = leaveType === LeaveType.ANNUAL ? "السنوية" : "العارضة";
      setFormError(`رصيدك المتبقي من الإجازة ${typeLabel} هو ${currentRemaining} يوماً، بينما طلبت ${selectedDaysCount} يوماً.`);
      return;
    }

    try {
      await onAddLeave({
        leaveType,
        startDate,
        endDate,
        reason
      });
      setReason("");
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || "فشل تقديم طلب الإجازة.");
    }
  };

  const getLeaveTypeArabic = (type: LeaveType) => {
    switch (type) {
      case LeaveType.ANNUAL: return "إجازة سنوية";
      case LeaveType.CASUAL: return "إجازة عارضة";
    }
  };

  const getStatusStyle = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.PENDING:
        return "bg-amber-50 border-amber-200 text-amber-800";
      case LeaveStatus.APPROVED:
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case LeaveStatus.REJECTED:
        return "bg-rose-50 border-rose-200 text-rose-800";
    }
  };

  const getStatusLabel = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.PENDING: return "قيد الانتظار";
      case LeaveStatus.APPROVED: return "مقبول ومصادق";
      case LeaveStatus.REJECTED: return "مرفوض";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="vacation-requests-tab" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-teal-800/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-500/20 rounded-xl text-teal-300">
              <Calendar className="h-6 w-6 animate-pulse" />
            </span>
            <h2 className="text-xl font-bold">بوابة تقديم ومتابعة الإجازات الطبية</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            يمكن لأطباء وممرضي مصلحة الأشعة تقديم طلبات الإجازات السنوية (حد أقصى 50 يوماً) والإجازات العارضة (حد أقصى 42 يوماً). تتم معالجة الطلبات واعتمادها لضمان تغطية كافية.
          </p>
        </div>
        
        {currentUser && (
          <button
            onClick={() => {
              setFormError("");
              setIsFormOpen(true);
            }}
            id="open-request-leave-modal-btn"
            className="flex-shrink-0 flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4 text-slate-950" />
            <span>طلب عطلة أو إجازة جديدة</span>
          </button>
        )}
      </div>

      {/* Low Annual Leave Balance Alert */}
      {!isManager && currentUser && currentStats.annualRemaining < 5 && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-pulse animate-duration-[2500ms]" id="vacation-low-balance-alert">
          <div className="p-3 bg-rose-100 rounded-xl text-rose-600 border border-rose-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-grow space-y-1 text-right font-medium">
            <h4 className="font-extrabold text-sm text-rose-950">🚨 نظام التنبيهات التلقائي: رصيدك السنوي المتبقي منخفض للغاية!</h4>
            <p className="text-xs text-rose-800 leading-relaxed">
              يتبقى لديك <span className="font-extrabold font-sans bg-rose-100 px-1 py-0.5 rounded border border-rose-200 text-rose-900">{currentStats.annualRemaining} أيام فقط</span> من أصل {ANNUAL_LIMIT} يوماً. نوصيك بتقديم طلب للحصول على إجازاتك لتجنب انقضاء السنة ونفاد الرصيد المتاح دون الاستفادة منه.
            </p>
          </div>
          <button 
            onClick={() => {
              setFormError("");
              setIsFormOpen(true);
            }}
            id="vacation-alert-request-btn"
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/15 cursor-pointer shrink-0 hover:scale-[1.02]"
          >
            قدم طلب إجازة عاجلة
          </button>
        </div>
      )}

      {/* Stats Widget */}
      {!isManager && currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Annual Leave Card */}
          <div className="bg-white border-2 border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black text-teal-600 tracking-wider">الإجازة السنوية</span>
                <h3 className="text-base font-black text-slate-900">الرصيد والعدّ الإجمالي</h3>
              </div>
              <span className="bg-teal-50 text-teal-800 text-xs font-bold px-3 py-1 rounded-full border border-teal-100 font-sans">
                الحد: {ANNUAL_LIMIT} يوم
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">المستخدمة</span>
                <span className="text-xl font-extrabold text-slate-800 font-sans">{currentStats.annualUsed}</span>
                <span className="text-[10px] text-slate-400 block">يوم</span>
              </div>
              <div className="bg-teal-50/40 p-3.5 rounded-xl border border-teal-100">
                <span className="text-[10px] text-teal-600 block font-bold">المتبقية</span>
                <span className="text-xl font-extrabold text-teal-700 font-sans">{currentStats.annualRemaining}</span>
                <span className="text-[10px] text-teal-600 block">يوم</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-teal-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (currentStats.annualUsed / ANNUAL_LIMIT) * 100)}%` }}
              />
            </div>
          </div>

          {/* Casual Leave Card */}
          <div className="bg-white border-2 border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black text-indigo-600 tracking-wider">الإجازة العارضة</span>
                <h3 className="text-base font-black text-slate-900">الرصيد والاستهلاك الفعلي</h3>
              </div>
              <span className="bg-indigo-50 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 font-sans">
                الحد: {CASUAL_LIMIT} يوم
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">المستخدمة</span>
                <span className="text-xl font-extrabold text-slate-800 font-sans">{currentStats.casualUsed}</span>
                <span className="text-[10px] text-slate-400 block">يوم</span>
              </div>
              <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-indigo-600 block font-bold">المتبقية</span>
                <span className="text-xl font-extrabold text-indigo-700 font-sans">{currentStats.casualRemaining}</span>
                <span className="text-[10px] text-indigo-600 block">يوم</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (currentStats.casualUsed / CASUAL_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Filters & Lists */}
      <div className="space-y-4">
        
        {/* Sub Navigation and Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "كافة الطلبات" },
              { id: "PENDING", label: "قيد المراجعة" },
              { id: "APPROVED", label: "مقبولة" },
              { id: "REJECTED", label: "مرفوضة" }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filter === btn.id 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-500">
            {isManager ? "مراجعة كافة طلبات الموظفين" : "طلبات الإجازة الخاصة بي"} ({filteredLeaves.length})
          </span>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredLeaves.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 p-12 rounded-2xl text-center space-y-2 flex flex-col items-center">
              <HelpCircle className="h-10 w-10 text-slate-400" />
              <h4 className="font-bold text-sm text-slate-700">لا توجد طلبات إجازة تطابق المعيار المختار</h4>
              <p className="text-xs text-slate-500">لم يتم العثور على أي بيانات إجازة مسجلة في هذا القسم حالياً.</p>
            </div>
          ) : (
            filteredLeaves.map((leave) => {
              const emp = employees.find(e => e.id === leave.employeeId);
              const statsObj = getEmployeeStats(leave.employeeId);
              
              return (
                <div 
                  key={leave.id} 
                  className={`bg-white border hover:border-slate-300 p-5 rounded-2xl shadow-sm space-y-4 transition-all relative ${
                    leave.status === LeaveStatus.PENDING ? "border-l-4 border-l-amber-500" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-100">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">
                            {getLeaveTypeArabic(leave.leaveType)}
                          </h4>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getStatusStyle(leave.status)}`}>
                            {getStatusLabel(leave.status)}
                          </span>
                        </div>
                        {isManager && emp && (
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            مقدم الطلب: <span className="text-teal-600">{emp.name}</span> ({emp.role === UserRole.MANAGER ? "مدير مصلحة" : "موظف مصلحة"})
                          </p>
                        )}
                        {!isManager && (
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                            تم التقديم في: {new Date(leave.createdAt).toLocaleDateString("ar-EG")}
                          </p>
                        )}
                      </div>
                    </div>

                    {isManager && emp && (
                      <div className="text-right text-[10px] font-sans bg-slate-50 p-2 rounded-lg border border-slate-150 space-y-1">
                        <span className="text-slate-400 block font-bold">موقف الرصيد الحالي للموظف:</span>
                        <div className="flex gap-3 text-slate-600 justify-end">
                          <span>سنوية مستخدمة: <b className="text-teal-600">{statsObj.annualUsed}</b>/50</span>
                          <span>عارضة مستخدمة: <b className="text-indigo-600">{statsObj.casualUsed}</b>/42</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates & duration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">تاريخ البدء:</span>
                      <span className="font-bold text-slate-800 font-sans">{leave.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">تاريخ الانتهاء:</span>
                      <span className="font-bold text-slate-800 font-sans">{leave.endDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">المدة المطلوبة:</span>
                      <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-sans text-xs">
                        {leave.totalDays} يوماً
                      </span>
                    </div>
                    <div className="md:col-span-3 mt-1 border-t border-slate-200/60 pt-2">
                      <span className="text-slate-400 block font-semibold">السبب أو المسوّغ الطبي:</span>
                      <span className="font-medium text-slate-700 italic">" {leave.reason || "لم يذكر سبب مخصص."} "</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-slate-400 font-sans">
                      معرف المستند: {leave.id}
                    </span>

                    <div className="flex gap-2">
                      {isManager && leave.status === LeaveStatus.PENDING && (
                        <>
                          <button
                            onClick={() => onUpdateLeaveStatus(leave.id, LeaveStatus.REJECTED)}
                            className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>رفض المعاملة</span>
                          </button>
                          <button
                            onClick={() => onUpdateLeaveStatus(leave.id, LeaveStatus.APPROVED)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-1.5 rounded-xl cursor-pointer shadow-md shadow-emerald-500/10 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>قبول وموافقة</span>
                          </button>
                        </>
                      )}

                      {!isManager && leave.status === LeaveStatus.PENDING && (
                        <button
                          onClick={() => onDeleteLeave(leave.id)}
                          className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>إلغاء وسحب الطلب</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- VACATION REQUEST DIALOG MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="request-leave-modal-dialog">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right">
            <div className="bg-teal-800 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تقديم طلب إجازة رسمي</h3>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="text-white/80 hover:text-white text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Informational helpful box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">شروط المعايير والأرصدة المستحقة:</span>
                <div className="flex justify-between">
                  <span>السنوية المطلوبة المتاحة لك:</span>
                  <span className="font-sans font-bold text-teal-600">{currentStats.annualRemaining} أيام</span>
                </div>
                <div className="flex justify-between">
                  <span>العارضة المطلوبة المتاحة لك:</span>
                  <span className="font-sans font-bold text-indigo-600">{currentStats.casualRemaining} أيام</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإجازة المطلوبة</label>
                <select
                  required
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-250 rounded-xl"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                >
                  <option value={LeaveType.ANNUAL}>إجازة سنوية (حدّ أقصى 50 يوماً سنوياً)</option>
                  <option value={LeaveType.CASUAL}>إجازة عارضة (حدّ أقصى 42 يوماً سنوياً)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    required
                    className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-sans"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    required
                    className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-sans"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {selectedDaysCount > 0 && (
                <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-teal-800">إجمالي أيام الإجازة:</span>
                  <span className="text-sm font-black text-teal-700 font-sans">{selectedDaysCount} أيام</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المسوّغات أو السبب بالتفصيل</label>
                <textarea
                  required
                  placeholder="من فضلك اكتب المسوغ لتقديمه فورياً إلى مدير المصلحة للاعتماد..."
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-teal-500/15"
                >
                  تأكيد الإرسال والتقديم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
