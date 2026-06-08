import React, { useState } from "react";
import { Star, Award, ShieldAlert, Plus, HelpCircle, FileText, CheckCircle2 } from "lucide-react";
import { Employee, PerformanceEvaluation, UserRole } from "../types.js";

interface PerformanceEvalsProps {
  evaluations: PerformanceEvaluation[];
  employees: Employee[];
  currentUser: Employee | null;
  onAddEvaluation: (evalData: Omit<PerformanceEvaluation, "id" | "overallScore" | "createdAt">) => void;
}

export default function PerformanceEvals({
  evaluations,
  employees,
  currentUser,
  onAddEvaluation,
}: PerformanceEvalsProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Rating states (1-5 scale)
  const [punctuality, setPunctuality] = useState(5);
  const [clinicalSkills, setClinicalSkills] = useState(5);
  const [teamwork, setTeamwork] = useState(5);
  const [patientCare, setPatientCare] = useState(5);
  const [reportsSpeed, setReportsSpeed] = useState(5);
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState("2026-06");

  const isManager = currentUser?.role === UserRole.MANAGER;

  // Selected employee's evaluations
  const activeFilteringEmpId = selectedEmpId || (isManager ? "" : currentUser?.id || "");
  const filteredEvals = evaluations.filter(ev => {
    if (activeFilteringEmpId) {
      return ev.employeeId === activeFilteringEmpId;
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !currentUser) return;
    
    onAddEvaluation({
      employeeId: selectedEmpId,
      month,
      punctuality,
      clinicalSkills,
      teamwork,
      patientCare,
      reportsSpeed,
      notes,
      evaluatorId: currentUser.id
    });

    // Reset
    setPunctuality(5);
    setClinicalSkills(5);
    setTeamwork(5);
    setPatientCare(5);
    setReportsSpeed(5);
    setNotes("");
    setIsFormOpen(false);
  };

  const getEmpName = (id: string) => employees.find(e => e.id === id)?.name || "غير معروف";

  // Compute stats for active filtering employee
  const ratingStats = (() => {
    if (filteredEvals.length === 0) return null;
    const count = filteredEvals.length;
    
    let punctSum = 0, clinicalSum = 0, teamSum = 0, careSum = 0, speedSum = 0, overallSum = 0;
    
    filteredEvals.forEach(ev => {
      punctSum += ev.punctuality;
      clinicalSum += ev.clinicalSkills;
      teamSum += ev.teamwork;
      careSum += ev.patientCare;
      speedSum += ev.reportsSpeed;
      overallSum += ev.overallScore;
    });

    return {
      punctuality: Number((punctSum / count).toFixed(1)),
      clinicalSkills: Number((clinicalSum / count).toFixed(1)),
      teamwork: Number((teamSum / count).toFixed(1)),
      patientCare: Number((careSum / count).toFixed(1)),
      reportsSpeed: Number((speedSum / count).toFixed(1)),
      overall: Number((overallSum / count).toFixed(1)),
      count
    };
  })();

  return (
    <div className="space-y-6" id="evaluations-tab-content">
      
      {/* Tab Header */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
            <Award className="h-5 w-5 text-teal-600 animate-bounce" />
            تقييم الأداء والتميز المهني للكوادر الطبية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            صلاحيات كاملة للمديرين لتقييم الكفاءة والالتزام الشهري، بينما يمكن للموظفين والممرضين مراجعة أدائهم لتحفيز التطوير.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              if (employees.length > 0) {
                setSelectedEmpId(employees[0].id);
              }
              setIsFormOpen(true);
            }}
            id="open-eval-form-btn"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-150"
          >
            <Plus className="h-4 w-4 text-slate-950" />
            <span>تسجيل تقييم شهري جديد</span>
          </button>
        )}
      </div>

      {/* Selector Profile Card */}
      <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        
        <div className="md:col-span-2 space-y-1">
          <label className="block text-xs font-bold text-slate-500 mb-1">
            {isManager ? "صفحة استعلام تقييمات الموظف:" : "سجل تقييمك الشخصي كأخصائي:"}
          </label>
          {isManager ? (
            <select
              id="eval-staff-selector"
              className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 cursor-pointer"
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
            >
              <option value="">-- جميع الموظفين بالتناوب --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({getEmpName(e.id)})</option>
              ))}
            </select>
          ) : (
            <div className="p-2 bg-teal-50 text-teal-900 font-bold text-sm rounded-lg border border-teal-100">
              {currentUser?.name} — {currentUser?.specialty === "RADIOLOGIST" ? "طبيب أشعة اختصاصي" : "أخصائي تقني أشعة مصلحة"}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center flex flex-col justify-center h-full">
          <span className="text-xs text-slate-500">معدل التقييم العام المستهدف للتميز</span>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-2xl font-black text-teal-600 font-sans">
              {ratingStats ? ratingStats.overall : "لم يتم التقييم"}
            </span>
            {ratingStats && (
              <span className="flex text-amber-400">
                {Array.from({ length: Math.round(ratingStats.overall) }, (_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">مبني على إجمالي {ratingStats?.count || 0} تقييمات شهرية</span>
        </div>

      </div>

      {/* Results details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG charts stats */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2">مؤشرات الأداء التراكمية (KPIs)</h3>
          
          {ratingStats ? (
            <div className="space-y-4" id="kpi-charts">
              {renderKpiBar("الانضباط والالتزام بالوقت والمناوبات", ratingStats.punctuality)}
              {renderKpiBar("المهارت الفنية السريرية والأجهزة (MRI/CT)", ratingStats.clinicalSkills)}
              {renderKpiBar("التعاون وروح العمل الجماعي المشترك", ratingStats.teamwork)}
              {renderKpiBar("معاملة ورعاية المرضى بالرحمة واللطف", ratingStats.patientCare)}
              {renderKpiBar("سرعة ودقة تقارير التشخيص الأشعي", ratingStats.reportsSpeed)}

              {/* Custom SVG Radar/Polygon visualizer inside circle to make it gorgeous */}
              <div className="pt-4 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 mb-2 font-mono">خريطة توزيع المهارات</span>
                <svg className="w-40 h-40" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  <circle cx="60" cy="60" r="30" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                  
                  {/* Axis lines */}
                  <line x1="60" y1="10" x2="60" y2="110" stroke="#cbd5e1" strokeDasharray="2" />
                  <line x1="10" y1="60" x2="110" y2="60" stroke="#cbd5e1" strokeDasharray="2" />
                  
                  {/* Custom polygon based on stats (simulated mapping) */}
                  <polygon 
                    points={`
                      60,${60 - (ratingStats.punctuality * 8)} 
                      ${60 + (ratingStats.clinicalSkills * 8)},60 
                      60,${60 + (ratingStats.teamwork * 8)} 
                      ${60 - (ratingStats.patientCare * 8)},60
                    `}
                    fill="rgba(13, 148, 136, 0.2)"
                    stroke="#0d9488"
                    strokeWidth="1.5"
                  />
                  <circle cx="60" cy="60" r="3" fill="#0d9488" />
                </svg>
                <div className="flex gap-2 text-[9px] text-slate-400 mt-2 font-mono">
                  <span>الأعلى: {Math.max(ratingStats.punctuality, ratingStats.clinicalSkills, ratingStats.teamwork, ratingStats.patientCare, ratingStats.reportsSpeed)} ⭐</span>
                  <span>الأقل: {Math.min(ratingStats.punctuality, ratingStats.clinicalSkills, ratingStats.teamwork, ratingStats.patientCare, ratingStats.reportsSpeed)} ⭐</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              الرجاء تحديد موظف يمتلك تقارير تقييمية معتمدة لعرض المخططات البيانية لمجموع الكفاءات.
            </div>
          )}
        </div>

        {/* List of Monthly Evaluations */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-teal-600 rounded-full" />
            سجل التقارير الشهرية المفصلة للتقييم ({filteredEvals.length})
          </h3>

          <div className="space-y-4">
            {filteredEvals.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                لا تتوفر تقييمات مسجلة للموظف المختار حالياً.
              </div>
            ) : (
              filteredEvals.map((ev) => (
                <div key={ev.id} className="bg-white border border-slate-150 p-5 rounded-2xl shadow-xs space-y-4 hover:border-slate-300 transition-colors">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-950 text-sm">{getEmpName(ev.employeeId)}</h4>
                      <p className="text-[11px] font-sans text-slate-400 mt-0.5">تقييم شهر العمل: {ev.month}</p>
                    </div>

                    <div className="flex items-center gap-1 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                      <span className="text-teal-700 font-extrabold text-xs font-sans">{ev.overallScore}</span>
                      <span className="text-teal-500 text-[10px]">⭐ نقاط التقييم</span>
                    </div>
                  </div>

                  {/* Individual metrics micro bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100/50 text-[10px] leading-tight text-center">
                    <div>
                      <span className="text-slate-400 block mb-1">الانضباط والتفاني</span>
                      <strong className="text-slate-800 font-sans">{ev.punctuality} / 5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">المهارات الفنية</span>
                      <strong className="text-slate-800 font-sans">{ev.clinicalSkills} / 5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">العمل الجماعي</span>
                      <strong className="text-slate-800 font-sans">{ev.teamwork} / 5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">رعاية المرضى</span>
                      <strong className="text-slate-800 font-sans">{ev.patientCare} / 5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">سرعة التقارير</span>
                      <strong className="text-slate-800 font-sans">{ev.reportsSpeed} / 5</strong>
                    </div>
                  </div>

                  {/* Feedback Text notes */}
                  {ev.notes && (
                    <div className="p-3 bg-teal-50/20 border-r-2 border-teal-500 rounded text-xs leading-relaxed text-slate-700">
                      <strong>توجيه وملاحظة المقيّم:</strong> {ev.notes}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-450 flex justify-between">
                    <span>الـمقيّم المعتمد: {getEmpName(ev.evaluatorId)}</span>
                    <span className="font-sans">حرر في: {new Date(ev.createdAt).toLocaleDateString("ar-EG")}</span>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- ADD VALUE EVALUATION FORM (Manager only) --- */}
      {isFormOpen && isManager && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="eval-form-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden text-right">
            <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تسجيل نموذج تقييم كفاءة موظف مصلحة الأشعة</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المراد تقييمه</label>
                  <select
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                  >
                    <option value="">-- اختر من الكوادر --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شهر التقييم</label>
                  <input
                    type="month"
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-right"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>
              </div>

              {/* Sliders for the 5 parameters */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-2">تقدير معايير التميز من 1 (غير مرضي) إلى 5 (ممتاز جداً):</span>
                
                {renderSliderMetric("الانضباط والحضور وتلبية المناوبات الطارئة", punctuality, setPunctuality)}
                {renderSliderMetric("المهارات السريرية وتجربة تشغيل الأجهزة والأمن المغناطيسي", clinicalSkills, setClinicalSkills)}
                {renderSliderMetric("العمل الجماعي والتعاون وتبادل المناوبات الطوعي", teamwork, setTeamwork)}
                {renderSliderMetric("رعاية ولطف معاملة المرضى وتهيئة الفحص", patientCare, setPatientCare)}
                {renderSliderMetric("السرعة والالتزام بزمن إخراج تقارير الأشعة", reportsSpeed, setReportsSpeed)}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات توجيهية وخطاب تميز الموظف</label>
                <textarea
                  required
                  placeholder="من فضلك تفضل بإعطاء الزميل توجيه دقيق وشكره على جهوده المخلصة في مصلحة التشخيص..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-right"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-lg cursor-pointer"
                >
                  إلغاء التقييم
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-slate-950" />
                  <span>اعتماد وإصدار التقرير</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );

  function renderKpiBar(label: string, value: number) {
    const percentage = Math.min((value / 5) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-600">{label}</span>
          <span className="text-teal-700 font-extrabold font-sans">{value} / 5</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-teal-600 h-full rounded-full transition-all duration-300" 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  function renderSliderMetric(label: string, value: number, onChange: (val: number) => void) {
    return (
      <div className="flex justify-between items-center gap-4 text-xs">
        <label className="text-slate-700 font-medium">{label}:</label>
        <div className="flex items-center gap-3 shrink-0">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            className="w-24 accent-teal-600 cursor-pointer"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="bg-white border font-bold px-2 py-0.5 rounded text-teal-800 shrink-0 font-sans">{value} ⭐</span>
        </div>
      </div>
    );
  }
}
