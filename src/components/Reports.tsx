import React, { useState } from "react";
import { FileSpreadsheet, Download, CalendarClock, TrendingUp, Users, Clock, Filter, CheckCircle, ListFilter, ShieldAlert, Award } from "lucide-react";
import { Employee, Shift, StaffSpecialty, SuddenAbsence } from "../types.js";
import * as XLSX from "xlsx";

interface ReportsProps {
  shifts: Shift[];
  employees: Employee[];
  absences: SuddenAbsence[];
}

export default function Reports({ shifts, employees, absences }: ReportsProps) {
  // Configured date range selection
  const [startDate, setStartDate] = useState<string>("2026-06-01");
  const [endDate, setEndDate] = useState<string>("2026-06-30");

  // Customize reports columns
  const [columns, setColumns] = useState({
    specialty: true,
    shiftBreakdown: true,
    totalShifts: true,
    hoursCompleted: true,
    absences: true,
    overtime: true,
    contact: true,
    status: true,
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getSpecialtyLabel = (spec: StaffSpecialty) => {
    switch (spec) {
      case StaffSpecialty.RADIOLOGIST: return "طبيب أشعة اختصاصي";
      case StaffSpecialty.TECHNOLOGIST: return "أخصائي تقني أشعة";
      case StaffSpecialty.NURSE: return "ممرض مصلحة";
      case StaffSpecialty.SECRETARY: return "سكرتير استقبال طبي";
    }
  };

  // Filter shifts based on customized date range
  const filteredShifts = shifts.filter(sh => {
    return sh.date >= startDate && sh.date <= endDate;
  });

  // Filter absences based on customized date range
  const filteredAbsences = absences.filter(ab => {
    return ab.date >= startDate && ab.date <= endDate;
  });

  // Compile stats for each employee dynamically
  const reportData = employees.map(emp => {
    const empShifts = filteredShifts.filter(sh => sh.employeeId === emp.id);
    const empAbsences = filteredAbsences.filter(ab => ab.employeeId === emp.id);

    // Count shifts by type
    const morningCount = empShifts.filter(sh => sh.type === "MORNING").length;
    const eveningCount = empShifts.filter(sh => sh.type === "EVENING").length;
    const nightCount = empShifts.filter(sh => sh.type === "NIGHT").length;

    // Total hours worked
    const hoursCompleted = empShifts.reduce((sum, current) => sum + current.hoursWorked, 0);

    // Calculate Overtime Hours dynamically (e.g., any hours exceeding a normal workload quota of 120 hours for the period, or night hours which count 1.5x)
    const standardLimit = 120;
    const overtimeHours = hoursCompleted > standardLimit ? hoursCompleted - standardLimit : 0;

    // Absences count
    const absenceCount = empAbsences.length;

    // Delays calculation (simulate 1 delay for every night shift completed as a mockup or fetch from notes containing "تأخر")
    const delayCount = empShifts.filter(sh => sh.note && (sh.note.includes("تأخر") || sh.note.includes("تأخير"))).length;

    return {
      id: emp.id,
      name: emp.name,
      specialty: emp.specialty,
      specialtyLabel: getSpecialtyLabel(emp.specialty),
      phone: emp.phone,
      email: emp.email,
      morningCount,
      eveningCount,
      nightCount,
      totalShifts: empShifts.length,
      hoursCompleted,
      overtimeHours,
      absenceCount,
      delayCount,
      status: emp.active ? "نشط" : "مجمد مؤقتاً"
    };
  }).sort((a, b) => b.hoursCompleted - a.hoursCompleted);

  // Totals for top cards
  const totalHoursAll = reportData.reduce((sum, item) => sum + item.hoursCompleted, 0);
  const totalShiftsAll = reportData.reduce((sum, item) => sum + item.totalShifts, 0);
  const totalOvertimeAll = reportData.reduce((sum, item) => sum + item.overtimeHours, 0);
  const totalAbsencesAll = reportData.reduce((sum, item) => sum + item.absenceCount, 0);

  // --- EXPORT TO EXCEL ---
  const handleExportToExcel = () => {
    try {
      // Create custom export rows based on customization selections
      const excelRows = reportData.map((row, index) => {
        const item: any = {
          "الرقم التسلسلي": index + 1,
          "إسم الموظف المعتمد": row.name,
        };

        if (columns.specialty) {
          item["التخصص / المسمى الوظيفي"] = row.specialtyLabel;
        }
        if (columns.contact) {
          item["رقم الجوال"] = row.phone;
          item["البريد الإلكتروني"] = row.email;
        }
        if (columns.shiftBreakdown) {
          item["مناوبات صباحية (Morning)"] = row.morningCount;
          item["مناوبات مسائية (Evening)"] = row.eveningCount;
          item["مناوبات ليلية (Night)"] = row.nightCount;
        }
        if (columns.totalShifts) {
          item["إجمالي عدد المناوبات"] = row.totalShifts;
        }
        if (columns.hoursCompleted) {
          item["ساعات العمل المنجزة"] = row.hoursCompleted;
        }
        if (columns.overtime) {
          item["ساعات العمل الإضافية (Overtime)"] = row.overtimeHours;
        }
        if (columns.absences) {
          item["حالات الغياب المسجلة"] = row.absenceCount;
          item["الحالات التأخر"] = row.delayCount;
        }
        if (columns.status) {
          item["حالة الكادر"] = row.status;
        }

        return item;
      });

      // Append Total calculations at bottom
      const summaryRow: any = {
        "الرقم التسلسلي": "",
        "إسم الموظف المعتمد": "إجمالي المصلحة العام للفتـرة",
      };
      if (columns.specialty) summaryRow["التخصص / المسمى الوظيفي"] = "";
      if (columns.contact) {
        summaryRow["رقم الجوال"] = "";
        summaryRow["البريد الإلكتروني"] = "";
      }
      if (columns.shiftBreakdown) {
        summaryRow["مناوبات صباحية (Morning)"] = reportData.reduce((sum, r) => sum + r.morningCount, 0);
        summaryRow["مناوبات مسائية (Evening)"] = reportData.reduce((sum, r) => sum + r.eveningCount, 0);
        summaryRow["مناوبات ليلية (Night)"] = reportData.reduce((sum, r) => sum + r.nightCount, 0);
      }
      if (columns.totalShifts) {
        summaryRow["إجمالي عدد المناوبات"] = totalShiftsAll;
      }
      if (columns.hoursCompleted) {
        summaryRow["ساعات العمل المنجزة"] = totalHoursAll;
      }
      if (columns.overtime) {
        summaryRow["ساعات العمل الإضافية (Overtime)"] = totalOvertimeAll;
      }
      if (columns.absences) {
        summaryRow["حالات الغياب المسجلة"] = totalAbsencesAll;
        summaryRow["الحالات التأخر"] = reportData.reduce((sum, r) => sum + r.delayCount, 0);
      }
      if (columns.status) summaryRow["حالة الكادر"] = "";

      excelRows.push(summaryRow);

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير المناوبات المفصل");

      XLSX.writeFile(workbook, `تقرير_مناوبات_مصلحة_الأشعة_${startDate}_إلى_${endDate}.xlsx`);
      
      setSuccessMsg("تم تصدير وتنزيل ملف Excel المخصص للمناوبات والغيابات والساعات الإضافية بنجاح!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (error) {
      console.error("Export Excel error: ", error);
    }
  };

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6" id="reports-tab-content">
      
      {/* Dynamic Report Controls & Header */}
      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              نظام التقارير المتقدم وإحصاءات ساعات العمل
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              خصّص نطاق الفترات الزمنية للبحث، صّف حقول البيانات المستعرضة، وتابع بدقة المناوبات الأساسية والإضافية وتفاصيل الغياب، مع التصدير المباشر لملفات الإكسل.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Custom Excel Export Button */}
            <button
              onClick={handleExportToExcel}
              id="export-custom-excel-btn"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>تصدير تقرير Excel مخصص</span>
            </button>
          </div>
        </div>

        {/* Success toast alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2" id="export-success-indicator">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <hr className="border-slate-100" />

        {/* Selection / Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-150">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">تاريخ بداية الفترة:</label>
            <input
              type="date"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">تاريخ نهاية الفترة:</label>
            <input
              type="date"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Filters dropdown simulator label */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <ListFilter className="h-3 w-3" />
              تحديد الأعمدة والبيانات المطلوبة بالتقرير:
            </label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                onClick={() => toggleColumn("specialty")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.specialty ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                الاختصاص
              </button>
              <button
                onClick={() => toggleColumn("shiftBreakdown")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.shiftBreakdown ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                تفصيل المناوبات
              </button>
              <button
                onClick={() => toggleColumn("hoursCompleted")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.hoursCompleted ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                ساعات العمل
              </button>
              <button
                onClick={() => toggleColumn("overtime")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.overtime ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                الساعات الإضافية
              </button>
              <button
                onClick={() => toggleColumn("absences")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.absences ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                الغياب والتأخير
              </button>
              <button
                onClick={() => toggleColumn("contact")}
                className={`px-2.5 py-1 text-[10px] h-7 font-bold rounded-lg border transition-all cursor-pointer ${
                  columns.contact ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                معلومات الاتصال
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern High-Value Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="reports-fast-stats">
        
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block select-none">ساعات مصلحة الأشعة</span>
            <h3 className="text-lg font-black text-slate-900 font-sans">{totalHoursAll} ساعة</h3>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block select-none">إجمالي المناوبات المنجزة</span>
            <h3 className="text-lg font-black text-slate-900 font-sans">{totalShiftsAll} مناوبة</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarClock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block select-none">عدد الساعات الإضافية</span>
            <h3 className="text-lg font-black text-teal-700 font-sans">+{totalOvertimeAll} ساعة</h3>
          </div>
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block select-none">حالات الغياب المسجّلة</span>
            <h3 className="text-lg font-black text-rose-700 font-sans">{totalAbsencesAll} غياب</h3>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
        </div>

      </div>

      {/* Big Custom Reports Table view */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden" id="custom-reports-table-container">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 select-none">
            <Users className="h-4 w-4 text-slate-500" />
            جدول إحصائيات المناوبات التفصيلية لفترة البحث المستهدفة
          </h3>
          <span className="text-[10px] text-slate-400 font-bold font-sans">
            الفترة: {startDate} إلى {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs leading-normal">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">الرقم</th>
                <th className="px-4 py-3.5">إسم الكادر الطبي</th>
                {columns.specialty && <th className="px-4 py-3.5">التخصص / المسمى</th>}
                {columns.shiftBreakdown && (
                  <>
                    <th className="px-4 py-3.5 text-center bg-sky-50/30">صباحية</th>
                    <th className="px-4 py-3.5 text-center bg-indigo-50/35">مسائية</th>
                    <th className="px-4 py-3.5 text-center bg-purple-50/30">ليلية</th>
                  </>
                )}
                {columns.totalShifts && <th className="px-4 py-3.5 text-center font-extrabold">مجموع المناوبات</th>}
                {columns.hoursCompleted && <th className="px-4 py-3.5 text-center font-extrabold text-slate-800">ساعات العمل</th>}
                {columns.overtime && <th className="px-4 py-3.5 text-center font-extrabold text-teal-700">الساعات الإضافية</th>}
                {columns.absences && (
                  <>
                    <th className="px-4 py-3.5 text-center text-rose-700 bg-rose-50/20">تغيب</th>
                    <th className="px-4 py-3.5 text-center text-amber-700 bg-amber-50/30">تأخر</th>
                  </>
                )}
                {columns.contact && <th className="px-4 py-3.5">الاتصال والتواصل</th>}
                {columns.status && <th className="px-4 py-3.5">حالة الكادر</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {reportData.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-mono text-slate-400">{index + 1}</td>
                  <td className="px-4 py-4">
                    <span className="font-extrabold text-slate-950 block">{row.name}</span>
                  </td>
                  
                  {columns.specialty && (
                    <td className="px-4 py-4 text-slate-500 font-bold">{row.specialtyLabel}</td>
                  )}
                  
                  {columns.shiftBreakdown && (
                    <>
                      <td className="px-4 py-4 text-center font-mono text-slate-600 bg-sky-50/10">{row.morningCount}</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-600 bg-indigo-50/10">{row.eveningCount}</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-600 bg-purple-50/15">{row.nightCount}</td>
                    </>
                  )}

                  {columns.totalShifts && (
                    <td className="px-4 py-4 text-center font-mono font-extrabold text-slate-900">{row.totalShifts}</td>
                  )}

                  {columns.hoursCompleted && (
                    <td className="px-4 py-4 text-center font-mono font-black text-slate-900 bg-slate-50/30">{row.hoursCompleted} س</td>
                  )}

                  {columns.overtime && (
                    <td className="px-4 py-4 text-center font-mono font-black text-teal-600 bg-teal-50/15">
                      {row.overtimeHours > 0 ? `+${row.overtimeHours} س` : "—"}
                    </td>
                  )}

                  {columns.absences && (
                    <>
                      <td className={`px-4 py-4 text-center font-mono font-extrabold bg-rose-50/5 ${row.absenceCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {row.absenceCount}
                      </td>
                      <td className={`px-4 py-4 text-center font-mono font-extrabold bg-amber-50/10 ${row.delayCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {row.delayCount}
                      </td>
                    </>
                  )}

                  {columns.contact && (
                    <td className="px-4 py-4 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block font-sans">{row.phone}</span>
                      <span className="text-[10px] text-slate-450 block font-sans">{row.email}</span>
                    </td>
                  )}

                  {columns.status && (
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        row.status === "نشط" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
