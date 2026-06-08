import React, { useState, useRef } from "react";
import { 
  Megaphone, 
  Newspaper, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Image as ImageIcon, 
  Search, 
  Calendar, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Eye, 
  Info, 
  Pin,
  Clock,
  ExternalLink
} from "lucide-react";
import { Employee, UserRole, AdminNotice, NoticeCategory } from "../types";

interface AdminNoticesProps {
  notices: AdminNotice[];
  currentUser: Employee | null;
  onAddNotice: (notice: { title: string; content: string; category: NoticeCategory; imageUrl?: string }) => Promise<void>;
  onUpdateNotice: (id: string, notice: Partial<AdminNotice>) => Promise<void>;
  onDeleteNotice: (id: string) => Promise<void>;
  triggerToast: (text: string, type: "alert" | "info" | "success") => void;
}

export default function AdminNotices({
  notices,
  currentUser,
  onAddNotice,
  onUpdateNotice,
  onDeleteNotice,
  triggerToast
}: AdminNoticesProps) {
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPERVISOR;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Form States (for Create & Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoticeCategory>(NoticeCategory.NOTICE);
  const [imageUrl, setImageUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File drag & drop references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Detail View State
  const [selectedNotice, setSelectedNotice] = useState<AdminNotice | null>(null);

  // Category labels in Arabic
  const categoryLabels: Record<NoticeCategory, { name: string; color: string; bg: string; border: string }> = {
    [NoticeCategory.NOTICE]: { 
      name: "تعميم إداري هام", 
      color: "text-amber-800", 
      bg: "bg-amber-50", 
      border: "border-amber-200" 
    },
    [NoticeCategory.REPORT]: { 
      name: "تقرير إداري دوري", 
      color: "text-violet-800", 
      bg: "bg-violet-50", 
      border: "border-violet-200" 
    },
    [NoticeCategory.DECISION]: { 
      name: "قرار مصلحي ملزم", 
      color: "text-emerald-800", 
      bg: "bg-emerald-50", 
      border: "border-emerald-200" 
    },
    [NoticeCategory.GENERAL]: { 
      name: "توجيهات وإرشادات عامة", 
      color: "text-blue-800", 
      bg: "bg-blue-50", 
      border: "border-blue-200" 
    }
  };

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        triggerToast("حجم الصورة كبير جداً. الحد الأقصى هو 2 ميغابايت لتجنب تباطؤ السيرفر.", "alert");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImageUrl(reader.result);
          triggerToast("تم تحميل وضغط الصورة السحابية بنجاح.", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        triggerToast("يرجى إرفاق ملف صورة صالح فقط (PNG, JPG, JPEG).", "alert");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        triggerToast("حجم الملف يتجاوز 2 ميغا بايت.", "alert");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImageUrl(reader.result);
          triggerToast("تم إرفاق الصورة الملقاة كحافظة للمنشور.", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreate = () => {
    setFormMode("CREATE");
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory(NoticeCategory.NOTICE);
    setImageUrl("");
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (notice: AdminNotice, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode("EDIT");
    setEditingId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setCategory(notice.category);
    setImageUrl(notice.imageUrl || "");
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !content.trim()) {
      setFormError("الرجاء ملء عنوان المنشور والمحتوى الإداري.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (formMode === "CREATE") {
        await onAddNotice({
          title: title.trim(),
          content: content.trim(),
          category,
          imageUrl: imageUrl || undefined
        });
        triggerToast("تم نشر وتعميم المنشور في السحابة بنجاح.", "success");
      } else if (formMode === "EDIT" && editingId) {
        await onUpdateNotice(editingId, {
          title: title.trim(),
          content: content.trim(),
          category,
          imageUrl: imageUrl || undefined
        });
        triggerToast("تم تحديث وتعديل المنشور الإداري بنجاح.", "success");
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ أثناء معالجة المنشور.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("هل أنت متأكد تماماً من رغبتك في حذف هذا المنشور الإداري نهائياً؟ لا يمكن التراجع عن هذه الخطوة.")) {
      try {
        await onDeleteNotice(id);
        triggerToast("تم إلغاء وحذف المنشور من لوحة المصلحة بنجاح.", "success");
        if (selectedNotice?.id === id) {
          setSelectedNotice(null);
        }
      } catch (err: any) {
        triggerToast("فشل في حذف المنشور.", "alert");
      }
    }
  };

  // Filter and search logic
  const filteredNotices = notices.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.authorName && n.authorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "ALL" || n.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6" id="admin-notices-viewport">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1.5 text-right w-full sm:w-auto">
          <div className="flex items-center gap-2.5 justify-end sm:justify-start">
            <span className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-100">
              <Megaphone className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">المنشورات والتعاميم والتقارير الإدارية</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            لوحة الإعلانات الرسمية والتقارير التنظيمية والقرارات الصادرة من إدارة مصلحة الأشعة.
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenCreate}
            id="btn-create-notice"
            className="w-full sm:w-auto text-xs bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-teal-600/10 cursor-pointer flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.01]"
          >
            <Plus className="h-4 w-4" />
            <span>نشر تعميم / تقرير إداري جديد</span>
          </button>
        )}
      </div>

      {/* Tickers for latest Notices for general users */}
      {filteredNotices.length > 0 && (
        <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-2xl p-4 flex items-center gap-3 transition-colors">
          <span className="p-1.5 bg-amber-100 border border-amber-200 text-amber-700 rounded-lg animate-pulse">
            <Pin className="h-3.5 w-3.5" />
          </span>
          <div className="flex-grow text-xs text-amber-950 font-bold text-right flex flex-col md:flex-row md:items-center gap-1">
            <span className="text-amber-800">[تعميم الأسبوع الأخير]</span>
            <span className="font-extrabold">{filteredNotices[0].title}</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal md:mr-auto">
              تاريخ النشر: {new Date(filteredNotices[0].createdAt).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
      )}

      {/* Search and Category Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        {/* Search input */}
        <div className="relative md:col-span-2">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن منشور، تعميم مفاجئ، تقرير أو كاتب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="notices-search-input"
            className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right"
          />
        </div>

        {/* Category Filter selector */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            id="notices-category-filter"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right"
          >
            <option value="ALL">📦 تصنيف المستندات: جميع المنشورات</option>
            <option value={NoticeCategory.NOTICE}>📢 التعاميم الإدارية الداخلية</option>
            <option value={NoticeCategory.REPORT}>📊 تقارير المتابعة الدورية</option>
            <option value={NoticeCategory.DECISION}>⚖️ القرارات المصلحية التنظيمية</option>
            <option value={NoticeCategory.GENERAL}>💡 التوجيهات العامة والإرشادات</option>
          </select>
        </div>
      </div>

      {/* Notices Grid / View */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-16 text-center shadow-inner space-y-4">
          <div className="p-4 bg-slate-50 inline-block rounded-full border border-slate-100 text-slate-400">
            <Newspaper className="h-8 w-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-700">لا يوجد أي منشورات مطابقة لمعايير البحث حالياً</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              إذا كنت مديراً يمكنك إنشاء ونشر أول منشور أو تقرير إداري عبر خيار "نشر تعميم جديد" من الجهة العليا.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="notices-cards-grid">
          {filteredNotices.map((notice) => {
            const labelSpec = categoryLabels[notice.category] || { name: "عام", color: "text-slate-800", bg: "bg-slate-50", border: "border-slate-200" };
            return (
              <div
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col group relative"
              >
                {/* Banner Image Preview */}
                {notice.imageUrl ? (
                  <div className="h-44 w-full bg-slate-100 overflow-hidden relative border-b border-slate-100 shrink-0">
                    <img
                      src={notice.imageUrl}
                      alt={notice.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-[9px] text-white font-sans px-2 py-0.5 rounded-full z-10">
                      مع صورة مرفقة
                    </span>
                  </div>
                ) : (
                  <div className="h-2 w-full bg-slate-100 shrink-0 group-hover:bg-teal-500 transition-colors" />
                )}

                {/* Card Content Wrapper */}
                <div className="p-5 flex-grow flex flex-col justify-between text-right space-y-4">
                  <div className="space-y-2.5">
                    {/* Category element row */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border ${labelSpec.bg} ${labelSpec.color} ${labelSpec.border}`}>
                        {labelSpec.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notice.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-teal-600 transition-colors">
                      {notice.title}
                    </h3>

                    {/* Content snippet */}
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line font-medium">
                      {notice.content}
                    </p>
                  </div>

                  {/* Creator and Actions Footer */}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="h-5 w-5 bg-teal-50 text-teal-600 border border-teal-100 rounded-full flex items-center justify-center font-sans text-[9px]">
                        {notice.authorName?.substring(0, 2) || "م"}
                      </span>
                      <span className="text-slate-700 truncate max-w-[120px]">
                        {notice.authorName || "إدارة المصلحة"}
                      </span>
                    </div>

                    {/* Card Manager Controls */}
                    <div className="flex items-center gap-2">
                      {isManager && (
                        <>
                          <button
                            onClick={(e) => handleOpenEdit(notice, e)}
                            title="تعديل المنشور"
                            className="p-1.5 bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(notice.id, e)}
                            title="حذف المنشور"
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      
                      <span className="p-1 group-hover:text-teal-600 text-slate-400 transition-colors">
                        <Eye className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detials Drawer or Modal */}
      {selectedNotice && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right overflow-y-auto"
          id="dialog-notice-details"
          onClick={() => setSelectedNotice(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block with image if custom exists */}
            {selectedNotice.imageUrl ? (
              <div className="h-64 w-full bg-slate-100 overflow-hidden relative border-b border-slate-100">
                <img
                  src={selectedNotice.imageUrl}
                  alt={selectedNotice.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-900/60 text-white hover:bg-slate-950 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                  <span className={`text-[10px] font-black text-amber-300 font-sans`}>
                    {(categoryLabels[selectedNotice.category] || { name: "عام" }).name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-3 py-1 bg-teal-100 text-teal-800 border border-teal-200 rounded-full`}>
                    {(categoryLabels[selectedNotice.category] || { name: "عام" }).name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="p-2 hover:bg-slate-250 text-slate-500 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1.5 justify-end">
                  <span>تاريخ النشر: {new Date(selectedNotice.createdAt).toLocaleString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <Clock className="h-3 w-3" />
                </span>
                <h3 className="text-lg md:text-xl font-black text-slate-900 leading-relaxed">
                  {selectedNotice.title}
                </h3>
              </div>

              {/* Main Contents text */}
              <div className="p-5 bg-slate-50/75 border border-slate-100 rounded-2xl">
                <p className="text-xs md:text-sm text-slate-800 leading-loose whitespace-pre-wrap font-medium">
                  {selectedNotice.content}
                </p>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2.5 font-bold">
                  <span className="h-8 w-8 bg-teal-100 text-teal-700 border border-teal-200 rounded-xl flex items-center justify-center font-sans text-xs">
                    {selectedNotice.authorName?.substring(0, 2) || "إد"}
                  </span>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-800">{selectedNotice.authorName || "إدارة المصلحة"}</p>
                    <p className="text-[10px] text-slate-400 font-sans">معتمد بسجلات الإدارة</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  {isManager && (
                    <button
                      onClick={(e) => {
                        setSelectedNotice(null);
                        handleOpenEdit(selectedNotice, e);
                      }}
                      className="flex-1 sm:flex-initial text-xs border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      تعديل محتوى المستند
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="flex-1 sm:flex-initial text-xs bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    إغلاق العرض
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal Form (Create/Edit) */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right overflow-y-auto"
          id="dialog-notice-form"
        >
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-900">
                {formMode === "CREATE" ? "📢 صياغة ونشر مستند إداري جديد" : "✏️ تعديل وتحرير مستند إداري قائم"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">عنوان المنشور أو التعميم *</label>
                <input
                  type="text"
                  placeholder="مثال: تعيين طاقم طوارئ عطلة عيد الأضحى المبارك"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right font-semibold"
                  dir="rtl"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">نوع وتصنيف المستند *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right font-extrabold"
                  dir="rtl"
                >
                  <option value={NoticeCategory.NOTICE}>📢 تعميم إداري هام (للطاقم)</option>
                  <option value={NoticeCategory.REPORT}>📊 تقرير إداري دوري (مسار العمل والجهوزية)</option>
                  <option value={NoticeCategory.DECISION}>⚖️ قرار مصلحي ملزم (تنظيم شؤون المصلحة)</option>
                  <option value={NoticeCategory.GENERAL}>💡 توجيهات وصحية عامة (إرشادات وتنبيهات)</option>
                </select>
              </div>

              {/* Content textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">المحتوى النصي للمستند *</label>
                <textarea
                  rows={6}
                  placeholder="اكتب هنا المحتوى الإداري بالتفصيل..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right leading-relaxed"
                  dir="rtl"
                />
              </div>

              {/* Image Upload Input Drag & Drop + URL option */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">إرفاق صورة للمستند (اختياري)</label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? "border-teal-500 bg-teal-50/40" 
                      : imageUrl 
                      ? "border-emerald-300 bg-emerald-50/20" 
                      : "border-slate-200 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {imageUrl ? (
                    <div className="space-y-2">
                      <div className="h-24 w-full max-w-[150px] mx-auto overflow-hidden rounded-xl border border-emerald-200">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-[10px] text-emerald-700 font-bold">تم إرفاق صورة بنجاح</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageUrl("");
                          }}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[9px] font-black"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-slate-500">
                      <ImageIcon className="h-7 w-7 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">اسحب وأفلت صورة هنا أو انقر لتصفح الملفات</p>
                      <p className="text-[10px] text-slate-400">الحد الأقصى للمستند: 2 ميغا بايت (PNG, JPG)</p>
                    </div>
                  )}
                </div>

                {/* Direct image URL option as fallback */}
                <div className="relative">
                  <span className="absolute right-3.5 top-3 text-[10px] font-bold text-slate-400">أو رابط صوري</span>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl.startsWith("data:") ? "" : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full text-xs pr-20 pl-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-left font-sans text-slate-600"
                  />
                </div>
              </div>

              {/* Submit / Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow text-xs bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? "جاري معالجة ونشر السند..." : formMode === "CREATE" ? "نشر وتعميم السند الإداري" : "حفظ وحيازة التعديلات"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
