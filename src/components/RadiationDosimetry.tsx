import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, Settings, Award, Users, PlusCircle, AlertOctagon, HelpCircle,
  Volume2, VolumeX, Radio, Calendar, Activity, Zap, CheckCircle, RefreshCw, Trash2, Edit2
} from "lucide-react";
import { Employee, RoomRadiationReading, CalibrationLog, PersonalDosimeter, UserRole } from "../types";

interface RadiationDosimetryProps {
  currentUser: any;
  employees: Employee[];
  radiationData?: {
    roomReadings: RoomRadiationReading[];
    calibrations: CalibrationLog[];
    dosimeters: PersonalDosimeter[];
  };
  triggerToast: (msg: string, type: "success" | "alert" | "info") => void;
  onUpdateState: () => void;
}

export default function RadiationDosimetry({
  currentUser,
  employees,
  radiationData,
  triggerToast,
  onUpdateState
}: RadiationDosimetryProps) {
  // Safe defaults if data is still fetching or not loaded
  const rooms = radiationData?.roomReadings || [];
  const calibrations = radiationData?.calibrations || [];
  const dosimeters = radiationData?.dosimeters || [];

  // Local active states
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("room-1");
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // New Calibration form state
  const [showCalForm, setShowCalForm] = useState<boolean>(false);
  const [newCalDevice, setNewCalDevice] = useState<string>("");
  const [newCalSerial, setNewCalSerial] = useState<string>("");
  const [newCalDate, setNewCalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newCalExpiry, setNewCalExpiry] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [newCalAgency, setNewCalAgency] = useState<string>("");
  const [newCalBattery, setNewCalBattery] = useState<number>(100);

  // Edit Personal Dosimeter form state
  const [editingDoseEmpId, setEditingDoseEmpId] = useState<string | null>(null);
  const [editQuarterDose, setEditQuarterDose] = useState<string>("");
  const [editAnnualDose, setEditAnnualDose] = useState<string>("");
  const [editBadgeCode, setEditBadgeCode] = useState<string>("");

  // Refs for audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected room radiation rate
  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const activeReading = activeRoom ? activeRoom.reading : 0.15;

  // Geiger Counter click player
  const playGeigerClick = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      // Geiger discharge sound: high frequency pop with exponential decay
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.012);
      
      // Crackle click volume
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.01);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.012);
    } catch (e) {
      console.warn("Geiger audio simulation failed to play:", e);
    }
  };

  // Sound loop based on radiation readings
  useEffect(() => {
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current);
      clickIntervalRef.current = null;
    }

    if (!soundEnabled || !activeRoom) return;

    // Map reading (uSv/h) to intervals. 
    // Default cosmic background (~0.05 uSv/h) yields rare clicks (every 2-4s)
    // Emergency level (5.0+ uSv/h) yields rapid frantic crackling (every 30-100ms)
    const reading = activeRoom.reading;
    
    // Calculate randomized timing interval
    const baseMs = Math.max(25, Math.min(3000, 300 / (reading + 0.05)));

    const triggerCrackle = () => {
      playGeigerClick();
      // Schedule next random click with a deviation for absolute Geiger realistic jitter
      const nextJitter = baseMs * (0.6 + Math.random() * 0.8);
      clickIntervalRef.current = setTimeout(triggerCrackle, nextJitter);
    };

    clickIntervalRef.current = setTimeout(triggerCrackle, baseMs);

    return () => {
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current);
      }
    };
  }, [soundEnabled, selectedRoomId, activeReading]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update room reading slider
  const handleRoomReadingChange = async (roomId: string, newReading: number) => {
    const updatedRooms = rooms.map(r => {
      if (r.id === roomId) {
        let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
        if (newReading > 4.0) status = "DANGER";
        else if (newReading > 1.0) status = "WARNING";
        return {
          ...r,
          reading: Math.round(newReading * 100) / 100,
          status,
          lastChecked: new Date().toISOString().split("T")[0]
        };
      }
      return r;
    });

    try {
      const response = await fetch("/api/radiation/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomReadings: updatedRooms })
      });
      if (response.ok) {
        onUpdateState();
      } else {
        triggerToast("فشل تحديث قراءة الغرفة", "alert");
      }
    } catch {
      triggerToast("حدث خلل أثناء الاتصال بخادم مصلحة الأشعة", "alert");
    }
  };

  // Reset to default
  const handleResetData = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إعادة ضبط قراءات الإشعاع للقيم النموذجية الافتراضية؟")) return;
    try {
      const resp = await fetch("/api/radiation/reset", { method: "POST" });
      if (resp.ok) {
        triggerToast("تم إعادة تصفير ومعايرة جميع مستشعرات الإشعاع وخلفية الغرف بنجاح.", "success");
        onUpdateState();
      } else {
        triggerToast("فشل تصفير أجهزة الإشعاع", "alert");
      }
    } catch {
      triggerToast("خطأ مجهول أثناء تصفير وحيازة مستشعرات جيجر", "alert");
    }
  };

  // Log new calibration
  const handleSaveCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalDevice || !newCalSerial || !newCalAgency) {
      triggerToast("الرجاء ملء جميع خانات المعايرة الفنية المطلوبة.", "alert");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const status = new Date(newCalExpiry) < new Date(today) ? "EXPIRED" : "PASSED";

    const payload = {
      deviceName: newCalDevice,
      serialNumber: newCalSerial,
      calibrationDate: newCalDate,
      expiryDate: newCalExpiry,
      batteryPercent: Number(newCalBattery),
      calibratedBy: newCalAgency,
      status
    };

    try {
      setIsCalibrating(true);
      const response = await fetch("/api/radiation/calibrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        triggerToast(`تم تسجيل شهادة المعايرة الدورية بنجاح لـ ${newCalDevice}.`, "success");
        setShowCalForm(false);
        setNewCalDevice("");
        setNewCalSerial("");
        setNewCalAgency("");
        onUpdateState();
      } else {
        triggerToast("فشل توثيق معاملة المعايرة", "alert");
      }
    } catch {
      triggerToast("خطأ اتصال أثناء حفظ شهادة الأمان", "alert");
    } finally {
      setIsCalibrating(false);
    }
  };

  // Save staff dosimeter
  const handleSaveDosimeter = async (empId: string) => {
    if (!editBadgeCode || editQuarterDose === "" || editAnnualDose === "") {
      triggerToast("يرجى إكمال بيانات الجرعة ونمرة البطاقة الشخصية أولاً.", "alert");
      return;
    }

    const qDose = parseFloat(editQuarterDose);
    const aDose = parseFloat(editAnnualDose);

    if (isNaN(qDose) || isNaN(aDose)) {
      triggerToast("الرجاء إدخال أرقام صحيحة لجرعات الإشعاع (mSv).", "alert");
      return;
    }

    try {
      const response = await fetch(`/api/radiation/dosimeters/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quarterDose: qDose,
          annualDose: aDose,
          badgeCode: editBadgeCode
        })
      });

      if (response.ok) {
        triggerToast("تم تحديث بطاقة قياس الجرعة ومستوى التعرض التراكمي للكادر بنجاح.", "success");
        setEditingDoseEmpId(null);
        onUpdateState();
      } else {
        triggerToast("تعذر تخزين قراءات الجرعات الشخصية.", "alert");
      }
    } catch {
      triggerToast("خطأ اتصال بالشبكة أثناء تسجيل بيانات dosimeter.", "alert");
    }
  };

  // Edit button toggle initializer
  const startEditingDose = (empId: string, currentBadge?: string, currentQ?: number, currentA?: number) => {
    setEditingDoseEmpId(empId);
    setEditBadgeCode(currentBadge || `TLD-${Date.now().toString().slice(-4)}`);
    setEditQuarterDose(currentQ !== undefined ? String(currentQ) : "0.00");
    setEditAnnualDose(currentA !== undefined ? String(currentA) : "0.00");
  };

  return (
    <div className="space-y-6 text-right" dir="rtl" id="radiation-monitoring-page">
      
      {/* Top Welcome Title & Live Geiger audio toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-l from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-500/10 text-rose-400 rounded-full animate-pulse border border-rose-500/30">
              <Radio className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">صالة الوقاية والأمان الإشعاعي (Geiger Hub)</h1>
          </div>
          <p className="text-slate-300 text-xs">
            مراقبة معدلات تسرب الأشعة الحية، أجهزة مسح الجرعات الغرفية، ومعايرة بطاقات الـ TLD الشخصية لكوادر مصلحة الأشعة.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Geiger audio feedback button */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                triggerToast("تم تفعيل مكبر صوت عداد جيجر للغرفة المحددة.", "info");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              soundEnabled 
                ? "bg-teal-500 text-slate-950 animate-pulse font-extrabold" 
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
            <span>{soundEnabled ? "إيقاف صوت نقرات جيجر 🔊" : "استماع لصوت نقرات جيجر 🔇"}</span>
          </button>

          {/* Reset button */}
          {currentUser?.role === UserRole.MANAGER && (
            <button
              onClick={handleResetData}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2.5 rounded-xl text-xs font-black transition-colors"
              title="إعادة تصفير ومعايرة الحساسات"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>إعادة الضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Emergency Status bar if any room is in Danger */}
      {rooms.some(r => r.status === "DANGER") && (
        <div className="p-4 bg-red-950/40 border-2 border-red-800 text-red-200 rounded-2xl flex items-start gap-3 animate-pulse">
          <AlertOctagon className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div className="text-right">
            <h4 className="text-sm font-bold text-red-200">تحذير أمان: معدل جرعة غرفي خارج النطاق القياسي (DANGER)!</h4>
            <p className="text-xs text-red-350">
              يرجى التحقق من غلق الأبواب الرصاصية العازلة في مختبرات المعالجة والتأكد من ارتداء الموظفين للمآزر الواقية من الرصاص بانتظام.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Monitor Rooms & Detailed visual dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Room Monitor sliders (6 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-500" />
                <span>حساسات الكشف اللحظية المحيطية (Area Monitors)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">الوحدة: μSv/h (ميكرو سيفرت / ساعة)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                let statusColor = "bg-emerald-500 text-white";
                let statusBg = "bg-emerald-50/70 border-emerald-200";
                let statusAr = "آمن";
                
                if (room.status === "DANGER") {
                  statusColor = "bg-rose-600 text-white";
                  statusBg = "bg-rose-50/70 border-rose-200";
                  statusAr = "خطر لتسرب شعاعي";
                } else if (room.status === "WARNING") {
                  statusColor = "bg-yellow-500 text-slate-950";
                  statusBg = "bg-amber-50/60 border-amber-200";
                  statusAr = "نشط ومراقب";
                }

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected 
                        ? "border-teal-500 ring-2 ring-teal-500/20 bg-slate-50/50" 
                        : "border-slate-100 bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Glowing pulse indicator for live listening */}
                    {isSelected && soundEnabled && (
                      <span className="absolute top-2 left-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{room.roomCode}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${statusColor}`}>
                          {statusAr}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{room.roomName}</h4>

                      {/* Display value in large */}
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-[10px] text-slate-400">القراءة:</span>
                        <div>
                          <span className="text-xl font-black text-slate-900 font-mono">{room.reading}</span>
                          <span className="text-[10px] text-slate-500 font-bold mr-1">μSv/h</span>
                        </div>
                      </div>

                      {/* Simulation slider for custom values */}
                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>المحاكاة:</span>
                          <span className="font-mono text-slate-500">{room.reading} uSv/h</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="10.0"
                          step="0.05"
                          value={room.reading}
                          onChange={(e) => handleRoomReadingChange(room.id, parseFloat(e.target.value))}
                          onClick={(e) => e.stopPropagation()} // don't trigger selection toggle on slide
                          className="w-full accent-teal-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Informational Panel on Safe Thresholds */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>مستويات الأمان القياسية (Radiation Dose Guide)</span>
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-right">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold">خلفية معتادة الطبيعية</span>
                <span className="text-xs font-black text-emerald-600 font-mono">~0.1 μSv/h</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold">أقصى حد أثناء التشغيل</span>
                <span className="text-xs font-black text-slate-600 font-mono">2.0 μSv/h</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold">انقسام حد الخطورة</span>
                <span className="text-xs font-black text-amber-500 font-mono">5.0 μSv/h</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold">الجرعة السنوية للعموم</span>
                <span className="text-xs font-black text-rose-500 font-mono">1 mSv/Year</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-450 leading-relaxed">
              * توصي الهيئة الدولية للوقاية من الإشعاع (ICRP) بألا تتجاوز جرعة الموظف المهني في مركز لـ الأشعة <span className="font-extrabold text-red-500">20 مللي سيفرت (20 mSv) سنوياً</span> متراكمة.
            </p>
          </div>
        </div>

        {/* Right Side: Oscilloscope monitor visualization of the active room (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 text-emerald-400 p-5 rounded-3xl border border-slate-800 shadow-lg space-y-4 font-mono relative overflow-hidden">
            
            {/* Grid overlay for radar scope effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,250,154,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,250,154,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs font-black tracking-widest text-emerald-300">LIVE SPECTROMETER</span>
              </div>
              <span className="text-[9px] text-emerald-600 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900 font-sans font-bold">
                {activeRoom ? activeRoom.roomCode : "N/A"}
              </span>
            </div>

            {/* Room title in monitor style */}
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-500 font-sans block">المنطقة تحت الفحص اللحظي:</span>
              <span className="text-sm font-bold text-white font-sans">{activeRoom ? activeRoom.roomName : "تحميل الحساسات..."}</span>
            </div>

            {/* Geiger pulse wave monitor simulator */}
            <div className="h-28 flex items-center justify-center bg-slate-900/60 rounded-xl border border-emerald-950 relative overflow-hidden">
              {/* Dynamic waveform simulation using SVG path */}
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 120" preserveAspectRatio="none">
                <path
                  d={
                    soundEnabled 
                      ? `M 0 60 Q 20 ${60 - Math.min(50, activeReading * 12)} 40 60 T 80 60 T 120 ${60 + Math.min(30, activeReading * 6)} T 160 60 T 200 60 T 240 ${60 - Math.min(45, activeReading * 9)} T 280 60 T 320 60 T 360 ${60 + Math.min(40, activeReading * 8)} T 400 60` 
                      : `M 0 60 L 400 60`
                  }
                  fill="none"
                  stroke={activeReading > 4.0 ? "#f43f5e" : activeReading > 1.0 ? "#f59e0b" : "#10b981"}
                  strokeWidth="2.5"
                  className={soundEnabled ? "animate-[pulse_1s_infinite]" : ""}
                />
              </svg>

              <div className="absolute bottom-2 left-3 text-[9px] text-emerald-600">
                GAIN: AUTO | RANGE: x0.1
              </div>
              <div className="absolute top-2 right-3 text-[9px] text-rose-500 animate-pulse font-sans">
                {activeReading > 4.0 ? "⚠️ RADIATION HIGH INTENSITY ALERT" : "● SYSTEM ARMED"}
              </div>
            </div>

            {/* Dose Rate numerical panel */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-900 border border-emerald-950/80 p-3 rounded-xl">
                <span className="block text-[9px] text-emerald-600 font-sans">INTEGRAL RATE</span>
                <span className="text-2xl font-black text-white font-mono">{activeReading.toFixed(3)}</span>
                <span className="text-[10px] text-emerald-500 mr-1">μSv/h</span>
              </div>
              <div className="bg-slate-900 border border-emerald-950/80 p-3 rounded-xl">
                <span className="block text-[9px] text-emerald-600 font-sans">CONVERSION SCALE</span>
                <span className="text-2xl font-black text-white font-mono">{(activeReading * 8.76).toFixed(2)}</span>
                <span className="text-[10px] text-emerald-500 mr-1">mSv/Yr</span>
              </div>
            </div>

            {/* Shield and safety protocols mini panel on ALARA */}
            <div className="border-t border-emerald-950/60 pt-3 text-[11px] text-slate-300 font-sans space-y-1.5">
              <span className="font-bold block text-emerald-300">درع الوقاية وسلوكيات ALARA:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                <div className="bg-slate-900/60 p-2 rounded border border-emerald-950">
                  <span className="font-extrabold block text-teal-400">الوقت (Time)</span>
                  <span className="text-slate-400">تقليل فترات التعرض بجدولة المناوبة العادلة.</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-emerald-950">
                  <span className="font-extrabold block text-teal-400">المسافة (Distance)</span>
                  <span className="text-slate-400">الابتعاد التام أثناء إطلاق نبضة الأشعة.</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-emerald-950">
                  <span className="font-extrabold block text-teal-400">الحواجز (Shielding)</span>
                  <span className="text-slate-400">إحكام غلق كبائن الرصاص والأبواب الواقية.</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Staff Dosimetry Badge Section (بطاقات التعرض الإشعاعي للكوادر الطبية) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>بطاقات قياس الجرعات التراكمية الشخصية للكوادر (Staff Dosimeters Ledger)</span>
            </h3>
            <p className="text-xs text-slate-500">
              قوائم جرعات الأشعة المسجلة بالمللي سيفرت (mSv) ربع السنوياً المسحوبة من فحص شريحة بطاقة TLD/OSLD.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                <th className="p-3 text-right">صاحب البطاقة / الموظف</th>
                <th className="p-3 text-right">رقم شريحة Dosimeter</th>
                <th className="p-3 text-right">الجرعة ربع السنوية (mSv)</th>
                <th className="p-3 text-right">الجرعة السنوية الإجمالية (mSv)</th>
                <th className="p-3 text-right">الحالة والامتثال</th>
                <th className="p-3 text-right">آخر تاريخ قراءة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const dose = dosimeters.find(d => d.employeeId === emp.id) || {
                  badgeCode: `TLD-26-${emp.id.replace(/\D/g, "") || "XYZ"}`,
                  quarterDose: 0.0,
                  annualDose: 0.0,
                  lastReadingDate: "-"
                };

                const isEditing = editingDoseEmpId === emp.id;

                // Compliance logic
                const annualLimit = 20.0;
                let complianceStatus = "آمن ومرخص";
                let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                
                if (dose.annualDose > 15.0) {
                  complianceStatus = "إنذار - تجاوز عتبة 75%";
                  badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                } else if (dose.annualDose > 5.0) {
                  complianceStatus = "مستقر ومراقب";
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                }

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {emp.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={emp.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                            {emp.name.charAt(0)}
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-slate-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-500">{emp.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Badge No */}
                    <td className="p-3 font-mono text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editBadgeCode}
                          onChange={(e) => setEditBadgeCode(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-24"
                        />
                      ) : (
                        dose.badgeCode
                      )}
                    </td>

                    {/* Quarter Dose */}
                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            value={editQuarterDose}
                            onChange={(e) => setEditQuarterDose(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-16 text-center font-mono"
                          />
                          <span className="text-[9px] text-slate-400">mSv</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-slate-800 font-mono">{dose.quarterDose.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400">mSv</span>
                        </div>
                      )}
                    </td>

                    {/* Annual Dose */}
                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editAnnualDose}
                            onChange={(e) => setEditAnnualDose(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-16 text-center font-mono"
                          />
                          <span className="text-[9px] text-slate-400">mSv</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-black text-slate-900 font-mono">{dose.annualDose.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-450 mr-1">/ 20mSv</span>
                        </div>
                      )}
                    </td>

                    {/* Compliance */}
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                        {complianceStatus}
                      </span>
                    </td>

                    {/* Last reading date */}
                    <td className="p-3 font-mono text-slate-500">
                      {dose.lastReadingDate}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      {currentUser?.role !== UserRole.EMPLOYEE ? (
                        isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveDosimeter(emp.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-extrabold transition-colors"
                            >
                              حفظ
                            </button>
                            <button
                              onClick={() => setEditingDoseEmpId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition-colors"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingDose(emp.id, dose.badgeCode, dose.quarterDose, dose.annualDose)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تحديث القراءة</span>
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px]">مراقب فقط</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hardware Calibration Section (سجل معايرة الأجهزة والشهادات) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-500" />
              <span>أجهزة المسح الغرفية وشواهد معايرة الحساسات (Detectors & Calibration Logs)</span>
            </h3>
            <p className="text-xs text-slate-500">
              متابعة صلاحية عدادات جيجر المحمولة وحجرات التأين لقياس التسريب الإشعاعي بالمرافق.
            </p>
          </div>

          {currentUser?.role === UserRole.MANAGER && (
            <button
              onClick={() => setShowCalForm(!showCalForm)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تسجيل شهادة معايرة</span>
            </button>
          )}
        </div>

        {/* Calibration Form Box */}
        {showCalForm && (
          <form onSubmit={handleSaveCalibration} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">تفاصيل شهادة معايرة الجهاز الفنية</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">اسم الجهاز الاستشعاري:</label>
                <input
                  type="text"
                  placeholder="مثال: عداد جيجر TLD Reader"
                  value={newCalDevice}
                  onChange={(e) => setNewCalDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">الرقم التسلسلي (Serial Number):</label>
                <input
                  type="text"
                  placeholder="S/N: GM-93921"
                  value={newCalSerial}
                  onChange={(e) => setNewCalSerial(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">مؤسسة شهادة المعايرة والمراقبة:</label>
                <input
                  type="text"
                  placeholder="الوكالة الدولية للرقابة الذرية أو جهة محلية"
                  value={newCalAgency}
                  onChange={(e) => setNewCalAgency(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">تاريخ الفحص الفعلي:</label>
                <input
                  type="date"
                  value={newCalDate}
                  onChange={(e) => setNewCalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">انتهاء صلاحية المعايرة:</label>
                <input
                  type="date"
                  value={newCalExpiry}
                  onChange={(e) => setNewCalExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-right"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block">مستوى البطارية المستقر (0-100%):</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={newCalBattery}
                  onChange={(e) => setNewCalBattery(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-center font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isCalibrating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                {isCalibrating ? "جاري الحفظ والتوثيق..." : "اعتماد شهادة المعايرة ✅"}
              </button>
              <button
                type="button"
                onClick={() => setShowCalForm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                إلغاء التعديل
              </button>
            </div>
          </form>
        )}

        {/* Calibrations Table / list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {calibrations.map((cal) => {
            const isExpired = cal.status === "EXPIRED" || new Date(cal.expiryDate) < new Date();
            return (
              <div key={cal.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  {isExpired ? (
                    <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">معايرة منتهية ⚠️</span>
                  ) : (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">معايرة نشطة وعاملة ✓</span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">{cal.serialNumber}</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{cal.deviceName}</h4>
                  <p className="text-[10px] text-slate-550 leading-relaxed">
                    منفذ بواسطة: <span className="font-extrabold text-slate-600">{cal.calibratedBy}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-200/50 pt-2 text-right">
                  <div>
                    <span className="text-slate-400 block">جرى فحصها:</span>
                    <span className="font-mono text-slate-700 font-extrabold">{cal.calibrationDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">انتهاء الشهادة:</span>
                    <span className={`font-mono font-extrabold ${isExpired ? "text-rose-600" : "text-slate-700"}`}>
                      {cal.expiryDate}
                    </span>
                  </div>
                </div>

                {/* Battery Meter */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="text-slate-500">شحن بطارية الحساس:</span>
                    <span className="text-slate-600 font-mono">{cal.batteryPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${cal.batteryPercent < 30 ? "bg-rose-500" : "bg-teal-500"}`}
                      style={{ width: `${cal.batteryPercent}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
