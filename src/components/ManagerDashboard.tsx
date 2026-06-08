import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  Award, 
  FileText, 
  TrendingUp, 
  Clock, 
  Info,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { 
  Employee, 
  Shift, 
  ShiftSwapRequest, 
  SuddenAbsence, 
  LeaveRequest, 
  UserRole, 
  SwapStatus, 
  LeaveStatus, 
  ShiftType,
  LeaveType
} from "../types";

interface ManagerDashboardProps {
  employees: Employee[];
  shifts: Shift[];
  swapRequests: ShiftSwapRequest[];
  absences: SuddenAbsence[];
  leaves: LeaveRequest[];
  currentUser: Employee | null;
  onUpdateSwapRequest: (id: string, status: SwapStatus) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus) => Promise<void>;
  onCoverAbsence: (absenceId: string, coverEmployeeId: string) => Promise<void>;
  triggerToast: (text: string, type: "alert" | "info" | "success") => void;
  setActiveTab: (tab: string) => void;
}

export default function ManagerDashboard({
  employees,
  shifts,
  swapRequests,
  absences,
  leaves,
  currentUser,
  onUpdateSwapRequest,
  onUpdateLeaveStatus,
  onCoverAbsence,
  triggerToast,
  setActiveTab
}: ManagerDashboardProps) {
  // Today is hardcoded as June 1, 2026 based on metadata
  const TODAY_STR = "2026-06-01";

  // State for user custom tasks
  const [customTasks, setCustomTasks] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem("radiology_dashboard_tasks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Default starting tasks for the manager
    return [
      { id: "task-1", text: "التنسيق مع مهندس الرنين المغناطيسي بخصوص الصيانة الوقائية السنوية", completed: false },
      { id: "task-2", text: "مراجعة ميزانية رصيد نقاط التطوع للموظفين الملتزمين بنهاية الأسبوع", completed: false },
      { id: "task-3", text: "نشر التقرير الأسبوعي حول مؤشرات تقييم الأداء المصلحي الجاري", completed: true }
    ];
  });

  const [newTaskText, setNewTaskText] = useState("");

  // Save custom tasks to localStorage
  useEffect(() => {
    localStorage.setItem("radiology_dashboard_tasks", JSON.stringify(customTasks));
  }, [customTasks]);

  // Derived Statistics for Today
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter(e => e.active).length;

  // Absences today (specifically on today's date "2026-06-01" or generally uncovered of any date)
  const uncoveredAbsences = absences.filter(a => !a.covered);
  const todaysAbsences = absences.filter(a => a.date === TODAY_STR);
  const todaysUncoveredAbsences = todaysAbsences.filter(a => !a.covered);

  // Swaps stats
  const pendingSwaps = swapRequests.filter(s => s.status === SwapStatus.PENDING);
  
  // Pending leaves
  const pendingLeaves = leaves.filter(l => l.status === LeaveStatus.PENDING);

  // Shifts of today
  const todaysShifts = shifts.filter(s => s.date === TODAY_STR);

  // Quick Action Handlers with loading state indicator
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleApproveSwap = async (id: string) => {
    setActionInProgress(id);
    try {
      await onUpdateSwapRequest(id, SwapStatus.APPROVED);
    } catch (e) {
      // Error is caught and toast is triggered by parent handles
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectSwap = async (id: string) => {
    setActionInProgress(id);
    try {
      await onUpdateSwapRequest(id, SwapStatus.REJECTED);
    } catch (e) {
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveLeave = async (id: string) => {
    setActionInProgress(id);
    try {
      await onUpdateLeaveStatus(id, LeaveStatus.APPROVED);
    } catch (e) {
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectLeave = async (id: string) => {
    setActionInProgress(id);
    try {
      await onUpdateLeaveStatus(id, LeaveStatus.REJECTED);
    } catch (e) {
    } finally {
      setActionInProgress(null);
    }
  };

  // Custom Tasks actions
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false
    };
    setCustomTasks(prev => [...prev, newTask]);
    setNewTaskText("");
    triggerToast("تمت إضافة مهمة عاجلة جديدة إلى جدولك الإداري.", "success");
  };

  const handleToggleTask = (id: string) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setCustomTasks(prev => prev.filter(t => t.id !== id));
    triggerToast("تم شطب المهمة بنجاح.", "info");
  };

  const getEmployeeName = (id?: string) => {
    return employees.find(e => e.id === id)?.name || "غير محدد";
  };

  const getSpecialtyLabel = (emp?: Employee) => {
    if (!emp) return "";
    switch (emp.specialty) {
      case "RADIOLOGIST": return "طبيب أشعة";
      case "TECHNOLOGIST": return "تقني أشعة";
      case "NURSE": return "ممرض مصلحة";
      case "SECRETARY": return "سكرتير الإستقبال";
      default: return "";
    }
  };

  const getShiftTypeArabic = (type?: ShiftType) => {
    switch (type) {
      case ShiftType.MORNING: return "صباحية (08:00 - 14:00)";
      case ShiftType.EVENING: return "مسائية (14:00 - 20:00)";
      case ShiftType.NIGHT: return "ليلية (20:00 - 08:00)";
      default: return "";
    }
  };

  // Auto-calculated core objective tasks (Auto status validation)
  const autoAbsencesChecked = todaysUncoveredAbsences.length === 0;
  const autoSwapsChecked = pendingSwaps.length === 0;
  const autoLeavesChecked = pendingLeaves.length === 0;

  return (
    <div className="space-y-8" id="manager-dashboard-view">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-sky-900/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 text-right">
            <div className="flex items-center gap-3 justify-start">
              <span className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400 border border-sky-500/20">
                <LayoutDashboard className="h-6 w-6" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black">لوحة التحكم والمتابعة الإدارية</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              أهلاً بك يا <strong>{currentUser?.name || "مدير مصلحة الأشعة"}</strong>. تعرض هذه الشاشة الموحدة الحالة اللحظية لطاقم الأشعة، غيابات اليوم، الطلبات المعلقة والمهام الإدارية لتبسيط اتخاذ القرار وحفظ الخدمة الطبية المستقرة.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shrink-0 font-sans text-xs">
            <Clock className="h-4 w-4 text-sky-400" />
            <div className="text-right">
              <p className="font-extrabold text-white">{TODAY_STR}</p>
              <p className="text-[10px] text-slate-350">السجلات تابعة لليوم الفيدرالي</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rapid Statistics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="dashboard-statistics-grid">
        
        {/* Stat Card 1: Today Absences */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
          <div className="space-y-1.5 text-right">
            <span className="text-[10px] font-black text-rose-500 block uppercase tracking-wider">غيابات اليوم الطارئة</span>
            <div className="flex items-baseline gap-2 justify-end flex-row-reverse">
              <span className="text-2xl font-extrabold text-slate-900 font-sans">{todaysAbsences.length}</span>
              <span className="text-xs font-bold text-slate-400">حالات</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {todaysUncoveredAbsences.length > 0 ? (
                <span className="text-rose-600 font-bold">🚨 {todaysUncoveredAbsences.length} شاغر غير مغطى اليوم</span>
              ) : (
                <span className="text-emerald-600 font-bold">✓ مغطاة بنجاح بالكامل</span>
              )}
            </p>
          </div>
          <span className="p-4 bg-rose-50 text-rose-500 rounded-2xl group-hover:scale-105 transition-transform duration-200">
            <ShieldAlert className="h-6 w-6" />
          </span>
        </div>

        {/* Stat Card 2: Pending Swaps */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
          <div className="space-y-1.5 text-right">
            <span className="text-[10px] font-black text-indigo-500 block uppercase tracking-wider">طلبات تبادل المناوبات</span>
            <div className="flex items-baseline gap-2 justify-end flex-row-reverse">
              <span className="text-2xl font-extrabold text-slate-900 font-sans">{pendingSwaps.length}</span>
              <span className="text-xs font-bold text-slate-400">طلب معلق</span>
            </div>
            <p className="text-[10px] text-slate-500">تنتظر مراجعة الإدارة والموافقة عليها</p>
          </div>
          <span className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl group-hover:scale-105 transition-transform duration-200">
            <RefreshCw className="h-6 w-6" />
          </span>
        </div>

        {/* Stat Card 3: Pending Leave Requests */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
          <div className="space-y-1.5 text-right">
            <span className="text-[10px] font-black text-teal-600 block uppercase tracking-wider">طلبات الإجازات المعلقة</span>
            <div className="flex items-baseline gap-2 justify-end flex-row-reverse">
              <span className="text-2xl font-extrabold text-slate-900 font-sans">{pendingLeaves.length}</span>
              <span className="text-xs font-bold text-slate-400">معاملة</span>
            </div>
            <p className="text-[10px] text-slate-500">رصيد سنوي وعوارض تحتاج دراسة</p>
          </div>
          <span className="p-4 bg-teal-50 text-teal-500 rounded-2xl group-hover:scale-105 transition-transform duration-200">
            <Calendar className="h-6 w-6" />
          </span>
        </div>

        {/* Stat Card 4: Total Staff Active */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
          <div className="space-y-1.5 text-right">
            <span className="text-[10px] font-black text-emerald-600 block uppercase tracking-wider">جاهزية طاقم الأشعة</span>
            <div className="flex items-baseline gap-2 justify-end flex-row-reverse">
              <span className="text-2xl font-extrabold text-slate-900 font-sans">{activeEmployeesCount}</span>
              <span className="font-sans text-xs text-slate-400">/ {totalEmployeesCount}</span>
            </div>
            <p className="text-[10px] text-slate-500">الموظفين المسجلين في الخدمة حالياً</p>
          </div>
          <span className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-105 transition-transform duration-200">
            <Users className="h-6 w-6" />
          </span>
        </div>

      </div>

      {/* 3. Main Bento Columns for Urgent Tasks & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RIGHT COLUMN (2cols): Urgent Requests Needing Manager Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section A: Today's Sudden Absences Coverage */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                <span>🚨 غيابات حرجة لليوم بحاجة لتغطية فورية ({todaysUncoveredAbsences.length})</span>
              </h3>
              <button 
                onClick={() => setActiveTab("absences")} 
                className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-605 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold"
              >
                شاشة الغيابات كاملة
              </button>
            </div>

            {todaysUncoveredAbsences.length === 0 ? (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-xl text-center text-emerald-800 text-xs flex flex-col items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>لا توجد ثغرات غياب شاغرة اليوم</p>
                <p className="text-[10px] text-slate-400">جميع مناوبات اليوم ({TODAY_STR}) مؤمنة وتغطي المرضى بالكامل.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {todaysUncoveredAbsences.map(ab => {
                  const emp = employees.find(e => e.id === ab.employeeId);
                  return (
                    <div key={ab.id} className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-600" />
                          <span className="font-extrabold text-xs text-rose-950">{emp?.name || "موظف"} ({getSpecialtyLabel(emp)})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          الفترة: <strong className="text-slate-800">{getShiftTypeArabic(ab.shiftType)}</strong>
                        </p>
                        <p className="text-[10px] text-rose-800 italic font-medium">السبب: "{ab.reason}"</p>
                      </div>

                      {/* Cover dropdown quick assignment */}
                      <div className="shrink-0 text-right">
                        <label className="block text-[10px] text-slate-500 mb-1 font-bold">اختر البديل المتاح للتكليف:</label>
                        <select
                          className="text-xs border border-teal-200 rounded-lg px-2.5 py-1.5 bg-white font-extrabold focus:outline-teal-500"
                          onChange={async (e) => {
                            if (e.target.value) {
                              setActionInProgress(ab.id);
                              try {
                                await onCoverAbsence(ab.id, e.target.value);
                              } finally {
                                setActionInProgress(null);
                              }
                            }
                          }}
                          disabled={actionInProgress === ab.id}
                          value=""
                        >
                          <option value="">-- كلف بديلاً للتغطية --</option>
                          {employees
                            .filter(e => e.id !== ab.employeeId && e.active)
                            .map(e => (
                              <option key={e.id} value={e.id}>
                                {e.name} ({getSpecialtyLabel(e)} - {e.points || 0} نقطة)
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Pending Swap Requests Review Panel */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>⚖️ مراجعة واعتماد طلبات تبادل المناوبات ({pendingSwaps.length})</span>
              </h3>
              <button 
                onClick={() => setActiveTab("swaps")} 
                className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-605 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold"
              >
                شاشة التبادلات كاملة
              </button>
            </div>

            {pendingSwaps.length === 0 ? (
              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl text-center text-indigo-850 text-xs">
                لا توجد طلبات تبادل معلقة تحتاج لقرار إداري.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSwaps.slice(0, 3).map(req => {
                  const requester = employees.find(e => e.id === req.requesterId);
                  const proposed = employees.find(e => e.id === req.proposedEmployeeId);
                  return (
                    <div key={req.id} className="bg-slate-50/50 border border-slate-150 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-start gap-2 flex-wrap text-right">
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            طلب تبادل من: <span className="text-teal-600">{requester?.name}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            المناوبة المتبادلة: <strong className="text-slate-700">{req.shiftDate} ({getShiftTypeArabic(req.shiftType)})</strong>
                          </p>
                        </div>
                        {req.proposedEmployeeId && (
                          <div className="text-left">
                            <span className="bg-amber-100 text-amber-900 border border-amber-200 rounded-lg px-2 py-0.5 text-[9px] font-black">
                              موجه إلى: {proposed?.name || "أخصائي محدد"}
                            </span>
                          </div>
                        )}
                      </div>

                      {req.notes && (
                        <p className="p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 italic">
                          " {req.notes} "
                        </p>
                      )}

                      <div className="flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => handleRejectSwap(req.id)}
                          disabled={actionInProgress !== null}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          رفض التبادل
                        </button>
                        <button
                          onClick={() => handleApproveSwap(req.id)}
                          disabled={actionInProgress !== null}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>اعتماد وموافقة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pendingSwaps.length > 3 && (
                  <p className="text-[11px] text-slate-400 text-center font-bold">
                    وغيرها من الطلبات... انقر على "شاشة التبادلات" لاستكمال الباقية.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section C: Pending Leaves Review Panel */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
                <span>📬 البت في طلبات الإجازات المعلقة ({pendingLeaves.length})</span>
              </h3>
              <button 
                onClick={() => setActiveTab("vacations")} 
                className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-605 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold"
              >
                شاشة الإجازات كاملة
              </button>
            </div>

            {pendingLeaves.length === 0 ? (
              <div className="bg-teal-500/5 p-4 text-center rounded-xl text-teal-800 text-xs font-semibold">
                لا توجد طلبات إجازة معلقة حالياً بانتظار الموافقة.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.slice(0, 3).map(leave => {
                  const emp = employees.find(e => e.id === leave.employeeId);
                  return (
                    <div key={leave.id} className="bg-teal-50/20 border border-teal-100/60 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-start gap-2 flex-wrap text-right">
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            مقدم الطلب: <strong className="text-teal-950">{emp?.name || "الموظف"}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                            نوع الإجازة: {leave.leaveType === LeaveType.ANNUAL ? "سنوية (حدّ أقصى 50م)" : "عارضة وطارئة"}
                          </p>
                          <p className="text-[11px] text-teal-800 font-extrabold mt-1">
                            الفترة المهنية: {leave.startDate} ⟵ {leave.endDate} ({leave.totalDays} أيام)
                          </p>
                        </div>
                        <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full">
                          تنتظر التمحيص
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="p-2.5 bg-white border border-teal-100 rounded-lg text-[10px] text-slate-600 italic">
                          " {leave.reason} "
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRejectLeave(leave.id)}
                          disabled={actionInProgress !== null}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          رفض الإجازة
                        </button>
                        <button
                          onClick={() => handleApproveLeave(leave.id)}
                          disabled={actionInProgress !== null}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>قبول واعتماد الإجازة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* LEFT COLUMN (1col): Real-time Urgent Task Manager/Planner */}
        <div className="space-y-6">
          
          {/* Bento Block 1: Daily Objective Health & Tasks Tracker */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-sky-600" />
              <span>المهام الإدارية العاجلة لليوم</span>
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              يتم توليد الأهداف الثلاثة الأولى حيوياً وربطها بالجهوزية المباشرة للمصلحة.
            </p>

            <div className="space-y-3">
              {/* Dynamic Task 1: Absences Coverage */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`p-1 rounded-md text-white mt-0.5 ${autoAbsencesChecked ? "bg-emerald-500" : "bg-slate-350 bg-rose-150"}`}>
                  <Check className={`h-3 w-3 ${autoAbsencesChecked ? "opacity-100" : "opacity-30"}`} />
                </span>
                <div className="text-right flex-grow">
                  <p className={`text-xs font-extrabold ${autoAbsencesChecked ? "line-through text-slate-400" : "text-rose-950"}`}>
                    تأمين غيابات اليوم الحرجة
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {autoAbsencesChecked ? "✓ جميع شواغر غياب اليوم مغطاة بالكامل." : `🚨 يوجد ${todaysUncoveredAbsences.length} شاغر بحاجة حل.`}
                  </p>
                </div>
              </div>

              {/* Dynamic Task 2: Review pending swaps */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`p-1 rounded-md text-white mt-0.5 ${autoSwapsChecked ? "bg-emerald-500" : "bg-slate-350 bg-amber-150"}`}>
                  <Check className={`h-3 w-3 ${autoSwapsChecked ? "opacity-100" : "opacity-30"}`} />
                </span>
                <div className="text-right flex-grow">
                  <p className={`text-xs font-extrabold ${autoSwapsChecked ? "line-through text-slate-400" : "text-amber-950"}`}>
                    موافاة قرارات طلبات التبادل
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {autoSwapsChecked ? "✓ لا توجد طلبات تبادل قيد الانتظار." : `🔍 يوجد ${pendingSwaps.length} طلبات تبادل معلقة.`}
                  </p>
                </div>
              </div>

              {/* Dynamic Task 3: Handle Leaves */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`p-1 rounded-md text-white mt-0.5 ${autoLeavesChecked ? "bg-emerald-500" : "bg-slate-350 bg-teal-150"}`}>
                  <Check className={`h-3 w-3 ${autoLeavesChecked ? "opacity-100" : "opacity-30"}`} />
                </span>
                <div className="text-right flex-grow">
                  <p className={`text-xs font-extrabold ${autoLeavesChecked ? "line-through text-slate-400" : "text-teal-950"}`}>
                    البت في ملفات الإجازات المعلقة
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {autoLeavesChecked ? "✓ تمت تسوية إجازات الموظفين." : `📬 يوجد ${pendingLeaves.length} معاملة إجازة تنتظر لقرارك.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Interactive Tasks Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-black text-slate-800 block">📝 ملاحظات ومهام مخصصة للمدير:</span>
              
              <div className="space-y-2">
                {customTasks.map(task => (
                  <div key={task.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-medium">
                    <div 
                      onClick={() => handleToggleTask(task.id)}
                      className="flex items-center gap-2 cursor-pointer flex-grow text-right"
                    >
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => {}}
                        className="rounded text-teal-600 focus:ring-teal-500 scale-95" 
                      />
                      <span className={`text-xs leading-relaxed text-slate-700 ${task.completed ? "line-through text-slate-400" : ""}`}>
                        {task.text}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      title="شطب"
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Task Form */}
              <form onSubmit={handleAddCustomTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف مهمّة مصلحية أخرى لليوم..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-right"
                />
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] px-3.5 rounded-lg transition-transform hover:scale-[1.01]"
                >
                  إضافة
                </button>
              </form>
            </div>
          </div>

          {/* Bento Block 2: Quick Shift Stats & Room Occupations today */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3 text-right">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <span>حالة وإشغال غرف الأشعة لليوم</span>
            </h4>
            
            <p className="text-[10px] text-slate-400 leading-normal mb-3 font-semibold">
              توزيع مناوبات الموظفين على الغرف الطبية التخصصية اليوم ({TODAY_STR}).
            </p>

            <div className="space-y-2">
              {/* Rooms List */}
              {[
                { name: "MRI - الرنين المغناطيسي", code: "MRI", color: "bg-teal-500" },
                { name: "CT - الأشعة المقطعية", code: "CT", color: "bg-sky-500" },
                { name: "X-Ray - الأشعة العادية", code: "X-Ray", color: "bg-amber-500" },
                { name: "Ultrasound - السونار", code: "Ultrasound", color: "bg-pink-500" }
              ].map(room => {
                const roomShifts = todaysShifts.filter(s => s.room === room.code);
                return (
                  <div key={room.code} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-800">{room.name}</span>
                      <span className="font-sans text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-md font-extrabold text-slate-700">
                        {roomShifts.length} مناوبات
                      </span>
                    </div>
                    {roomShifts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 font-semibold text-[10px] text-slate-600">
                        {roomShifts.map(s => {
                          const eName = getEmployeeName(s.employeeId);
                          return (
                            <span key={s.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              {eName} ({s.type === ShiftType.MORNING ? "صباحاً" : s.type === ShiftType.EVENING ? "مساءً" : "ليلاً"})
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[9px] text-rose-500 font-bold">⚠️ غرفه شاغرة اليوم! لا يوجد مناوب معين.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
