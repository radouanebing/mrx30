import React, { useState } from "react";
import { AlertOctagon, UserCheck, ShieldAlert, Clock, Plus, Heart, HelpCircle, Activity } from "lucide-react";
import { Employee, SuddenAbsence, ShiftType, UserRole } from "../types.js";

interface AbsenceAlertsProps {
  absences: SuddenAbsence[];
  employees: Employee[];
  currentUser: Employee | null;
  onCoverAbsence: (absenceId: string, coverEmployeeId: string) => void;
  onReportSuddenAbsence: (date: string, shiftType: ShiftType, reason: string) => void;
}

export default function AbsenceAlerts({
  absences,
  employees,
  currentUser,
  onCoverAbsence,
  onReportSuddenAbsence,
}: AbsenceAlertsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [date, setDate] = useState("2026-06-01");
  const [shiftType, setShiftType] = useState<ShiftType>(ShiftType.MORNING);
  const [reason, setReason] = useState("");

  const isManager = currentUser?.role === UserRole.MANAGER;

  // Filter uncovered absences
  const uncoveredAbsences = absences.filter(a => !a.covered);
  const coveredAbsences = absences.filter(a => a.covered);

  const getShiftTypeArabic = (type: ShiftType) => {
    switch (type) {
      case ShiftType.MORNING: return "المناوبة الصباحية (08:00 - 14:00)";
      case ShiftType.EVENING: return "المناوبة المسائية (14:00 - 20:00)";
      case ShiftType.NIGHT: return "المناوبة الليلية (20:00 - 08:00)";
    }
  };

  const getSpecialtyLabel = (emp: Employee) => {
    switch (emp.specialty) {
      case "RADIOLOGIST": return "طبيب أشعة";
      case "TECHNOLOGIST": return "تقني أشعة";
      case "NURSE": return "ممرض مصلحة";
      case "SECRETARY": return "سكرتير الإستقبال";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportSuddenAbsence(date, shiftType, reason);
    setReason("");
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6" id="absences-tab-content">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-rose-800/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-500/20 rounded-xl text-rose-300">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </span>
            <h2 className="text-xl font-bold">إدارة حالات الغياب الطارئة والتغطية السريعة</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            نظام استجابة متكامل لضمان استمرارية تشغيل أجهزة الرنين والمستعجلات دون توقف. يمكن للموظفين طرح الغياب المرضي المفاجئ، ويتيح للزملاء التطوع للتغطية لرد المناوبة لاحقاً.
          </p>
        </div>
        
        {!isManager && (
          <button
            onClick={() => setIsFormOpen(true)}
            id="report-absence-form-btn"
            className="flex-shrink-0 flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل غياب طارئ لي</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Uncovered List (Critical) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            ثغرات الغياب الحرجة وبحاجة لتغطية فورية ({uncoveredAbsences.length})
          </h3>
          
          <div className="space-y-4">
            {uncoveredAbsences.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl text-center text-emerald-800 space-y-2 flex flex-col items-center">
                <Heart className="h-10 w-10 text-emerald-500 fill-emerald-500/10" />
                <h4 className="font-bold text-sm">كل المناوبات مغطاة بالكامل حالياً</h4>
                <p className="text-xs text-emerald-600">جدول العمل العام ممتاز ولا توجد أي حالات عجز أو فراغات مناوبة طارئة.</p>
              </div>
            ) : (
              uncoveredAbsences.map((ab) => {
                const sickEmp = employees.find(e => e.id === ab.employeeId);
                const isSickPersonCurrentUser = currentUser?.id === ab.employeeId;
                
                return (
                  <div key={ab.id} className="bg-white border-2 border-rose-200 hover:border-rose-300 p-5 rounded-2xl shadow-sm space-y-4 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                          <AlertOctagon className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">إشعار غياب طارئ</h4>
                          <p className="text-xs text-rose-700 font-bold mt-0.5 font-sans">تاريخ الغياب: {ab.date}</p>
                        </div>
                      </div>
                      <span className="bg-rose-100 text-rose-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-200">
                        مطلوب متطوع فوراً
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block">الموظف الغائب:</span>
                        <span className="font-bold text-slate-800">{sickEmp?.name}</span> ({sickEmp ? getSpecialtyLabel(sickEmp) : ""})
                      </div>
                      <div>
                        <span className="text-slate-500 block">الفترة المطلوبة:</span>
                        <span className="font-bold text-slate-800">{getShiftTypeArabic(ab.shiftType)}</span>
                      </div>
                      <div className="md:col-span-2 mt-1">
                        <span className="text-slate-500 block">السبب والظرف الصحي:</span>
                        <span className="font-medium text-slate-700 italic">" {ab.reason} "</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-slate-400 font-sans">
                        تم الإبلاغ في: {new Date(ab.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      
                      {isSickPersonCurrentUser ? (
                        <span className="text-[11px] text-rose-600 font-bold italic bg-rose-50 px-2 py-1 rounded border border-rose-150">
                          بانتظار تأكيد زميل أو مدير بالتغطية
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          {isManager ? (
                            <select
                              id={`select-cover-${ab.id}`}
                              className="text-xs border border-teal-200 rounded px-2 py-1 bg-white focus:outline-teal-500"
                              onChange={(e) => {
                                if (e.target.value) {
                                  onCoverAbsence(ab.id, e.target.value);
                                }
                              }}
                              value=""
                            >
                              <option value="">-- كلف موظفاً للتغطية --</option>
                              {employees
                                .filter(e => e.id !== ab.employeeId && e.active)
                                .map(e => (
                                  <option key={e.id} value={e.id}>
                                    {e.name} ({getSpecialtyLabel(e)})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => {
                                if (currentUser) {
                                  onCoverAbsence(ab.id, currentUser.id);
                                }
                              }}
                              id={`volunteer-cover-btn-${ab.id}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Heart className="h-3.5 w-3.5 fill-white" />
                              <span>تطوع للتغطية بالإنقاذ</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Covered (History) */}
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pt-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            الغيابات التي تم احتواؤها وتغطيتها ({coveredAbsences.length})
          </h3>
          
          <div className="space-y-3">
            {coveredAbsences.map((ab) => {
              const sickEmp = employees.find(e => e.id === ab.employeeId);
              const coverEmp = employees.find(e => e.id === ab.coverEmployeeId);
              
              return (
                <div key={ab.id} className="bg-slate-50 border border-slate-250 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center text-xs gap-4 opacity-80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
                        <UserCheck className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-bold text-slate-900">{sickEmp?.name}</span>
                      <span className="text-slate-400">← غطاه الزميل المخلص:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">{coverEmp?.name}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-sans">
                      التاريخ: {ab.date} / المناوبة: {ab.shiftType === "MORNING" ? "صباحية" : ab.shiftType === "EVENING" ? "مسائية" : "ليلية"}
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded">
                    تمت التغطية بنجاح
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Sidebar Help */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-1 text-teal-300">
              <Activity className="h-4 w-4" />
              ميثاق الالتزام والاستجابة
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              تلتزم إدارة مصلحة الأشعة بتوفير مكافأة مالية وحوافز تقييمية بنسبة 1.5× لكل أخصائي أشعة أو ممرض يتطوع فورياً لتغطية غياب زميله بدون إشعار مسبق لضمان سلامة المرضى تحت الحالات العاجلة.
            </p>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>تأثير التغطية على ساعات العمل:</span>
                <span className="text-emerald-400">+8 ساعات معتمده</span>
              </div>
              <div className="flex justify-between">
                <span>تأثير التغطية على تقييم الأداء:</span>
                <span className="text-emerald-400">+التميز ومكافأة تعاون</span>
              </div>
            </div>
          </div>
          
          <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 text-xs leading-relaxed space-y-2">
            <h5 className="font-bold text-teal-900">هل تحتاج للمساعدة؟</h5>
            <p className="text-teal-800">
              في حال تعذر إيجاد حل تلقائي للتبديل، يرجى التواصل هاتفيا مع د. أحمد منصور بشكل مباشر لتفعيل المخطط الاحتياطي الطارئ (C).
            </p>
          </div>
        </div>

      </div>

      {/* --- FORM DIALOG (Simulate reporting an absence) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="absence-direct-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right">
            <div className="bg-rose-700 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تقديم إبلاغ غياب مفاجئ لك</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المناوبة المعتذر عنها</label>
                <select
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-250 rounded-lg"
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as ShiftType)}
                >
                  <option value={ShiftType.MORNING}>المناوبة الصباحية (08:00 - 14:00)</option>
                  <option value={ShiftType.EVENING}>المناوبة المسائية (14:00 - 20:00)</option>
                  <option value={ShiftType.NIGHT}>المناوبة الليلية (20:00 - 08:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ اليوم والغياب</label>
                <input
                  type="date"
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg text-right"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العذر الطبي أو القهري بالتفصيل</label>
                <textarea
                  required
                  placeholder="من فضلك اكتب العذر لتقديمه فورياً إلى لجنة الإدارة..."
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  تأكيد الإرسال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
