import React, { useState } from "react";
import { Users, Plus, ShieldCheck, Mail, Phone, Calendar, UserMinus, ShieldAlert, BadgeCheck, CheckCircle2, Key, Settings, Lock, Edit, ShieldX } from "lucide-react";
import { Employee, StaffSpecialty, UserRole, EmployeePermissions, hasPermission, StaffTeam } from "../types.js";

interface EmployeeManagerProps {
  employees: Employee[];
  currentUser: Employee | null;
  onAddEmployee: (emp: Omit<Employee, "id">) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeManager({
  employees,
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: EmployeeManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState<StaffSpecialty>(StaffSpecialty.TECHNOLOGIST);
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [hiringDate, setHiringDate] = useState("2026-06-01");
  const [team, setTeam] = useState<StaffTeam>(StaffTeam.GENERAL);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  // Edit employee states
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialty, setEditSpecialty] = useState<StaffSpecialty>(StaffSpecialty.TECHNOLOGIST);
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [editPassword, setEditPassword] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editHiringDate, setEditHiringDate] = useState("");
  const [editTeam, setEditTeam] = useState<StaffTeam>(StaffTeam.GENERAL);
  const [editCustomStartTime, setEditCustomStartTime] = useState("");
  const [editCustomEndTime, setEditCustomEndTime] = useState("");

  // State to track which employee's permissions are currently being customized
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);

  const isManager = currentUser?.role === UserRole.MANAGER;

  const startEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditPhone(emp.phone);
    setEditSpecialty(emp.specialty);
    setEditRole(emp.role);
    setEditPassword(emp.password || "123456");
    setEditPoints(emp.points || 0);
    setEditHiringDate(emp.hiringDate);
    setEditTeam(emp.team || StaffTeam.GENERAL);
    setEditCustomStartTime(emp.customStartTime || "");
    setEditCustomEndTime(emp.customEndTime || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    onUpdateEmployee(editingEmp.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      specialty: editSpecialty,
      role: editRole,
      password: editPassword,
      points: Number(editPoints),
      hiringDate: editHiringDate,
      team: editTeam,
      customStartTime: editCustomStartTime || undefined,
      customEndTime: editCustomEndTime || undefined
    });
    setEditingEmp(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEmployee({
      name,
      email,
      phone,
      specialty,
      role,
      active: true,
      hiringDate,
      team,
      customStartTime: customStartTime || undefined,
      customEndTime: customEndTime || undefined,
      permissions: {
        edit_schedule: role === UserRole.MANAGER || role === UserRole.SUPERVISOR,
        request_swap: true,
        view_reports: role === UserRole.MANAGER || role === UserRole.SUPERVISOR,
        manage_settings: role === UserRole.MANAGER,
      }
    });
    
    // Reset Form
    setName("");
    setEmail("");
    setPhone("");
    setTeam(StaffTeam.GENERAL);
    setCustomStartTime("");
    setCustomEndTime("");
    setIsFormOpen(false);
  };

  const getSpecialtyLabel = (spec: StaffSpecialty) => {
    switch (spec) {
      case StaffSpecialty.RADIOLOGIST: return "طبيب أشعة اختصاصي";
      case StaffSpecialty.TECHNOLOGIST: return "أخصائي تقني أشعة";
      case StaffSpecialty.NURSE: return "ممرض مصلحة الأشعة";
      case StaffSpecialty.SECRETARY: return "سكرتير استقبال وتنظيم";
    }
  };

  const getRoleBadgeStyle = (roleVal: UserRole) => {
    switch (roleVal) {
      case UserRole.MANAGER:
        return "bg-rose-50 border-rose-200 text-rose-700 font-extrabold";
      case UserRole.SUPERVISOR:
        return "bg-amber-50 border-amber-200 text-amber-700 font-bold";
      case UserRole.EMPLOYEE:
      default:
        return "bg-blue-50 border-blue-200 text-blue-700 font-medium";
    }
  };

  const getRoleLabel = (roleVal: UserRole) => {
    switch (roleVal) {
      case UserRole.MANAGER: return "مدير مصلحة";
      case UserRole.SUPERVISOR: return "مشرف مصلحة";
      case UserRole.EMPLOYEE: return "موظف عادي";
    }
  };

  // Safe toggle helper for single permissions
  const handleTogglePermission = (emp: Employee, permKey: keyof EmployeePermissions) => {
    const currentPerms = emp.permissions || {
      edit_schedule: emp.role === UserRole.MANAGER || emp.role === UserRole.SUPERVISOR,
      request_swap: true,
      view_reports: emp.role === UserRole.MANAGER || emp.role === UserRole.SUPERVISOR,
      manage_settings: emp.role === UserRole.MANAGER,
    };

    const updatedPerms = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    onUpdateEmployee(emp.id, { permissions: updatedPerms });
  };

  // Bulk role setting update that resets default permissions as a baseline
  const handleRoleChange = (emp: Employee, targetRole: UserRole) => {
    const defaultPerms: EmployeePermissions = {
      edit_schedule: targetRole === UserRole.MANAGER || targetRole === UserRole.SUPERVISOR,
      request_swap: true,
      view_reports: targetRole === UserRole.MANAGER || targetRole === UserRole.SUPERVISOR,
      manage_settings: targetRole === UserRole.MANAGER,
    };

    onUpdateEmployee(emp.id, {
      role: targetRole,
      permissions: defaultPerms
    });
  };

  return (
    <div className="space-y-6" id="employees-tab-content">
      
      {/* Overview header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600 animate-pulse" />
            إدارة الكوادر الطبية ونظام الصلاحيات المتقدم
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل بيانات الموظفين وتخصيص أدوارهم (مدير، مشرف، موظف) وتعديل صلاحيات العمل الفردية والوصول للنظام بشكل تفصيلي.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsFormOpen(true)}
            id="register-new-staff-btn"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-150"
          >
            <Plus className="h-4 w-4 text-slate-950" />
            <span>تسجيل موظف جديد بالمصلحة</span>
          </button>
        )}
      </div>

      {/* Grid of employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="employees-cards-grid">
        {employees.map((emp) => {
          const isCurrentUserCard = currentUser?.id === emp.id;
          const isPermOpen = editingPermissionsId === emp.id;
          
          // Get current effective permissions
          const isSchedEditable = hasPermission(emp, "edit_schedule");
          const isSwapAllowed = hasPermission(emp, "request_swap");
          const isReportVisible = hasPermission(emp, "view_reports");
          const isSettingsConfigurable = hasPermission(emp, "manage_settings");

          return (
            <div 
              key={emp.id} 
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between gap-4 ${
                isCurrentUserCard 
                  ? "border-teal-400 ring-1 ring-teal-500/5 shadow-md"
                  : "border-slate-150 hover:border-slate-250"
              }`}
            >
              
              {/* Badge for Role */}
              <div className="absolute left-4 top-4">
                <span className={`border text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 ${getRoleBadgeStyle(emp.role)}`}>
                  {emp.role === UserRole.MANAGER ? (
                    <ShieldAlert className="h-2.5 w-2.5" />
                  ) : (
                    <BadgeCheck className="h-2.5 w-2.5" />
                  )}
                  {getRoleLabel(emp.role)}
                </span>
              </div>

              {/* Main Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-black shadow-inner text-white uppercase ${
                    emp.role === UserRole.MANAGER ? "bg-rose-600" : emp.role === UserRole.SUPERVISOR ? "bg-amber-600" : "bg-teal-600"
                  }`}>
                    {emp.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 leading-none">
                      {emp.name}
                      {isCurrentUserCard && (
                        <span className="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 border border-teal-250 rounded font-black">أنت</span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-1.5">{getSpecialtyLabel(emp.specialty)}</p>
                  </div>
                </div>

                {/* Subdetails layout */}
                <div className="space-y-2 text-xs text-slate-650 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-sans text-slate-700 text-[11px] font-medium">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-sans text-slate-700 text-[11px] font-medium">{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-500">تاريخ التعيين:</span>
                    <span className="font-sans text-slate-700 font-bold text-[11px]">{emp.hiringDate}</span>
                  </div>

                  {/* Team Designation */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5 mt-1">
                    <span className="text-slate-500 text-[10px] font-bold">الفريق المصلحي:</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      emp.team === StaffTeam.SCANNER
                        ? "bg-sky-50 text-sky-700 border border-sky-100"
                        : emp.team === StaffTeam.IRM
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {emp.team === StaffTeam.SCANNER 
                        ? "أجهزة السكانير (Scanner)" 
                        : emp.team === StaffTeam.IRM 
                          ? "أجهزة الرنين المغناطيسي (IRM)" 
                          : "فريق عام مصلحي"}
                    </span>
                  </div>

                  {/* Custom shift/timing overrides */}
                  {(emp.customStartTime || emp.customEndTime) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-100 mt-1">
                      <span className="font-bold">⏰ ساعات العمل كمدير/كادر مخصص:</span>
                      <span className="font-sans font-bold bg-amber-100 text-amber-950 px-1.5 rounded">
                        {emp.customStartTime || "08:00"} {emp.customEndTime ? `- ${emp.customEndTime}` : ""}
                      </span>
                    </div>
                  )}

                  {isManager && (
                    <div className="flex items-center gap-2 border-t border-slate-200/60 pt-1.5 mt-1">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-slate-500">كلمة المرور:</span>
                      <span className="font-mono bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-bold text-[11px] select-all">{emp.password || "123456"}</span>
                    </div>
                  )}
                  {typeof emp.points === "number" && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-605 text-teal-600" />
                      <span className="text-slate-500">النقاط والمكافآت:</span>
                      <span className="font-sans bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded text-teal-800 font-black text-[11px]">{emp.points} نقطة</span>
                    </div>
                  )}
                </div>

                {/* Customizable Permissions Sub-Box (Accordion panel) */}
                {isPermOpen ? (
                  <div className="bg-teal-50/30 border border-teal-100 p-3.5 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-900 flex items-center gap-1">
                        <Key className="h-3.5 w-3.5 text-teal-600" />
                        تخصيص الصلاحيات الفردية:
                      </span>
                    </div>

                    {/* Checkboxes grid */}
                    <div className="space-y-2 text-[11px] text-slate-700 font-bold">
                      <label className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-slate-100 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={!isManager}
                          checked={isSchedEditable}
                          onChange={() => handleTogglePermission(emp, "edit_schedule")}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>تعديل جدول المناوبات</span>
                      </label>

                      <label className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-slate-100 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={!isManager}
                          checked={isSwapAllowed}
                          onChange={() => handleTogglePermission(emp, "request_swap")}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>تقديم طلب تبديل مناوبة</span>
                      </label>

                      <label className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-slate-100 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={!isManager}
                          checked={isReportVisible}
                          onChange={() => handleTogglePermission(emp, "view_reports")}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>عرض تقارير الآخرين وساعاتهم</span>
                      </label>

                      <label className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-slate-100 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={!isManager}
                          checked={isSettingsConfigurable}
                          onChange={() => handleTogglePermission(emp, "manage_settings")}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>إدارة النسخ والأمن السحابي</span>
                      </label>
                    </div>

                    {/* Role override selector */}
                    {isManager && (
                      <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block text-[10px] text-slate-500 font-bold">تعديل الدور العام للموظف:</span>
                        <select
                          className="w-full text-[10px] p-1 bg-slate-50 border border-slate-200 text-slate-800 rounded font-bold focus:outline-none cursor-pointer"
                          value={emp.role}
                          onChange={(e) => handleRoleChange(emp, e.target.value as UserRole)}
                        >
                          <option value={UserRole.EMPLOYEE}>موظف عادي</option>
                          <option value={UserRole.SUPERVISOR}>مشرف مصلحة</option>
                          <option value={UserRole.MANAGER}>مدير المصلحة</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isSchedEditable && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded font-bold">تعديل المناوبات</span>
                    )}
                    {isSwapAllowed && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded font-bold">تبادل الوجبات</span>
                    )}
                    {isReportVisible && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded font-bold font-sans">دراسة تقارير</span>
                    )}
                    {isSettingsConfigurable && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <Lock className="h-2 w-2" />
                        ضبط الأمان
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions for Manager */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/20 -mx-5 -mb-5 p-5 rounded-b-2xl">
                
                {/* Active status toggle */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 select-none">
                  <span className={`h-2 w-2 rounded-full ${emp.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-[10px] font-bold">{emp.active ? "نشط بالخدمة" : "مجمد مؤقتاً"}</span>
                </div>

                <div className="flex gap-1.5 text-xs">
                  {/* Toggle permissions collapse */}
                  <button
                    onClick={() => setEditingPermissionsId(isPermOpen ? null : emp.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer border ${
                      isPermOpen 
                        ? "bg-slate-800 border-slate-900 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-slate-50"
                    }`}
                  >
                    <Settings className="h-3 w-3" />
                    <span>{isPermOpen ? "إغلاق الضبط" : "تخصيص الصلاحيات"}</span>
                  </button>

                  {isManager && (
                    <button
                      onClick={() => startEditEmployee(emp)}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-bold px-2 py-1 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-0.5 border border-teal-100"
                    >
                      <Edit className="h-3 w-3" />
                      <span>تعديل</span>
                    </button>
                  )}

                  {isManager && !isCurrentUserCard && (
                    <>
                      <button
                        onClick={() => onUpdateEmployee(emp.id, { active: !emp.active })}
                        className="text-slate-600 hover:text-teal-600 font-bold hover:bg-teal-50 px-2 py-1 rounded text-[10px] transition-colors cursor-pointer"
                      >
                        {emp.active ? "تجميد" : "تنشيط"}
                      </button>
                      <button
                        onClick={() => onDeleteEmployee(emp.id)}
                        className="text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-0.5"
                      >
                        <UserMinus className="h-3 w-3" />
                        <span>استبعاد</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* --- ADD NEW EMPLOYEE DIALOG --- */}
      {isFormOpen && isManager && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="employee-form-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-150 overflow-hidden text-right animate-fade-in">
            <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تسجيل موظف طبي بمصلحة الأشعة</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الإسم الكامل للموظف</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد العتيبي"
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-right"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للـمستشفى</label>
                  <input
                    type="email"
                    required
                    placeholder="k.otaibi@hospital.gov"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 font-sans"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال الشخصي المباشر</label>
                  <input
                    type="tel"
                    required
                    placeholder="05XXXXXXXX"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 font-sans text-left"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-sans">مستوى التخصص والوظيفة</label>
                  <select
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value as StaffSpecialty)}
                  >
                    <option value={StaffSpecialty.RADIOLOGIST}>طبيب أشعة اختصاصي</option>
                    <option value={StaffSpecialty.TECHNOLOGIST}>أخصائي تقني أشعة</option>
                    <option value={StaffSpecialty.NURSE}>ممرض مصلحة</option>
                    <option value={StaffSpecialty.SECRETARY}>سكرتير استقبال طبي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صلاحية النظام الممنوحة</label>
                  <select
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.EMPLOYEE}>صلاحية موظف (محدودة)</option>
                    <option value={UserRole.SUPERVISOR}>صلاحية مشرف (جدول وتقارير)</option>
                    <option value={UserRole.MANAGER}>صلاحية مدير مصلحة (إدارة كاملة)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفريق الطبي المصلحي</label>
                  <select
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 font-sans"
                    value={team}
                    onChange={(e) => setTeam(e.target.value as StaffTeam)}
                  >
                    <option value={StaffTeam.GENERAL}>فريق عام مصلحي</option>
                    <option value={StaffTeam.SCANNER}>طاقم أجهزة السكانير (Scanner)</option>
                    <option value={StaffTeam.IRM}>طاقم أجهزة الرنين المغناطيسي (IRM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعات عمل مخصصة (مثال: للمدير)</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      placeholder="مثال: 08:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-teal-500"
                      title="مثال: 08:00"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="مثال: 20:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-teal-500"
                      title="مثال: 20:00"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ تعيينه وبداية العمل</label>
                <input
                  type="date"
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg text-right font-sans"
                  value={hiringDate}
                  onChange={(e) => setHiringDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-lg cursor-pointer"
                >
                  إلغاء التعيين
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-slate-950" />
                  <span>تأكيد وتسجيل الكادر</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE DIALOG (FULL ADMINISTRATIVE CONTROL) --- */}
      {editingEmp && isManager && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="employee-edit-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-150 overflow-hidden text-right animate-fade-in">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-teal-400" />
                <h3 className="font-bold text-base">تعديل الملف والصلحيات للموظف</h3>
              </div>
              <button onClick={() => setEditingEmp(null)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للكادر الطبي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد العتيبي"
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 text-right"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 font-sans"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال مباشرة</label>
                  <input
                    type="tel"
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 font-sans text-left"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المستوى المهني والتخصص</label>
                  <select
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value as StaffSpecialty)}
                  >
                    <option value={StaffSpecialty.RADIOLOGIST}>طبيب أشعة اختصاصي</option>
                    <option value={StaffSpecialty.TECHNOLOGIST}>أخصائي تقني أشعة</option>
                    <option value={StaffSpecialty.NURSE}>ممرض مصلحة</option>
                    <option value={StaffSpecialty.SECRETARY}>سكرتير استقبال طبي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">درجة الصلاحية</label>
                  <select
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.EMPLOYEE}>صلاحية موظف (محدودة)</option>
                    <option value={UserRole.SUPERVISOR}>صلاحية مشرف (جدول وتقارير)</option>
                    <option value={UserRole.MANAGER}>صلاحية مدير مصلحة (إدارة كاملة)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفريق الطبي المصلحي</label>
                  <select
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-550 font-sans"
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value as StaffTeam)}
                  >
                    <option value={StaffTeam.GENERAL}>فريق عام مصلحي</option>
                    <option value={StaffTeam.SCANNER}>طاقم أجهزة السكانير (Scanner)</option>
                    <option value={StaffTeam.IRM}>طاقم أجهزة الرنين المغناطيسي (IRM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعات عمل مخصصة (مثال: للمدير)</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      placeholder="مثال: 08:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-slate-500"
                      title="مثال: 08:00"
                      value={editCustomStartTime}
                      onChange={(e) => setEditCustomStartTime(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="مثال: 20:00"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-sans focus:ring-2 focus:ring-slate-500"
                      title="مثال: 20:00"
                      value={editCustomEndTime}
                      onChange={(e) => setEditCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* CRUCIAL ASPECT REQUIREMENT: CHANGE EMPLOYEE PASSWORD */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                  <Key className="h-4 w-4 text-amber-500" />
                  <span>تعيين وإعادة تعيين كلمة السر (أمن النظام)</span>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="أدخل كلمة مرور جديدة قوية"
                    className="w-full text-sm p-2 bg-white border border-slate-250 rounded-lg focus:ring-2 focus:ring-amber-500 text-center font-mono font-bold text-amber-900"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                  <span className="block text-[10px] text-slate-500 mt-1">يستطيع الموظف استخدام هذه الكلمة على الفور لتسجيل دخوله.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النقاط والمكافآت المتراكمة</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 text-center font-sans"
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ مباشرة العمل</label>
                  <input
                    type="date"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 font-sans text-right"
                    value={editHiringDate}
                    onChange={(e) => setEditHiringDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-lg cursor-pointer"
                >
                  إلغاء التغيير
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-slate-950" />
                  <span>تحديث وحفظ الملف</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
