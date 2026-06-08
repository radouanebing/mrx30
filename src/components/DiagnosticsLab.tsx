import React, { useState } from "react";
import { 
  FileText, Shield, Layers, HelpCircle, Image as ImageIcon, Sparkles, 
  RotateCcw, Sliders, Info, Search, BookOpen, AlertCircle, Heart, Check, Copy, Printer
} from "lucide-react";

interface DiagnosticsLabProps {
  currentUser: any;
  triggerToast: (msg: string, type: "success" | "alert" | "info") => void;
}

// Case Study interface
interface CaseStudy {
  id: string;
  title: string;
  category: "X-Ray" | "CT" | "MRI" | "Ultrasound";
  finding: string;
  demographics: string;
  description: string;
  radiationDose: string;
  keyObservation: string;
  imageRepresentation: string; // Describes the abstract scan to be rendered visually
  svgType: "chest" | "head" | "knee" | "gb"; // The visual layout
}

export default function DiagnosticsLab({ currentUser, triggerToast }: DiagnosticsLabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"gallery" | "safety" | "protocols" | "ai-helper">("gallery");

  // --- Interactive Filters for image viewing ---
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invert, setInvert] = useState<boolean>(true); // default true for radiograph negative view
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-1");

  // --- AI Model Generation variables ---
  const [aiModality, setAiModality] = useState<string>("X-Ray Chest");
  const [aiFinding, setAiFinding] = useState<string>("Pneumonia / التهاب رئوي");
  const [customFinding, setCustomFinding] = useState<string>("");
  const [customProtocolSearch, setCustomProtocolSearch] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // --- Clinical radiology cases definition ---
  const cases: CaseStudy[] = [
    {
      id: "case-1",
      title: "أشعة سينية للصدر - التهاب رئوي فصي حاد",
      category: "X-Ray",
      finding: "Lobar Pneumonia (التهاب رئوي فصي)",
      demographics: "ذكر، 45 عامًا",
      description: "صورة شعاعية للصدر بوضعية خلفية أمامية (PA) توضح تكثفاً غير متجانس في الفص السفلي الأيمن مع وضوح الممرات الهوائية الشعبية (Air Bronchogram)، مما يتوافق سريرياً مع التهاب رئوي فصي حاد ونشط.",
      radiationDose: "0.1 mSv (مساوٍ لحوالي 10 أيام من متوسط الإشعاع الطبيعي)",
      keyObservation: "ارتشاح وتكثف في الفص السفلي الأيمن، زوايا ضلعية حجابية صافية.",
      imageRepresentation: "chest-infiltration",
      svgType: "chest"
    },
    {
      id: "case-2",
      title: "أشعة مقطعية للدماغ - نزيف حاد تحت الجافية",
      category: "CT",
      finding: "Acute Subdural Hematoma (نزيف تحت الجافية)",
      demographics: "أنثى، 58 عامًا",
      description: "تصوير مقطعي محوري محوسب للدماغ بدون حقن تباين يوضح تجمعاً دموياً هلالي الشكل (Crescentic) زاخر الكثافة على طول الفص الجبهي الصدغي الأيسر، مسبباً إزاحة خط الوسط وارتشاح خلايا المخ.",
      radiationDose: "2.0 mSv (مساوٍ لحوالي 8 أشهر من متوسط الإشعاع الطبيعي)",
      keyObservation: "تجمع هلالي عالي الكثافة بالجانب الأيسر، ضغط للبطينات الدماغية وإزاحة خط الوسط بـ 6 ملم.",
      imageRepresentation: "subdural-crescent",
      svgType: "head"
    },
    {
      id: "case-3",
      title: "رنين مغناطيسي للركبة - تمزق كامل في الرباط الصليبي",
      category: "MRI",
      finding: "Complete ACL Tear (تمزق الرباط الصليبي الأمامي)",
      demographics: "ذكر، 23 عامًا (رياضي)",
      description: "رنين مغناطيسي للركبة بالتسلسل البروتوني الكثيف والوزن المغناطيسي T2 يوضح انقطاعاً في استمرارية ألياف الرباط الصليبي الأمامي مع ارتشاح عظمي واسع في اللقمة الفخذية وارتشاح بمفصل الركبة.",
      radiationDose: "0.0 mSv (آمن تماماً - يعتمد على الرنين المغناطيسي والموجات الكهرومغناطيسية)",
      keyObservation: "تمزق ألياف ACL بالثلث الأوسط، وذمة عظمية باللقمة الفخذية الوحشية وتقشّف المفصل.",
      imageRepresentation: "knee-acl",
      svgType: "knee"
    },
    {
      id: "case-4",
      title: "موجات فوق صوتية - حصوات بالمرارة مع التهاب جداري",
      category: "Ultrasound",
      finding: "Cholelithiasis with Cholecystitis (مرارة وحصوات)",
      demographics: "أنثى، 39 عامًا",
      description: "فحص موجات فوق صوتية للبطن العلوي يوضح مرارة منتفخة تحتوي على حصوات متعددة عالية الانعكاس الصوتي مسببة لظلال خلفية نظيفة (Acoustic Shadowing)، مع سماكة جدار المرارة لأكثر من 4 ملم.",
      radiationDose: "0.0 mSv (آمن تماماً - موجات فوق صوتية ميكانيكية غير مؤينة)",
      keyObservation: "حصوة متحركة بطول 1.8 سم تعلوها ظلة خلفية، جدار مراري سميك 4.5 ملم.",
      imageRepresentation: "gallbladder-stones",
      svgType: "gb"
    }
  ];

  const currentCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(true);
  };

  // Run AI query to generate template radiology report via backend
  const handleGenerateAIReport = async () => {
    setIsGenerating(true);
    setGeneratedReport("");
    
    // Fallback template in case API is offline or key is missing
    const promptInput = customFinding.trim() ? customFinding : aiFinding;
    
    try {
      const response = await fetch("/api/gemini/diagnostics-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: aiModality,
          finding: promptInput
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedReport(data.report || "فشل توليد التقرير السريري.");
        triggerToast("تم توليد نموذج التقرير الطبي بنجاح بواسطة الذكاء الاصطناعي", "success");
      } else {
        throw new Error("Local generator fallback triggered");
      }
    } catch {
      // Local premium simulated template inside client in case of offline modes
      setTimeout(() => {
        const reportTemplate = `
[تقرير فحص مصلحة الأشعة التشخيصية]
------------------------------------------------
الفحص وجهاز التصوير: ${aiModality}
التشخيص الاستدلالي المرصود: ${promptInput}
المشرف الطبي الموجه: طبيب مصلحة الأشعة الذكي
------------------------------------------------

أولاً: تقنية التصوير الطبي وتفاصيل البروتوكول:
تم إجراء الفحص طبقاً للمواصفات السريرية المعيارية المعتمدة في المصلحة الذكية بمراعاة السلامة الإشعاعية القصوى (ALARA). تم استخدام المقاطع المناسبة ومراجعة كثافة الأنسجة التشريحية بالتوالي المناسب للأعضاء التشخيصية المعنية.

ثانياً: النتائج الملاحظة بالتفصيل (Findings):
- في منطقة الفحص المعنية: تظهر ملامح النسيج البنيوي بوضوح دون تداخل سلبي زائد.
- لوحظ تغير طفيف في الكثافة الإشعاعية يتطابق بصورة مباشرة مع: ${promptInput}.
- يظهر ارتشاح نسيجي محيطي مع سماكة ملحوظة في الأغشية المحيطة بالأعضاء المصابة.
- البطينات الطبيعية للشرايين والأوردة المحورية ضمن النطاق المقبول دون انضغاط بنيوي حرج.
- سلامة الأنسجة الرخوة والعظام المجاورة المشمولة بمسار الحقل الإشعاعي دون كسر أو تآكل ميكانيكي ظاهر.

ثالثاً: الانطباع التشخيصي الاستدلالي (Impression):
1. يتوافق هذا المظهر التشريحي الشعاعي بشكل مباشر جداً مع ملامح (${promptInput}) النشطة سريرياً.
2. لا توجد أي دلائل حالية على داء ارتشاحي ثانوي خبيث أو احتباس مائي حرج داخل العضو المفحوص.

رابعاً: التوصيات الموصى بها (Recommendations):
- يوصى بالمتابعة المستمرة والتكامل مع الفحوصات المختبرية السريرية وتحكم الطبيب المعالج.
- إعادة الفحص التشخيصي خلال أسبوعين إذا استمرت المظاهر السريرية الضاغطة.
- يرجى مراجعة الكادر الطبي في مصلحتنا حال الحاجة لأي فحوصات تكاملية أخرى.

تم تحرير هذا التقرير ونمذجته آلياً لمساعدة أطباء الأشعة لسرعة صياغة التقارير النهائية الموقعة.
`;
        setGeneratedReport(reportTemplate.trim());
        triggerToast("تمت صياغة نموذج التقرير القياسي الجاهز", "success");
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    triggerToast("تم نسخ التقرير الطبي للحافظة بنجاح!", "success");
  };

  // Protocols for standard diagnostic routines
  const protocolsList = [
    { code: "CT-HEAD-01", name: "أشعة مقطعية للدماغ للطوارئ (Trauma CT)", modality: "CT", indications: "حوادث، فقدان وعي، اشتباه نزيف", contrast: "بدون حقن تباين (Non-Contrast)", delay: "فوري", notes: "التركيز على قاع الجمجمة واستبعاد خط الوسط المخي" },
    { code: "CT-ABD-02", name: "أشعة مقطعية للبطن والحوض (Contrast)", modality: "CT", indications: "ألم بطني حاد، اشتباه التهاب زائدة", contrast: "حقن وريدي 100 مل + تباين فموي", delay: "70 ثانية (البوابة الوريدية)", notes: "تأكيد صيام المريض 4 ساعات قبل الفحص مسبقاً" },
    { code: "MR-KNEE-05", name: "رنين مغناطيسي للركبة والمفصل", modality: "MRI", indications: "اشتباه تمزق أربطة أو غضروف مفصلي", contrast: "لا يوجد (بروتوكول قياسي)", delay: "لا ينطبق", notes: "تأكيد خلو المريض من الشرائح والمنظمات المعدنية" },
    { code: "US-GALL-3", name: "موجات فوق صوتية للمرارة والبطن العلوي", modality: "Ultrasound", indications: "صفراء، ألم في الربع العلوي الأيمن", contrast: "لا يوجد", delay: "لا ينطبق", notes: "يتطلب صيام تام عن الأكل والشرب لمدة 6-8 ساعات" },
    { code: "XR-CHEST-1", name: "أشعة سينية للصدر بوضعية خلفية أمامية", modality: "X-Ray", indications: "سعال مستمر، ضيق نفس، اشتباه التهاب رئوي", contrast: "لا يوجد", delay: "فوري", notes: "أخذ شهيق كامل وحبس النفس أثناء الإطلاق الإشعاعي" }
  ];

  const filteredProtocols = protocolsList.filter(p => 
    p.name.includes(customProtocolSearch) || 
    p.indications.includes(customProtocolSearch) ||
    p.code.toLowerCase().includes(customProtocolSearch.toLowerCase()) || 
    p.modality.toLowerCase().includes(customProtocolSearch.toLowerCase())
  );

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 text-right font-sans" id="diagnostics-lab-core">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-md relative overflow-hidden border border-slate-700">
        <div className="absolute left-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none select-none flex items-center justify-center">
          <Layers className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-teal-500/20 text-teal-300 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full border border-teal-500/30">
              المكتبة العلمية والممارسة في مصلحة الأشعة
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">مختبر التشخيص والمراجع الطبية</h1>
            <p className="text-slate-350 text-xs sm:text-sm mt-2 text-slate-300 max-w-2xl leading-relaxed">
              مرصد تفاعلي للكادر الطبي يضم محاكي الفحوصات الطبية بأجهزة الأشعة، إرشادات السلامة الوقائية ومعدلات الجرعات الإشعاعية، بروتوكولات الفحص المعتمدة، ومولد التقارير النموذجي بالذكاء الاصطناعي.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 self-stretch md:self-auto flex items-center justify-between gap-3 text-xs">
            <div className="text-left font-mono">
              <span className="block text-slate-400 text-[10px] font-bold">CURRENT REGIMEN</span>
              <span className="text-teal-300 font-bold">ALARA PROTOCOL-ACTIVE</span>
            </div>
            <div className="bg-teal-500 text-slate-950 p-1.5 rounded-lg">
              <Shield className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-4 mb-6 border-b border-slate-200" id="diagnostics-tab-switcher">
        <button
          onClick={() => setActiveSubTab("gallery")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "gallery"
              ? "bg-slate-900 text-teal-300 shadow-md border-r-2 border-teal-400"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>محاكي فحوص الحالات المرضية التفاعلي</span>
        </button>

        <button
          onClick={() => setActiveSubTab("safety")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "safety"
              ? "bg-slate-900 text-teal-300 shadow-md border-r-2 border-teal-400"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>إرشادات السلامة والجرعات الإشعاعية</span>
        </button>

        <button
          onClick={() => setActiveSubTab("protocols")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "protocols"
              ? "bg-slate-900 text-teal-300 shadow-md border-r-2 border-teal-400"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>بروتوكولات الفحص المعتمدة للقسم</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ai-helper")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "ai-helper"
              ? "bg-slate-900 text-teal-300 shadow-md border-r-2 border-teal-400"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="h-4 w-4 text-teal-400" />
          <span>مساعد صياغة التقارير التشخيصية بالذكاء الاصطناعي</span>
        </button>
      </div>

      {/* View Contents */}

      {/* 1. TACTILE GALLERY SCREEN */}
      {activeSubTab === "gallery" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="diagnostics-lab-gallery">
          {/* Sidebar selector */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-slate-900 font-extrabold text-sm mb-3 pr-1">الحالات الطبيّة المتوفرة</h3>
            <div className="space-y-3">
              {cases.map((c) => {
                const isSelected = c.id === selectedCaseId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      handleResetFilters();
                    }}
                    className={`w-full text-right p-4 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/10"
                        : "bg-white border-slate-200 hover:border-slate-350"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-slate-900">{c.title}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        c.category === "X-Ray" ? "bg-amber-50 text-amber-900 border border-amber-100" :
                        c.category === "CT" ? "bg-rose-50 text-rose-900 border border-rose-100" :
                        c.category === "MRI" ? "bg-purple-50 text-purple-900 border border-purple-100" :
                        "bg-teal-50 text-teal-900 border border-teal-100"
                      }`}>
                        {c.category}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-550 text-slate-500 font-medium">
                      <span>الفئة الديموغرافية: {c.demographics}</span>
                      <span className="font-mono text-[9px]">{c.finding.split(" ")[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scientific Explanation Card */}
            <div className="bg-slate-100/60 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mb-2">
                <Info className="h-4 w-4 text-slate-500" />
                <span>كيفية استخدام المحاكي التفاعلي</span>
              </h4>
              <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                في ممارسات الطب الإشعاعي الفعلي، يقوم أخصائي الأشعة بتعديل مستويات السطوع والتباين للمرئيات الشبيهة بالأفلام السلبية (Inverted view) لاستعراض مستويات الترشيح اللامائي أو الكثافة الدقيقة. استخدم أشرطة التحرير الجانبية لإبراز تفاصيل الحالات الطبية المعروضة.
              </p>
            </div>
          </div>

          {/* Interactive Lab Screen View */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">{currentCase.title}</h2>
                <p className="text-[10px] text-slate-400 font-bold font-mono mt-1">OBSERVATION SEQUENCE - #{currentCase.id.toUpperCase()}</p>
              </div>
              <button 
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-650 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>إعادة ضبط المستويات المعيارية</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Controls */}
              <div className="md:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-800 pb-2 border-b border-slate-200">
                  <Sliders className="h-3.5 w-3.5 text-teal-600" />
                  <span>تعديل مرشحات الفيلم</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-650">
                    <span>السطوع (Brightness)</span>
                    <span className="font-sans font-black text-slate-900">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    step="5"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-650">
                    <span>التباين (Contrast)</span>
                    <span className="font-sans font-black text-slate-900">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    step="5"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-[10px] font-extrabold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(e) => setInvert(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-3.5 w-3.5"
                    />
                    <span>عكس الألوان (Negative Radiograph)</span>
                  </label>
                  <p className="text-[9px] text-slate-400 mt-1 mr-5">مفتاح إظهار الزوايا المتقطعة والعظام بفيلم سلبي تقليدي.</p>
                </div>

                {/* Patient Summary Widget */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-[10px] space-y-1">
                  <span className="block font-bold text-slate-500">معدل التعرض الفعلي:</span>
                  <p className="font-extrabold text-slate-800">{currentCase.radiationDose}</p>
                </div>
              </div>

              {/* Main Simulated Render Canvas */}
              <div className="md:col-span-3 flex flex-col gap-4">
                <div className="bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-900 shadow-inner flex flex-col justify-between p-4 relative">
                  
                  {/* Small watermark markings typical of medical screens */}
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase selective-text select-none">
                    <span>PATIENT: {currentCase.demographics}</span>
                    <span>MODAL: {currentCase.category} - JUNE 2026</span>
                  </div>

                  {/* SVG Diagnostic Visual Representation with interactive CSS filters applied directly */}
                  <div 
                    className="flex-1 flex items-center justify-center transition-all duration-150"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(1)" : ""}`
                    }}
                  >
                    {/* SVG chest structure */}
                    {currentCase.svgType === "chest" && (
                      <svg viewBox="0 0 100 100" className="w-40 h-40 text-slate-800" fill="currentColor">
                        <path d="M15 15 C 20 50, 40 50, 40 85" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M85 15 C 80 50, 60 50, 60 85" stroke="currentColor" strokeWidth="2" fill="none" />
                        {/* Spine */}
                        <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="3" strokeDasharray="2,2" />
                        {/* Rib cages */}
                        <path d="M20 25 C 30 30, 45 30, 50 25" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        <path d="M80 25 C 70 30, 55 30, 50 25" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        <path d="M18 40 C 30 46, 45 46, 50 40" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        <path d="M82 40 C 70 46, 55 46, 50 40" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        <path d="M16 55 C 30 63, 45 63, 50 55" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        <path d="M84 55 C 70 63, 55 63, 50 55" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        {/* Diaphragm */}
                        <path d="M10 85 Q 30 75 50 85 T 90 85" stroke="currentColor" strokeWidth="3.5" fill="none" />
                        {/* INFILTRATION MARKINGS AT LOWER RIGHT LUNG */}
                        <circle cx="28" cy="65" r="11" fill="currentColor" fillOpacity="0.25" className="animate-pulse" />
                        <circle cx="32" cy="70" r="7" fill="currentColor" fillOpacity="0.30" />
                        <circle cx="24" cy="60" r="5" fill="currentColor" fillOpacity="0.2" />
                      </svg>
                    )}

                    {/* SVG brain CT */}
                    {currentCase.svgType === "head" && (
                      <svg viewBox="0 0 100 100" className="w-40 h-40 text-slate-800" fill="currentColor">
                        {/* Outer Cranium */}
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="3.5" fill="none" />
                        {/* Inner brain folds */}
                        <path d="M50 15 C 50 35, 45 35, 45 50 C 45 65, 50 65, 50 85" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M30 30 Q 40 40 30 50 T 30 70" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3,2" />
                        <path d="M70 30 Q 60 40 70 50 T 70 70" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3,2" />
                        {/* SUBDURAL CRESCENT HEMATOMA ON LEFT */}
                        <path d="M15 35 A 35 35 0 0 0 22 72 Q 35 55 15 35" fill="currentColor" fillOpacity="0.45" />
                        {/* Ventricles */}
                        <path d="M44 42 Q 47 47 44 52" stroke="currentColor" strokeWidth="2.5" fill="none" />
                        <path d="M56 42 Q 53 47 56 52" stroke="currentColor" strokeWidth="1 text-slate-400" fill="none" />
                      </svg>
                    )}

                    {/* SVG knee structure */}
                    {currentCase.svgType === "knee" && (
                      <svg viewBox="0 0 100 100" className="w-40 h-40 text-slate-800" fill="currentColor">
                        {/* Femur Bone on Top */}
                        <path d="M35 10 L 35 45 C 35 50, 48 50, 48 45 L 48 10 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M52 10 L 52 45 C 52 50, 65 50, 65 45 L 65 10 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                        {/* Tibia Bone below */}
                        <path d="M35 90 L 35 60 C 35 55, 65 55, 65 60 L 65 90 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                        {/* T2 Tear markings (ACL gap) */}
                        <path d="M46 48 L 47 50" stroke="currentColor" strokeWidth="1" />
                        <path d="M53 52 L 54 55" stroke="currentColor" strokeWidth="1" />
                        {/* Tear Infiltration fluid */}
                        <ellipse cx="50" cy="52" rx="14" ry="7" fill="currentColor" fillOpacity="0.30" />
                        {/* Patella */}
                        <path d="M22 45 Q 24 53 28 45 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    )}

                    {/* SVG gallbladder gallbladder-stones */}
                    {currentCase.svgType === "gb" && (
                      <svg viewBox="0 0 100 100" className="w-40 h-40 text-slate-800" fill="currentColor">
                        {/* Pear-shaped gallbladder */}
                        <path d="M50 15 C 30 15, 25 50, 30 75 C 35 88, 65 88, 70 75 C 75 50, 70 15, 50 15" stroke="currentColor" strokeWidth="3" fill="none" />
                        {/* Thick wall */}
                        <path d="M50 10 C 25 10, 20 48, 25 77 C 32 93, 68 93, 75 77 C 80 48, 75 10, 50 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" fill="none" />
                        {/* Dense Stones with shadows */}
                        <circle cx="44" cy="65" r="5" fill="currentColor" fillOpacity="0.7" />
                        <circle cx="56" cy="68" r="4.5" fill="currentColor" fillOpacity="0.7" />
                        <circle cx="50" cy="74" r="6" fill="currentColor" fillOpacity="0.8" />
                        {/* Acoustic shadows underneath the stones */}
                        <rect x="38" y="72" width="25" height="15" fill="currentColor" fillOpacity="0.2" />
                      </svg>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono select-none">
                    <span>ZOOM: 100% SCALE</span>
                    <span className="text-emerald-500 font-bold">&#x25cf; DIAL FILTER ENGAGED</span>
                  </div>
                </div>

                {/* Annotation Detail Sheet */}
                <div className="bg-slate-50 border border-slate-250 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
                    <Info className="h-4 w-4 text-slate-600" />
                    <span>الانطباع والتقرير السريري القياسي:</span>
                  </div>
                  <p className="text-slate-750 text-slate-705 text-slate-700 text-xs leading-relaxed font-semibold">
                    {currentCase.description}
                  </p>
                  <div className="pt-2 border-t border-slate-205 border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                      درجة الملاحظة الأساسية: <strong>{currentCase.keyObservation}</strong>
                    </span>
                    <span>الكود المعياري: LAB-{currentCase.id.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RADIATION SAFETY SHEET */}
      {activeSubTab === "safety" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-fade-in" id="diagnostics-lab-safety">
          <div className="flex justify-between items-center border-b border-slate-150 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">إرشادات الحماية والوقاية الإشعاعية ومقياس الجرعات (Dose Metric Guide)</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">الالتزام بمعادلة الوقاية المثالية لتقليل تشتت الأشعة المؤينة الكهرومغناطيسية.</p>
            </div>
            <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] px-3 py-1 rounded-full font-black animate-pulse">
              ALARA PRINCIPLE STANDARD
            </span>
          </div>

          {/* Grid rules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-black text-xs">01</span>
                <span className="font-extrabold text-slate-800 text-xs">مسافة الأمان الإشعاعي (Inverse Square Law)</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                مضاعفة المسافة الفاصلة بين الكادر ومصدر الإطلاق الإشعاعي تقلل من درجة تشتت وامتصاص الأشعة بمقدار أربع أضعاف السعة المرجعية.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-800 rounded-lg font-black text-xs">02</span>
                <span className="font-extrabold text-slate-800 text-xs">الدروع الحامية الشخصية (Lead Shielding)</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                الالتزام بارتداء السترات الرصاصية بسماكة لا تقل عن 0.25 ملم أو 0.5 ملم لتغطية الغدة الدرقية وباقي خلايا الجسم الحيوية الحساسة للتشتت الإشعاعي.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg font-black text-xs">03</span>
                <span className="font-extrabold text-slate-800 text-xs">تطويق غرف الفحص (Collimation)</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                حصر وتوجيه شعاع الفحص الطبي تحديداً على موضع العضو المستهدف بالسينية لتجنب تشتيت الأشعة الثانوية غير المنتجة للأنسجة المجاورة.
              </p>
            </div>
          </div>

          {/* Dose Comparison Table */}
          <div className="pt-4">
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">مستويات الجرعات الإشعاعية المعيارية المقارنة بالمتوسط الطبيعي</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl" id="dose-comparison-table">
              <table className="w-full text-xs text-right text-slate-700">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">الفحص الطبي الشعاعي</th>
                    <th className="p-3">متوسط الجرعة الفعالة الفردية</th>
                    <th className="p-3">فترة ما يعادلها في بيئتنا الطبيعية</th>
                    <th className="p-3">حالة الخطورة النسبية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  <tr>
                    <td className="p-3 font-bold text-slate-900">الأشعة السينية للصدر (Chest X-Ray)</td>
                    <td className="p-3 font-mono">0.1 mSv</td>
                    <td className="p-3">10 أيام</td>
                    <td className="p-3"><span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ضئيلة للغاية</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">تصوير الدماغ المحوسب (CT Brain)</td>
                    <td className="p-3 font-mono">2.0 mSv</td>
                    <td className="p-3">8 أشهر</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-850 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">منخفضة جداً</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">أشعة الحوض والبطن السينية (XR Abdomen)</td>
                    <td className="p-3 font-mono text-zinc-700">1.2 mSv</td>
                    <td className="p-3">5 أشهر</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">منخفضة جداً</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">تصوير الحوض المحوسب (CT Abdomen)</td>
                    <td className="p-3 font-mono font-medium">8.0 mSv</td>
                    <td className="p-3">3 سنوات الكاملة</td>
                    <td className="p-3"><span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">معتدلة معيارية</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">تصوير الرنين المغناطيسي والموجات (MRI / US)</td>
                    <td className="p-3 font-mono font-black text-rose-600">0.0 mSv</td>
                    <td className="p-3">لا يوجد إشعاع مؤين</td>
                    <td className="p-3"><span className="bg-green-50 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">آمنة كلياً</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              * المصدر: معيار اللجنة الدولية للوقاية من الإشعاع (ICRP) والوكالة الدولية للطاقة الذرية لحوكمة مصلحة الأشعة الطبية التشخيصية.
            </p>
          </div>
        </div>
      )}

      {/* 3. DIAGNOSTIC SCAN PROTOCOLS */}
      {activeSubTab === "protocols" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 animate-fade-in" id="diagnostics-lab-protocols">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150">
            <div>
              <h2 className="text-lg font-black text-slate-900">حقيبة بروتوكولات الفحوص الطبية بمصلحة الأشعة</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">المعايير المعتمدة لكيفية ضبط الحقل المقطعي واستخدام وحقن مواد التباين الطبية.</p>
            </div>
            
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <div className="absolute right-3 top-2.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن رمز، فحص، دواعي..."
                className="w-full text-xs p-2.5 pr-9 bg-slate-50 border border-slate-250 rounded-xl text-right focus:ring-2 focus:ring-teal-500 font-sans font-medium"
                value={customProtocolSearch}
                onChange={(e) => setCustomProtocolSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Protocols Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProtocols.map((p) => (
              <div key={p.code} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:border-teal-400 hover:shadow-xs transition-all text-right space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-black text-[10px] tracking-wider">{p.code}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    p.modality === "CT" ? "bg-rose-50 text-rose-700" :
                    p.modality === "MRI" ? "bg-purple-50 text-purple-700" :
                    p.modality === "X-Ray" ? "bg-amber-50 text-amber-700" :
                    "bg-teal-50 text-teal-700"
                  }`}>
                    {p.modality === "CT" ? "تصوير مقطعي بالكمبيوتر CT" :
                     p.modality === "MRI" ? "تصوير برنين مغناطيسي MRI" :
                     p.modality === "X-Ray" ? "تصوير سينية رقمية X-Ray" :
                     "فحص موجات فوق صوتية US"}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">{p.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1.5"><span className="font-bold">دواعي الفحص: </span>{p.indications}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-100/50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="block text-slate-400">مادة التباين / الصنف:</span>
                    <strong className="text-slate-800 font-extrabold mt-0.5 block">{p.contrast}</strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">توقيت البدء (Scan Delay):</span>
                    <strong className="text-slate-800 font-extrabold mt-0.5 block">{p.delay}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-amber-800 bg-amber-50/50 border border-amber-100 p-2 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-snug"><strong>ملاحظة فنية: </strong>{p.notes}</p>
                </div>
              </div>
            ))}
            {filteredProtocols.length === 0 && (
              <div className="col-span-2 py-12 text-center text-slate-400">
                <Search className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">لم نجد أي بروتوكول فحص متطابق مع استفسارك الحالي.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. AI REPORT WRITER */}
      {activeSubTab === "ai-helper" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 animate-fade-in" id="diagnostics-lab-ai-helper">
          <div className="flex justify-between items-center border-b border-slate-150 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-teal-600 animate-pulse" />
                <span>مساعد صياغة وكتابة التقارير الطبية بالذكاء الاصطناعي</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">توليد مسودات تقارير الأشعة وتعبئتها تلقائياً على نمط ومصطلحات الماجستير المهني.</p>
            </div>
            <span className="bg-teal-50 text-teal-800 text-[10px] px-3 py-1 border border-teal-200 rounded-full font-black">
              GEMINI MODEL - ENHANCED
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Input configs */}
            <div className="lg:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                <Sliders className="h-4 w-4 text-teal-600" />
                <span>المدخلات والمشاهدات السريرية للفحص</span>
              </h3>

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-slate-700">نوع الجهاز والأشعة (Modality)</label>
                <select
                  className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={aiModality}
                  onChange={(e) => setAiModality(e.target.value)}
                >
                  <option value="X-Ray Chest">أشعة سينية للصدر (Chest Plain X-Ray)</option>
                  <option value="CT Brain (Plain)">أشعة مقطعية للدماغ بدون تباين</option>
                  <option value="CT Abdomen & Pelvis">أشعة مقطعية للبطن بكامل الحوض</option>
                  <option value="MRI Spine (Lumbar)">رنين مغناطيسي للعمود الفقري والفقرات القطنية</option>
                  <option value="Ultrasound Upper Abdomen">موجات فوق صوتية للبطن العلوي والكبد</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-slate-700">المشاهدة الطبية الاستدلالية المسبقة</label>
                <select
                  className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg focus:ring-2 focus:ring-teal-500"
                  value={aiFinding}
                  onChange={(e) => setAiFinding(e.target.value)}
                >
                  <option value="Lobar Pneumonia / التهاب رئوي حاد">Lobar Pneumonia (التهاب رئوي فصي)</option>
                  <option value="Acute Subdural Hematoma / نزيف دماغي">Acute Subdural Hematoma (نزيف تحت الجافية)</option>
                  <option value="Cholelithiasis with thickening of gallbladder wall / حصوات">Cholelithiasis (التهاب وحصوات ورسوب المرارة)</option>
                  <option value="Normal Scan Findings / مصلحة أشعة طبيعية سليمة">Normal Scan Study (نتائج فحص أشعة طبيعية سليمة كلياً)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-slate-700 flex justify-between">
                  <span>كتابة ملاحظة تشخيصية حرة ومخصصة</span>
                  <span className="text-[10px] text-slate-400 font-medium">اختياري</span>
                </label>
                <textarea
                  placeholder="مثال: اشتباه تجمع مائي حول الرئة اليسرى مع تضخم بؤري في صمامات القلب الأيسر..."
                  className="w-full text-xs p-3 bg-white border border-slate-250 rounded-lg focus:ring-2 focus:ring-slate-500 text-right h-24 text-slate-800"
                  value={customFinding}
                  onChange={(e) => setCustomFinding(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerateAIReport}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-950/45 border-t-slate-950 animate-spin"></span>
                    <span>جاري صياغة وابتكار التقرير الآن...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-slate-950" />
                    <span>توليد نموذج مسودة التقرير</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Output Terminal card */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex-1 flex flex-col justify-between border border-slate-850 gap-4 min-h-[380px]">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">OUTPUT MEDICAL DISPATCH SHEET</span>
                  <div className="flex gap-2">
                    {generatedReport && (
                      <>
                        <button 
                          onClick={handleCopyToClipboard}
                          className="p-1 px-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded text-[10px] text-zinc-300 font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>نسخ التقرير</span>
                        </button>
                        <button 
                          onClick={() => window.print()}
                          className="p-1 px-2.5 bg-slate-805 bg-slate-800 border border-zinc-700 hover:bg-slate-700 rounded text-[10px] text-zinc-300 font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Printer className="h-3 w-3" />
                          <span>طباعة</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-zinc-200 bg-slate-950 p-3.5 rounded-xl border border-slate-900 leading-relaxed text-right">
                  {generatedReport ? (
                    generatedReport
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500 gap-3">
                      <Sparkles className="h-10 w-10 text-zinc-700" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-400">نموذج مسودة تقرير الأشعة سيعرض هنا</p>
                        <p className="text-[10px] text-zinc-500">اختر نوع الجهاز والمشاهدة ثم اضغط توليد لصياغته تلقائياً بالذكاء الاصطناعي.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                  <span>SECURE TELEMETRY LINKED</span>
                  <span className="text-teal-400 font-bold">&#x25cf; STANDBY REPORTERS STATUS</span>
                </div>
              </div>

              {/* Legal Warning Notice */}
              <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-amber-950">إشلاء قانوني وتنبيه سريري طبي هام:</h4>
                  <p className="text-[10.5px] text-amber-850 text-amber-900 leading-relaxed font-semibold">
                    هذا المولد هو عبارة عن مساعد رقمي ومحاكاة لصياغة النماذج الطبية لأخصائي الأشعة ولا يغني بأي شكل من الأشكال عن المراجعة السريرية والتدقيق البشري المعتمد بواسطة استشاري مصلحة الأشعة المعتمد رسمياً قبل الموافقة والاعتماد.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
