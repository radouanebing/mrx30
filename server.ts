import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc, setDoc, getDocFromServer, setLogLevel } from "firebase/firestore";
import { 
  UserRole, 
  StaffSpecialty, 
  ShiftType, 
  SwapStatus, 
  StaffTeam,
  RadiologyState, 
  Employee, 
  Shift, 
  ShiftSwapRequest, 
  SuddenAbsence, 
  PerformanceEvaluation,
  LeaveType,
  LeaveStatus,
  LeaveRequest,
  NoticeCategory,
  AdminNotice
} from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Debugging incoming request logging middleware
app.use((req, res, next) => {
  console.log(`[Request logger] ${req.method} ${req.url} - Content-Type requested: ${req.headers.accept}`);
  next();
});

// Load Firebase Config and initialize Connection
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const firebaseApp = initializeApp(firebaseConfig);
    
    // Suppress verbose cancellation logs and warning messages from standard output
    setLogLevel("error");

    // Initialize Firestore on server-side with experimentalForceLongPolling to handle Cloud Run stream terminations elegantly
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true
    }, firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Successfully initialized server-side connection to Firestore database:", firebaseConfig.firestoreDatabaseId);
    
    // Validate connection to Firestore as per SKILL.md rules
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        console.log("[Firebase] Connection test succeeded.");
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("[Firebase] Warning: Please check your Firebase configuration or network.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("[Firebase] Error reading or initializing Firebase:", err);
  }
}

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const DB_FILE = path.join(DATA_DIR, "radiology_db.json");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR);
}

// Automatic Daily Backup helper
const runAutoBackupIfNeeded = () => {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const files = fs.readdirSync(BACKUPS_DIR);
    const hasTodayBackup = files.some(f => f.startsWith(`auto-backup-${todayStr}`));
    
    if (!hasTodayBackup) {
      const state = readState();
      const filename = `auto-backup-${todayStr}-${Date.now()}.json`;
      const filePath = path.join(BACKUPS_DIR, filename);
      const backupContent = {
        ...state,
        _backup_meta_notes: `نسخة احتياطية سحابية تلقائية ليوم ${todayStr}`
      };
      fs.writeFileSync(filePath, JSON.stringify(backupContent, null, 2), "utf-8");
      console.log(`[Scheduled Backup] Auto daily backup created: ${filename}`);
    }
  } catch (err) {
    console.error("[Scheduled Backup] Error creating auto backup:", err);
  }
};

// Initial seed data if DB_FILE doesn't exist
const initialEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "MRX_RN",
    email: "naghnaghradouane@gmail.com",
    phone: "0551234567",
    specialty: StaffSpecialty.RADIOLOGIST,
    role: UserRole.MANAGER,
    active: true,
    hiringDate: "2020-01-15",
    password: "123456",
    team: StaffTeam.GENERAL,
    permissions: {
      edit_schedule: true,
      request_swap: true,
      view_reports: true,
      manage_settings: true
    }
  },
  {
    id: "emp-2",
    name: "د. أمل الحربي",
    email: "a.harbi@hospital.gov",
    phone: "0557654321",
    specialty: StaffSpecialty.RADIOLOGIST,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2021-06-10",
    password: "123456",
    team: StaffTeam.IRM,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  },
  {
    id: "emp-3",
    name: "خالد العتيبي",
    email: "k.otaibi@hospital.gov",
    phone: "0502233445",
    specialty: StaffSpecialty.TECHNOLOGIST,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2022-03-01",
    password: "123456",
    team: StaffTeam.SCANNER,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  },
  {
    id: "emp-4",
    name: "سارة الشمري",
    email: "s.shammari@hospital.gov",
    phone: "0569988776",
    specialty: StaffSpecialty.TECHNOLOGIST,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2022-11-20",
    password: "123456",
    team: StaffTeam.SCANNER,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  },
  {
    id: "emp-5",
    name: "ياسر القحطاني",
    email: "y.qahtani@hospital.gov",
    phone: "0543322110",
    specialty: StaffSpecialty.TECHNOLOGIST,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2023-05-15",
    password: "123456",
    team: StaffTeam.IRM,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  },
  {
    id: "emp-6",
    name: "محمد عسيري",
    email: "m.asiri@hospital.gov",
    phone: "0531122334",
    specialty: StaffSpecialty.NURSE,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2021-09-01",
    password: "123456",
    team: StaffTeam.GENERAL,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  },
  {
    id: "emp-7",
    name: "فاطمة الدوسري",
    email: "f.dawsari@hospital.gov",
    phone: "0598877665",
    specialty: StaffSpecialty.SECRETARY,
    role: UserRole.EMPLOYEE,
    active: true,
    hiringDate: "2022-01-10",
    password: "123456",
    team: StaffTeam.GENERAL,
    permissions: {
      edit_schedule: false,
      request_swap: true,
      view_reports: false,
      manage_settings: false
    }
  }
];

// Helper to get array of dates for June 2026
const getJune2026Shifts = (): Shift[] => {
  const shifts: Shift[] = [];
  const rooms = ["غرفة الرنين المغناطيسي (MRI)", "غرفة الأشعة المقطعية (CT)", "غرفة الأشعة العادية (X-Ray)", "غرفة السونار (Ultrasound)"];
  
  // Let's pre-generate shifts for days 1 to 7 of June 2026 to show a beautiful starting schedule
  // Shifts: MORNING, EVENING, NIGHT
  const employeeIds = ["emp-3", "emp-4", "emp-5", "emp-6"];
  const radiologistIds = ["emp-1", "emp-2"];
  
  for (let day = 1; day <= 10; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `2026-06-${dayStr}`;
    
    // Day Shift (MORNING)
    shifts.push({
      id: `shift-m1-${day}`,
      employeeId: employeeIds[day % employeeIds.length],
      date,
      type: ShiftType.MORNING,
      room: rooms[0],
      hoursWorked: 8,
      note: "الرنين اليومي المجدول"
    });
    
    shifts.push({
      id: `shift-m2-${day}`,
      employeeId: radiologistIds[day % 2],
      date,
      type: ShiftType.MORNING,
      room: rooms[1],
      hoursWorked: 8,
      note: "طبيب الأشعة المشرف"
    });
    
    // Evening Shift (EVENING)
    shifts.push({
      id: `shift-e1-${day}`,
      employeeId: employeeIds[(day + 1) % employeeIds.length],
      date,
      type: ShiftType.EVENING,
      room: rooms[2],
      hoursWorked: 8,
      note: "قسم الطوارئ والأشعة العادية"
    });
    
    // Night Shift (NIGHT)
    shifts.push({
      id: `shift-n1-${day}`,
      employeeId: employeeIds[(day + 2) % employeeIds.length],
      date,
      type: ShiftType.NIGHT,
      room: rooms[3],
      hoursWorked: 8,
      note: "مناوبة ليلية طارئة"
    });
  }
  return shifts;
};

const initialEvaluations: PerformanceEvaluation[] = [
  {
    id: "eval-1",
    employeeId: "emp-3",
    month: "2026-05",
    punctuality: 5,
    clinicalSkills: 4,
    teamwork: 5,
    patientCare: 4,
    reportsSpeed: 4,
    overallScore: 4.4,
    notes: "خالد ملتزم جداً بالوقت ويؤدي الفحوصات بمهارة متميزة وروح جماعية رائعة.",
    evaluatorId: "emp-1",
    createdAt: "2026-05-28T10:00:00Z"
  },
  {
    id: "eval-2",
    employeeId: "emp-4",
    month: "2026-05",
    punctuality: 4,
    clinicalSkills: 5,
    teamwork: 4,
    patientCare: 5,
    reportsSpeed: 3,
    overallScore: 4.2,
    notes: "سارة مميزة للغاية في رعاية المرضى والتعامل بلطف. تحتاج لتحسين سرعة إنهاء الفحص.",
    evaluatorId: "emp-1",
    createdAt: "2026-05-29T11:30:00Z"
  }
];

const initialSwapRequests: ShiftSwapRequest[] = [
  {
    id: "swap-1",
    requesterId: "emp-3",
    shiftId: "shift-e1-2", // Khalid wants to swap Evening shift on June 2
    shiftDate: "2026-06-02",
    shiftType: ShiftType.EVENING,
    proposedEmployeeId: "emp-4", // proposed to Sarah
    status: SwapStatus.PENDING,
    notes: "لدى ظرف عائلي طارئ يتطلب حضوري في المساء. هل من الممكن التبديل معي؟",
    createdAt: "2026-06-01T06:00:00Z"
  }
];

const initialAbsences: SuddenAbsence[] = [
  {
    id: "abs-1",
    employeeId: "emp-5",
    date: "2026-06-01",
    shiftType: ShiftType.NIGHT,
    reason: "عذر طبي مفاجئ (نزلة برد)",
    coverEmployeeId: "emp-3", // Covered by Khalid
    covered: true,
    createdAt: "2026-06-01T07:00:00Z"
  }
];

const initialState: RadiologyState = {
  employees: initialEmployees,
  shifts: getJune2026Shifts(),
  swapRequests: initialSwapRequests,
  absences: initialAbsences,
  evaluations: initialEvaluations,
  settings: {
    showAlgorithmToEmployees: true,
    showSmartControlToEmployees: true
  },
  leaves: []
};

// Database Read/Write helpers
const readState = (): RadiologyState => {
  if (!fs.existsSync(DB_FILE)) {
    saveState(initialState);
    return initialState;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed: RadiologyState = JSON.parse(data);
    let changed = false;

    // Ensure settings exist
    if (!parsed.settings) {
      parsed.settings = {
        showAlgorithmToEmployees: true,
        showSmartControlToEmployees: true
      };
      changed = true;
    }

    // Ensure leaves array exists
    if (!parsed.leaves) {
      parsed.leaves = [];
      changed = true;
    }

    // Ensure notices array exists
    if (!parsed.notices) {
      parsed.notices = [];
      changed = true;
    }

    // Ensure all employees have a password and permissions setup
    if (parsed.employees && Array.isArray(parsed.employees)) {
      parsed.employees.forEach(emp => {
        if (!emp.password) {
          emp.password = "123456";
          changed = true;
        }
        if (!emp.permissions) {
          emp.permissions = {
            edit_schedule: emp.role === UserRole.MANAGER || emp.role === UserRole.SUPERVISOR,
            request_swap: true,
            view_reports: emp.role === UserRole.MANAGER || emp.role === UserRole.SUPERVISOR,
            manage_settings: emp.role === UserRole.MANAGER,
          };
          changed = true;
        }
        if (!emp.team) {
          if (emp.id === "emp-3" || emp.id === "emp-4") {
            emp.team = StaffTeam.SCANNER;
          } else if (emp.id === "emp-2" || emp.id === "emp-5") {
            emp.team = StaffTeam.IRM;
          } else {
            emp.team = StaffTeam.GENERAL;
          }
          changed = true;
        }
      });
    }

    // Ensure radiation monitoring data exists
    if (!parsed.radiationData) {
      parsed.radiationData = {
        roomReadings: [
          { id: "room-1", roomName: "غرفة الأشعة السينية الرقمية (Digital X-Ray Suite)", roomCode: "XRAY-A", reading: 0.15, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] },
          { id: "room-2", roomName: "جناح التصوير المقطعي محاكي المقطع (CT Scanner Room)", roomCode: "CT-SCAN-B", reading: 1.25, status: "WARNING", lastChecked: new Date().toISOString().split('T')[0] },
          { id: "room-3", roomName: "غرفة الرنين المغناطيسي الفائق (MRI Suite)", roomCode: "MRI-C", reading: 0.04, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] },
          { id: "room-4", roomName: "مختبر الطب النووي النشط (Nuclear Medicine)", roomCode: "NUC-MED-D", reading: 5.80, status: "DANGER", lastChecked: new Date().toISOString().split('T')[0] },
          { id: "room-5", roomName: "غرفة فحص التصوير بالسونار (Ultrasound Room)", roomCode: "US-E", reading: 0.02, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] }
        ],
        calibrations: [
          { id: "cal-1", deviceName: "عداد جيجر المحمول (Eberline Geiger Counter)", serialNumber: "GM-98241", calibrationDate: "2026-01-10", expiryDate: "2027-01-10", batteryPercent: 92, calibratedBy: "وكالة الأمان النووي والوقاية من الإشعاعات", status: "PASSED" },
          { id: "cal-2", deviceName: "مقياس مسح الجرعات الغرفي (Ludlum Area Monitor 3)", serialNumber: "AM-43289", calibrationDate: "2025-08-15", expiryDate: "2026-08-15", batteryPercent: 88, calibratedBy: "معهد بحوث ومعايرة أجهزة القياس", status: "PASSED" },
          { id: "cal-3", deviceName: "غرفة معايرة تسرب الأشعة (Fluke Pro-Ion Chamber)", serialNumber: "IC-11048", calibrationDate: "2024-11-20", expiryDate: "2025-11-20", batteryPercent: 45, calibratedBy: "الهيئة الوطنية للفحوصات الفنية", status: "EXPIRED" }
        ],
        dosimeters: parsed.employees ? parsed.employees.map((emp, idx) => ({
          id: `dos-${emp.id}`,
          employeeId: emp.id,
          badgeCode: `TLD-26-${1000 + idx}`,
          quarterDose: parseFloat((0.85 + (idx * 0.35)).toFixed(2)),
          annualDose: parseFloat((2.15 + (idx * 1.05)).toFixed(2)),
          lastReadingDate: new Date().toISOString().split('T')[0]
        })) : []
      };
      changed = true;
    }

    if (changed) {
      saveState(parsed);
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file, using fallback.", err);
    return initialState;
  }
};

const saveState = (state: RadiologyState) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  if (db) {
    const docRef = doc(db, "state", "radiology_state");
    setDoc(docRef, state)
      .then(() => {
        console.log("[Firebase] State successfully saved and synced dynamically to cloud Firestore.");
      })
      .catch((error) => {
        console.error("[Firebase] Error saving state to Firestore:", error);
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: "write",
          path: "state/radiology_state",
          authInfo: {
            userId: "server-admin",
            providerInfo: []
          }
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
      });
  }
};

const syncStateFromFirestore = async () => {
  if (!db) return;
  try {
    console.log("[Firebase] Pulling remote database state from Firestore on boot...");
    const docRef = doc(db, "state", "radiology_state");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const remoteState = docSnap.data() as RadiologyState;
      fs.writeFileSync(DB_FILE, JSON.stringify(remoteState, null, 2), "utf-8");
      console.log("[Firebase] Local cache successfully synchronized from remote cloud Firestore.");
    } else {
      console.log("[Firebase] No existing state found in Firestore. Seeding to Firestore on next user change.");
    }
  } catch (error) {
    console.error("[Firebase] Error loading state from Firestore on startup:", error);
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType: "get",
      path: "state/radiology_state",
      authInfo: {
        userId: "server-admin",
        providerInfo: []
      }
    };
    console.error("Firestore Error: ", JSON.stringify(errInfo));
  }
};

// --- GET Entire State ---
app.get("/api/state", (req, res) => {
  try {
    console.log("[API] /api/state requested. Fetching current radiology state...");
    const state = readState();
    res.json(state);
  } catch (error: any) {
    console.error("[API Error] Failed to get state:", error);
    res.status(500).json({ error: "Failed to read application state", details: error.message || String(error) });
  }
});

// --- PUT System Settings ---
app.put("/api/settings", (req, res) => {
  const state = readState();
  state.settings = {
    showAlgorithmToEmployees: req.body.showAlgorithmToEmployees === true,
    showSmartControlToEmployees: req.body.showSmartControlToEmployees === true,
    whatsappEnabled: req.body.whatsappEnabled === true,
    whatsappToken: req.body.whatsappToken || "",
    whatsappPhoneId: req.body.whatsappPhoneId || "",
    whatsappTemplateName: req.body.whatsappTemplateName || "",
    whatsappCustomMessageTemplate: req.body.whatsappCustomMessageTemplate || "",
  };
  saveState(state);
  res.json(state.settings);
});

// --- POST Send WhatsApp Reminder Notification ---
app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { employeeId, employeeName, phone, message } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "رقم الهاتف الخاص بالموظف مطلوب لإرسال التذكير." });
    }

    const state = readState();
    const settings = (state.settings || {}) as any;

    const formattedPhone = phone.replace(/\D/g, "");
    let finalPhone = formattedPhone;
    if (formattedPhone.length === 10 && formattedPhone.startsWith("05")) {
      finalPhone = "966" + formattedPhone.substring(1);
    } else if (formattedPhone.length === 9 && formattedPhone.startsWith("5")) {
      finalPhone = "966" + formattedPhone;
    }

    // Logic for Meta WhatsApp Cloud API if enabled and configured
    if (settings.whatsappEnabled && settings.whatsappToken && settings.whatsappPhoneId) {
      const url = `https://graph.facebook.com/v18.0/${settings.whatsappPhoneId}/messages`;
      
      console.log(`[WhatsApp API] Calling Meta Graph API for destination: ${finalPhone}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.whatsappToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: finalPhone,
          type: "text",
          text: {
            body: message || "تذكير مناوبة مصلحة الأشعة"
          }
        })
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error("[WhatsApp API Error] Meta API Response:", responseData);
        return res.status(502).json({
          success: false,
          error: "بوابة Meta WhatsApp رفضت الطلب. يرجى مراجعة إعدادات التوكن وصلاحيات الرقم.",
          details: responseData
        });
      }

      return res.json({
        success: true,
        mode: "API_GATEWAY",
        message: "تم إرسال التذكير بنجاح آلياً عبر بوابة Meta WhatsApp Cloud API!",
        details: responseData
      });
    }

    // Default Web-link instruction or simulated success
    console.log(`[WhatsApp Simulation] Reminder queued for ${employeeName} (${finalPhone}): ${message}`);
    
    // Return simulated response indicating the server-side logic was correctly calculated & queued
    return res.json({
      success: true,
      mode: "SIMULATED_LINK",
      message: "تم إنشاء التذكير ومعالجته ببيانات الموظف بنجاح لمقدمي الخدمة.",
      redirectUrl: `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
    });

  } catch (error: any) {
    console.error("[WhatsApp Integration Endpoint Error]:", error);
    res.status(500).json({ success: false, error: "حدث خطأ غير متوقع أثناء معالجة رسالة WhatsApp السحابية.", details: error.message });
  }
});

// --- employees ---
app.post("/api/employees", (req, res) => {
  const state = readState();
  const newEmp: Employee = {
    ...req.body,
    id: `emp-${Date.now()}`,
    syncStatus: false,
    lastModified: new Date().toISOString()
  };
  state.employees.push(newEmp);
  saveState(state);
  res.status(201).json(newEmp);
});

app.put("/api/employees/:id", (req, res) => {
  const state = readState();
  const idx = state.employees.findIndex(e => e.id === req.params.id);
  if (idx !== -1) {
    state.employees[idx] = { 
      ...state.employees[idx], 
      ...req.body,
      syncStatus: false,
      lastModified: new Date().toISOString()
    };
    saveState(state);
    res.json(state.employees[idx]);
  } else {
    res.status(404).json({ error: "Employee not found" });
  }
});

app.delete("/api/employees/:id", (req, res) => {
  const state = readState();
  // Filter out employee while keeping list
  state.employees = state.employees.filter(e => e.id !== req.params.id);
  // Also filter shifts, swaps, or set their references to undefined/inactive
  saveState(state);
  res.json({ success: true });
});

// --- shifts ---
app.post("/api/shifts", (req, res) => {
  const state = readState();
  const newShift: Shift = {
    ...req.body,
    id: `shift-${Date.now()}`,
    syncStatus: false,
    lastModified: new Date().toISOString()
  };
  state.shifts.push(newShift);
  saveState(state);
  res.status(201).json(newShift);
});

app.put("/api/shifts/:id", (req, res) => {
  const state = readState();
  const idx = state.shifts.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    state.shifts[idx] = { 
      ...state.shifts[idx], 
      ...req.body,
      syncStatus: false,
      lastModified: new Date().toISOString()
    };
    saveState(state);
    res.json(state.shifts[idx]);
  } else {
    res.status(404).json({ error: "Shift not found" });
  }
});

app.delete("/api/shifts/:id", (req, res) => {
  const state = readState();
  state.shifts = state.shifts.filter(s => s.id !== req.params.id);
  saveState(state);
  res.json({ success: true });
});

// --- leaves ---
app.get("/api/leaves", (req, res) => {
  const state = readState();
  res.json(state.leaves || []);
});

app.post("/api/leaves", (req, res) => {
  const state = readState();
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;

  if (!employeeId || !leaveType || !startDate || !endDate) {
    return res.status(400).json({ error: "جميع الحقول (تاريخ البدء، الانتهاء نوع الإجازة) مطلوبة." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return res.status(400).json({ error: "تاريخ البدء أو الانتهاء غير صحيح أو تاريخ البدء بعد تاريخ الانتهاء." });
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Check balance: Limits: ANNUAL = 50, CASUAL = 42
  const limit = leaveType === LeaveType.ANNUAL ? 50 : 42;
  const approvedLeaves = (state.leaves || []).filter(
    l => l.employeeId === employeeId && l.leaveType === leaveType && l.status === LeaveStatus.APPROVED
  );
  const totalApprovedDays = approvedLeaves.reduce((sum, current) => sum + current.totalDays, 0);

  if (totalApprovedDays + totalDays > limit) {
    const arabType = leaveType === LeaveType.ANNUAL ? "السنوية" : "العارضة";
    return res.status(400).json({
      error: `لا يمكن تقديم الطلب. أيام الإجازة ${arabType} المطلوبة تشحن رصيدك إلى ${totalApprovedDays + totalDays} يوماً وهو ما يتخطى الحد الأقصى المسموح به (${limit} يوماً).`
    });
  }

  const newLeave: LeaveRequest = {
    id: `leave-${Date.now()}`,
    employeeId,
    leaveType,
    startDate,
    endDate,
    totalDays,
    reason: reason || "",
    status: LeaveStatus.PENDING,
    createdAt: new Date().toISOString()
  };

  if (!state.leaves) {
    state.leaves = [];
  }
  state.leaves.push(newLeave);
  saveState(state);
  res.status(201).json(newLeave);
});

app.put("/api/leaves/:id", (req, res) => {
  const state = readState();
  if (!state.leaves) {
    state.leaves = [];
  }
  const idx = state.leaves.findIndex(l => l.id === req.params.id);
  if (idx !== -1) {
    const oldLeave = state.leaves[idx];
    const { status } = req.body;

    // Check balance again if approving
    if (status === LeaveStatus.APPROVED && oldLeave.status !== LeaveStatus.APPROVED) {
      const limit = oldLeave.leaveType === LeaveType.ANNUAL ? 50 : 42;
      const approvedLeaves = state.leaves.filter(
        l => l.employeeId === oldLeave.employeeId && l.leaveType === oldLeave.leaveType && l.status === LeaveStatus.APPROVED && l.id !== oldLeave.id
      );
      const totalApprovedDays = approvedLeaves.reduce((sum, current) => sum + current.totalDays, 0);

      if (totalApprovedDays + oldLeave.totalDays > limit) {
        const arabType = oldLeave.leaveType === LeaveType.ANNUAL ? "السنوية" : "العارضة";
        return res.status(400).json({
          error: `تعذر الموافقة. إجمالي أيام الإجازات ${arabType} سيبلغ ${totalApprovedDays + oldLeave.totalDays} يوماً وهو ما يتجاوز الحد المسموح (${limit} يوماً).`
        });
      }
    }

    state.leaves[idx] = { ...oldLeave, ...req.body };
    saveState(state);
    res.json(state.leaves[idx]);
  } else {
    res.status(404).json({ error: "Leave request not found" });
  }
});

app.delete("/api/leaves/:id", (req, res) => {
  const state = readState();
  if (state.leaves) {
    state.leaves = state.leaves.filter(l => l.id !== req.params.id);
  }
  saveState(state);
  res.json({ success: true });
});

// --- admin notices & reports ---
app.get("/api/notices", (req, res) => {
  const state = readState();
  res.json(state.notices || []);
});

app.post("/api/notices", (req, res) => {
  const state = readState();
  const { title, content, category, imageUrl, authorId, authorName } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: "العنوان ومحتوى المنشور والنوع حقول مطلوبة." });
  }
  const newNotice: AdminNotice = {
    id: `notice-${Date.now()}`,
    title,
    content,
    category,
    imageUrl: imageUrl || "",
    createdAt: new Date().toISOString(),
    authorId: authorId || "system",
    authorName: authorName || "مدير المصلحة"
  };
  if (!state.notices) {
    state.notices = [];
  }
  state.notices.push(newNotice);
  saveState(state);
  res.status(201).json(newNotice);
});

app.put("/api/notices/:id", (req, res) => {
  const state = readState();
  if (!state.notices) state.notices = [];
  const idx = state.notices.findIndex(n => n.id === req.params.id);
  if (idx !== -1) {
    const { title, content, category, imageUrl } = req.body;
    state.notices[idx] = {
      ...state.notices[idx],
      title: title ?? state.notices[idx].title,
      content: content ?? state.notices[idx].content,
      category: category ?? state.notices[idx].category,
      imageUrl: imageUrl ?? state.notices[idx].imageUrl
    };
    saveState(state);
    res.json(state.notices[idx]);
  } else {
    res.status(404).json({ error: "Notice not found" });
  }
});

app.delete("/api/notices/:id", (req, res) => {
  const state = readState();
  if (!state.notices) state.notices = [];
  state.notices = state.notices.filter(n => n.id !== req.params.id);
  saveState(state);
  res.json({ success: true });
});

// --- swapRequests ---
app.post("/api/swaps", (req, res) => {
  const state = readState();
  const newSwap: ShiftSwapRequest = {
    ...req.body,
    id: `swap-${Date.now()}`,
    status: SwapStatus.PENDING,
    createdAt: new Date().toISOString(),
    syncStatus: false,
    lastModified: new Date().toISOString()
  };
  state.swapRequests.push(newSwap);
  saveState(state);
  res.status(201).json(newSwap);
});

app.put("/api/swaps/:id", (req, res) => {
  const state = readState();
  const { status, resolvedById } = req.body;
  const idx = state.swapRequests.findIndex(s => s.id === req.params.id);
  
  if (idx !== -1) {
    const swap = state.swapRequests[idx];
    swap.status = status;
    swap.resolvedById = resolvedById;
    swap.resolvedAt = new Date().toISOString();
    swap.syncStatus = false;
    swap.lastModified = new Date().toISOString();

    // CRITICAL DETAIL: If the swap is APPROVED, perform the automatic schedule switch!
    if (status === SwapStatus.APPROVED) {
      const shiftIdx = state.shifts.findIndex(sh => sh.id === swap.shiftId);
      if (shiftIdx !== -1 && swap.proposedEmployeeId) {
        // Swap employeeId assigned to this shift
        state.shifts[shiftIdx].employeeId = swap.proposedEmployeeId;
        state.shifts[shiftIdx].syncStatus = false;
        state.shifts[shiftIdx].lastModified = new Date().toISOString();
      }
    }
    
    saveState(state);
    res.json(swap);
  } else {
    res.status(404).json({ error: "Swap request not found" });
  }
});

// --- absences ---
app.post("/api/absences", (req, res) => {
  const state = readState();
  const newAbs: SuddenAbsence = {
    ...req.body,
    id: `abs-${Date.now()}`,
    createdAt: new Date().toISOString(),
    syncStatus: false,
    lastModified: new Date().toISOString()
  };
  
  // If a cover employee is assigned immediately, modify the corresponding shift if necessary 
  // or we can flag the shift with warning. Let's make sure it updates the scheduler shift too!
  if (newAbs.covered && newAbs.coverEmployeeId) {
    const shiftIdx = state.shifts.findIndex(sh => sh.date === newAbs.date && sh.type === newAbs.shiftType && sh.employeeId === newAbs.employeeId);
    if (shiftIdx !== -1) {
      state.shifts[shiftIdx].employeeId = newAbs.coverEmployeeId;
      state.shifts[shiftIdx].note = `تغطية غياب طارئ لـ ${state.employees.find(e => e.id === newAbs.employeeId)?.name || ""}`;
      state.shifts[shiftIdx].syncStatus = false;
      state.shifts[shiftIdx].lastModified = new Date().toISOString();
    }
  }

  state.absences.push(newAbs);
  saveState(state);
  res.status(201).json(newAbs);
});

app.put("/api/absences/:id", (req, res) => {
  const state = readState();
  const idx = state.absences.findIndex(a => a.id === req.params.id);
  if (idx !== -1) {
    const originalAbs = state.absences[idx];
    const updatedAbs = { 
      ...originalAbs, 
      ...req.body,
      syncStatus: false,
      lastModified: new Date().toISOString()
    };
    
    // If it was just marked covered with a coverEmployeeId, update schedule
    if (updatedAbs.covered && updatedAbs.coverEmployeeId && !originalAbs.covered) {
      const shiftIdx = state.shifts.findIndex(sh => sh.date === updatedAbs.date && sh.type === updatedAbs.shiftType && sh.employeeId === updatedAbs.employeeId);
      if (shiftIdx !== -1) {
        state.shifts[shiftIdx].employeeId = updatedAbs.coverEmployeeId;
        state.shifts[shiftIdx].note = `تغطية غياب طارئ لـ ${state.employees.find(e => e.id === updatedAbs.employeeId)?.name || ""}`;
        state.shifts[shiftIdx].syncStatus = false;
        state.shifts[shiftIdx].lastModified = new Date().toISOString();
      }
    }
    
    state.absences[idx] = updatedAbs;
    saveState(state);
    res.json(updatedAbs);
  } else {
    res.status(404).json({ error: "Absence not found" });
  }
});

// --- evaluations ---
app.post("/api/evaluations", (req, res) => {
  const state = readState();
  
  const p = req.body;
  const overallScore = Number(((p.punctuality + p.clinicalSkills + p.teamwork + p.patientCare + p.reportsSpeed) / 5).toFixed(1));
  
  const newEval: PerformanceEvaluation = {
    ...p,
    id: `eval-${Date.now()}`,
    overallScore,
    createdAt: new Date().toISOString(),
    syncStatus: false,
    lastModified: new Date().toISOString()
  };
  
  state.evaluations.push(newEval);
  
  // Recalculate average rating of employee
  const empId = p.employeeId;
  const empEvals = state.evaluations.filter(e => e.employeeId === empId);
  const avg = Number((empEvals.reduce((sum, current) => sum + current.overallScore, 0) / empEvals.length).toFixed(1));
  
  const empIdx = state.employees.findIndex(e => e.id === empId);
  if (empIdx !== -1) {
    state.employees[empIdx].ratingAverage = avg;
    state.employees[empIdx].syncStatus = false;
    state.employees[empIdx].lastModified = new Date().toISOString();
  }
  
  saveState(state);
  res.status(201).json(newEval);
});

app.delete("/api/evaluations/:id", (req, res) => {
  const state = readState();
  const evalToDelete = state.evaluations.find(e => e.id === req.params.id);
  if (evalToDelete) {
    state.evaluations = state.evaluations.filter(e => e.id !== req.params.id);
    
    // Recalculate
    const empId = evalToDelete.employeeId;
    const empEvals = state.evaluations.filter(e => e.employeeId === empId);
    if (empEvals.length > 0) {
      const avg = Number((empEvals.reduce((sum, current) => sum + current.overallScore, 0) / empEvals.length).toFixed(1));
      const empIdx = state.employees.findIndex(e => e.id === empId);
      if (empIdx !== -1) {
        state.employees[empIdx].ratingAverage = avg;
        state.employees[empIdx].syncStatus = false;
        state.employees[empIdx].lastModified = new Date().toISOString();
      }
    } else {
      const empIdx = state.employees.findIndex(e => e.id === empId);
      if (empIdx !== -1) {
        delete state.employees[empIdx].ratingAverage;
        state.employees[empIdx].syncStatus = false;
        state.employees[empIdx].lastModified = new Date().toISOString();
      }
    }
    
    saveState(state);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Evaluation not found" });
  }
});

// --- GOOGLE FIREBASE INTELLIGENT SYNC SERVICE (C# SyncService Equivalent) ---
app.post("/api/sync/process", (req, res) => {
  try {
    const state = readState();
    
    let syncedEmployees = 0;
    let syncedShifts = 0;
    let syncedSwaps = 0;
    let syncedAbsences = 0;
    let syncedEvaluations = 0;
    const nowStr = new Date().toISOString();

    // 1. Process employees
    state.employees = state.employees.map(emp => {
      if (emp.syncStatus === false || emp.syncStatus === undefined) {
        syncedEmployees++;
        return { ...emp, syncStatus: true, lastModified: nowStr };
      }
      return emp;
    });

    // 2. Process shifts
    state.shifts = state.shifts.map(sh => {
      if (sh.syncStatus === false || sh.syncStatus === undefined) {
        syncedShifts++;
        return { ...sh, syncStatus: true, lastModified: nowStr };
      }
      return sh;
    });

    // 3. Process swapRequests
    state.swapRequests = state.swapRequests.map(sw => {
      if (sw.syncStatus === false || sw.syncStatus === undefined) {
        syncedSwaps++;
        return { ...sw, syncStatus: true, lastModified: nowStr };
      }
      return sw;
    });

    // 4. Process absences
    state.absences = state.absences.map(abs => {
      if (abs.syncStatus === false || abs.syncStatus === undefined) {
        syncedAbsences++;
        return { ...abs, syncStatus: true, lastModified: nowStr };
      }
      return abs;
    });

    // 5. Process evaluations
    state.evaluations = state.evaluations.map(ev => {
      if (ev.syncStatus === false || ev.syncStatus === undefined) {
        syncedEvaluations++;
        return { ...ev, syncStatus: true, lastModified: nowStr };
      }
      return ev;
    });

    const totalSynced = syncedEmployees + syncedShifts + syncedSwaps + syncedAbsences + syncedEvaluations;

    if (totalSynced > 0) {
      saveState(state);
    }

    res.json({
      success: true,
      syncedEmployees,
      syncedShifts,
      syncedSwaps,
      syncedAbsences,
      syncedEvaluations,
      totalSynced,
      lastSyncTime: nowStr
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failing to execute StartSyncProcess in backend server environment", details: error.message });
  }
});

// --- CLOUD BACKUP & RESTORE APIS ("توفير نسخة احتياطية سحابية لضمان أمن البيانات واسترجاعها بسهولة") ---
app.get("/api/backups", (req, res) => {
  try {
    // Run scheduled automatic daily backup check
    runAutoBackupIfNeeded();
    
    const files = fs.readdirSync(BACKUPS_DIR);
    const backups = files
      .filter(f => f.endsWith(".json"))
      .map(filename => {
        const filePath = path.join(BACKUPS_DIR, filename);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        
        return {
          id: filename.replace(".json", ""),
          filename,
          dateStr: stats.mtime.toISOString(),
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          notes: content._backup_meta_notes || "نسخة احتياطية تلقائية"
        };
      })
      .sort((a,b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
      
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: "Failed to list backups" });
  }
});

// Endpoint to overwrite state directly (used for Google Drive restore or custom uploads)
app.post("/api/state/restore", (req, res) => {
  try {
    const newState = req.body;
    if (!newState || !Array.isArray(newState.employees) || !Array.isArray(newState.shifts)) {
      return res.status(400).json({ error: "Invalid state structure" });
    }
    
    // Strip meta note before saving
    delete newState._backup_meta_notes;
    
    saveState(newState);
    res.json({ success: true, message: "State successfully replaced and synchronized." });
  } catch (err) {
    res.status(500).json({ error: "Failed to overwrite state" });
  }
});

app.post("/api/backups", (req, res) => {
  try {
    const state = readState();
    const backupId = `backup-${Date.now()}`;
    const filename = `${backupId}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);
    
    // Inject notes for identification
    const notes = req.body.notes || "نسخة احتياطية يدوية";
    const backupContent = {
      ...state,
      _backup_meta_notes: notes
    };
    
    fs.writeFileSync(filePath, JSON.stringify(backupContent, null, 2), "utf-8");
    res.status(201).json({ id: backupId, filename, notes });
  } catch (err) {
    res.status(500).json({ error: "Failed to save backup" });
  }
});

app.post("/api/backups/:id/restore", (req, res) => {
  try {
    const backupId = req.params.id;
    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }
    
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Strip meta note before saving
    delete content._backup_meta_notes;
    
    saveState(content);
    res.json({ success: true, message: "Database restored successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to restore backup" });
  }
});

app.delete("/api/backups/:id", (req, res) => {
  try {
    const backupId = req.params.id;
    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Backup file not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete backup" });
  }
});

// --- API Routing for Geiger Readings & Radiation Dosimetry Safety ---

app.put("/api/radiation/rooms", (req, res) => {
  try {
    const state = readState();
    if (!state.radiationData) {
      return res.status(500).json({ error: "Radiation data not loaded" });
    }
    const { roomReadings } = req.body;
    if (Array.isArray(roomReadings)) {
      state.radiationData.roomReadings = roomReadings;
      saveState(state);
      res.json({ success: true, roomReadings: state.radiationData.roomReadings });
    } else {
      res.status(400).json({ error: "Invalid payload format. Must be an array of RoomRadiationReading" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update room readings" });
  }
});

app.post("/api/radiation/calibrations", (req, res) => {
  try {
    const state = readState();
    if (!state.radiationData) {
      return res.status(500).json({ error: "Radiation data not loaded" });
    }
    
    const newCalibration = {
      ...req.body,
      id: req.body.id || `cal-${Date.now()}`
    };

    // If matches existing id, replace, else append
    const idx = state.radiationData.calibrations.findIndex(c => c.id === newCalibration.id);
    if (idx !== -1) {
      state.radiationData.calibrations[idx] = newCalibration;
    } else {
      state.radiationData.calibrations.push(newCalibration);
    }

    saveState(state);
    res.status(201).json(newCalibration);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save calibration" });
  }
});

app.put("/api/radiation/dosimeters/:id", (req, res) => {
  try {
    const state = readState();
    if (!state.radiationData) {
      return res.status(500).json({ error: "Radiation data not loaded" });
    }
    
    const employeeId = req.params.id;
    const { quarterDose, annualDose, badgeCode } = req.body;
    
    let dosimeter = state.radiationData.dosimeters.find(d => d.employeeId === employeeId);
    if (!dosimeter) {
      dosimeter = {
        id: `dos-${employeeId}`,
        employeeId,
        badgeCode: badgeCode || `TLD-${Date.now()}`,
        quarterDose: quarterDose || 0,
        annualDose: annualDose || 0,
        lastReadingDate: new Date().toISOString().split('T')[0]
      };
      state.radiationData.dosimeters.push(dosimeter);
    } else {
      if (typeof quarterDose === "number") dosimeter.quarterDose = quarterDose;
      if (typeof annualDose === "number") dosimeter.annualDose = annualDose;
      if (badgeCode) dosimeter.badgeCode = badgeCode;
      dosimeter.lastReadingDate = new Date().toISOString().split('T')[0];
    }

    saveState(state);
    res.json(dosimeter);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update dosimetry reading" });
  }
});

app.post("/api/radiation/reset", (req, res) => {
  try {
    const state = readState();
    state.radiationData = {
      roomReadings: [
        { id: "room-1", roomName: "غرفة الأشعة السينية الرقمية (Digital X-Ray Suite)", roomCode: "XRAY-A", reading: 0.15, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] },
        { id: "room-2", roomName: "جناح التصوير المقطعي محاكي المقطع (CT Scanner Room)", roomCode: "CT-SCAN-B", reading: 1.25, status: "WARNING", lastChecked: new Date().toISOString().split('T')[0] },
        { id: "room-3", roomName: "غرفة الرنين المغناطيسي الفائق (MRI Suite)", roomCode: "MRI-C", reading: 0.04, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] },
        { id: "room-4", roomName: "مختبر الطب النووي النشط (Nuclear Medicine)", roomCode: "NUC-MED-D", reading: 5.80, status: "DANGER", lastChecked: new Date().toISOString().split('T')[0] },
        { id: "room-5", roomName: "غرفة فحص التصوير بالسونار (Ultrasound Room)", roomCode: "US-E", reading: 0.02, status: "SAFE", lastChecked: new Date().toISOString().split('T')[0] }
      ],
      calibrations: [
        { id: "cal-1", deviceName: "عداد جيجر المحمول (Eberline Geiger Counter)", serialNumber: "GM-98241", calibrationDate: "2026-01-10", expiryDate: "2027-01-10", batteryPercent: 92, calibratedBy: "وكالة الأمان النووي والوقاية من الإشعاعات", status: "PASSED" },
        { id: "cal-2", deviceName: "مقياس مسح الجرعات الغرفي (Ludlum Area Monitor 3)", serialNumber: "AM-43289", calibrationDate: "2025-08-15", expiryDate: "2026-08-15", batteryPercent: 88, calibratedBy: "معهد بحوث ومعايرة أجهزة القياس", status: "PASSED" },
        { id: "cal-3", deviceName: "غرفة معايرة تسرب الأشعة (Fluke Pro-Ion Chamber)", serialNumber: "IC-11048", calibrationDate: "2024-11-20", expiryDate: "2025-11-20", batteryPercent: 45, calibratedBy: "الهيئة الوطنية للفحوصات الفنية", status: "EXPIRED" }
      ],
      dosimeters: state.employees ? state.employees.map((emp, idx) => ({
        id: `dos-${emp.id}`,
        employeeId: emp.id,
        badgeCode: `TLD-26-${1000 + idx}`,
        quarterDose: parseFloat((0.85 + (idx * 0.35)).toFixed(2)),
        annualDose: parseFloat((2.15 + (idx * 1.05)).toFixed(2)),
        lastReadingDate: new Date().toISOString().split('T')[0]
      })) : []
    };
    saveState(state);
    res.json(state.radiationData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset radiation data" });
  }
});

// --- Lazy Initializer for GoogleGenAI with Environment Variable Guard ---
let aiInstance: GoogleGenAI | null = null;
const getAiInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but not configured. Set it under Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
};

// --- AI Radiology Diagnostic Report Generator Route ---
app.post("/api/gemini/diagnostics-report", async (req, res) => {
  try {
    const { modality, finding } = req.body;
    if (!modality || !finding) {
      return res.status(400).json({ error: "Parameters 'modality' and 'finding' are required." });
    }

    // Try to get the initialized Gemini instance
    const ai = getAiInstance();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `اكتب تقرير طبي تشخيصي تفصيلي ومكتمل باللغة العربية كطبيب أشعة محترف بأسلوب أكاديمي رسمي لجهاز الفحص: ${modality}، بناءً على الملاحظة الطبية والمشاهدة: ${finding}.
يجب أن يتبع التقرير بدقة البنية الطبية المعتمدة ويشمل الأقسام التالية مع الاستعانة بالمصلحات الأجنبية اللاتينية عند الضرورة:
1. الفحص والملخص السريري وبروتوكول الفحص المتبع (Study Protocol)
2. نتائج الفحص بالتفصيل (Detailed Findings) لشرح مظهر وبنية الأنسجة والنسب الطبيعية وغير الطبيعية
3. الانطباع الاستدلالي النهائي (Impression) لتأكيد الحالة
4. التوصيات الطبية والمتابعة المتبعة (Recommendations)

اكتب التقرير مباشرة وبكل رصانة طبية واحترافية وبدون أي طابع دعائي أو مقدمات خارجة عن السياق الطبي، ليكون جاهزاً للطباعة والاعتماد من قبل طبيب المصلحة المختص. يرجى ألا تزيد المقالة الكاملة للتقرير عن 15 إلى 20 سطراً لتناسب نماذج المستندات وتكون محددة بدقة عقلانية.`,
    });

    res.json({ report: result.text });
  } catch (error: any) {
    console.error("[Gemini Report Endpoint] Error generating diagnostic report:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate report with Gemini. Ensure GEMINI_API_KEY on the server is loaded." 
    });
  }
});

// --- VITE MIDDLEWARE HANDLING OR STAGE SERVING ---
async function startServer() {
  // Sync latest cloud state on startup as non-blocking background process
  if (db) {
    console.log("[Startup] Initializing background cloud synchronization from Firestore...");
    syncStateFromFirestore().catch((err) => {
      console.error("[Startup Sync] Non-blocking background sync failed:", err);
    });
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Radiology Staff Manager Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
