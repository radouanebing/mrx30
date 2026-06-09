export enum UserRole {
  MANAGER = "MANAGER",
  SUPERVISOR = "SUPERVISOR",
  EMPLOYEE = "EMPLOYEE"
}

export enum StaffSpecialty {
  RADIOLOGIST = "RADIOLOGIST", // طبيب أشعة
  TECHNOLOGIST = "TECHNOLOGIST", // تقني أشعة
  NURSE = "NURSE", // ممرض مصلحة
  SECRETARY = "SECRETARY" // سكرتير طبي
}

export enum ShiftType {
  MORNING = "MORNING", // صباحية: 08:00 - 14:00
  EVENING = "EVENING", // مسائية: 14:00 - 20:00
  NIGHT = "NIGHT" // ليلية: 20:00 - 08:00
}

export enum StaffTeam {
  SCANNER = "SCANNER", // فريق جهاز المقطعية (Scanner Team)
  IRM = "IRM", // فريق جهاز الرنين المغناطيسي (IRM Team)
  GENERAL = "GENERAL" // عام / غير مححدد
}

export enum SwapStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface EmployeePermissions {
  edit_schedule: boolean;
  request_swap: boolean;
  view_reports: boolean;
  manage_settings: boolean;
}

export interface PerformanceEvaluation {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  punctuality: number; // 1-5 الانضباط بالوقت
  clinicalSkills: number; // 1-5 المهارات المهنية والسريرية
  teamwork: number; // 1-5 العمل الجماعي والتعاون
  patientCare: number; // 1-5 رعاية المرضى ولطف المعاملة
  reportsSpeed: number; // 1-5 سرعة تسليم تقارير الأشعة
  overallScore: number; // auto-calculated average
  notes: string;
  evaluatorId: string;
  createdAt: string;
  syncStatus?: boolean; // حالة المزامنة مع سحابة Firebase (SyncStatus mapped)
  lastModified?: string; // طابع آخر تعديل للبيان (LastModified mapped)
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: StaffSpecialty;
  role: UserRole;
  active: boolean;
  hiringDate: string;
  avatarUrl?: string;
  ratingAverage?: number;
  permissions?: EmployeePermissions; // Customizable permissions per employee
  password?: string; // كلمة السر لتسجيل الدخول الفردي للموظفين
  points?: number; // رصيد النقاط التراكمية للتطوع والتبادل
  weekendWeight?: number; // ثقل مشاركة عطلة نهاية الأسبوع (للعدالة اللوغاريتمية)
  team?: StaffTeam; // الفريق المصلحي (جهاز المقطعية SCANNER / الرنين IRM)
  customStartTime?: string; // وقت بدء مخصص (مثلاً للمدير أو الحالات الخاصة)
  customEndTime?: string; // وقت نهاية مخصص
  syncStatus?: boolean; // حالة المزامنة مع سحابة Firebase
  lastModified?: string; // طابع آخر تعديل للبيان
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  room: string; // الرنين المغناطيسي MRI, الأشعة المقطعية CT, الأشعة العادية X-Ray, السونار Ultrasound
  hoursWorked: number;
  note?: string;
  startTime?: string; // وقت البدء (مثلاً 08:00 صباحاً)
  endTime?: string; // وقت النهاية (مثلاً 08:00 مساءً)
  syncStatus?: boolean; // حالة المزامنة مع سحابة Firebase
  lastModified?: string; // طابع آخر تعديل للبيان
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  shiftId: string; // The shift to be swapped
  shiftDate: string;
  shiftType: ShiftType;
  proposedEmployeeId?: string; // Optional target if proposing to a specific person, otherwise public board
  status: SwapStatus;
  notes: string;
  createdAt: string;
  resolvedById?: string;
  resolvedAt?: string;
  syncStatus?: boolean; // حالة المزامنة مع سحابة Firebase
  lastModified?: string; // طابع آخر تعديل للبيان
}

export interface SuddenAbsence {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  reason: string;
  coverEmployeeId?: string; // Who will cover
  covered: boolean;
  createdAt: string;
  syncStatus?: boolean; // حالة المزامنة مع سحابة Firebase
  lastModified?: string; // طابع آخر تعديل للبيان
}

export interface BackupRecord {
  id: string;
  filename: string;
  dateStr: string;
  notes: string;
  size: string;
}

export interface SystemSettings {
  showAlgorithmToEmployees: boolean;
  showSmartControlToEmployees: boolean;
  whatsappEnabled?: boolean;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  whatsappTemplateName?: string;
  whatsappCustomMessageTemplate?: string;
  morningShiftColor?: string;
  eveningShiftColor?: string;
  nightShiftColor?: string;
}

export enum LeaveType {
  ANNUAL = "ANNUAL", // سنوية (حدّ 50 يوم)
  CASUAL = "CASUAL"  // عارضة (حدّ 42 يوم)
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum NoticeCategory {
  NOTICE = "NOTICE",       // تعميم إداري
  REPORT = "REPORT",       // تقرير إداري
  DECISION = "DECISION",   // قرار إداري
  GENERAL = "GENERAL"      // عام
}

export interface AdminNotice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  imageUrl?: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export interface RoomRadiationReading {
  id: string;
  roomName: string;
  roomCode: string;
  reading: number; // in uSv/h
  status: "SAFE" | "WARNING" | "DANGER";
  lastChecked: string;
}

export interface CalibrationLog {
  id: string;
  deviceName: string;
  serialNumber: string;
  calibrationDate: string;
  expiryDate: string;
  batteryPercent: number;
  calibratedBy: string;
  status: "PASSED" | "FAILED" | "EXPIRED";
}

export interface PersonalDosimeter {
  id: string;
  employeeId: string;
  badgeCode: string;
  quarterDose: number; // mSv
  annualDose: number; // mSv
  lastReadingDate: string;
}

export interface RadiationState {
  roomReadings: RoomRadiationReading[];
  calibrations: CalibrationLog[];
  dosimeters: PersonalDosimeter[];
}

export interface RadiologyState {
  employees: Employee[];
  shifts: Shift[];
  swapRequests: ShiftSwapRequest[];
  absences: SuddenAbsence[];
  evaluations: PerformanceEvaluation[];
  settings?: SystemSettings;
  leaves?: LeaveRequest[];
  notices?: AdminNotice[];
  radiationData?: RadiationState;
}

export function hasPermission(employee: Employee | null, permission: keyof EmployeePermissions): boolean {
  if (!employee) return false;
  
  // Custom permissions overrides
  if (employee.permissions && typeof employee.permissions[permission] === "boolean") {
    return employee.permissions[permission];
  }
  
  // Default values based on role
  switch (employee.role) {
    case UserRole.MANAGER:
      return true;
    case UserRole.SUPERVISOR:
      return permission === "edit_schedule" || permission === "request_swap" || permission === "view_reports";
    case UserRole.EMPLOYEE:
    default:
      return permission === "request_swap";
  }
}
