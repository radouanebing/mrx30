import React, { useState } from "react";
import { Plus, Trash2, Edit, CalendarDays, RefreshCw, AlertTriangle, Info, Clock, Check, ShieldAlert, X, MessageCircle } from "lucide-react";
import { Employee, Shift, ShiftType, StaffSpecialty, UserRole, hasPermission, SystemSettings } from "../types.js";
import SmartSchedulingPanel from "./SmartSchedulingPanel";
import { findOverlappingShift } from "../lib/shiftValidation";

interface ScheduleGridProps {
  shifts: Shift[];
  employees: Employee[];
  currentUser: Employee | null;
  settings: SystemSettings | null;
  onAddShift: (shift: Omit<Shift, "id">) => void;
  onUpdateShift: (id: string, shift: Partial<Shift>) => void;
  onDeleteShift: (id: string) => void;
  onFileSwapRequest: (shiftId: string, notes: string, proposedEmpId: string) => void;
  onReportSuddenAbsence: (date: string, shiftType: ShiftType, reason: string) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  triggerToast: (text: string, type: "alert" | "info" | "success") => void;
  simulatedTime?: Date | null;
}

export default function ScheduleGrid({
  shifts,
  employees,
  currentUser,
  settings,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onFileSwapRequest,
  onReportSuddenAbsence,
  onUpdateEmployee,
  onUpdateSettings,
  triggerToast,
  simulatedTime
}: ScheduleGridProps) {
  const [selectedDate, setSelectedDate] = useState<string>("2026-06-01");
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<"ALL" | "SCANNER" | "IRM">("ALL");

  // Navigation days (All 30 days of June 2026 for a full monthly view)
  const targetDays = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    return `2026-06-${dayStr}`;
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<Shift | null>(null);

  // Add form states
  const [newEmpId, setNewEmpId] = useState("");
  const [newDate, setNewDate] = useState("2026-06-01");
  const [newType, setNewType] = useState<ShiftType>(ShiftType.MORNING);
  const [newRoom, setNewRoom] = useState("غرفة الرنين المغناطيسي (MRI)");
  const [newNote, setNewNote] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Validation / Overlap conflict state
  const [conflictDetail, setConflictDetail] = useState<{
    newShiftData: Omit<Shift, "id">;
    conflictingShift: Shift;
    employeeName: string;
  } | null>(null);

  // Swap form states
  const [swapNote, setSwapNote] = useState("");
  const [proposedEmpId, setProposedEmpId] = useState("");

  // Absence form states
  const [absenceReason, setAbsenceReason] = useState("");
  const [reportingAbsenceDate, setReportingAbsenceDate] = useState("");
  const [reportingAbsenceType, setReportingAbsenceType] = useState<ShiftType>(ShiftType.MORNING);
  const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);

  const isManager = currentUser?.role === UserRole.MANAGER;
  const canEditSchedule = hasPermission(currentUser, "edit_schedule");
  const canRequestSwap = hasPermission(currentUser, "request_swap");

  // Rooms available in radiology
  const ROOMS = [
    "غرفة الرنين المغناطيسي (MRI)",
    "غرفة الأشعة المقطعية (CT)",
    "غرفة الأشعة العادية (X-Ray)",
    "غرفة السونار (Ultrasound)",
    "قسم الطوارئ الصدري والقلبي"
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpId) return;
    const computedHours = newType === ShiftType.MORNING ? 6 : newType === ShiftType.EVENING ? 6 : 12;
    const shiftData = {
      employeeId: newEmpId,
      date: newDate,
      type: newType,
      room: newRoom,
      hoursWorked: computedHours,
      note: newNote,
      startTime: customStart || undefined,
      endTime: customEnd || undefined,
    };

    // Real-time overlapping shift validation
    const overlap = findOverlappingShift(shifts, newEmpId, newDate);
    if (overlap) {
      const empName = employees.find(emp => emp.id === newEmpId)?.name || "الكادر الطبي";
      setConflictDetail({
        newShiftData: shiftData,
        conflictingShift: overlap,
        employeeName: empName
      });
      return; // Stop and display the blocking confirmation modal
    }

    onAddShift(shiftData);
    // Reset
    setNewNote("");
    setCustomStart("");
    setCustomEnd("");
    setIsAddOpen(false);
  };

  const handleConfirmConflict = () => {
    if (!conflictDetail) return;
    onAddShift(conflictDetail.newShiftData);
    setConflictDetail(null);
    setNewNote("");
    setCustomStart("");
    setCustomEnd("");
    setIsAddOpen(false);
    triggerToast("تم تجاوز نظام منع التداخل وحفظ المناوبة بنجاح تلبية للحالة المصلحية.", "success");
  };

  const handleCancelConflict = () => {
    setConflictDetail(null);
    triggerToast("تم إلغاء الإضافة المتداخلة حفاظاً على توازن أوقات الكادر.", "info");
  };

  const startSwapRequest = (shift: Shift) => {
    setSelectedShiftForSwap(shift);
    // Find eligible colleague specializing in similar role or anyone
    const firstColleague = employees.find(e => e.id !== shift.employeeId);
    setProposedEmpId(firstColleague?.id || "");
    setSwapNote("");
    setIsSwapOpen(true);
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap) return;
    onFileSwapRequest(selectedShiftForSwap.id, swapNote, proposedEmpId);
    setIsSwapOpen(false);
    setSelectedShiftForSwap(null);
  };

  const handleAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportSuddenAbsence(reportingAbsenceDate, reportingAbsenceType, absenceReason);
    setAbsenceReason("");
    setIsAbsenceOpen(false);
  };

  const getShiftTypeArabic = (type: ShiftType) => {
    switch (type) {
      case ShiftType.MORNING:
        return "صباحية (08:00 - 14:00)";
      case ShiftType.EVENING:
        return "مسائية (14:00 - 20:00)";
      case ShiftType.NIGHT:
        return "ليلية (20:00 - 08:00)";
    }
  };

  const getSpecialtyLabel = (spec: StaffSpecialty) => {
    switch (spec) {
      case StaffSpecialty.RADIOLOGIST: return "طبيب أشعة";
      case StaffSpecialty.TECHNOLOGIST: return "تقني أشعة";
      case StaffSpecialty.NURSE: return "ممرض مصلحة";
      case StaffSpecialty.SECRETARY: return "سكرتير الإستقبال";
    }
  };

  // Filter shifts on selected date and team filter
  const filteredShifts = shifts.filter((sh) => {
    if (sh.date !== selectedDate) return false;
    if (selectedTeamFilter === "ALL") return true;
    
    // Find the employee assigned to this shift to check their team
    const emp = employees.find(e => e.id === sh.employeeId);
    if (!emp) return false;
    
    return emp.team === selectedTeamFilter;
  });
  const morningShifts = filteredShifts.filter(s => s.type === ShiftType.MORNING);
  const eveningShifts = filteredShifts.filter(s => s.type === ShiftType.EVENING);
  const nightShifts = filteredShifts.filter(s => s.type === ShiftType.NIGHT);

  return (
    <div className="space-y-6" id="schedule-tab-content">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal-600 animate-pulse" />
            <span>نظام تناوب مناوبات مصلحة الأشعة المتكاملة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === "daily" 
              ? "استكشف وادرس المناوبات الفورية الثلاث الموزعة على مدار الـ 24 ساعة لليوم المحدد."
              : "استعرض وانظر إلى الجدول الكامل لشهر يونيو 2026 بشكل كلي مع ترشيح الفحوصات والمناوبات."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector View Toggle Segmented Controls */}
          <div className="flex gap-1 bg-slate-200/75 p-1 rounded-xl border border-slate-250 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "daily"
                  ? "bg-slate-900 text-teal-300 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الجدول اليومي الدقيق
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                viewMode === "monthly"
                  ? "bg-slate-900 text-teal-300 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>الجدول الشهري الشامل</span>
              <span className="bg-amber-400 text-slate-950 font-sans text-[9px] px-1.5 py-0.5 rounded-full font-black">30 يوم</span>
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {canEditSchedule ? (
              <button
                onClick={() => {
                  setNewDate(selectedDate);
                  setIsAddOpen(true);
                }}
                id="add-shift-btn"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-150 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 text-slate-950" />
                <span>إضافة مناوبة جديدة</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setReportingAbsenceDate(selectedDate);
                  setIsAbsenceOpen(true);
                }}
                id="report-absence-direct-btn"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-450 hover:to-orange-450 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-150 w-full sm:w-auto"
              >
                <AlertTriangle className="h-4 w-4 text-white" />
                <span>الإبلاغ عن غياب طارئ اليوم</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Smart scheduling, modulo algorithm and credit marketplace */}
      {currentUser && (settings?.showSmartControlToEmployees !== false || currentUser.role === UserRole.MANAGER) && (
        <SmartSchedulingPanel
          employees={employees}
          shifts={shifts}
          currentUser={currentUser}
          settings={settings}
          onAddShift={onAddShift}
          onUpdateEmployee={onUpdateEmployee}
          onDeleteShift={onDeleteShift}
          onUpdateSettings={onUpdateSettings}
          triggerToast={triggerToast}
        />
      )}

      {/* Team Filter Segment Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
            <Info className="h-4 w-4" />
          </span>
          <div>
            <span className="text-xs font-black text-slate-800 block">تصفية الجدول بحسب الفريق المصلحي:</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ركز على جداول طواقم الأجهزة والتكليفات اليومية المخصصة.</span>
          </div>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedTeamFilter("ALL")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedTeamFilter === "ALL"
                ? "bg-slate-900 text-teal-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            كل الكوادر المصلحية
          </button>
          <button
            type="button"
            onClick={() => setSelectedTeamFilter("SCANNER")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
              selectedTeamFilter === "SCANNER"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-white shrink-0"></span>
            <span>فريق السكانير (Scanner)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTeamFilter("IRM")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
              selectedTeamFilter === "IRM"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-white shrink-0"></span>
            <span>فريق الرنين (IRM)</span>
          </button>
        </div>
      </div>

      {/* Conditionally render Daily View or Full Monthly calendar */}
      {viewMode === "daily" ? (
        <>
          {/* Date timeline selector */}
          <div className="flex space-x-2 space-x-reverse overflow-x-auto py-2" id="date-timeline-selector">
            {targetDays.map((date) => {
              const isActive = date === selectedDate;
              const [, month, day] = date.split("-");
              
              // Count shifts on this day
              const dayShifts = shifts.filter(s => s.date === date);
              const dayShiftsCount = dayShifts.length;
              
              // Detect if any employee is double-scheduled (has conflict) on this day
              const assignedEmpIds = dayShifts.map(s => s.employeeId);
              const hasConflictOnDay = assignedEmpIds.some((empId, idx) => assignedEmpIds.indexOf(empId) !== idx);
              
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer min-w-24 relative ${
                    isActive
                      ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/10 scale-105"
                      : hasConflictOnDay
                        ? "bg-rose-50 border-rose-200 hover:border-rose-300 text-slate-700"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  {hasConflictOnDay && (
                    <span className="absolute -top-1 -left-1 bg-rose-500 text-white p-1 rounded-full shadow-sm animate-bounce" title="يوجد تعارض أو تداخل مناوبات في هذا اليوم!">
                      <ShieldAlert className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-xs opacity-75">يونيو 2026</span>
                  <span className="text-2xl font-black my-1 font-sans">{day}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : "bg-teal-500"}`} />
                    <span className="text-[10px] font-bold">
                      {dayShiftsCount} {dayShiftsCount === 1 ? "مناوبة" : "مناوبات"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Daily Shift Grid Layout (3 Columns for Morning, Evening, Night) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="daily-shifts-grid">
            
            {/* Morning Column */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-col h-full">
              <div className="flex justify-between items-center pb-3 border-b border-amber-100 mb-4 bg-amber-50/50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">المناوبة الصباحية</h3>
                    <span className="text-[11px] text-amber-805 text-amber-800">08:00 صباحاً - 02:00 مساءً</span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {morningShifts.length} موظفين
                </span>
              </div>

              {/* Weekend highlight notice for Friday / Saturday optional choice */}
              {(() => {
                const d = new Date(selectedDate);
                const day = d.getUTCDay(); // 5 is Friday, 6 is Saturday
                if (day === 5 || day === 6) {
                  return (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed font-bold shadow-xs">
                      ⚠️ عطلة نهاية الأسبوع (الجمعة/السبت): المناوبة الصباحية اليوم طوعية ومتاحة بالاختيار لجميع الموظفين المصنفين في الفترة الصباحية لتنسيق تشغيل اختياري مريح.
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-4 flex-grow">
                {morningShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Info className="h-8 w-8 mb-2 stroke-1" />
                    <span className="text-xs">لم يتم جدولة موظفين بعد</span>
                  </div>
                ) : (
                  morningShifts.map((shift) => renderShiftCard(shift))
                )}
              </div>
            </div>

            {/* Evening Column */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-col h-full">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-100 mb-4 bg-indigo-50/50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">المناوبة المسائية</h3>
                    <span className="text-[11px] text-indigo-805 text-indigo-800">02:00 مساءً - 08:00 مساءً</span>
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {eveningShifts.length} موظفين
                </span>
              </div>

              <div className="space-y-4 flex-grow">
                {eveningShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Info className="h-8 w-8 mb-2 stroke-1" />
                    <span className="text-xs">لم يتم جدولة موظفين بعد</span>
                  </div>
                ) : (
                  eveningShifts.map((shift) => renderShiftCard(shift))
                )}
              </div>
            </div>

            {/* Night Column */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-col h-full">
              <div className="flex justify-between items-center pb-3 border-b border-purple-100 mb-4 bg-purple-50/50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">المناوبة الليلية</h3>
                    <span className="text-[11px] text-purple-805 text-purple-800">08:00 مساءً - 08:00 صباحاً</span>
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-900 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {nightShifts.length} موظفين
                </span>
              </div>

              <div className="space-y-4 flex-grow">
                {nightShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Info className="h-8 w-8 mb-2 stroke-1" />
                    <span className="text-xs">لم يتم جدولة موظفين بعد</span>
                  </div>
                ) : (
                  nightShifts.map((shift) => renderShiftCard(shift))
                )}
              </div>
            </div>

          </div>
        </>
      ) : (
        /* Render Full Monthly Calendar View for June 2026 */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs" id="monthly-scheduler-calendar-container">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">جدول المناوبات الشهري الشامل</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">يونيو 2026 (شهر كامل منسق مسبقاً)</p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block"></span> صباحي (6س)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500 inline-block"></span> مسائي (6س)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-600 inline-block"></span> ليلي (12س)</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center" id="monthly-calendar-grid">
            {/* Weekdays names heading */}
            {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map(dayName => (
              <div key={dayName} className="font-extrabold text-[10px] text-slate-500 py-2 bg-slate-50 rounded-lg">
                {dayName}
              </div>
            ))}

            {/* June 1, 2026 is Monday. Monday is column 1 (if Sunday is 0). So we render 1 blank cell */}
            {Array.from({ length: 1 }).map((_, idx) => (
              <div key={`blank-${idx}`} className="bg-slate-50/20 rounded-xl min-h-[90px] border border-dashed border-slate-100"></div>
            ))}

            {/* Render 30 day cells representing June 1 to June 30 */}
            {Array.from({ length: 30 }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const cellDate = `2026-06-${dayStr}`;
              const isSelected = cellDate === selectedDate;
              
              // Filter shifts on this specific day
              const dayShifts = shifts.filter(s => {
                if (s.date !== cellDate) return false;
                if (selectedTeamFilter === "ALL") return true;
                const emp = employees.find(e => e.id === s.employeeId);
                return emp?.team === selectedTeamFilter;
              });
              const assignedEmpIds = dayShifts.map(s => s.employeeId);
              const hasConflict = assignedEmpIds.some((empId, i) => assignedEmpIds.indexOf(empId) !== i);

              return (
                <div
                  key={cellDate}
                  onClick={() => {
                    setSelectedDate(cellDate);
                    setViewMode("daily");
                    triggerToast(`تم الانتقال لليوم ${dayNum} يونيو بالتفصيل المصلحي`, "success");
                  }}
                  className={`rounded-xl border p-2 min-h-[96px] text-right flex flex-col justify-between cursor-pointer transition-all hover:border-teal-500 hover:shadow-xs group ${
                    isSelected
                      ? "bg-teal-50/40 border-teal-500 ring-1 ring-teal-500/20"
                      : hasConflict
                        ? "bg-rose-50/30 border-rose-250"
                        : "bg-white border-slate-180 border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-mono text-xs font-black p-1 rounded-md leading-none ${
                      isSelected 
                        ? "bg-teal-600 text-white" 
                        : "text-slate-700 bg-slate-105 bg-slate-100 group-hover:bg-slate-200"
                    }`}>
                      {dayNum}
                    </span>
                    {hasConflict && (
                      <span className="bg-rose-500 text-white p-0.5 rounded-full inline-block" title="تداخل مناوبات طبي في هذا اليوم!">
                        <ShieldAlert className="h-3 w-3 animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* Shifts Pills List */}
                  <div className="space-y-1 mt-2">
                    {dayShifts.slice(0, 3).map((sh) => {
                      const emp = employees.find(e => e.id === sh.employeeId);
                      const compactName = emp ? emp.name.split(" ")[0] : "موظف";
                      return (
                        <div
                          key={sh.id}
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                            sh.type === ShiftType.MORNING ? "bg-amber-50 text-amber-900 border-amber-200" :
                            sh.type === ShiftType.EVENING ? "bg-indigo-50 text-indigo-900 border-indigo-200" :
                            "bg-purple-50 text-purple-900 border-purple-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            sh.type === ShiftType.MORNING ? "bg-amber-400" :
                            sh.type === ShiftType.EVENING ? "bg-indigo-505 bg-indigo-500" :
                            "bg-purple-600"
                          }`}></span>
                          <span className="truncate">{compactName}</span>
                        </div>
                      );
                    })}
                    {dayShifts.length > 3 && (
                      <div className="text-[8px] font-black text-slate-400 text-center">
                        + {dayShifts.length - 3} مناوبات أخرى
                      </div>
                    )}
                    {dayShifts.length === 0 && (
                      <div className="text-[9px] text-slate-300 py-1.5 font-medium pr-1 select-none">شاغر</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-teal-600" />
              <span>انقر فوق أي مربع لتحديد اليوم وتعديل المناوبة وإضافة وحذف الكوادر الطبية مباشرة.</span>
            </span>
            <span>المجموع العام المجدول: <strong>{shifts.length} مناوبات</strong></span>
          </div>
        </div>
      )}

      {/* --- ADD SHIFT MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="add-shift-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right">
            <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">جدولة مناوبة جديدة لليوم {selectedDate}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المكلف بالمناوبة</label>
                <select
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.filter(e => e.active).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({getSpecialtyLabel(e.specialty)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">فترة المناوبة</label>
                  <select
                    required
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ShiftType)}
                  >
                    <option value={ShiftType.MORNING}>صباحية</option>
                    <option value={ShiftType.EVENING}>مسائية</option>
                    <option value={ShiftType.NIGHT}>ليلية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ اليوم</label>
                  <input
                    type="date"
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المعدات / محطة العمل</label>
                <select
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                >
                  {ROOMS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Special director / custom employee timing notification */}
              {(() => {
                const selectedEmp = employees.find(e => e.id === newEmpId);
                if (!selectedEmp) return null;
                const isDirector = selectedEmp.role === UserRole.MANAGER;
                if (isDirector || selectedEmp.customStartTime || selectedEmp.customEndTime) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-right space-y-1">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <span>👑 كادر مخصص / مدير الكيان:</span>
                        <span className="bg-amber-100 text-amber-950 text-[10px] px-1.5 py-0.5 rounded font-black font-sans">{selectedEmp.name}</span>
                      </p>
                      <p className="text-[10px] text-amber-800">
                        ساعات العمل المخصصة المسجلة للموظف: <strong>{selectedEmp.customStartTime || "08:00"} {selectedEmp.customEndTime ? `- ${selectedEmp.customEndTime}` : ""}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStart(selectedEmp.customStartTime || "08:00");
                          setCustomEnd(selectedEmp.customEndTime || "20:00");
                          triggerToast("تم تطبيق ساعات عمل المدير/الكادر التلقائية بنجاح.", "success");
                        }}
                        className="text-[9.5px] font-black text-amber-950 bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded border border-amber-300 cursor-pointer text-center w-full"
                      >
                        تطبيق ساعات عمل الكادر الخاصة على بروفايل المناوبة ⚡
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وقت البدء والانتهاء المخصص للمناوبة (اختياري)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">وقت الدخول</span>
                    <input
                      type="text"
                      placeholder="مثال: 08:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-teal-500"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-405 text-slate-400 block mb-0.5">وقت الانصراف</span>
                    <input
                      type="text"
                      placeholder="مثال: 20:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-teal-500"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStart("08:00");
                      setCustomEnd("20:00");
                      triggerToast("تم تعيين أوقات المناوبة من 8 صباحاً إلى 8 مساءً بنجاح.", "info");
                    }}
                    className="flex-1 text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-1.5 rounded-lg cursor-pointer"
                  >
                    ⚡ تعيين من 8 صباحاً إلى 8 مساءً (12س)
                  </button>
                  {(customStart || customEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStart("");
                        setCustomEnd("");
                        triggerToast("تمت العودة للأوقات الافتراضية للمناوبة.", "info");
                      }}
                      className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                    >
                      إعادة تعيين
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات ومهام مخصصة (اختياري)</label>
                <textarea
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  placeholder="مثال: فحص الحالات المستعجلة القادمة من الطوارئ فقط..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>

              {/* Pre-emptive Real-Time overlap warning prior to clicking Add */}
              {(() => {
                const currentOverlap = newEmpId ? findOverlappingShift(shifts, newEmpId, newDate) : null;
                if (currentOverlap) {
                  return (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-right animate-pulse flex items-start gap-2.5">
                      <ShieldAlert className="h-4.5 w-4.5 text-rose-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-black text-rose-900 leading-none">
                          تنبيه تداخل مناوبة: الموظف المكلف مشغول بالفعل!
                        </p>
                        <p className="text-[10.5px] text-rose-700 leading-relaxed">
                          هذا الكادر الطبي مجدول مسبقاً في مناوبة <strong>{getShiftTypeArabic(currentOverlap.type)}</strong> بمحطة {currentOverlap.room} في نفس اليوم ({newDate}).
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  تأكيد وحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OVERLAPPING SHIFT CONFLICT MODAL (BLOCKING WARNING) --- */}
      {conflictDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4" id="shift-conflict-blocking-modal">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-rose-100 overflow-hidden text-right leading-relaxed animate-fade-in">
            {/* Warning Header */}
            <div className="bg-gradient-to-r from-rose-600 to-amber-500 p-5 text-white flex items-center gap-3">
              <span className="p-2 bg-white/20 rounded-xl">
                <ShieldAlert className="h-6 w-6 text-white animate-pulse" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">تحذير حرج: تداخل في مناوبات الكادر!</h3>
                <p className="text-[11px] text-rose-100 mt-0.5">يوجد تعارض في التكليفات المسجلة بنفس اليوم</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Alert Body */}
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-2">
                <p className="text-xs text-rose-900 font-medium">
                  لقد حاولت جدولة مناوبة جديدة للموظف(ة): <strong className="text-red-700 font-black">د./أ. {conflictDetail.employeeName}</strong> في تاريخ {conflictDetail.newShiftData.date}.
                </p>
                <p className="text-xs text-slate-650 text-slate-600">
                  نظام كشف التداخل التلقائي اكتشف أن هذا الموظف <strong>مجدول بالفعل</strong> في مناوبة أخرى داخل نفس اليوم:
                </p>
              </div>

              {/* Conflict details comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right">
                {/* Existing Shift Profile */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative">
                  <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">المناوبة الحالية</span>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5">المناوبة المسجلة مسبقاً</h4>
                  <div className="text-[11px] text-slate-550 text-slate-500 space-y-1">
                    <p>• <strong>النوع:</strong> {getShiftTypeArabic(conflictDetail.conflictingShift.type)}</p>
                    <p>• <strong>المحطة:</strong> {conflictDetail.conflictingShift.room}</p>
                    <p>• <strong>الملاحظات:</strong> {conflictDetail.conflictingShift.note || "لا توجد ملاحظات"}</p>
                  </div>
                </div>

                {/* Proposed Overlapping Shift Profile */}
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl relative">
                  <span className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">المناوبة المقترحة</span>
                  <h4 className="text-xs font-bold text-rose-800 mb-1.5">المناوبة المتداخلة الجديدة</h4>
                  <div className="text-[11px] text-rose-700 space-y-1">
                    <p>• <strong>النوع:</strong> {getShiftTypeArabic(conflictDetail.newShiftData.type)}</p>
                    <p>• <strong>المحطة:</strong> {conflictDetail.newShiftData.room}</p>
                    <p>• <strong>الملاحظات:</strong> {conflictDetail.newShiftData.note || "لا توجد ملاحظات"}</p>
                  </div>
                </div>
              </div>

              {/* Quality & Safety warning text */}
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                ⚠️ <strong>توصية نظام القوى والعدالة:</strong> العمل في مناوبات متداخلة أو مزدوجة في نفس اليوم يعرض الطبيب أو تقني الأشعة للإرهاق التراكمي الشديد، مما يقلل من دقة الفحوصات والتقارير الطبية. يُفضّل إلغاء هذه الإضافة وتعيين زميل آخر بنظام التناوب الدوري المعادل.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCancelConflict}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/10 flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>إلغاء الإضافة لحماية الموظف</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConflict}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-850 hover:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>تأكيد الحفظ برغم التداخل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBMIT SWAP MODAL --- */}
      {isSwapOpen && selectedShiftForSwap && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="swap-req-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right">
            <div className="bg-teal-700 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تقديم طلب تبادل لمناوبة {getShiftTypeArabic(selectedShiftForSwap.type)}</h3>
              <button onClick={() => setIsSwapOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSwapSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-teal-50 rounded-lg text-xs leading-relaxed text-teal-900 border border-teal-100 font-sans">
                <strong>المناوبة الأساسية:</strong> {selectedShiftForSwap.date} - {selectedShiftForSwap.room} <br/>
                <strong>الموظف المجدول حالياً:</strong> {employees.find(e => e.id === selectedShiftForSwap.employeeId)?.name}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الزميل المقترح للتبديل معه</label>
                <select
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={proposedEmpId}
                  onChange={(e) => setProposedEmpId(e.target.value)}
                >
                  <option value="">-- اختر الزميل المقترح --</option>
                  {employees
                    .filter(e => e.id !== selectedShiftForSwap.employeeId && e.id !== currentUser?.id)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({getSpecialtyLabel(e.specialty)})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">سيتم تدوير وحفظ الجدول تلقائياً بمجرد موافقة الطرف الآخر أو مدير المصلحة.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب طلب التبديل والكلما الملاحظة</label>
                <textarea
                  required
                  placeholder="الرجاء ذكر الظرف لتسهيل التنسيق السريع مع الزملاء..."
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  value={swapNote}
                  onChange={(e) => setSwapNote(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwapOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  إرسال الطلب فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REPORT ABSENCE MODAL --- */}
      {isAbsenceOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="absence-form-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right">
            <div className="bg-rose-700 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">الإبلاغ عن غياب طارئ ومفاجئ</h3>
              <button onClick={() => setIsAbsenceOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleAbsenceSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 rounded-lg text-xs leading-relaxed text-rose-900 border border-rose-100 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>تنبيه هام ومستعجل:</strong> هذا النموذج مخصص للتبليغ عن الحالات المرضية أو القهرية المفاجئة التي تستدعي تغطية فورية لضمان استمرار إنقاذ الحالات في غرف الإشعات.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المناوبة المراد الإبلاغ عن الغياب فيها</label>
                <select
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={reportingAbsenceType}
                  onChange={(e) => setReportingAbsenceType(e.target.value as ShiftType)}
                >
                  <option value={ShiftType.MORNING}>المناوبة الصباحية (08:00 - 14:00)</option>
                  <option value={ShiftType.EVENING}>المناوبة المسائية (14:00 - 20:00)</option>
                  <option value={ShiftType.NIGHT}>المناوبة الليلية (20:00 - 08:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ اليوم</label>
                <input
                  type="date"
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  value={reportingAbsenceDate}
                  onChange={(e) => setReportingAbsenceDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السبب أو العذر القهري</label>
                <textarea
                  required
                  placeholder="اذكر الوعكة الصحية أو العذر الطارئ لإرساله لمدير المصلحة..."
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAbsenceOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  الإبلاغ الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Helper inside Render Shift Card
  function renderShiftCard(shift: Shift) {
    const employee = employees.find((e) => e.id === shift.employeeId);
    const isCurrentUserShift = currentUser?.id === shift.employeeId;
    const isConflicted = shifts.some(s => s.employeeId === shift.employeeId && s.date === shift.date && s.id !== shift.id);

    // Calculate remaining time
    let remainingText = "غير متوفر";
    try {
      const refTime = simulatedTime || new Date();
      const [year, month, day] = shift.date.split("-").map(Number);
      let hour = 8;
      let minute = 0;
      
      if (shift.startTime && shift.startTime.includes(":")) {
        const cleanStart = shift.startTime.split(" ")[0];
        const parts = cleanStart.split(":");
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h)) hour = h;
        if (!isNaN(m)) minute = m;
      } else {
        if (shift.type === "EVENING") hour = 14;
        else if (shift.type === "NIGHT") hour = 20;
      }

      const shiftStartTime = new Date(year, month - 1, day, hour, minute, 0, 0);
      const diffMs = shiftStartTime.getTime() - refTime.getTime();

      if (diffMs < 0) {
        const diffAbsMin = Math.abs(Math.floor(diffMs / 60000));
        if (diffAbsMin < 480) {
          const h = Math.floor(diffAbsMin / 60);
          const m = diffAbsMin % 60;
          remainingText = `بدأت منذ ${h > 0 ? `${h}س و ` : ""}${m}د`;
        } else {
          remainingText = "منتهية";
        }
      } else {
        const diffMins = Math.floor(diffMs / 60000);
        const days = Math.floor(diffMins / (24 * 60));
        const hours = Math.floor((diffMins % (24 * 60)) / 60);
        const mins = diffMins % 60;

        let partsStr = [];
        if (days > 0) partsStr.push(`${days} يوم`);
        if (hours > 0) partsStr.push(`${hours} ساعة`);
        if (mins > 0 || partsStr.length === 0) partsStr.push(`${mins} دقيقة`);
        remainingText = partsStr.join(" و ");
      }
    } catch (e) {
      console.error(e);
    }

    const handleSendWhatsApp = async () => {
      if (!employee?.phone) {
        triggerToast("لا يوجد رقم هاتف مسجل لهذا الموظف لتذكيره.", "alert");
        return;
      }

      // Pre-format message variables
      const shiftDate = shift.date;
      let shiftTypeLabel = "صباحية";
      if (shift.type === "EVENING") shiftTypeLabel = "مسائية";
      else if (shift.type === "NIGHT") shiftTypeLabel = "ليلية";

      const shiftTime = shift.startTime || (shift.type === "MORNING" ? "08:00 صباحاً" : shift.type === "EVENING" ? "02:00 مساءً" : "08:00 مساءً");
      
      const defaultMessage = `السلام عليكم ورحمة الله وبركاته يا ${employee.name}، تذكير بمناوبتك المقررة في مصلحة الأشعة:\n- اليوم والتاريخ: ${shiftDate}\n- الفترة: ${shiftTypeLabel}\n- القسم/الغرفة: ${shift.room}\n- الأوقات المقررة: ${shiftTime}\n- الوقت المتبقي للبدء: ${remainingText}\nنتمنى لكم التوفيق في مناوبتكم المتميزة!`;

      // Read template from settings if customized
      let customTemplate = settings?.whatsappCustomMessageTemplate || "";
      let message = defaultMessage;

      if (customTemplate) {
        message = customTemplate
          .replace(/{name}/g, employee.name || "")
          .replace(/{date}/g, shiftDate || "")
          .replace(/{type}/g, shiftTypeLabel)
          .replace(/{room}/g, shift.room || "")
          .replace(/{time}/g, shiftTime)
          .replace(/{remaining}/g, remainingText);
      }

      try {
        triggerToast("جاري إعداد تذكير WhatsApp المعتمد...", "info");
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: employee.id,
            employeeName: employee.name,
            phone: employee.phone,
            message: message
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "فشل الاتصال بخادم إرسال WhatsApp.");
        }

        const data = await res.json();
        if (data.success) {
          if (data.mode === "API_GATEWAY") {
            triggerToast("🚀 " + data.message, "success");
          } else if (data.mode === "SIMULATED_LINK" && data.redirectUrl) {
            triggerToast("✅ تم تفعيل قالب التذكير بنجاح! سيتم فتح WhatsApp اليدوي للعميل.", "success");
            window.open(data.redirectUrl, "_blank");
          }
        } else {
          triggerToast(data.error || "تعذر إرسال التنبيه الفوري.", "alert");
        }
      } catch (err: any) {
        triggerToast(err.message || "فشلت عملية معالجة إرسال WhatsApp.", "alert");
      }
    };

    return (
      <div 
        key={shift.id} 
        className={`p-4 rounded-xl border relative transition-all duration-200 shadow-xs hover:shadow-md ${
          isConflicted
            ? "bg-rose-50/70 border-rose-300 hover:border-rose-450 ring-1 ring-rose-300/30"
            : isCurrentUserShift 
              ? "bg-teal-50/55 border-teal-200 ring-1 ring-teal-300/30" 
              : "bg-slate-50/40 border-slate-200/80"
        }`}
      >
        {/* Top bar with Speciality Label */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span className={`h-2 w-2 rounded-full ${employee?.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-[10px] font-black text-slate-400 font-sans tracking-wider">
              {employee ? getSpecialtyLabel(employee.specialty) : "غير معروف"}
            </span>
          </div>

          {/* Conflicted Badge */}
          {isConflicted && (
            <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse" title="هذا الموظف لديه مهمتان أو مناوبتان متداخلتان في نفس اليوم!">
              <ShieldAlert className="h-3 w-3" />
              تداخل تكراري!
            </span>
          )}

          {/* Manager Operations */}
          {canEditSchedule && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onDeleteShift(shift.id)}
                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="حذف المناوبة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* User Specific Tag */}
          {isCurrentUserShift && !isConflicted && (
            <span className="bg-teal-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Check className="h-2 w-2" />
              مناوبة مخصصة لك
            </span>
          )}
        </div>

        {/* Employee Name */}
        <div className="flex justify-between items-center mt-1">
          <h4 className="font-bold text-slate-900 text-sm">{employee?.name || "غير محدد"}</h4>
          {employee?.team && employee?.team !== "GENERAL" && (
            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md ${
              employee.team === "SCANNER" 
                ? "bg-sky-50 text-sky-700 border border-sky-150" 
                : "bg-indigo-50 text-indigo-700 border border-indigo-150"
            }`}>
              {employee.team === "SCANNER" ? "Scanner 🖥️" : "IRM 🧲"}
            </span>
          )}
        </div>
        
        {/* Room / Equipment Detail */}
        <div className="mt-2 text-xs text-slate-600 font-medium bg-white/70 px-2 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="text-teal-700 truncate">{shift.room}</span>
          <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-sans">
            {shift.startTime || shift.endTime ? (
              <span className="text-amber-700 bg-amber-50 px-1 rounded border border-amber-100 font-bold">
                {shift.startTime || "08:00"}-{shift.endTime || "20:00"}
              </span>
            ) : (
              <span>{shift.hoursWorked}س</span>
            )}
          </span>
        </div>

        {/* Short Note */}
        {shift.note && (
          <p className="mt-1.5 text-[11px] text-slate-500 bg-slate-100/60 p-1.5 rounded-md leading-relaxed">
            {shift.note}
          </p>
        )}

        {/* Submitting Swap Requests Actions for employees */}
        {!canEditSchedule && (
          <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-2.5">
            {isCurrentUserShift && canRequestSwap ? (
              <button
                onClick={() => startSwapRequest(shift)}
                className="w-full flex items-center justify-center gap-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-800 text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
                <span>طلب تبادل هذه المناوبة</span>
              </button>
            ) : isCurrentUserShift && !canRequestSwap ? (
              <p className="text-[9px] text-rose-500 font-bold text-center w-full bg-rose-50 p-1.5 rounded-lg border border-rose-100">تم حظر صلاحية طلب تبادل المناوبة لديك</p>
            ) : (
              <p className="text-[9px] text-slate-400 font-medium italic text-center w-full">لا يمكنك التعديل على مناوبة زملائك</p>
            )}
          </div>
        )}

        {/* WhatsApp Reminder Direct Action (Available for Manager) */}
        {currentUser?.role === UserRole.MANAGER && (
          <div className="mt-3 pt-2 px-1 border-t border-dashed border-slate-200" id="whatsapp-sender-row">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-medium font-sans">الوقت المتبقي للبدء:</span>
                <span className="font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-150 font-sans tracking-wide">
                  {remainingText}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="text-[9.5px] text-slate-400 font-sans truncate" title={employee?.phone || ""}>
                  رقم: <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-black">{employee?.phone || "غير مسجل"}</span>
                </div>
                {employee?.phone ? (
                  <button
                    onClick={handleSendWhatsApp}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black px-2.5 py-1 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] duration-150"
                    title="أرسل تذكير WhatsApp بجميع تفاصيل المناوبة والوقت المتبقي"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>تذكير واتساب 💬</span>
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400 italic">الجوال غير مسجل</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
