import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calculator, 
  HelpCircle, 
  Coins, 
  CalendarDays, 
  ArrowLeftRight, 
  CheckCircle2, 
  Info, 
  Bot,
  UserCheck,
  AlertCircle,
  Calendar,
  Play,
  RotateCcw,
  Check,
  FileText,
  AlertTriangle,
  Users,
  Shuffle,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Employee, Shift, ShiftType, StaffSpecialty, UserRole, SystemSettings } from "../types.js";

interface SmartSchedulingPanelProps {
  employees: Employee[];
  shifts: Shift[];
  currentUser: Employee | null;
  settings: SystemSettings | null;
  onAddShift: (shift: Omit<Shift, "id">) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onDeleteShift: (id: string) => void;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  triggerToast: (text: string, type: "alert" | "info" | "success") => void;
}

interface GeneratedShiftPreview {
  date: string;
  dayName: string;
  isWeekend: boolean;
  morningStaff: Employee[];
  eveningStaff: Employee[];
  nightStaff: Employee[];
  morningNote: string;
  eveningNote: string;
  nightNote: string;
  morningRule: string;
  eveningRule: string;
  nightRule: string;
}

// Struct for the 30-Day Hospital Scheduling Algorithm
interface HospitalDaySchedule {
  dayNum: number;
  date: string;
  dayName: string;
  isWeekend: boolean;
  morning: Employee[];
  evening: Employee[];
  night: Employee[];
  logs: string[];
}

export default function SmartSchedulingPanel({
  employees,
  shifts,
  currentUser,
  settings,
  onAddShift,
  onUpdateEmployee,
  onDeleteShift,
  onUpdateSettings,
  triggerToast
}: SmartSchedulingPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"hospitalsched" | "algorithm" | "credits" | "preview" | "collective">("collective");
  
  // States of the Collective/Group Bulk Scheduler
  const [selectedNightWorkers, setSelectedNightWorkers] = useState<string[]>([]);
  const [selectedEveningWorkers, setSelectedEveningWorkers] = useState<string[]>([]);
  const [selectedMorningWorkers, setSelectedMorningWorkers] = useState<string[]>([]);
  const [bulkDaysCount, setBulkDaysCount] = useState<number>(30);
  const [bulkCleanExisting, setBulkCleanExisting] = useState<boolean>(true);
  const [bulkIsGenerating, setBulkIsGenerating] = useState<boolean>(false);

  // Existing 10-day state
  const [previewShifts, setPreviewShifts] = useState<GeneratedShiftPreview[]>([]);
  
  // Credit exchange Simulator State
  const [selectedSimEmpId, setSelectedSimEmpId] = useState("");
  const [simPointsChange, setSimPointsChange] = useState(5);
  const [simAction, setSimAction] = useState<"add" | "spend">("add");
  const [simNote, setSimNote] = useState("تطوع لمناوبة مسائية إضافية");

  // Hospital 30-Day Algorithm State
  const [hospitalAbsencesAndLeaves, setHospitalAbsencesAndLeaves] = useState<{
    [empId: string]: { absentDays: string; vacationDays: string };
  }>(() => {
    // Standard starting scenario (Dr. Amal/Nawal is on leave, Yasser is absent on Day 4)
    return {
      "emp-2": { absentDays: "", vacationDays: "5,6,7,8,9,10" },
      "emp-5": { absentDays: "4", vacationDays: "" }
    };
  });

  const [hospitalResults, setHospitalResults] = useState<{
    dailySchedules: HospitalDaySchedule[];
    weekendShiftCounts: { [empId: string]: number };
    eveningShiftCounts: { [empId: string]: number };
    nightShiftCounts: { [empId: string]: number };
  } | null>(null);

  const activeEmployees = employees.filter(e => e.active !== false);

  useEffect(() => {
    if (settings?.showAlgorithmToEmployees === false && currentUser?.role !== UserRole.MANAGER) {
      setActiveSubTab("collective");
    }
  }, [settings, currentUser]);

  // June 1 to June 10, 2026 Days Reference
  const PREVIEW_DAYS = [
    { date: "2026-06-01", dayName: "الإثنين", isWeekend: false },
    { date: "2026-06-02", dayName: "الثلاثاء", isWeekend: false },
    { date: "2026-06-03", dayName: "الأربعاء", isWeekend: false },
    { date: "2026-06-04", dayName: "الخميس", isWeekend: false },
    { date: "2026-06-05", dayName: "الجمعة", isWeekend: true },
    { date: "2026-06-06", dayName: "السبت", isWeekend: true },
    { date: "2026-06-07", dayName: "الأحد", isWeekend: false },
    { date: "2026-06-08", dayName: "الإثنين", isWeekend: false },
    { date: "2026-06-09", dayName: "الثلاثاء", isWeekend: false },
    { date: "2026-06-10", dayName: "الأربعاء", isWeekend: false },
  ];

  // Helper to run the Hospital Shift Scheduling Algorithm
  const runHospitalAlgorithm = (
    customLeaves: { [empId: string]: { absentDays: string; vacationDays: string } }
  ) => {
    if (activeEmployees.length === 0) {
      triggerToast("خطأ: لا يوجد عمال مسجلين لتوزيع المناوبات.", "alert");
      return null;
    }

    // Map string inputs to arrays of numbers
    const absencesAndLeaves: { [empId: string]: { absentDays: number[]; vacationDays: number[] } } = {};
    activeEmployees.forEach(emp => {
      const record = customLeaves[emp.id] || { absentDays: "", vacationDays: "" };
      
      const parsedAbsents = record.absentDays
        .split(",")
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 30);
        
      const parsedVacations = record.vacationDays
        .split(",")
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 30);

      absencesAndLeaves[emp.id] = {
        absentDays: parsedAbsents,
        vacationDays: parsedVacations
      };
    });

    // 1. Night shift pool is exactly 6 workers to rotate properly (since 2 are needed each night, 1-on, 2-off rotation)
    // We select the first 6 active workers to serve as the night pool rotation.
    const nightPool = activeEmployees.slice(0, 6);

    // Keep track of assignments for fair rotation
    const weekendShiftCounts: { [empId: string]: number } = {};
    const eveningShiftCounts: { [empId: string]: number } = {};
    const nightShiftCounts: { [empId: string]: number } = {};
    
    activeEmployees.forEach(emp => {
      weekendShiftCounts[emp.id] = 0;
      eveningShiftCounts[emp.id] = 0;
      nightShiftCounts[emp.id] = 0;
    });

    const dailySchedules: HospitalDaySchedule[] = [];

    // Process each of the 30 days of June 2026
    for (let d = 1; d <= 30; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const date = `2026-06-${dayStr}`;
      const dObj = new Date(Date.UTC(2026, 5, d));
      const dayNameIndex = dObj.getUTCDay(); // Sunday = 0, Monday = 1, etc.
      
      // Sunday to Thursday (0,1,2,3,4) vs Friday and Saturday (5,6)
      const isWeekend = dayNameIndex === 5 || dayNameIndex === 6;
      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayName = dayNames[dayNameIndex];

      const logs: string[] = [];

      // Unified helper to check worker's attendance status
      const isAvailable = (empId: string) => {
        const record = absencesAndLeaves[empId];
        if (!record) return true;
        const isAbsent = record.absentDays.includes(d);
        const isVacation = record.vacationDays.includes(d);
        return !isAbsent && !isVacation;
      };

      // ----------------------------------------------------
      // A. NIGHT SHIFT (Exactly 2 workers, obeying "1-on, 2-off")
      // ----------------------------------------------------
      // Perfect rotation cycle of 3 groups of 2:
      // Group 0: nightPool[0], nightPool[1]
      // Group 1: nightPool[2], nightPool[3]
      // Group 2: nightPool[4], nightPool[5]
      const teamIdx = (d - 1) % 3;
      let scheduledNightIds: string[] = [];
      if (teamIdx === 0) {
        scheduledNightIds = [nightPool[0]?.id, nightPool[1]?.id].filter(Boolean);
      } else if (teamIdx === 1) {
        scheduledNightIds = [nightPool[2]?.id, nightPool[3]?.id].filter(Boolean);
      } else {
        scheduledNightIds = [nightPool[4]?.id, nightPool[5]?.id].filter(Boolean);
      }

      const nightAssigned: Employee[] = [];

      scheduledNightIds.forEach(empId => {
        const emp = activeEmployees.find(e => e.id === empId);
        if (!emp) return;

        if (!isAvailable(empId)) {
          // CONFLICT! This night crew member is absent or on leave today.
          const isAbs = absencesAndLeaves[empId]?.absentDays.includes(d);
          const reason = isAbs ? "غائب طارئ اليوم" : "في إجازة رسمية";
          
          // CONFLICT RESOLUTION: Search the rest of nightPool first who is available,
          // and has worked the least nights overall.
          const replacements = nightPool.filter(candidate => {
            const isAssignedTonight = scheduledNightIds.includes(candidate.id);
            const isCandAvail = isAvailable(candidate.id);
            return !isAssignedTonight && isCandAvail;
          }).sort((a, b) => {
            return (nightShiftCounts[a.id] || 0) - (nightShiftCounts[b.id] || 0);
          });

          if (replacements.length > 0) {
            const chosenRepl = replacements[0];
            nightAssigned.push(chosenRepl);
            nightShiftCounts[chosenRepl.id]++;
            logs.push(`⚠️ تعارض ليل: ${emp.name} (${reason}) - تم استبداله بالطبيب البديل ${chosenRepl.name} لضمان تغطية المناوبة الليلية.`);
          } else {
            // Pick other general employee who is available
            const others = activeEmployees.filter(candidate => {
              const insideNightPool = nightPool.some(n => n.id === candidate.id);
              return !insideNightPool && isAvailable(candidate.id);
            }).sort((a, b) => {
              return (nightShiftCounts[a.id] || 0) - (nightShiftCounts[b.id] || 0);
            });

            if (others.length > 0) {
              const chosenRepl = others[0];
              nightAssigned.push(chosenRepl);
              nightShiftCounts[chosenRepl.id]++;
              logs.push(`🚨 تعارض حرج: عطل بالشبكة الليلية، تم استدعاء المناوب الاحتياطي المتاح ${chosenRepl.name} بدلاً من ${emp.name}.`);
            } else {
              logs.push(`🛑 فشل الجدولة الليلية: ${emp.name} غير متوفر لتأمين المناوبة الليلية ولا يوجد موظف تعويضي على الإطلاق!`);
            }
          }
        } else {
          nightAssigned.push(emp);
          nightShiftCounts[empId]++;
        }
      });

      // ----------------------------------------------------
      // B. EVENING SHIFT (Exactly 1 worker)
      // ----------------------------------------------------
      // Must not be scheduled on Night duty same day, and must be available
      const eveningCandidates = activeEmployees.filter(emp => {
        const isScheduledNight = nightAssigned.some(n => n.id === emp.id);
        return !isScheduledNight && isAvailable(emp.id);
      });

      const eveningAssigned: Employee[] = [];
      if (eveningCandidates.length > 0) {
        // Pick the worker with the lowest evening shift count so far for absolute fairness
        const sortedEvening = [...eveningCandidates].sort((a, b) => {
          return (eveningShiftCounts[a.id] || 0) - (eveningShiftCounts[b.id] || 0);
        });
        const chosen = sortedEvening[0];
        eveningAssigned.push(chosen);
        eveningShiftCounts[chosen.id]++;
      } else {
        logs.push(`🛑 عجز الفترة المسائية: لا تتوفر تغطية للكادر في الفترة المسائية.`);
      }

      // ----------------------------------------------------
      // C. MORNING SHIFT & WEEKENDS
      // ----------------------------------------------------
      const morningAssigned: Employee[] = [];
      if (isWeekend) {
        // Weekend Morning rules: Friday & Saturday have no standard full weekday morning shift.
        // Instead, we rotate 1 available worker to do weekend morning coverage fairly.
        const weekendCandidates = activeEmployees.filter(emp => {
          const isWorkingNight = nightAssigned.some(n => n.id === emp.id);
          const isWorkingEvening = eveningAssigned.some(e => e.id === emp.id);
          return !isWorkingNight && !isWorkingEvening && isAvailable(emp.id);
        });

        if (weekendCandidates.length > 0) {
          // Sort by previous weekend shift count (ascending) to guarantee rotation fairness
          const sortedWeekend = [...weekendCandidates].sort((a, b) => {
            return (weekendShiftCounts[a.id] || 0) - (weekendShiftCounts[b.id] || 0);
          });
          const chosen = sortedWeekend[0];
          morningAssigned.push(chosen);
          weekendShiftCounts[chosen.id]++;
          logs.push(`⚖️ مناوبة عطلة الويكند: الموظف ${chosen.name} يغطي عطلة الويكند (الجمعة/السبت) لضمان توزيع الأعباء بالتساوي.`);
        } else {
          logs.push(`🚨 عطلة مكشوفة: لم يعين موظف بالمناوبة الصباحية لعطلة الويكند لعدم تفرغ أي زميل.`);
        }
      } else {
        // Weekdays: All available workers (not on night/evening assigned, and not absent/on leave) are assigned.
        const weekdayMorningCandidates = activeEmployees.filter(emp => {
          const isWorkingNight = nightAssigned.some(n => n.id === emp.id);
          const isWorkingEvening = eveningAssigned.some(e => e.id === emp.id);
          return !isWorkingNight && !isWorkingEvening && isAvailable(emp.id);
        });
        morningAssigned.push(...weekdayMorningCandidates);
      }

      dailySchedules.push({
        dayNum: d,
        date,
        dayName,
        isWeekend,
        morning: morningAssigned,
        evening: eveningAssigned,
        night: nightAssigned,
        logs
      });
    }

    return {
      dailySchedules,
      weekendShiftCounts,
      eveningShiftCounts,
      nightShiftCounts
    };
  };

  const handleRunHospitalScheduling = () => {
    const results = runHospitalAlgorithm(hospitalAbsencesAndLeaves);
    if (results) {
      setHospitalResults(results);
      triggerToast("تم تشغيل ومحاكاة خوارزمية جدولة الـ 30 يوماً للمستشفى بنجاح بنظام عدالة الويكند وتفادي التعارضات!", "success");
    }
  };

  // Preset scenario handlers
  const handleApplyPreset = (type: "perfect" | "default" | "critical") => {
    let preset: { [empId: string]: { absentDays: string; vacationDays: string } } = {};
    if (type === "perfect") {
      // No leaves/vacations
      preset = {};
      triggerToast("تم تطبيق سيناريو الحضور التام بنجاح (لا إجازات ولا غيابات).", "info");
    } else if (type === "default") {
      preset = {
        "emp-2": { absentDays: "", vacationDays: "5,6,7,8,9,10" },
        "emp-5": { absentDays: "4", vacationDays: "" }
      };
      triggerToast("تم تطبيق سيناريو الإجازة المصرحة والغياب الطارئ.", "info");
    } else {
      preset = {
        "emp-2": { absentDays: "", vacationDays: "5,6,7,8,9,10" },
        "emp-5": { absentDays: "4,18", vacationDays: "" },
        "emp-4": { absentDays: "", vacationDays: "20,21,22,23,24,25" },
        "emp-3": { absentDays: "12", vacationDays: "" }
      };
      triggerToast("تم تطبيق سيناريو النقص الحرج وضغط العطلات بنجاح.", "info");
    }
    setHospitalAbsencesAndLeaves(preset);
    // Run algorithm automatically after setting the preset
    const results = runHospitalAlgorithm(preset);
    if (results) {
      setHospitalResults(results);
    }
  };

  // Run initial simulation
  useEffect(() => {
    const results = runHospitalAlgorithm(hospitalAbsencesAndLeaves);
    if (results) {
      setHospitalResults(results);
    }
  }, []);

  // Initialize bulk scheduling selections
  useEffect(() => {
    if (activeEmployees.length > 0 && selectedNightWorkers.length === 0 && selectedEveningWorkers.length === 0 && selectedMorningWorkers.length === 0) {
      // Intelligently distribute employees across the 3 exclusive categories
      const night: string[] = [];
      const evening: string[] = [];
      const morning: string[] = [];
      
      activeEmployees.forEach((emp, i) => {
        if (i < 3) {
          night.push(emp.id);
        } else if (i < 5) {
          evening.push(emp.id);
        } else {
          morning.push(emp.id);
        }
      });
      
      if (night.length === 0 && activeEmployees.length > 0) {
        night.push(activeEmployees[0].id);
      }
      if (evening.length === 0 && activeEmployees.length > 1) {
        evening.push(activeEmployees[1].id);
      }
      if (morning.length === 0 && activeEmployees.length > 2) {
        morning.push(activeEmployees[2].id);
      }
      
      setSelectedNightWorkers(night);
      setSelectedEveningWorkers(evening);
      setSelectedMorningWorkers(morning);
    }
  }, [employees]);

  // Utility to dynamically switch employee shift groups exclusively
  const assignEmployeeGroup = (empId: string, group: "night" | "evening" | "morning") => {
    setSelectedNightWorkers(prev => prev.filter(id => id !== empId));
    setSelectedEveningWorkers(prev => prev.filter(id => id !== empId));
    setSelectedMorningWorkers(prev => prev.filter(id => id !== empId));
    
    if (group === "night") {
      setSelectedNightWorkers(prev => [...prev, empId]);
    } else if (group === "evening") {
      setSelectedEveningWorkers(prev => [...prev, empId]);
    } else if (group === "morning") {
      setSelectedMorningWorkers(prev => [...prev, empId]);
    }
  };

  // Bulk collective schedule generator
  const handleGenerateBulkShifts = async () => {
    if (selectedNightWorkers.length === 0) {
      triggerToast("تنبيه: الرجاء تعيين عامل واحد على الأقل لطاقم الليل.", "alert");
      return;
    }
    if (selectedEveningWorkers.length === 0) {
      triggerToast("تنبيه: الرجاء تعيين عامل واحد على الأقل لطاقم المساء.", "alert");
      return;
    }
    if (selectedMorningWorkers.length === 0) {
      triggerToast("تنبيه: الرجاء تعيين عامل واحد على الأقل لطاقم الصباح.", "alert");
      return;
    }

    setBulkIsGenerating(true);
    try {
      const daysCount = Math.min(Math.max(bulkDaysCount, 1), 30);
      const datesToProcess: string[] = [];
      for (let d = 1; d <= daysCount; d++) {
        const dayStr = d < 10 ? `0${d}` : `${d}`;
        datesToProcess.push(`2026-06-${dayStr}`);
      }

      if (bulkCleanExisting) {
        triggerToast("جاري التطهير وإلغاء المناوبات السابقة لتجنب التداخل والازدواجية...", "info");
        const existingShiftsToClean = shifts.filter(sh => datesToProcess.includes(sh.date));
        for (const sh of existingShiftsToClean) {
          await onDeleteShift(sh.id);
        }
      }

      // Track individual shift assignments inside the loop
      const localNightCount: { [id: string]: number } = {};
      const localEveningCount: { [id: string]: number } = {};
      const localMorningCount: { [id: string]: number } = {};

      selectedNightWorkers.forEach(id => { localNightCount[id] = 0; });
      selectedEveningWorkers.forEach(id => { localEveningCount[id] = 0; });
      selectedMorningWorkers.forEach(id => { localMorningCount[id] = 0; });

      // Track last days worked for night (to enforce 1-on-2-off)
      const lastNightWorked: { [id: string]: number[] } = {};
      selectedNightWorkers.forEach(id => { lastNightWorked[id] = []; });

      // Divide evening crew into two groups/teams to enforce Week-on / Week-off
      // Team A works Weeks 1 & 3; Team B works Weeks 2 & 4
      const eveningTeamA = selectedEveningWorkers.filter((_, idx) => idx % 2 === 0);
      const eveningTeamB = selectedEveningWorkers.filter((_, idx) => idx % 2 === 1);

      let totalAdded = 0;

      for (let d = 1; d <= daysCount; d++) {
        const dayStr = d < 10 ? `0${d}` : `${d}`;
        const date = `2026-06-${dayStr}`;
        const dObj = new Date(Date.UTC(2026, 5, d));
        const dayOfWeekIndex = dObj.getUTCDay();
        const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6; // Friday/Saturday

        // ==========================================
        // 1. NIGHT SHIFT SELECTION (طاقم الليل)
        // ==========================================
        // We need exactly 2 night workers.
        // Rule: 1 night on, 2 nights off (cannot work if worked on day d-1 or d-2)
        let eligibleNightCandidates = selectedNightWorkers.filter(id => {
          const history = lastNightWorked[id] || [];
          const workedInLast2Days = history.includes(d - 1) || history.includes(d - 2);
          return !workedInLast2Days;
        });

        // Resilience check: if too few workers, fallback to 1 night rest, or anyone from list
        if (eligibleNightCandidates.length < Math.min(2, selectedNightWorkers.length)) {
          eligibleNightCandidates = selectedNightWorkers.filter(id => {
            const history = lastNightWorked[id] || [];
            return !history.includes(d - 1); // Only rest 1 night if we have small pool
          });
        }
        if (eligibleNightCandidates.length === 0) {
          eligibleNightCandidates = [...selectedNightWorkers]; // absolute fallback
        }

        // Sort by how many night shifts they've total done (fairness)
        eligibleNightCandidates.sort((idA, idB) => {
          const countA = localNightCount[idA] || 0;
          const countB = localNightCount[idB] || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });

        const assignedNightIds = eligibleNightCandidates.slice(0, Math.min(2, selectedNightWorkers.length));
        for (const empId of assignedNightIds) {
          localNightCount[empId] = (localNightCount[empId] || 0) + 1;
          if (!lastNightWorked[empId]) lastNightWorked[empId] = [];
          lastNightWorked[empId].push(d);

          await onAddShift({
            employeeId: empId,
            date,
            type: ShiftType.NIGHT,
            room: "غرفة الأشعة العادية (X-Ray)",
            hoursWorked: 12,
            note: "[طاقم الليل - تناوب ليلتين راحة]"
          });
          totalAdded++;
        }

        // ==========================================
        // 2. EVENING SHIFT SELECTION (طاقم المساء)
        // ==========================================
        // Rule: Works one week, rests one week. No morning or night shifts.
        const weekIndex = Math.floor((d - 1) / 7);
        const isWeekAActive = weekIndex % 2 === 0; // Weeks 1 & 3 are Team A; Weeks 2 & 4 are Team B
        
        let activeEveningPool = isWeekAActive ? eveningTeamA : eveningTeamB;
        if (activeEveningPool.length === 0) {
          activeEveningPool = selectedEveningWorkers;
        }

        const sortedEveningCandidates = [...activeEveningPool].sort((idA, idB) => {
          const countA = localEveningCount[idA] || 0;
          const countB = localEveningCount[idB] || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });

        if (sortedEveningCandidates.length > 0) {
          const eveningId = sortedEveningCandidates[0];
          localEveningCount[eveningId] = (localEveningCount[eveningId] || 0) + 1;

          await onAddShift({
            employeeId: eveningId,
            date,
            type: ShiftType.EVENING,
            room: "غرفة السونار (Ultrasound)",
            hoursWorked: 6,
            note: `[طاقم المساء - أسبوع عمل / أسبوع راحة (الدورة لـ 7 أيام)]`
          });
          totalAdded++;
        }

        // ==========================================
        // 3. MORNING SHIFT SELECTION (طاقم الصباح)
        // ==========================================
        // Rule: Work morning only. No evening or night.
        // The remaining employees work in the morning shift on standard weekdays (all of them work), 
        // and are divided/rotated on Friday & Saturday (only 1 works per weekend day).
        const morningCountNeeded = isWeekend ? 1 : selectedMorningWorkers.length;
        
        const sortedMorningCandidates = [...selectedMorningWorkers].sort((idA, idB) => {
          const countA = localMorningCount[idA] || 0;
          const countB = localMorningCount[idB] || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });

        const assignedMorningIds = sortedMorningCandidates.slice(0, morningCountNeeded);
        for (const empId of assignedMorningIds) {
          localMorningCount[empId] = (localMorningCount[empId] || 0) + 1;

          await onAddShift({
            employeeId: empId,
            date,
            type: ShiftType.MORNING,
            room: isWeekend ? "غرفة الرنين المغناطيسي (MRI)" : "غرفة الأشعة المقطعية (CT)",
            hoursWorked: 6,
            note: isWeekend ? "[طاقم الصباح - صباحية الويكند]" : "[طاقم الصباح - صباحية قياسية]"
          });
          totalAdded++;
        }
      }

      triggerToast(`تمت الجدولة الجماعية التلقائية بنجاح! تم توزيع وجدولة إجمالي ${totalAdded} مناوبة موزعة بعدالة بين العمال المحددين لمدّة ${daysCount} يوماً في النظام سحابياً بنقرة واحدة.`, "success");
      setActiveSubTab("collective");
    } catch (err) {
      console.error(err);
      triggerToast("حدث تعذر أثناء توليد المناوبات الجماعية.", "alert");
    } finally {
      setBulkIsGenerating(false);
    }
  };

  const handleUpdateAvailability = (empId: string, field: "absentDays" | "vacationDays", value: string) => {
    const updated = {
      ...hospitalAbsencesAndLeaves,
      [empId]: {
        ...(hospitalAbsencesAndLeaves[empId] || { absentDays: "", vacationDays: "" }),
        [field]: value
      }
    };
    setHospitalAbsencesAndLeaves(updated);
  };

  // Clean old shifts and submit newly generated roster for all 30 days
  const handleCommitHospitalRoster = async () => {
    if (!hospitalResults) return;
    setIsGenerating(true);
    try {
      // 1. Wipe all existing shifts in June 2026 to prevent overlapping
      triggerToast("جاري تنظيف وتطهير مناوبات شهر يونيو 2026 السابقة...", "info");
      const juneShifts = shifts.filter(sh => sh.date.startsWith("2026-06"));
      for (const sh of juneShifts) {
        await onDeleteShift(sh.id);
      }

      // 2. Add the newly calculated shifts
      let addCount = 0;
      for (const day of hospitalResults.dailySchedules) {
        // Morning shifts
        for (const emp of day.morning) {
          await onAddShift({
            employeeId: emp.id,
            date: day.date,
            type: ShiftType.MORNING,
            room: day.isWeekend ? "غرفة الرنين المغناطيسي (MRI)" : "غرفة الأشعة المقطعية (CT)",
            hoursWorked: 6,
            note: day.isWeekend ? "[توزيع الويكند العادل]" : "[الدوام الصباحي القياسي للمشفى]"
          });
          addCount++;
        }

        // Evening shift (Exactly 1 worker)
        for (const emp of day.evening) {
          await onAddShift({
            employeeId: emp.id,
            date: day.date,
            type: ShiftType.EVENING,
            room: "غرفة السونار (Ultrasound)",
            hoursWorked: 6,
            note: "[المناوبة المسائية العادلة لعضو واحد]"
          });
          addCount++;
        }

        // Night shifts (2 workers)
        for (const emp of day.night) {
          await onAddShift({
            employeeId: emp.id,
            date: day.date,
            type: ShiftType.NIGHT,
            room: "غرفة الأشعة العادية (X-Ray)",
            hoursWorked: 12,
            note: "[مناوبة الليل التناوبية 1-on, 2-off]"
          });
          addCount++;
        }
      }

      triggerToast(`تم بنجاح وبسرعة جدولة وتضمين ${addCount} مناوبة مع المزامنة السحابية لـ 30 يوماً!`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("حدث تعذر في جدولة وتنزيل الجدول السحابي.", "alert");
    } finally {
      setIsGenerating(false);
    }
  };

  // Legacy 10-day generator for Smart scheduling tab Compatibility
  const handleGeneratePreview = () => {
    if (activeEmployees.length === 0) {
      triggerToast("خطأ: لا يوجد عمال مسجلين لتوليد الجدول.", "alert");
      return;
    }

    const generated: GeneratedShiftPreview[] = [];
    const nightGroupA = activeEmployees.filter(e => e.id === "emp-3" || e.id === "emp-4");
    const nightGroupB = activeEmployees.filter(e => e.id === "emp-5" || e.id === "emp-6");
    const nightGroupC = activeEmployees.filter(e => e.id === "emp-2" || e.id === "emp-7");

    PREVIEW_DAYS.forEach((day, index) => {
      let nightStaff: Employee[] = [];
      let nightRule = "";
      const cycleDay = index % 6;

      if (cycleDay === 0 || cycleDay === 1) {
        nightStaff = nightGroupA;
        nightRule = "تناوب الليل: المجموعة (أ) - مناوبة 1 من ليلتين متتاليتين";
      } else if (cycleDay === 2 || cycleDay === 3) {
        nightStaff = nightGroupB;
        nightRule = "تناوب الليل: المجموعة (ب) - مناوبة 2 من ليلتين متتاليتين";
      } else {
        nightStaff = nightGroupC;
        nightRule = "تناوب الليل: المجموعة (ج) - مناوبة 3 من ليلتين متتاليتين";
      }

      const eveningCandidates = activeEmployees.filter(
        emp => !nightStaff.some(n => n.id === emp.id) && emp.role !== UserRole.MANAGER
      );
      const eveningVolIndex = index % eveningCandidates.length;
      const eveningStaffSelected = eveningCandidates[eveningVolIndex] ? [eveningCandidates[eveningVolIndex]] : [];
      let eveningRule = `تم بالاختيار والتطوع الاختياري لبناء رصيد نقاط العمال (+5 نقاط رصيد)`;

      let morningStaff: Employee[] = [];
      let morningRule = "";

      if (day.isWeekend) {
        const weekendCandidates = activeEmployees.filter(
          emp => !nightStaff.some(n => n.id === emp.id) && !eveningStaffSelected.some(e => e.id === emp.id)
        );

        const sortedWeekendCandidates = [...weekendCandidates].sort((a, b) => {
          const aPoints = a.points || 0;
          const bPoints = b.points || 0;
          const aWeight = a.weekendWeight || 0;
          const bWeight = b.weekendWeight || 0;
          const aIndexVal = activeEmployees.findIndex(e => e.id === a.id);
          const bIndexVal = activeEmployees.findIndex(e => e.id === b.id);

          const aScore = ((aIndexVal + index) % activeEmployees.length) + (aWeight * 3) - (aPoints * 0.5);
          const bScore = ((bIndexVal + index) % activeEmployees.length) + (bWeight * 3) - (bPoints * 0.5);
          return aScore - bScore;
        });

        const selectedForWeekend = sortedWeekendCandidates[0] ? [sortedWeekendCandidates[0]] : [];
        morningStaff = selectedForWeekend;
        morningRule = `مناوبة عطلة الويكند طوعية ومنسقة بالمعادلة اللوغاريتمية المتطورة للعدالة`;
      } else {
        const regularMorningCandidates = activeEmployees.filter(
          emp => !nightStaff.some(n => n.id === emp.id) && !eveningStaffSelected.some(e => e.id === emp.id) && emp.specialty !== StaffSpecialty.SECRETARY
        );
        morningStaff = regularMorningCandidates.slice(0, 2);
        morningRule = "فترة صباحية قياسية (باستثناء الجمعة والسبت)";
      }

      generated.push({
        date: day.date,
        dayName: day.dayName,
        isWeekend: day.isWeekend,
        morningStaff,
        eveningStaff: eveningStaffSelected,
        nightStaff,
        morningNote: day.isWeekend ? "عطلة نهاية الأسبوع - مناوبة اختيارية طوعية" : "الأشعة والتقارير الصباحية المعتادة",
        eveningNote: "متابعة الطوارئ وتصوير الحالات الفورية",
        nightNote: "المناوبات التتابعية للأمن وتقنية الطوارئ",
        morningRule,
        eveningRule,
        nightRule
      });
    });

    setPreviewShifts(generated);
    setActiveSubTab("preview");
    triggerToast("تمت محاكاة وتوزيع الجدول الذكي لـ 10 أيام بنجاح وفق معادلات العدالة!", "success");
  };

  const handleCommitPreview = async () => {
    if (previewShifts.length === 0) return;
    setIsGenerating(true);

    try {
      const currentRangeDates = PREVIEW_DAYS.map(d => d.date);
      const shiftsToClear = shifts.filter(sh => currentRangeDates.includes(sh.date));
      
      triggerToast(`جاري تطهير ${shiftsToClear.length} مناوبة سابقة للتأكد من عدم التداخل...`, "info");
      
      for (const sh of shiftsToClear) {
        await onDeleteShift(sh.id);
      }

      let addedCount = 0;
      for (const prev of previewShifts) {
        for (const emp of prev.morningStaff) {
          await onAddShift({
            employeeId: emp.id,
            date: prev.date,
            type: ShiftType.MORNING,
            room: "غرفة الأشعة المقطعية (CT)",
            hoursWorked: 6,
            note: `[توليد تلقائي ذكي] ${prev.morningNote}`
          });
          addedCount++;
        }

        for (const emp of prev.eveningStaff) {
          await onAddShift({
            employeeId: emp.id,
            date: prev.date,
            type: ShiftType.EVENING,
            room: "غرفة الرنين المغناطيسي (MRI)",
            hoursWorked: 6,
            note: `[تطوعي ذكي بقوة +5] ${prev.eveningNote}`
          });

          const currentPts = emp.points || 0;
          await onUpdateEmployee(emp.id, { points: currentPts + 5 });
          addedCount++;
        }

        for (const emp of prev.nightStaff) {
          await onAddShift({
            employeeId: emp.id,
            date: prev.date,
            type: ShiftType.NIGHT,
            room: "غرفة الأشعة العادية (X-Ray)",
            hoursWorked: 12,
            note: `[تناوب ليل 12 ساعة] ${prev.nightNote}`
          });

          const currentPts = emp.points || 0;
          await onUpdateEmployee(emp.id, { points: currentPts + 10 });
          addedCount++;
        }
      }

      triggerToast(`تم جدولة وتنزيل ${addedCount} مناوبة ذكية بنجاح! تم منح وتحديث نقاط الكادر المتطوع.`, "success");
      setPreviewShifts([]);
      setActiveSubTab("hospitalsched");
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      triggerToast("خطأ أثناء تنزيل الجدولة الذكية.", "alert");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimEmpId) {
      triggerToast("الرجاء تحديد الموظف أولاً.", "alert");
      return;
    }

    const matchedEmp = employees.find(e => e.id === selectedSimEmpId);
    if (!matchedEmp) return;

    const currentPoints = matchedEmp.points || 0;
    const changeAmount = simPointsChange;
    let updatedPoints = currentPoints;

    if (simAction === "add") {
      updatedPoints = currentPoints + changeAmount;
      triggerToast(`تم منح الكادر ${matchedEmp.name} عدد +${changeAmount} نقاط تطوع!`, "success");
    } else {
      if (currentPoints < changeAmount) {
        triggerToast("رصيد الموظف غير كافٍ لإجراء هذه المقايضة بالنقاط.", "alert");
        return;
      }
      updatedPoints = currentPoints - changeAmount;
      triggerToast(`تم استخدام ${changeAmount} نقطة من رصيد ${matchedEmp.name} بنجاح!`, "info");
    }

    await onUpdateEmployee(matchedEmp.id, { points: updatedPoints });
    
    setSimPointsChange(5);
    setSimNote("");
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 border border-indigo-700/40 p-6 rounded-3xl shadow-xl text-white mb-6 transition-all duration-300 relative overflow-hidden" id="smart-scheduling-dashboard-control">
      {/* Visual background decors */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10" dir="rtl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-teal-400 to-indigo-500 rounded-xl text-slate-900 shadow-md">
              <Bot className="h-5 w-5 text-slate-900 animate-bounce" />
            </span>
            <h3 className="text-base font-black tracking-tight text-white flex gap-2">
              <span>منصة التعيين والجدولة الجماعية الذكية للمناوبات</span>
              <span className="bg-teal-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide">شهر كامل</span>
            </h3>
          </div>
          <p className="text-xs text-indigo-200/80 leading-relaxed font-semibold">
            قسّم الكادر بالكامل بنقرة واحدة لتوزيع المناوبات النهارية، والمسائية بالتناوب الأسبوعي، والليلية بمعدل ليلة عمل وليلتين من الراحة المطلقة وتفادي الازدواج أو التداخل تلقائياً.
          </p>
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-5 py-2.5 w-full md:w-auto bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md shadow-teal-500/15 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] duration-150"
        >
          <Sparkles className="h-4 w-4 text-slate-950" />
          <span>{isOpen ? "إخفاء لوحة الجدولة" : "تفعيل الجدولة والمحاكاة الذكية"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 border-t border-indigo-500/30 pt-6 relative z-10 animate-fade-in" dir="rtl">
          
          {/* Manager display control settings */}
          {currentUser?.role === UserRole.MANAGER && (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-teal-400 font-sans flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
                  تحكم المدير الفوري في صلاحيات مصلحة رؤية اللوحات للآخرين
                </span>
                <p className="text-xs text-indigo-200">
                  حدد أي من اللوحات الذكية المتقدمة يُسمح لباقي موظفي المصلحة باستعراضها آلياً على شاشاتهم.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 px-3 py-1.5 rounded-xl border border-indigo-800 hover:border-teal-500/50 transition-colors">
                  <input
                    type="checkbox"
                    className="accent-teal-400 h-4 w-4 cursor-pointer"
                    checked={settings?.showSmartControlToEmployees !== false}
                    onChange={(e) => {
                      onUpdateSettings({
                        showSmartControlToEmployees: e.target.checked,
                        showAlgorithmToEmployees: settings?.showAlgorithmToEmployees !== false,
                      });
                    }}
                  />
                  <span className="text-xs font-bold text-white">عرض لوحة التحكم بالجدولة للآخرين</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 px-3 py-1.5 rounded-xl border border-indigo-800 hover:border-teal-500/50 transition-colors">
                  <input
                    type="checkbox"
                    className="accent-teal-400 h-4 w-4 cursor-pointer"
                    checked={settings?.showAlgorithmToEmployees !== false}
                    onChange={(e) => {
                      onUpdateSettings({
                        showSmartControlToEmployees: settings?.showSmartControlToEmployees !== false,
                        showAlgorithmToEmployees: e.target.checked,
                      });
                    }}
                  />
                  <span className="text-xs font-bold text-white">عرض خوارزمية ومعادلات 30 يوم للآخرين</span>
                </label>
              </div>
            </div>
          )}

          {/* WhatsApp Integration Settings */}
          {currentUser?.role === UserRole.MANAGER && (
            <div className="mb-6 p-5 rounded-2xl bg-teal-950/20 border border-teal-500/30 animate-fade-in text-right">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-500/10 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-black text-teal-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>إعدادات بوابة ومزود خدمة WhatsApp لربط وتذكير الموظفين</span>
                  </h4>
                  <p className="text-xs text-indigo-200 mt-1">
                    قم بتهيئة خادم الإرسال السحابي والآلي للرسائل أو كتابة قالب التذكير العام لإرسال إشعارات فورية عبر WhatsApp.
                  </p>
                </div>
                
                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950/60 px-4 py-2 rounded-xl border border-teal-500/30 hover:border-emerald-500 transition-colors">
                  <input
                    type="checkbox"
                    className="accent-emerald-400 h-4.5 w-4.5 cursor-pointer"
                    checked={settings?.whatsappEnabled === true}
                    onChange={(e) => {
                      onUpdateSettings({
                        ...settings,
                        showSmartControlToEmployees: settings?.showSmartControlToEmployees !== false,
                        showAlgorithmToEmployees: settings?.showAlgorithmToEmployees !== false,
                        whatsappEnabled: e.target.checked
                      } as any);
                    }}
                  />
                  <div>
                    <span className="text-xs font-black text-white block">تفعيل بوابة الإرسال الآلي</span>
                    <span className="text-[10px] text-teal-300 block">يقوم بإرسال رسائل خلفية باستخدام API بدلاً من الروابط اليدوية</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-teal-300 block">رمز توكن Meta للوصول السحابي (Meta Graph Access Token)</label>
                  <input
                    type="password"
                    placeholder="EAAW..."
                    className="w-full text-xs bg-slate-950/90 border border-indigo-900 focus:border-teal-400 text-white rounded-xl py-2 px-3 focus:outline-none text-left font-mono"
                    value={settings?.whatsappToken || ""}
                    onChange={(e) => {
                      onUpdateSettings({
                        ...settings,
                        showSmartControlToEmployees: settings?.showSmartControlToEmployees !== false,
                        showAlgorithmToEmployees: settings?.showAlgorithmToEmployees !== false,
                        whatsappToken: e.target.value
                      } as any);
                    }}
                    dir="ltr"
                  />
                  <p className="text-[9px] text-slate-400">توكن صلاحيات مطور Meta لمشروع WhatsApp Business الخاص بك.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-teal-300 block">معرف رقم الهاتف المرسل (Phone Number ID)</label>
                  <input
                    type="text"
                    placeholder="109283748293749"
                    className="w-full text-xs bg-slate-950/90 border border-indigo-900 focus:border-teal-400 text-white rounded-xl py-2 px-3 focus:outline-none text-left font-mono"
                    value={settings?.whatsappPhoneId || ""}
                    onChange={(e) => {
                      onUpdateSettings({
                        ...settings,
                        showSmartControlToEmployees: settings?.showSmartControlToEmployees !== false,
                        showAlgorithmToEmployees: settings?.showAlgorithmToEmployees !== false,
                        whatsappPhoneId: e.target.value
                      } as any);
                    }}
                    dir="ltr"
                  />
                  <p className="text-[9px] text-slate-400">موصول بحساب الأعمال السحابي على Facebook App Console.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-teal-300">يستخدم {`{name}`} لاسم العامل، {`{date}`} للتاريخ، {`{type}`} للفترة، {`{room}`} للغرفة، {`{time}`} للوقت، {`{remaining}`} للوقت المتبقي للبدء.</span>
                  <label className="text-[11px] font-bold text-teal-300">نص وقالب التذكير المخصص (العربية):</label>
                </div>
                <textarea
                  rows={3}
                  className="w-full text-xs bg-slate-950/90 border border-indigo-900 focus:border-teal-400 text-white rounded-xl py-2.5 px-3 focus:outline-none leading-relaxed"
                  placeholder="السلام عليكم ورحمة الله وبركاته يا {name}، تذكير بمناوبتك المقررة في مصلحة الأشعة: اليوم {date} فترة {type} في {room} عند الساعة {time}. الوقت المتبقي للبدء: {remaining}."
                  value={settings?.whatsappCustomMessageTemplate || ""}
                  onChange={(e) => {
                    onUpdateSettings({
                      ...settings,
                      showSmartControlToEmployees: settings?.showSmartControlToEmployees !== false,
                      showAlgorithmToEmployees: settings?.showAlgorithmToEmployees !== false,
                      whatsappCustomMessageTemplate: e.target.value
                    } as any);
                  }}
                />
              </div>
            </div>
          )}

          {/* Sub-tabs switcher */}
          <div className="flex flex-wrap gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-indigo-800/40 mb-6 max-w-5xl">
            <button
              onClick={() => setActiveSubTab("collective")}
              className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeSubTab === "collective" 
                  ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md" 
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Users className="inline-block h-4 w-4 ml-1.5" />
              الجدولة الجماعية السريعة ⚡
            </button>
            
            {(settings?.showAlgorithmToEmployees !== false || currentUser?.role === UserRole.MANAGER) && (
              <>
                <button
                  onClick={() => setActiveSubTab("hospitalsched")}
                  className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSubTab === "hospitalsched" 
                      ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md" 
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Calendar className="inline-block h-4 w-4 ml-1.5" />
                  الجدول والموازنة (30 يوم)
                </button>
                <button
                  onClick={() => setActiveSubTab("algorithm")}
                  className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSubTab === "algorithm" 
                      ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md" 
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Calculator className="inline-block h-4 w-4 ml-1.5" />
                  المعادلات وصيغة الحصانة
                </button>
                <button
                  onClick={() => setActiveSubTab("credits")}
                  className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSubTab === "credits" 
                      ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md" 
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Coins className="inline-block h-4 w-4 ml-1.5" />
                  نقاط الصرف والمرونة
                </button>
                <button
                  onClick={() => setActiveSubTab("preview")}
                  className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer relative ${
                    activeSubTab === "preview" 
                      ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md" 
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <CalendarDays className="inline-block h-4 w-4 ml-1.5" />
                  معاينة الرصيد (10 أيام)
                  {previewShifts.length > 0 && (
                    <span className="absolute top-1 left-2 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              </>
            )}
          </div>

          {/* COLLECTIVE QUICK SCHEDULER SUBTAB */}
          {activeSubTab === "collective" && (
            <div className="space-y-6 animate-fade-in text-right" dir="rtl">
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-indigo-500/30 space-y-6">
                
                {/* Header Information and Rules Explanation */}
                <div className="flex items-center gap-3 pb-3 border-b border-indigo-500/20">
                  <span className="p-2.5 bg-indigo-500/20 rounded-xl text-teal-350">
                    <Shuffle className="h-5 w-5 animate-pulse text-teal-350" />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-white">منصة التعيين والجدولة الجماعية السريعة ⚡</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      قسّم العمال إلى مجموعات مخصصة وسيتولى المساعد الذكي تطبيق القواعد الشرطية والراحة تلقائياً لتوليد جدول عادل متكامل بنقرة زر واحدة!
                    </p>
                  </div>
                </div>

                {/* Exclusive Rules Guide Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-purple-950/25 border border-purple-500/20 p-4 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>طاقم المناوبات الليلية 🟣 (تاع الليل)</span>
                    </h5>
                    <p className="text-[10px] text-purple-200/80 leading-relaxed font-medium">
                      يعمل الموظف ليلة واحدة (12 ساعة) ثم يستفيد تلقائياً من <strong>ليلتين كاملتين من الراحة (1-on, 2-off)</strong>. ولا يعمل في الصباح أو المساء أبداً.
                    </p>
                  </div>

                  <div className="bg-sky-950/25 border border-sky-500/20 p-4 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      <span>طاقم المناوبات المسائية 🔵 (تاع العشية)</span>
                    </h5>
                    <p className="text-[10px] text-sky-200/80 leading-relaxed font-medium">
                      يعمل الموظف <strong>أسبوعاً كاملاً (7 أيام عمل مسائي) ثم يرتاح أسبوعاً كاملاً بالتناوب الدوري</strong>. ولا يعمل في الفترة الصباحية أو الليلية على الإطلاق.
                    </p>
                  </div>

                  <div className="bg-emerald-950/25 border border-emerald-500/20 p-4 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>طاقم المناوبات الصباحية 🟢 (تاع النهار)</span>
                    </h5>
                    <p className="text-[10px] text-emerald-200/80 leading-relaxed font-medium">
                      يعمل الموظف بالفترة الصباحية القياسية القيادية فقط (6 ساعات). ولا يعمل في المساء أو الليل نهائياً لتنظيم أوقات نومه ومناوباته النهارية.
                    </p>
                  </div>
                </div>

                {/* Employees Assignment Roster Selection Grid */}
                <div className="bg-slate-950/75 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-950">
                    <h5 className="text-xs font-black text-indigo-300 flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span>فرز وتخصيص كادر العمل للمناوبات (توزيع حصري):</span>
                    </h5>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-350 px-2.5 py-1 rounded-full font-black">
                      إجمالي الكادر النشط: {activeEmployees.length} عمال
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {activeEmployees.map(emp => {
                      const isNight = selectedNightWorkers.includes(emp.id);
                      const isEvening = selectedEveningWorkers.includes(emp.id);
                      const isMorning = selectedMorningWorkers.includes(emp.id);
                      
                      let activeGroupLabel = "غير معين";
                      let activeGroupColor = "text-slate-400 bg-slate-900";
                      
                      if (isNight) {
                        activeGroupLabel = "طاقم الليل 🟣";
                        activeGroupColor = "text-purple-300 bg-purple-500/10 border-purple-500/35";
                      } else if (isEvening) {
                        activeGroupLabel = "طاقم المساء 🔵";
                        activeGroupColor = "text-sky-300 bg-sky-500/10 border-sky-500/35";
                      } else if (isMorning) {
                        activeGroupLabel = "طاقم الصباح 🟢";
                        activeGroupColor = "text-emerald-300 bg-emerald-500/10 border-emerald-500/35";
                      }

                      return (
                        <div
                          key={emp.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-900/40 border border-slate-850 rounded-xl gap-3 hover:bg-slate-900/80 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-xs font-extrabold text-indigo-300 border border-indigo-500/20">
                              {emp.name.charAt(0)}
                            </span>
                            <div className="text-right">
                              <span className="text-xs font-black text-white block">{emp.name}</span>
                              <span className="text-[9px] text-slate-400">
                                {emp.specialty === StaffSpecialty.RADIOLOGIST ? "أخصائي أشعة (طبيب)" : "فني أشعة (تقني)"}
                              </span>
                            </div>
                          </div>

                          {/* Current active badge & Group switch buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-black ${activeGroupColor}`}>
                              المجموعة الحالية: {activeGroupLabel}
                            </span>

                            <div className="flex rounded-lg overflow-hidden border border-slate-800 p-0.5 bg-slate-950">
                              <button
                                type="button"
                                onClick={() => assignEmployeeGroup(emp.id, "night")}
                                className={`px-2.5 py-1 text-[9px] font-black cursor-pointer transition-all ${
                                  isNight
                                    ? "bg-purple-600 text-white rounded-md shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                ليلية 20:00
                              </button>
                              <button
                                type="button"
                                onClick={() => assignEmployeeGroup(emp.id, "evening")}
                                className={`px-2.5 py-1 text-[9px] font-black cursor-pointer transition-all ${
                                  isEvening
                                    ? "bg-sky-600 text-white rounded-md shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                مسائية 14:00
                              </button>
                              <button
                                type="button"
                                onClick={() => assignEmployeeGroup(emp.id, "morning")}
                                className={`px-2.5 py-1 text-[9px] font-black cursor-pointer transition-all ${
                                  isMorning
                                    ? "bg-emerald-600 text-white rounded-md shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                صباحية 08:00
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Duration and Settings */}
                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-350 mb-1">أيام الجدول المطلوب ضخها وتوليدها تلقائياً:</label>
                    <div className="flex gap-2">
                      {[7, 15, 30].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setBulkDaysCount(days)}
                          className={`flex-1 py-2 px-3 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                            bulkDaysCount === days 
                              ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 border-teal-400 font-bold animate-pulse" 
                              : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          {days === 30 ? "شهر كامل (30 يوم)" : `${days} أيام`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:pr-4">
                    <span className="block text-xs font-black text-slate-350 mb-1">الوقاية التلقائية من تداخل المواعيد:</span>
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bulkCleanExisting}
                        onChange={(e) => setBulkCleanExisting(e.target.checked)}
                        className="accent-teal-400 h-4 w-4 cursor-pointer"
                      />
                      <span>حذف وتطهير أي مواعيد ومناوبات مجدولة سابقة وتجنب الازدواج التلقائي</span>
                    </label>
                  </div>
                </div>

                {/* Submitting collective shifts */}
                <div className="pt-3 flex justify-center">
                  <button
                    onClick={handleGenerateBulkShifts}
                    disabled={bulkIsGenerating}
                    className="w-full md:max-w-md py-4 bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 text-xs font-black rounded-xl shadow-xl hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {bulkIsGenerating ? (
                      <>
                        <span className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" />
                        <span>جاري الحساب السريع والجدولة الجماعية سحابياً...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 text-slate-950 fill-white" />
                        <span>تأكيد وضخ المناوبات الجماعية بنقرة واحدة ⚡</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HOSPITAL 30-DAY SCHEDULER TAB */}
          {activeSubTab === "hospitalsched" && (
            <div className="space-y-6">
              
              {/* Grid with parameters configuration and diagnostics */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1. INPUT DATABASE OF ATTENDANCE, ABSENCES & LEAVES */}
                <div className="bg-slate-900/70 p-5 rounded-2xl border border-indigo-800/40 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-800/30">
                    <h4 className="text-sm font-black text-teal-300 flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-teal-400" />
                      <span>مدخلات غياب وإجازات الطاقم (Inputs)</span>
                    </h4>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                    حدد أيام الغياب الطارئة والإجازات الدورية لكل موظف خلال هذا الشهر (أرقام الأيام من 1 إلى 30 مفصولة بفاصلة):
                  </p>

                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {activeEmployees.map((emp) => {
                      const record = hospitalAbsencesAndLeaves[emp.id] || { absentDays: "", vacationDays: "" };
                      return (
                        <div key={emp.id} className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-white">{emp.name}</span>
                            <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-black font-sans uppercase">
                              {emp.id === "emp-1" || emp.id === "emp-2" ? "طبيب" : "تقني"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-slate-400 mb-0.5">أيام الغياب الفجائي:</label>
                              <input
                                type="text"
                                placeholder="مثال: 4, 15"
                                value={record.absentDays}
                                onChange={(e) => handleUpdateAvailability(emp.id, "absentDays", e.target.value)}
                                className="w-full text-xs p-1.5 bg-slate-900 border border-slate-750 text-white rounded focus:outline-none focus:ring-1 focus:ring-teal-400 text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-slate-400 mb-0.5">أيام الإجازة الدورية:</label>
                              <input
                                type="text"
                                placeholder="مثال: 5,6,7,8"
                                value={record.vacationDays}
                                onChange={(e) => handleUpdateAvailability(emp.id, "vacationDays", e.target.value)}
                                className="w-full text-xs p-1.5 bg-slate-900 border border-slate-750 text-white rounded focus:outline-none focus:ring-1 focus:ring-teal-400 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Preset Quick Actions */}
                  <div className="pt-2 border-t border-indigo-800/20 space-y-2">
                    <span className="block text-[10px] text-slate-400 font-bold">سيناريوهات الحضور الجاهزة للاختبار:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleApplyPreset("perfect")}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                      >
                        حضور كامل
                      </button>
                      <button
                        onClick={() => handleApplyPreset("default")}
                        className="py-1.5 px-2 bg-indigo-950 text-teal-300 border border-teal-500/20 hover:bg-indigo-900 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                      >
                        إجازة د. أمل
                      </button>
                      <button
                        onClick={() => handleApplyPreset("critical")}
                        className="py-1.5 px-2 bg-rose-950/40 text-rose-300 border border-rose-500/20 hover:bg-rose-900/30 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                      >
                        نقص حرج
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. FAIRNESS & ROTATION STATISTICS SUMMARY */}
                <div className="bg-slate-900/70 p-5 rounded-2xl border border-indigo-800/40 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-teal-300 flex items-center gap-2">
                      <Calculator className="h-4.5 w-4.5 text-teal-400" />
                      <span>تشخيص عدالة التوزيع الـ 30 يوماً</span>
                    </h4>

                    {hospitalResults ? (
                      <div className="space-y-3.5">
                        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                          تقرير تفصيلي لعدد المناوبات الممنوحة لكل الكادر الطبي، متقداً ببرهان العدالة ونظام التناوب الدوري:
                        </p>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                            <span className="block text-[9px] text-slate-400 mb-0.5">صباحي ويكند</span>
                            <strong className="text-sky-300 text-xs font-mono">
                              {(Object.values(hospitalResults.weekendShiftCounts) as number[]).reduce((a, b) => a + b, 0)} مناوبة
                            </strong>
                          </div>
                          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                            <span className="block text-[9px] text-slate-400 mb-0.5">مسائي (1 فرد)</span>
                            <strong className="text-teal-300 text-xs font-mono">
                              {(Object.values(hospitalResults.eveningShiftCounts) as number[]).reduce((a, b) => a + b, 0)} مناوبة
                            </strong>
                          </div>
                          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                            <span className="block text-[9px] text-slate-400 mb-0.5 font-sans">ليلي (2 فرد)</span>
                            <strong className="text-purple-300 text-xs font-mono">
                              {(Object.values(hospitalResults.nightShiftCounts) as number[]).reduce((a, b) => a + b, 0)} ليلة
                            </strong>
                          </div>
                        </div>

                        <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                          {activeEmployees.map(emp => (
                            <div key={emp.id} className="flex justify-between items-center text-[10px] bg-slate-950/50 p-2 rounded-lg border border-slate-850">
                              <span className="font-black text-slate-200">{emp.name}</span>
                              <div className="flex gap-2.5 text-slate-300 font-mono">
                                <span>صباح ريادي: <strong className="text-white">{hospitalResults.weekendShiftCounts[emp.id] || 0}</strong></span>
                                <span className="text-teal-400">مسائي: <strong>{hospitalResults.eveningShiftCounts[emp.id] || 0}</strong></span>
                                <span className="text-purple-400">ليلي: <strong>{hospitalResults.nightShiftCounts[emp.id] || 0}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        الرجاء تشغيل الخوارزمية لمعاينة تقرير إحصاءات العدالة.
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleRunHospitalScheduling}
                      className="w-full py-3 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-2 duration-150"
                    >
                      <Play className="h-4.5 w-4.5 text-slate-950 fill-slate-950" />
                      <span>إعادة محاكاة وتشغيل الخوارزمية الفوري</span>
                    </button>
                  </div>
                </div>

                {/* 3. REALTIME CONFLICT RESOLUTION LOGS */}
                <div className="bg-slate-900/70 p-5 rounded-2xl border border-indigo-800/40 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-400 animate-pulse" />
                      <span>منصة الإحلال وحل التعارضات الفوري</span>
                    </h4>
                    
                    <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                      تتولى الخوارزمية تلقائياً رصد حالات عجز الكادر أو غيابهم عن المناوبة المطلوبة وتبحث في قاعدة البيانات عن الزميل المتاح لتعويضه طارئاً:
                    </p>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {hospitalResults && hospitalResults.dailySchedules.some(d => d.logs.length > 0) ? (
                        hospitalResults.dailySchedules.flatMap((d) => 
                          d.logs.map((log, idx) => (
                            <div key={`${d.dayNum}-${idx}`} className="p-2.5 bg-rose-950/15 border border-rose-900/40 text-[10px] text-rose-200 rounded-lg text-right flex items-start gap-2">
                              <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[8px] font-sans font-black shrink-0 mt-0.5">يوم {d.dayNum}</span>
                              <span className="leading-relaxed font-medium">{log}</span>
                            </div>
                          ))
                        )
                      ) : (
                        <div className="p-4 text-center text-emerald-400 bg-emerald-950/10 border border-emerald-900/30 rounded-xl text-xs flex items-center justify-center gap-1.5">
                          <Check className="h-4 w-4" />
                          <span>جميع أيام الشهر مغطاة بمثالية وبلا تداخلات حرجة!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleCommitHospitalRoster}
                      disabled={isGenerating || !hospitalResults}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-xs font-black rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-2 duration-150"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                          <span>جاري الجدولة والتثبيت السحابي المستمر...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4.5 w-4.5 text-slate-950" />
                          <span>اعتماد وحفظ الجدول ذي الـ 30 يوماً سحابياً</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE 30-DAY TIMELINE CALENDAR GRID */}
              {hospitalResults && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-indigo-900/50">
                    <div>
                      <h4 className="text-xs font-black text-teal-300">جدول المناوبات الكامل والمولد لشهر يونيو 2026</h4>
                      <p className="text-[10px] text-slate-400 mt-1">توضح الأيام في عطل السبت والجمعة باللون المذهب (الصباحي طوعي بالتناوب).</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-slate-900/60 rounded-2xl border border-indigo-800/30">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-indigo-950/80 bg-slate-950/60 text-slate-300 font-black">
                          <th className="p-3">اليوم والتاريخ</th>
                          <th className="p-3 text-center">المناوبة الصباحية (08:00 - 14:00)</th>
                          <th className="p-3 text-center">المناوبة المسائية (14:00 - 20:00)</th>
                          <th className="p-3 text-center">المناوبة الليلية (20:00 - 08:00)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-950/50 font-medium">
                        {hospitalResults.dailySchedules.map((day) => (
                          <tr 
                            key={day.dayNum} 
                            className={`hover:bg-indigo-950/20 transition-all ${
                              day.isWeekend ? "bg-amber-500/5 border-r-4 border-r-amber-400" : ""
                            }`}
                          >
                            <td className="p-3 whitespace-nowrap">
                              <span className="block font-black text-white">{day.dayName}</span>
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{day.date}</span>
                              {day.isWeekend && (
                                <span className="inline-block mt-1 bg-amber-500/20 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-black">عطلة نهاية الأسبوع</span>
                              )}
                            </td>

                            {/* Morning Column */}
                            <td className="p-3">
                              {day.morning.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">إجازة مصلحة / لا تغطية واجبة</div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap justify-center gap-1.5">
                                    {day.morning.map(s => (
                                      <span key={s.id} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-black font-sans shadow-sm">
                                        {s.name}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="block text-[8px] text-slate-400 text-center font-sans">
                                    {day.isWeekend ? "توزيع الويكند العادل (فرد واحد)" : "جميع عمال الكادر المتوفرين"}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Evening Column (Exactly 1 worker) */}
                            <td className="p-3">
                              {day.evening.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">غير مغطى</div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex justify-center">
                                    {day.evening.map(s => (
                                      <span key={s.id} className="bg-sky-500/10 text-sky-300 border border-sky-500/10 px-2.5 py-0.5 rounded text-[10px] font-black shadow-sm">
                                        {s.name}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="block text-[8px] text-slate-400 text-center font-sans">مناوبة مسائية من فرد واحد</span>
                                </div>
                              )}
                            </td>

                            {/* Night Column (Exactly 2 workers, 1-on 2-off rotation) */}
                            <td className="p-3">
                              {day.night.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">شمال مكشوف</div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap justify-center gap-1.5">
                                    {day.night.map(s => (
                                      <span key={s.id} className="bg-purple-500/10 text-purple-300 border border-purple-500/10 px-2.5 py-0.5 rounded text-[10px] font-black shadow-sm">
                                        {s.name}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="block text-[8px] text-slate-400 text-center font-sans font-bold">المناوبة ليلية (فردان) 1-on, 2-off</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Subtab Content: Algorithm explanation */}
          {activeSubTab === "algorithm" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-indigo-800/30 space-y-4">
                <h4 className="text-sm font-black text-teal-300 flex items-center gap-1.5">
                  <Calculator className="h-4.5 w-4.5" />
                  صيغة العدالة اللوغاريتمية والمعايير المنظمة للقسم
                </h4>
                
                <p className="text-xs text-indigo-100/90 leading-relaxed font-semibold">
                  لتجنب المحسوبية وضمان خلو الجدول من أي تراكم غير مبرر للضغط، يقوم المساعد الذكي بتطبيق القواعد الأربعة بدقة متناهية:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex gap-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/40">
                    <span className="font-mono text-teal-400 font-bold">01</span>
                    <p className="text-slate-300 font-medium">
                      <strong>فترات مجموعة الليل:</strong> تناوب دوري حديدي لـ 6 عمال بتبديل (1-on, 2-off) لمنع التعب الجسدي والذهني.
                    </p>
                  </div>

                  <div className="flex gap-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/40">
                    <span className="font-mono text-teal-400 font-bold">02</span>
                    <p className="text-slate-300 font-medium">
                      <strong>الفترة المسائية (طوعية):</strong> تعمل يومياً وتمنح الموظف +5 نقاط فورية في رصيد عفته، مما يعطيه إعفاءات تلقائية لاحقاً.
                    </p>
                  </div>

                  <div className="flex gap-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/40">
                    <span className="font-mono text-teal-400 font-bold">03</span>
                    <p className="text-slate-300 font-medium">
                      <strong>عطل نهاية الأسبوع (الجمعة/السبت):</strong> الصباحية تكون طوعية، وعند فرضها تُقاد بصيغة <code>Modulo % Total</code> مع خصم وزن نقاط التطوع لتأمين العفة التامة من التتالي.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleGeneratePreview}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 duration-150"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>توليد ومحاكاة جدول الـ 10 أيام الأولى</span>
                  </button>
                </div>
              </div>

              {/* Formula & visual graph simulation representation */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-indigo-800/30 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-teal-300 flex items-center gap-1.5">
                    <HelpCircle className="h-4.5 w-4.5" />
                    تمثيل معادلة العدالة اللوغاريتمية رياضياً
                  </h4>
                  
                  {/* Beautiful code block style rendering of math equation */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center font-mono text-teal-300 space-y-2 overflow-x-auto text-xs" dir="ltr">
                    <p className="text-white text-[11px] font-sans pb-1.5 border-b border-slate-800 text-left">Modulo Fair Weight Algorithm Score (S):</p>
                    <code className="block py-1 text-sm">
                      S = ((Emp_Idx + Day_Idx) % N) + (W * 3) - (Pts * 0.5)
                    </code>
                    <div className="text-[10px] text-slate-400 text-left pt-2 font-sans space-y-1">
                      <p>• <strong className="text-white">Emp_Idx:</strong> المعرف الفرعي للموظف بالكادر الأسيوطى</p>
                      <p>• <strong className="text-white">Day_Idx:</strong> المؤشر العددي لليوم المجدول</p>
                      <p>• <strong className="text-white">W (WeekendWeight):</strong> ثقل عمل الموظف في الآونة الراجحة لعطل الأسبوع</p>
                      <p>• <strong className="text-white">Pts (Volunteer Points):</strong> نقاط رصيد التطوع المكتسبة بالمناوبة المسائية</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pt-1 font-semibold">
                     كلما زادت مشاركة الكادر وتطوعه في الفترات المسائية (Pts أعلى)، 
                     <strong> يتدنى مؤشر النقاط الفرعي له (S)</strong>، مما يعطيه الحصانة والإعفاء الأكثر تلقائية من الاضطرار للأيام المزدحمة في عطل الجمعة والسبت.
                  </p>
                </div>

                <div className="pt-4 border-t border-indigo-900/30 text-[11px] text-teal-200 bg-teal-950/30 p-3 rounded-xl border border-teal-900/50 flex items-start gap-2">
                  <Info className="h-4 corners-none text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    هذه الرياضيات تضمن توزيعاً متكافئاً 100% مستقلاً عن المزاجية أو التفضيلات التقليدية.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: Credit Points Marketplace */}
          {activeSubTab === "credits" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Left Column: Staff with points table */}
              <div className="lg:col-span-2 bg-slate-900/50 p-5 rounded-2xl border border-indigo-800/30 space-y-3">
                <h4 className="text-sm font-black text-teal-300 flex items-center gap-2">
                  <UserCheck className="h-4.5 w-4.5 text-teal-400" />
                  <span>أرصدة الكادر الطبي من نقاط التطوع وموازن الفترات</span>
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right text-slate-200">
                    <thead>
                      <tr className="border-b border-indigo-950 text-indigo-300 text-[10px] font-black uppercase">
                        <th className="py-2.5">اسم الموظف / الكادر</th>
                        <th className="py-2.5 text-center">أرصدة نقاط التطوع</th>
                        <th className="py-2.5 text-center">ثقل عطل الأسبوع</th>
                        <th className="py-2.5 text-center">التخصص الرئيسي</th>
                        <th className="py-2.5 text-center">الرديفة المتفق عليها</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-950 font-medium">
                      {activeEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                            <strong className="text-white">{emp.name}</strong>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-teal-500/10 text-teal-300 px-2.5 py-1 rounded-full text-[10px] font-black border border-teal-500/20 font-mono">
                              {emp.points ?? 15} نقطة
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-500/20 font-mono">
                              {emp.weekendWeight ?? 0}
                            </span>
                          </td>
                          <td className="py-3 text-center text-slate-300">
                            {emp.specialty === StaffSpecialty.RADIOLOGIST ? "طبيب أشعة" : "تقني أشعة مختص"}
                          </td>
                          <td className="py-3 text-center text-slate-400">
                            {emp.role === UserRole.MANAGER ? "مدير مصلحة" : "موظف مخلص"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-indigo-950/30 border border-indigo-900/30 p-3 rounded-xl flex items-center gap-2 text-[10px] text-slate-300 leading-relaxed">
                  <Info className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>
                    معدل الأعداد المرجعي: المناوبة الليلية تمنح الطبيب/العامل (+10 نقاط رصيد) إخفاء الأسبوع متاح بخصم (-15 نقطة) من الرصيد المتوفر للتطوع والتبادل.
                  </span>
                </div>
              </div>

              {/* Right Column: Simulated point adjustor */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-indigo-800/30">
                <form onSubmit={handleSimulateCredit} className="space-y-4">
                  <h4 className="text-sm font-black text-teal-300 flex items-center gap-2">
                    <Coins className="h-4.5 w-4.5 text-teal-400" />
                    <span>موزع نقاط التطوع والتبادل</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    استخدم هذا المحاكي لزيادة رصيد كادر طبي نتيجة عمله الإضافي الاختياري أو صرف نقاط مقابل عطل وامتيازات.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-300 mb-1">اسم الموظف أو الكادر:</label>
                      <select
                        value={selectedSimEmpId}
                        onChange={(e) => setSelectedSimEmpId(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-800 border border-slate-705 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                        required
                      >
                        <option value="">-- اختر الكادر الطبي --</option>
                        {activeEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} (رصيد: {e.points ?? 15})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-slate-300 mb-1">نوع الإجراء:</label>
                        <select
                          value={simAction}
                          onChange={(e) => setSimAction(e.target.value as "add" | "spend")}
                          className="w-full text-xs p-2.5 bg-slate-800 border border-slate-705 text-white rounded-xl focus:outline-none"
                        >
                          <option value="add">منح نقاط إضافية (+)</option>
                          <option value="spend">صرف/خصم نقاط (-)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-300 mb-1">الكمية (بالنقاط):</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={simPointsChange}
                          onChange={(e) => setSimPointsChange(Number(e.target.value))}
                          className="w-full text-xs p-2.5 bg-slate-800 border border-slate-705 text-white rounded-xl focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-300 mb-1">البيان مصلحياً:</label>
                      <input
                        type="text"
                        placeholder="مثال: تبطين المناوبة الليلية لزميله"
                        value={simNote}
                        onChange={(e) => setSimNote(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-800 border border-slate-705 text-white rounded-xl focus:outline-none text-right placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] text-center flex items-center justify-center gap-2 duration-150"
                  >
                    <ArrowLeftRight className="h-4 w-4 text-slate-950" />
                    <span>تأكيد الموازنة وحفظ الرصيد المالي</span>
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* Subtab Content: Preview generated table */}
          {activeSubTab === "preview" && (
            <div className="space-y-4 animate-fade-in">
              {previewShifts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-dashed border-indigo-800/30 flex flex-col items-center">
                  <Info className="h-10 w-10 mb-2 stroke-1 text-slate-500" />
                  <p className="text-xs">لم يتم احتساب ومحاكاة الجدول بعد.</p>
                  <p className="text-[10px] text-slate-500 mt-1">الرجاء الانتقال إلى "المنطق الخوارزمي" والضغط على زر التوليد التلقائي لإنشاء المعاينة.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Preview Banner alerting they can confirm */}
                  <div className="p-4 bg-teal-950/40 border border-teal-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                        الجدول المستخلص والجاهز للتصدير والتثبيت (أول 10 أيام من يونيو 2026)
                      </h4>
                      <p className="text-[10px] text-slate-350">
                        الجدول أدناه يمثّل المعاينة المتكافئة وفق قواعد التناوب المحددة للقسم. بالضغط على زر الحفظ، سيتم مسح التعارضات السابقة بالأيام المذكورة وتخزين المناوبات الجديدة تلقائياً.
                      </p>
                    </div>

                    <button
                      onClick={handleCommitPreview}
                      disabled={isGenerating}
                      className="px-5 py-2.5 w-full sm:w-auto bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
                          <span>جاري التطهير والجدولة السحابية...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-slate-950" />
                          <span>تثبيت وحفظ هذا الجدول بالمصلحة</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Generated Table layout */}
                  <div className="overflow-x-auto bg-slate-900/60 rounded-2xl border border-indigo-800/30">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-indigo-950/70 bg-slate-950/50 text-indigo-200">
                          <th className="p-3">التاريخ واليوم</th>
                          <th className="p-3 text-center">المناوبة الصباحية (08:00-14:00)</th>
                          <th className="p-3 text-center">المناوبة المسائية (14:00-20:00)</th>
                          <th className="p-3 text-center">المناوبة الليلية (20:00-08:00)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-950/50 font-medium">
                        {previewShifts.map((day) => (
                          <tr 
                            key={day.date} 
                            className={`hover:bg-indigo-950/20 transition-all ${
                              day.isWeekend ? "bg-amber-500/5 border-r-4 border-r-amber-400" : ""
                            }`}
                          >
                            <td className="p-3 whitespace-nowrap">
                              <span className="block font-black text-white">{day.dayName}</span>
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{day.date}</span>
                              {day.isWeekend && (
                                <span className="inline-block mt-1 bg-amber-500/20 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-black">عطلة نهاية الأسبوع</span>
                              )}
                            </td>

                            {/* Morning column preview */}
                            <td className="p-3">
                              {day.morningStaff.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">إجازة / طاقم طوعي بالاختيار</div>
                              ) : (
                                <div className="space-y-1">
                                  {day.morningStaff.map(s => (
                                    <div key={s.id} className="text-emerald-300 font-bold text-center">
                                      {s.name}
                                    </div>
                                  ))}
                                  <span className="block text-[9px] text-slate-400 text-center font-sans tracking-tight">{day.morningRule}</span>
                                </div>
                              )}
                            </td>

                            {/* Evening column preview with volunteer credit indicator */}
                            <td className="p-3">
                              {day.eveningStaff.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">غير نشط</div>
                              ) : (
                                <div className="space-y-1">
                                  {day.eveningStaff.map(s => (
                                    <div key={s.id} className="text-sky-300 font-bold text-center flex items-center justify-center gap-1">
                                      {s.name}
                                      <span className="bg-sky-500/20 text-sky-400 px-1 py-0.2 rounded text-[8px]" title="نقاط تطوع">+5</span>
                                    </div>
                                  ))}
                                  <span className="block text-[9px] text-slate-400 text-center font-sans tracking-tight">{day.eveningRule}</span>
                                </div>
                              )}
                            </td>

                            {/* Night column preview 2 on, 2 off status */}
                            <td className="p-3 font-medium">
                              {day.nightStaff.length === 0 ? (
                                <div className="text-center text-slate-500 text-[10px] italic">غير مغطى</div>
                              ) : (
                                <div className="space-y-1">
                                  {day.nightStaff.map(s => (
                                    <div key={s.id} className="text-purple-300 font-bold text-center flex items-center justify-center gap-1">
                                      {s.name}
                                      <span className="bg-purple-500/20 text-purple-400 px-1 py-0.2 rounded text-[8px]" title="نقاط ليلية">+10</span>
                                    </div>
                                  ))}
                                  <span className="block text-[9px] text-slate-400 text-center font-sans tracking-tight">{day.nightRule}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
