import React, { useState, useEffect, useRef } from "react";
import { Bell, Heart, AlertCircle, RefreshCw, Layers, ShieldCheck, HelpCircle, Calendar, ShieldAlert, Users, Award, Database, Lock, KeyRound, Newspaper, LayoutDashboard, Radio } from "lucide-react";
import { 
  Employee, 
  Shift, 
  ShiftSwapRequest, 
  SuddenAbsence, 
  PerformanceEvaluation, 
  BackupRecord, 
  SwapStatus, 
  ShiftType, 
  UserRole,
  SystemSettings,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  AdminNotice,
  NoticeCategory
} from "./types";

import Header from "./components/Header";
import ScheduleGrid from "./components/ScheduleGrid";
import AbsenceAlerts from "./components/AbsenceAlerts";
import SwapBoard from "./components/SwapBoard";
import EmployeeManager from "./components/EmployeeManager";
import PerformanceEvals from "./components/PerformanceEvals";
import Reports from "./components/Reports";
import BackupRestore from "./components/BackupRestore";
import LoginPortal from "./components/LoginPortal";
import DiagnosticsLab from "./components/DiagnosticsLab";
import VacationRequests from "./components/VacationRequests";
import AdminNotices from "./components/AdminNotices";
import ManagerDashboard from "./components/ManagerDashboard";
import RadiationDosimetry from "./components/RadiationDosimetry";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [absences, setAbsences] = useState<SuddenAbsence[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [radiationData, setRadiationData] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [notifications, setNotifications] = useState<{ id: string; text: string; type: "alert" | "info" | "success" }[]>([]);

  // Shift notification system states
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [notifiedShiftIds, setNotifiedShiftIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("notified_shift_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeAlertShift, setActiveAlertShift] = useState<Shift | null>(null);

  // Simple Web Audio API Synthesizer Chime
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.36); // C6
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("Audio warning: Chime blocked by browser policy until user click.", e);
    }
  };

  // Automated Shift 1-Hour Pre-shift Alarm System Tick Loop
  useEffect(() => {
    if (!currentUser) {
      setActiveAlertShift(null);
      return;
    }

    const checkIncomingShifts = () => {
      const refTime = simulatedTime || new Date();
      
      // Calculate any shift starting in <= 60 minutes for the current employee
      const userShifts = shifts.filter(s => s.employeeId === currentUser.id);
      
      let closestShift: Shift | null = null;
      let closestDiffMins: number = Infinity;

      for (const shift of userShifts) {
        // Construct start Date for the shift
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
        const diffMinutes = Math.floor(diffMs / 60000);

        // Standard notification condition: Starts in less than or equal to 60 minutes, and has not yet started
        if (diffMinutes >= 0 && diffMinutes <= 60) {
          if (diffMinutes < closestDiffMins) {
            closestDiffMins = diffMinutes;
            closestShift = shift;
          }

          // Trigger automated alert if not already notified
          if (!notifiedShiftIds.includes(shift.id)) {
            // Trigger toast
            triggerToast(
              `🔔 تنبيه ذاتي تلقائي: تبدأ مناوبتك المقررة في ${shift.room} بعد ${diffMinutes} دقيقة! يرجى الاستعداد والتحضير لمصلحة الأشعة.`,
              "alert"
            );
            
            // Play sound chime
            playNotificationSound();

            // Track this shift ID as notified
            const updated = [...notifiedShiftIds, shift.id];
            setNotifiedShiftIds(updated);
            localStorage.setItem("notified_shift_alerts", JSON.stringify(updated));
          }
        }
      }

      // Live update the active banner alert if found
      if (closestShift) {
        setActiveAlertShift(closestShift);
      } else {
        setActiveAlertShift(null);
      }
    };

    // Run check immediately
    checkIncomingShifts();

    // Check periodically every 5 seconds (especially for live countdown updates or fast simulator interactions!)
    const checkTimer = setInterval(checkIncomingShifts, 5000);
    return () => clearInterval(checkTimer);
  }, [currentUser, shifts, simulatedTime, notifiedShiftIds]);

  const handleTestNotificationSimulation = () => {
    if (!currentUser) {
      triggerToast("يرجى تسجيل الدخول أولاً كأي موظف لتفعيل وتجربة التنبيه التلقائي للمناوبات.", "alert");
      return;
    }

    const refTime = simulatedTime || new Date();
    // Schedule a shift starting in 55 minutes
    const testShiftTime = new Date(refTime.getTime() + 55 * 60 * 1000);
    
    // Format date as YYYY-MM-DD
    const y = testShiftTime.getFullYear();
    const m = String(testShiftTime.getMonth() + 1).padStart(2, "0");
    const d = String(testShiftTime.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    
    // Format hours/minutes
    const hh = String(testShiftTime.getHours()).padStart(2, "0");
    const mm = String(testShiftTime.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;

    const testShift: Shift = {
      id: `test-simulation-shift-${Date.now()}`,
      employeeId: currentUser.id,
      date: dateStr,
      type: testShiftTime.getHours() < 14 ? ShiftType.MORNING : testShiftTime.getHours() < 20 ? ShiftType.EVENING : ShiftType.NIGHT,
      room: "قسم الطوارئ الصدري والقلبي (جناح المحاكاة)",
      hoursWorked: 6,
      startTime: timeStr,
      note: "مناوبة محاكاة مضافة فورياً لاختبار نظام التنبيه الذاتي للتبريرات الأمنية العالية قبل ساعة."
    };

    // Add to shifts array so the tick catches it
    setShifts(prev => [testShift, ...prev]);
    
    // Flush the notified IDs for this test shift to let the chime ring
    setNotifiedShiftIds(prev => prev.filter(id => id !== testShift.id));

    triggerToast("🚀 تم تشييد مناوبة اختبار تبدأ في غضون 55 دقيقة للمطابقة! ترقب التنبيه الفوري ورنين المنبه.", "success");
  };

  // Dark Mode Support for safe operation in dark radiology reading rooms
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("radiology_dark_mode") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("radiology_dark_mode", "true");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("radiology_dark_mode", "false");
    }
  }, [darkMode]);

  // 1. Fetch entire state from backend with auto-retry and self-healing logic during server boots
  const retryCountRef = useRef(0);
  const backupRetryCountRef = useRef(0);

  const fetchState = async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load state");
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("ملقم الخدمة السحابي قيد التشغيل والتهيئة.. يرجى الانتظار ثوانٍ والمحاولة.");
      }
      
      const data = await res.json();
      
      setEmployees(data.employees || []);
      setShifts(data.shifts || []);
      setSwapRequests(data.swapRequests || []);
      setAbsences(data.absences || []);
      setEvaluations(data.evaluations || []);
      setLeaves(data.leaves || []);
      setNotices(data.notices || []);
      setRadiationData(data.radiationData || null);
      if (data.settings) {
        setSettings(data.settings);
      }

      // Reset retry count once a valid JSON payload is loaded
      retryCountRef.current = 0;

      // Get authenticated user from session/local storage
      const savedEmpId = localStorage.getItem("radiology_logged_emp_id");
      if (savedEmpId && data.employees?.length > 0) {
        const matched = data.employees.find((e: Employee) => e.id === savedEmpId);
        if (matched) {
          setCurrentUser(matched);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setSyncStatus("idle");
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      
      const errMsg = err.message || String(err);
      const isBootingError = !errMsg || 
                             errMsg.includes("Failed to fetch") || 
                             errMsg.includes("failed to fetch") || 
                             errMsg.includes("ملقم الخدمة السحابي") ||
                             errMsg.includes("Failed to load state");
      
      // Auto-retry if the server is still booting or warming up (max 5 retries, 3-sec intervals)
      if (isBootingError && retryCountRef.current < 5) {
        retryCountRef.current += 1;
        console.log(`[Auto-healing] Server booting (connection issue). Retry #${retryCountRef.current} in 3 seconds...`);
        setTimeout(() => {
          fetchState();
        }, 3000);
      } else {
        triggerToast("خطأ في الاتصال بالملقم السحابي. يرجى الانتظار ثوانٍ أو مراجعة الخادم.", "alert");
      }
    }
  };

  // 2. Fetch list of backups with automatic retry
  const fetchBackupsList = async () => {
    try {
      const res = await fetch("/api/backups");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setBackups(data);
          backupRetryCountRef.current = 0;
          return;
        }
      }
      throw new Error("Failed to load backups");
    } catch (err) {
      console.error("Failed to load backups list", err);
      // Auto-retry backups list load up to 5 times
      if (backupRetryCountRef.current < 5) {
        backupRetryCountRef.current += 1;
        console.log(`[Auto-healing] Backups fetch failed. Retry #${backupRetryCountRef.current} in 3 seconds...`);
        setTimeout(() => {
          fetchBackupsList();
        }, 3000);
      }
    }
  };

  useEffect(() => {
    fetchState();
    fetchBackupsList();
    
    // Auto-refresh state every 30 seconds to simulate real-time multi-device sync!
    const timer = setInterval(() => {
      fetchState();
      fetchBackupsList();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Guard tabs which standard employees cannot access
  useEffect(() => {
    if (currentUser?.role === UserRole.EMPLOYEE) {
      if (["employees", "evaluations", "backups", "dashboard"].includes(activeTab)) {
        setActiveTab("schedule");
      }
    }
  }, [currentUser, activeTab]);

  // Automatic Notification System for Annual Leave Balance < 5 days
  const lastPromptedEmpId = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.MANAGER) {
      const userLeaves = leaves.filter(
        l => l.employeeId === currentUser.id && l.leaveType === LeaveType.ANNUAL && l.status === LeaveStatus.APPROVED
      );
      const approvedDays = userLeaves.reduce((sum, l) => sum + l.totalDays, 0);
      const remaining = 50 - approvedDays;

      if (remaining < 5 && lastPromptedEmpId.current !== currentUser.id) {
        lastPromptedEmpId.current = currentUser.id;
        triggerToast(
          `⚠️ تنبيه تلقائي للحد الحرج: رصيد إجازاتك السنوية المتبقي منخفض جداً (${remaining} يوم من أصل 50). يرجى تقديم طلب إجازة لتفادي ضياع الرصيد السنوي.`,
          "alert"
        );
      }
    } else if (!currentUser) {
      lastPromptedEmpId.current = null;
    }
  }, [currentUser, leaves]);

  const handleLoginSuccess = (user: Employee) => {
    setCurrentUser(user);
    localStorage.setItem("radiology_logged_emp_id", user.id);
    triggerToast(`مرحباً بك مجدداً د./أ./ ${user.name}! تم تسجيل دخولك بنجاح.`, "success");
    if (user.role !== UserRole.EMPLOYEE) {
      setActiveTab("dashboard");
    } else {
      setActiveTab("schedule");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("radiology_logged_emp_id");
    triggerToast("تم تسجيل الخروج من نظام مصلحة الأشعة بنجاح.", "info");
  };

  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPassword.trim()) {
      triggerToast("الرجاء كتابة كلمة المرور الجديدة أولاً.", "alert");
      return;
    }
    setIsChangingPassword(true);
    try {
      await handleUpdateEmployee(currentUser.id, { password: newPassword.trim() });
      triggerToast("تم تحديث كلمة المرور الخاصة بك بنجاح!", "success");
      setNewPassword("");
    } catch (err) {
      triggerToast("خطأ أثناء تحديث كلمة المرور.", "alert");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toast trigger helper
  const triggerToast = (text: string, type: "alert" | "info" | "success" = "info") => {
    const newNotify = {
      id: `notify-${Date.now()}-${Math.random()}`,
      text,
      type
    };
    setNotifications(prev => [newNotify, ...prev].slice(0, 5)); // Keep only recent 5
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotify.id));
    }, 5000);
  };

  // --- API OPERATIONS ---

  // Post new shift
  const handleAddShift = async (newShift: Omit<Shift, "id">) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShift)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تمت إضافه وجدولة المناوبة الطبية بنجاح.", "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر جدولة المناوبة. يرجى التحقق من خادم المليكة.", "alert");
    }
  };

  // Delete shift
  const handleDeleteShift = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تم إزالة وإلغاء المناوبة من جدول مصلحة الأشعة.", "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر حذف المناوبة.", "alert");
    }
  };

  // Update shift
  const handleUpdateShift = async (id: string, updated: Partial<Shift>) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error();
      await fetchState();
    } catch (error) {
      setSyncStatus("error");
    }
  };

  // Submit swap request "تنبيهات فوري لتبادل المناوبات"
  const handleFileSwapRequest = async (shiftId: string, notes: string, proposedEmpId: string) => {
    if (!currentUser) return;
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: currentUser.id,
          shiftId,
          shiftDate: shift.date,
          shiftType: shift.type,
          proposedEmployeeId: proposedEmpId,
          notes
        })
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast(`تم إرسال طلب التبادل بنجاح لـ ${employees.find(e => e.id === proposedEmpId)?.name}`, "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل تقديم طلب تبادل المناوبات.", "alert");
    }
  };

  // Resolve swap request
  const handleUpdateSwapRequest = async (id: string, status: SwapStatus) => {
    if (!currentUser) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/swaps/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolvedById: currentUser.id
        })
      });
      if (!res.ok) throw new Error();
      await fetchState();
      
      if (status === SwapStatus.APPROVED) {
        triggerToast("تمت الموافقة وتدوير المناوبة وتعديل الجدول العام فورياً!", "success");
      } else {
        triggerToast("تم رفض طلب تبادل المناوبة المعين.", "info");
      }
    } catch (error) {
      setSyncStatus("error");
      triggerToast("حدث خلل أثناء معالجة تبديل الوجبات.", "alert");
    }
  };

  // Report sudden absence "تغطية حالات الغياب المفاجئة"
  const handleReportSuddenAbsence = async (date: string, shiftType: ShiftType, reason: string) => {
    if (!currentUser) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUser.id,
          date,
          shiftType,
          reason,
          covered: false
        })
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تم الإبلاغ والتعميم عن غياب طارئ وجاري التنسيق للتغطية.", "alert");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر إبلاغ الغياب الطارئ.", "alert");
    }
  };

  // Assign cover employee to emergency absence
  const handleCoverAbsence = async (absenceId: string, coverEmployeeId: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/absences/${absenceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverEmployeeId,
          covered: true
        })
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast(`تمت تغطية الغياب وإسناد المناوبة لـ ${employees.find(e => e.id === coverEmployeeId)?.name}. شكراً على إنقاذ المناوبة!`, "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("حدث خلل أثناء إسناد مناوبة الطوارئ.", "alert");
    }
  };

  // Add staff employee
  const handleAddEmployee = async (newEmp: Omit<Employee, "id">) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast(`تم إضافة وتسجيل الكادر الموظف ${newEmp.name} بنجاح.`, "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("حدث خطأ أثناء حفظ بيانات الموظف.", "alert");
    }
  };

  // Update staff employee
  const handleUpdateEmployee = async (id: string, updated: Partial<Employee>) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تم تحديث ملف تعريف الكادر الموظف بنجاح.", "success");
    } catch (error) {
      setSyncStatus("error");
    }
  };

  // Update system settings
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSettings(updated);
      triggerToast("تم تحديث إعدادات عرض المحاكاة واللوحات الذكية بنجاح.", "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر تحديث الإعدادات الفنية للمنصة.", "alert");
    }
  };

  // Delete staff employee
  const handleDeleteEmployee = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تم استبعاد وإزالة الكادر الطبي بنجاح من القوائم.", "success");
    } catch (error) {
      setSyncStatus("error");
    }
  };

  // Submit new leave request
  const handleAddLeave = async (leaveData: { leaveType: LeaveType; startDate: string; endDate: string; reason: string }) => {
    if (!currentUser) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leaveData,
          employeeId: currentUser.id
        })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "تعذر تقديم طلب الإجازة.");
      }
      await fetchState();
      triggerToast("تم تسجيل وتقديم طلب الإجازة بنجاح، بانتظار موافقة المدير.", "success");
    } catch (error: any) {
      setSyncStatus("error");
      triggerToast(error.message || "فشل إرسال طلب المعاملة.", "alert");
      throw error;
    }
  };

  // Update status of leave request
  const handleUpdateLeaveStatus = async (id: string, status: LeaveStatus) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "فشل تحديث المعاملة.");
      }
      await fetchState();
      const stArabic = status === "APPROVED" ? "الموافقة" : "الرفض";
      triggerToast(`تم إتمام إجراءات ${stArabic} على طلب الإجازة بنجاح.`, "success");
    } catch (error: any) {
      setSyncStatus("error");
      triggerToast(error.message || "تعذر تعديل حالة الطلب.", "alert");
      throw error;
    }
  };

  // Delete/Cancel a leave request
  const handleDeleteLeave = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast("تم إلغاء وسحب طلب الإجازة بنجاح.", "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر إلغاء وسحب المعاملة.", "alert");
    }
  };

  // Add a new notice/report
  const handleAddNotice = async (noticeData: { title: string; content: string; category: NoticeCategory; imageUrl?: string }) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...noticeData,
          authorId: currentUser?.id || "system",
          authorName: currentUser?.name || "مدير المصلحة"
        })
      });
      if (!res.ok) throw new Error();
      await fetchState();
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل إنشاء وتعميم المنشور.", "alert");
      throw error;
    }
  };

  // Update an existing notice/report
  const handleUpdateNotice = async (id: string, noticeData: Partial<AdminNotice>) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeData)
      });
      if (!res.ok) throw new Error();
      await fetchState();
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل تعديل المنشور الإداري.", "alert");
      throw error;
    }
  };

  // Delete/Cancel a notice
  const handleDeleteNotice = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchState();
    } catch (error) {
      setSyncStatus("error");
      triggerToast("تعذر حذف وإزالة المنشور.", "alert");
      throw error;
    }
  };

  // Add performance rating
  const handleAddEvaluation = async (evalData: Omit<PerformanceEvaluation, "id" | "overallScore" | "createdAt">) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evalData)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      triggerToast(`تم إصدار واعتماد نموذج التقييم بنجاح لـ ${employees.find(e => e.id === evalData.employeeId)?.name}`, "success");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل نشر تقييم الأداء.", "alert");
    }
  };

  // Cloud Backups create
  const handleCreateBackup = async (notesStr: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesStr })
      });
      if (!res.ok) throw new Error();
      triggerToast("تم أخذ وحيازة نسخة احتياطية سحابية جديدة لبيانات المصلحة.", "success");
      fetchBackupsList();
      setSyncStatus("idle");
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل إنشاء نسخة الأمان السحابية.", "alert");
    }
  };

  // Cloud backup restore
  const handleRestoreBackup = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/backups/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error();
      triggerToast("تم استرجاع الجدول وكافة بيانات مصلحة الأشعة بنجاح من ملف النسخ للأمن!", "success");
      await fetchState();
    } catch (error) {
      setSyncStatus("error");
      triggerToast("فشل استرجاع نسخة الأمان السحابية.", "alert");
    }
  };

  // Cloud backup delete
  const handleDeleteBackup = async (id: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/backups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      triggerToast("تم مسح وإلغاء نقطة الاستعادة من خادم الأمن.", "success");
      fetchBackupsList();
      setSyncStatus("idle");
    } catch (error) {
      setSyncStatus("error");
    }
  };

  const pendingSwapsCount = swapRequests.filter(s => s.status === SwapStatus.PENDING).length;
  const uncoveredAbsencesCount = absences.filter(a => !a.covered).length;

  if (!currentUser) {
    if (employees.length === 0) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans gap-4">
          <RefreshCw className="h-10 w-10 text-teal-400 animate-spin" />
          <p className="text-sm font-bold text-slate-350 text-slate-300">جاري الاتصال بقاعدة بيانات المشفى وجلب السجلات...</p>
        </div>
      );
    }
    return <LoginPortal employees={employees} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="radiology-platform-root">
      
      {/* Header Container */}
      <Header
        currentUser={currentUser}
        employees={employees}
        onUserChange={(user) => {}}
        syncStatus={syncStatus}
        onTriggerSync={() => {
          fetchState();
          fetchBackupsList();
          triggerToast("تم تنشيط مكاملة المزامنة وجلب آخر تعديلات المناوبات.", "info");
        }}
        onLogout={handleLogout}
      />

      {/* Immediate Warnings alerts strip for high-stake notifications (تنبيهات فورية لضمان استمرارية العمل) */}
      {(uncoveredAbsencesCount > 0 || pendingSwapsCount > 0) && (
        <section className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 shadow-inner" id="system-live-alert-ticker">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-amber-900 gap-2 font-medium">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span>
                <strong>مجلس تنبيهات مصلحة الرعاية:</strong> هناك{" "}
                {uncoveredAbsencesCount > 0 ? (
                  <span className="text-rose-700 font-extrabold">{uncoveredAbsencesCount} ثغرة غياب مفاجئ بحاجة لتغطية</span>
                ) : null}
                {uncoveredAbsencesCount > 0 && pendingSwapsCount > 0 ? " و " : ""}
                {pendingSwapsCount > 0 ? (
                  <span className="text-indigo-700 font-extrabold">{pendingSwapsCount} طلبات تبادل معلقة</span>
                ) : null}
              </span>
            </div>
            
            <button 
              onClick={() => setActiveTab(uncoveredAbsencesCount > 0 ? "absences" : "swaps")} 
              className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3 py-1 rounded shadow-sm transition-colors cursor-pointer"
            >
              انقر لفحص الاستجابة العاجلة
            </button>
          </div>
        </section>
      )}

      {/* Low Annual Leave Balance Automatic Warning */}
      {currentUser && currentUser.role !== UserRole.MANAGER && (
        (() => {
          const userLeaves = leaves.filter(
            l => l.employeeId === currentUser.id && l.leaveType === LeaveType.ANNUAL && l.status === LeaveStatus.APPROVED
          );
          const approvedDays = userLeaves.reduce((sum, l) => sum + l.totalDays, 0);
          const remaining = 50 - approvedDays;
          if (remaining < 5) {
            return (
              <section className="bg-rose-500/10 border-b border-rose-500/20 py-3 shadow-inner" id="low-leave-alert-banner" dir="rtl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-rose-950 gap-3 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                    </span>
                    <p className="leading-relaxed">
                      <strong>تنبيه رصيد الإجازات السنوية:</strong> رصيدك الرقابي المتبقي هو 
                      <span className="text-rose-700 font-extrabold mx-1.5 px-2 py-0.5 bg-rose-100/80 rounded-md font-sans border border-rose-200">{remaining} أيام فقط</span> 
                      من أصل 50 يوماً. يرجى المبادرة بتقديم طلب إجازة لتجنب انقضاء السنة وضياع رصيدك السنوي دون استخدام.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab("vacations")} 
                    className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>تقديم ومتابعة الإجازات الآن</span>
                  </button>
                </div>
              </section>
            );
          }
          return null;
        })()
      )}

      {/* 1-Hour Pre-Shift Automatic Glowing Alarm Alert Banner */}
      {activeAlertShift && (
        (() => {
          const refTime = simulatedTime || new Date();
          const [year, month, day] = activeAlertShift.date.split("-").map(Number);
          let hour = 8;
          let minute = 0;
          
          if (activeAlertShift.startTime && activeAlertShift.startTime.includes(":")) {
            const parts = activeAlertShift.startTime.split(" ")[0].split(":");
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (!isNaN(h)) hour = h;
            if (!isNaN(m)) minute = m;
          } else {
            if (activeAlertShift.type === "EVENING") hour = 14;
            else if (activeAlertShift.type === "NIGHT") hour = 20;
          }
          
          const shiftStartTime = new Date(year, month - 1, day, hour, minute, 0, 0);
          const diffMs = shiftStartTime.getTime() - refTime.getTime();
          const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
          const diffSeconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));

          return (
            <section className="bg-rose-600 text-white py-3.5 px-4 shadow-lg border-b border-rose-700 relative overflow-hidden transition-all duration-300 animate-pulse-slow" id="active-shift-notification-banner" dir="rtl">
              <div className="absolute inset-0 bg-rose-700/20 backdrop-blur-[1px]" />
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-white/10 rounded-xl flex items-center justify-center animate-bounce">
                    <Bell className="h-5 w-5 text-teal-300 animate-pulse" />
                  </span>
                  <div className="text-right">
                    <h3 className="font-black text-sm text-teal-100 flex items-center gap-2">
                      <span>تنبيه مناوبة وشيك (مراقب الحضور التلقائي)</span>
                      <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black animate-pulse">تبدأ قريباً!</span>
                    </h3>
                    <p className="text-xs text-slate-100 mt-0.5 font-semibold">
                      يبدأ دورك المقرر في مصلحة الأشعة بـ <span className="bg-white/20 px-2 py-0.5 rounded text-white font-extrabold">{activeAlertShift.room}</span> خلال{" "}
                      <span className="text-yellow-300 font-sans font-black text-sm tracking-wide bg-slate-950/40 px-2 py-0.5 rounded border border-white/10">
                        {String(diffMinutes).padStart(2, "0")}:{String(diffSeconds).padStart(2, "0")}
                      </span>{" "}
                      دقيقة! (المقرر البدء عند الساعة {activeAlertShift.startTime || (activeAlertShift.type === "MORNING" ? "08:00 صباحاً" : activeAlertShift.type === "EVENING" ? "02:00 مساءً" : "08:00 مساءً")})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      // Discard/Dismiss active visual banner by marking it notified
                      setNotifiedShiftIds(prev => [...prev, activeAlertShift.id]);
                      setActiveAlertShift(null);
                      triggerToast("تم تأكيد حضور واستلام التنبيه الذاتي بنجاح.", "success");
                    }}
                    className="text-xs bg-slate-950 border border-slate-700 hover:bg-slate-900 text-teal-300 font-black px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>موافق، تم تأكيد الحضور والاستعداد للمناوبة</span>
                  </button>
                </div>
              </div>
            </section>
          );
        })()
      )}

      {/* Main Split Layout Container */}
      <div className="flex flex-col lg:flex-row flex-grow w-full max-w-8xl mx-auto" dir="rtl">
        
        {/* Sidebar Panel */}
        <aside className="w-full lg:w-80 bg-white border-l border-slate-200 flex flex-col p-5 gap-1.5 shrink-0 border-b lg:border-b-0" id="sleek-sidebar">
          
          {currentUser?.role !== UserRole.EMPLOYEE && (
            <button
              onClick={() => setActiveTab("dashboard")}
              id="nav-tab-dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className={`h-4.5 w-4.5 shrink-0 ${activeTab === "dashboard" ? "text-teal-400" : "text-sky-500"}`} />
              <span className="flex-grow">لوحة التحكم والمتابعة الإدارية</span>
              {(uncoveredAbsencesCount > 0 || pendingSwapsCount > 0 || leaves.filter(l => l.status === "PENDING").length > 0) ? (
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              ) : null}
            </button>
          )}

          <button
            onClick={() => setActiveTab("schedule")}
            id="nav-tab-schedule"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
              activeTab === "schedule"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar className={`h-4.5 w-4.5 shrink-0 ${activeTab === "schedule" ? "text-teal-400" : "text-sky-600"}`} />
            <span className="flex-grow">جدول المناوبات العشرين والـ 24 ساعة</span>
          </button>

          <button
            onClick={() => setActiveTab("absences")}
            id="nav-tab-absences"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "absences"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className={`h-4.5 w-4.5 shrink-0 ${activeTab === "absences" ? "text-teal-400" : "text-amber-500"}`} />
            <span className="flex-grow">الغيابات الطارئة والتغطية</span>
            {uncoveredAbsencesCount > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full font-sans animate-bounce shrink-0">
                {uncoveredAbsencesCount}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("swaps")}
            id="nav-tab-swaps"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "swaps"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <RefreshCw className={`h-4.5 w-4.5 shrink-0 ${activeTab === "swaps" ? "text-teal-400" : "text-sky-500"}`} />
            <span className="flex-grow">طلبات تبادل المناوبات</span>
            {pendingSwapsCount > 0 ? (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full font-sans shrink-0">
                {pendingSwapsCount}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("vacations")}
            id="nav-tab-vacations"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "vacations"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar className={`h-4.5 w-4.5 shrink-0 ${activeTab === "vacations" ? "text-teal-400" : "text-teal-500"}`} />
            <span className="flex-grow">تقديم ومتابعة الإجازات</span>
            {leaves.filter(l => l.status === "PENDING").length > 0 ? (
              <span className="bg-teal-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full font-sans shrink-0">
                {leaves.filter(l => l.status === "PENDING").length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("notices")}
            id="nav-tab-notices"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "notices"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Newspaper className={`h-4.5 w-4.5 shrink-0 ${activeTab === "notices" ? "text-teal-400" : "text-amber-500"}`} />
            <span className="flex-grow">المنشورات والتقارير الإدارية</span>
            {notices.length > 0 ? (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full font-sans shrink-0">
                {notices.length}
              </span>
            ) : null}
          </button>

          {currentUser?.role !== UserRole.EMPLOYEE && (
            <button
              onClick={() => setActiveTab("employees")}
              id="nav-tab-employees"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
                activeTab === "employees"
                  ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className={`h-4.5 w-4.5 shrink-0 ${activeTab === "employees" ? "text-teal-400" : "text-indigo-500"}`} />
              <span className="flex-grow">تسيير العمال والموظفين</span>
            </button>
          )}

          {currentUser?.role !== UserRole.EMPLOYEE && (
            <button
              onClick={() => setActiveTab("evaluations")}
              id="nav-tab-evaluations"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
                activeTab === "evaluations"
                  ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Award className={`h-4.5 w-4.5 shrink-0 ${activeTab === "evaluations" ? "text-teal-400" : "text-amber-500"}`} />
              <span className="flex-grow">تقييم الأداء والتميز المهني</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("reports")}
            id="nav-tab-reports"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
              activeTab === "reports"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Database className={`h-4.5 w-4.5 shrink-0 ${activeTab === "reports" ? "text-teal-400" : "text-violet-500"}`} />
            <span className="flex-grow">التقارير وساعات العمل</span>
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            id="nav-tab-diagnostics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "diagnostics"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Layers className={`h-4.5 w-4.5 shrink-0 ${activeTab === "diagnostics" ? "text-teal-400" : "text-teal-600"}`} />
            <span className="flex-grow font-extrabold text-slate-800">مكتبة وممارسة الأشعة والتشخيص</span>
            <span className="bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-sans shrink-0 animate-pulse">جديد</span>
          </button>

          <button
            onClick={() => setActiveTab("radiation")}
            id="nav-tab-radiation"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full relative ${
              activeTab === "radiation"
                ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Radio className={`h-4.5 w-4.5 shrink-0 ${activeTab === "radiation" ? "text-teal-400" : "text-rose-500 animate-pulse"}`} />
            <span className="flex-grow font-extrabold text-slate-800">الأمان الإشعاعي وجهاز القياس</span>
            <span className="bg-rose-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full font-sans shrink-0">حسّاس</span>
          </button>

          {currentUser?.role !== UserRole.EMPLOYEE && (
            <button
              onClick={() => setActiveTab("backups")}
              id="nav-tab-backups"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all focus:outline-none cursor-pointer text-right w-full ${
                activeTab === "backups"
                  ? "bg-slate-900 text-teal-300 shadow-md border-r-4 border-teal-400"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layers className={`h-4.5 w-4.5 shrink-0 ${activeTab === "backups" ? "text-teal-400" : "text-emerald-600"}`} />
              <span className="flex-grow">النسخ السحابي والأمن المتقدم</span>
            </button>
          )}

          {/* Dark Mode Toggle Switch / خيار الوضع الليلي لغرف الأشعة المظلمة */}
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200" id="dark-mode-sidebar-control">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 flex items-center justify-center">
                  {darkMode ? (
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.307l.707.707m11.314 11.314l.707.707M12 8a4 4 0 110 8 4 4 0 010-8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </span>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-slate-800">الوضع الليلي (Dark Room)</h4>
                  <p className="text-[10px] text-slate-500">غرف الأشعة المظلمة</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                  darkMode ? "bg-teal-400" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${
                    darkMode ? "translate-x-0" : "-translate-x-5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Backup Indicator Progress Box */}
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200 hidden lg:block">
            <p className="text-xs text-slate-500 mb-2 font-bold select-none">النسخ الاحتياطي السحابي</p>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-sky-100 rounded-full overflow-hidden">
                <div className="h-full bg-sky-600 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <span className="text-[10px] font-black text-sky-700 font-sans">نشط</span>
            </div>
            <p className="text-[9px] mt-2 text-slate-400 font-medium">مجلّد الأبحاث وسير العمال آمن تماماً</p>
          </div>

          {/* Automated Shift Alerts & Alarm Setup Widget */}
          <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-teal-500/20 shadow-md text-white" id="automated-alarm-center-sidebar">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-teal-500/10 rounded-lg text-teal-400 flex items-center justify-center animate-pulse">
                <Bell className="h-4 w-4" />
              </span>
              <div className="text-right">
                <h4 className="text-xs font-black text-teal-300">منبه المناوبات التلقائي الذاتي</h4>
                <p className="text-[10px] text-slate-400 font-medium">مراقب الحضور في مصلحة الأشعة</p>
              </div>
            </div>

            <div className="text-slate-300 text-[10px] space-y-2 mb-3 leading-relaxed border-t border-slate-800 pt-2">
              <p dir="rtl">
                يقوم النظام تلقائياً بفحص جدولك الفصلي والمناوباتي للتنبيه قبل <strong className="text-yellow-400">ساعة كاملة (60 دقيقة)</strong> من بدء مهامك المقررة.
              </p>
              <div className="flex items-center justify-between text-[9px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">حالة منبه الواجهة:</span>
                <span className="text-emerald-400 font-black flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  مراقب نشط
                </span>
              </div>
            </div>

            {/* Simulated Time Warp Tool to make testing extremely immediate and clean */}
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 mb-3 text-right">
              <h5 className="text-[9px] font-bold text-slate-400 mb-1.5">محاكي ساعة وقت المشفى:</h5>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>الوقت المرجعي الحالي:</span>
                  <span className="font-mono text-teal-400">
                    {simulatedTime ? "توقيت محاكي" : "الوقت الحقيقي"}
                  </span>
                </div>
                
                <p className="font-mono text-[10px] tracking-tight bg-slate-900 border border-slate-800 p-1.5 rounded text-center font-bold text-white leading-none">
                  {(simulatedTime || new Date()).toLocaleDateString("ar-EG", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </p>

                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button
                    onClick={() => {
                      const base = simulatedTime || new Date();
                      setSimulatedTime(new Date(base.getTime() + 15 * 60 * 1000));
                      triggerToast("⏩ تم تقديم وقت المحاكاة بـ 15 دقيقة بنجاح.", "info");
                    }}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-1 rounded-lg border border-slate-750 transition-colors cursor-pointer block text-center"
                  >
                    +15 دقيقة
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedTime(null);
                      setNotifiedShiftIds([]);
                      triggerToast("🔄 تم استعادة الوقت الفعلي الحالي بنجاح.", "success");
                    }}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-rose-300 py-1.5 px-1 rounded-lg border border-slate-750 transition-colors cursor-pointer block text-center"
                  >
                    ضبط الحقيقي
                  </button>
                </div>
              </div>
            </div>

            {/* Test Simulation Buttons */}
            <button
              onClick={handleTestNotificationSimulation}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-black rounded-xl text-slate-950 bg-gradient-to-r from-teal-400 to-sky-400 hover:from-teal-300 hover:to-sky-300 transition-all cursor-pointer shadow-md shadow-teal-500/15 hover:scale-[1.01] duration-150"
            >
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span>اختبار التنبيه الفوري (55د)</span>
            </button>
          </div>

          {/* Change Password Sidebar Widget */}
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-sky-600 shrink-0" />
              <span>أمن الحساب وتغيير كلمة السر</span>
            </h4>
            <p className="text-[10px] text-slate-500 mb-2">
              يمكنك تعيين كلمة مرور جديدة مخصصة وسرية لحسابك هنا للولوج السريع لاحقاً.
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  placeholder="كلمة السر الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none text-right"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-black rounded-xl text-slate-950 bg-gradient-to-r from-teal-400 to-sky-400 hover:from-teal-300 hover:to-sky-300 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-teal-500/10 hover:scale-[1.01] duration-150"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{isChangingPassword ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}</span>
              </button>
            </form>
          </div>

        </aside>

        {/* Dynamic content view */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          <div className="relative">
            
            {/* Manager Dashboard Tab */}
            {activeTab === "dashboard" && (
              <ManagerDashboard
                employees={employees}
                shifts={shifts}
                swapRequests={swapRequests}
                absences={absences}
                leaves={leaves}
                currentUser={currentUser}
                onUpdateSwapRequest={handleUpdateSwapRequest}
                onUpdateLeaveStatus={handleUpdateLeaveStatus}
                onCoverAbsence={handleCoverAbsence}
                triggerToast={triggerToast}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Schedule Grid Tab */}
            {activeTab === "schedule" && (
              <ScheduleGrid
                shifts={shifts}
                employees={employees}
                currentUser={currentUser}
                settings={settings}
                onAddShift={handleAddShift}
                onUpdateShift={handleUpdateShift}
                onDeleteShift={handleDeleteShift}
                onFileSwapRequest={handleFileSwapRequest}
                onReportSuddenAbsence={handleReportSuddenAbsence}
                onUpdateEmployee={handleUpdateEmployee}
                onUpdateSettings={handleUpdateSettings}
                triggerToast={triggerToast}
                simulatedTime={simulatedTime}
              />
            )}

            {/* Absence Alerts Tab */}
            {activeTab === "absences" && (
              <AbsenceAlerts
                absences={absences}
                employees={employees}
                currentUser={currentUser}
                onCoverAbsence={handleCoverAbsence}
                onReportSuddenAbsence={handleReportSuddenAbsence}
              />
            )}

            {/* Swap board Tab */}
            {activeTab === "swaps" && (
              <SwapBoard
                swapRequests={swapRequests}
                employees={employees}
                currentUser={currentUser}
                onUpdateSwapRequest={handleUpdateSwapRequest}
              />
            )}

            {/* Vacation Requests Tab */}
            {activeTab === "vacations" && (
              <VacationRequests
                leaves={leaves}
                employees={employees}
                currentUser={currentUser}
                onAddLeave={handleAddLeave}
                onUpdateLeaveStatus={handleUpdateLeaveStatus}
                onDeleteLeave={handleDeleteLeave}
              />
            )}

            {/* Admin Notices Tab */}
            {activeTab === "notices" && (
              <AdminNotices
                notices={notices}
                currentUser={currentUser}
                onAddNotice={handleAddNotice}
                onUpdateNotice={handleUpdateNotice}
                onDeleteNotice={handleDeleteNotice}
                triggerToast={triggerToast}
              />
            )}

            {/* Employee Manager Tab */}
            {activeTab === "employees" && (
              <EmployeeManager
                employees={employees}
                currentUser={currentUser}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}

            {/* Evaluations Tab */}
            {activeTab === "evaluations" && (
              <PerformanceEvals
                evaluations={evaluations}
                employees={employees}
                currentUser={currentUser}
                onAddEvaluation={handleAddEvaluation}
              />
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <Reports
                shifts={shifts}
                employees={employees}
                absences={absences}
              />
            )}

            {/* Diagnostics Lab Tab */}
            {activeTab === "diagnostics" && (
              <DiagnosticsLab
                currentUser={currentUser}
                triggerToast={triggerToast}
              />
            )}

            {/* Radiation Dosimetry Hub Tab */}
            {activeTab === "radiation" && (
              <RadiationDosimetry
                currentUser={currentUser}
                employees={employees}
                radiationData={radiationData}
                triggerToast={triggerToast}
                onUpdateState={fetchState}
              />
            )}

            {/* Cloud Backups Tab */}
            {activeTab === "backups" && (
              <BackupRestore
                backups={backups}
                currentUser={currentUser}
                onRefreshBackups={fetchBackupsList}
                onCreateBackup={handleCreateBackup}
                onRestoreBackup={handleRestoreBackup}
                onDeleteBackup={handleDeleteBackup}
                isSyncing={syncStatus === "syncing"}
                onStateRestored={fetchState}
              />
            )}

          </div>
        </main>

      </div>

      {/* Notification Toast Layer */}
      <div className="fixed bottom-5 left-5 space-y-2 z-50 pointer-events-none" id="toasts-notifications-stack">
        {notifications.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border text-xs font-semibold max-w-sm flex items-center gap-2 pointer-events-auto transition-all animate-bounce ${
              toast.type === "alert"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-900 text-white border-slate-800"
            }`}
          >
            <Bell className={`h-4.5 w-4.5 ${toast.type === "alert" ? "text-rose-500 animate-pulse" : "text-emerald-500"}`} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-100 py-5 mt-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 font-medium">
          <span>نظام تسيير عمال مصلحة الأشعة المتقدم © {new Date().getFullYear()} — مستشفى الجامعة والبحوث الطبية</span>
        </div>
      </footer>

    </div>
  );
}
