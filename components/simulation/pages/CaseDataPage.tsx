
import React, { useMemo, useRef, useState, useEffect } from "react";
import { CaseData, EvidenceFile, PartyType } from "../types/simulation";
import { fileToBlobUrl, makeId } from "../utils/fileHelpers";
import { Sparkles, UploadCloud, Loader2, CheckCircle, Paperclip, ChevronLeft, AlertTriangle, Lock, FileText, X, Info, BadgeCheck } from "lucide-react";

export function CaseDataPage(props: {
  caseData: CaseData;
  evidence: EvidenceFile[];
  onPatch: (patch: Partial<CaseData>) => void;
  onAddEvidence: (files: EvidenceFile[]) => void;
  onRemoveEvidence: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onAnalyzeFile: (file: File) => Promise<void>;
}) {
  const cd = props.caseData;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const analyzeInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // --- Strict Validation ---
  const validationError = useMemo(() => {
    if (!cd.caseTitle.trim()) return "عنوان الدعوى مطلوب.";
    if (!cd.court.trim()) return "اسم المحكمة مطلوب.";
    if (!cd.plaintiff.name.trim()) return "اسم المدعي مطلوب.";
    if (!cd.defendant.name.trim()) return "اسم المدعى عليه مطلوب.";
    
    // Rule: Commercial vs Government
    const isCommercial = cd.court.includes("تجارية") || cd.court.includes("Commercial");
    const isGovDefendant = cd.defendant.type === "GOVERNMENT";
    if (isCommercial && isGovDefendant) {
      return "خطأ اختصاص: لا يجوز مقاضاة جهة حكومية في المحكمة التجارية (الاختصاص للمظالم).";
    }

    // Rule: Compensation Date
    const isCompensation = cd.caseType.includes("تعويض") || cd.caseType.includes("COMPENSATION");
    const hasDate = cd.gregorianDate || cd.hijriDate;
    if (isCompensation && !hasDate) {
      return "دعاوى التعويض تتطلب تحديد تاريخ الضرر.";
    }

    if (cd.facts.length < 10) return "الوقائع قصيرة جداً (مطلوب 10 أحرف على الأقل).";
    if (cd.requests.length < 5) return "الطلبات غير واضحة.";

    return null;
  }, [cd]);

  // --- Auto-Detect Government ---
  useEffect(() => {
     const defName = cd.defendant.name;
     const govtKeywords = /وزارة|هيئة|أمانة|رئاسة|صندوق|الديوان|إمارة|محافظة|بلدية|مؤسسة عامة|مجلس شؤون|الهيئة/i;
     const isGovtName = govtKeywords.test(defName);
     const isAdminCourt = cd.caseType === 'إدارية' || cd.court.includes('إدارية') || cd.court.includes('مظالم');

     if ((isAdminCourt || isGovtName) && cd.defendant.type !== 'GOVERNMENT') {
         props.onPatch({
             defendant: { ...cd.defendant, type: 'GOVERNMENT' }
         });
     }
  }, [cd.court, cd.caseType, cd.defendant.name]);

  const isGovtLocked = (cd.caseType === 'إدارية' || cd.court.includes('إدارية')) ||
                       /وزارة|هيئة|أمانة|رئاسة|صندوق|الديوان|إمارة|محافظة|بلدية|مجلس شؤون|الهيئة/i.test(cd.defendant.name);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setSelectedFile(file);
        setAnalyzeError(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      await props.onAnalyzeFile(selectedFile);
      setSelectedFile(null); // Clear selection on success
    } catch (error) {
      console.error(error);
      setAnalyzeError("تعذر تحليل الملف. يرجى التأكد من وضوح النص أو صيغة الملف.");
    } finally {
      setIsAnalyzing(false);
      if (analyzeInputRef.current) analyzeInputRef.current.value = '';
    }
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList) as File[];
    const mapped: EvidenceFile[] = files.map((f) => ({
      id: makeId("ev"),
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
      blobUrl: fileToBlobUrl(f),
    }));
    props.onAddEvidence(mapped);
    e.target.value = "";
  };

  return (
    <div style={{ display: "grid", gap: 14 }} className={isAnalyzing ? "opacity-90 pointer-events-none" : ""}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>بيانات القضية</h2>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                جاري استخراج البيانات من الملف...
            </div>
          )}
      </div>

      {/* AI Auto-Fill Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden transition-all">
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                <Sparkles className="text-gold-400" size={18} />
                <h3 className="font-bold text-lg text-white">تعبئة البيانات تلقائياً</h3>
                </div>
                <p className="text-slate-300 text-sm">ارفع ملف القضية (PDF/صورة) وسيقوم النظام باستخراج البيانات.</p>
            </div>
            
            {!selectedFile ? (
                <button 
                    onClick={() => analyzeInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold transition-all flex items-center gap-2 backdrop-blur-sm active:scale-95"
                >
                    <UploadCloud size={20} />
                    اختيار ملف
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                        <FileText size={16} className="text-gold-400"/>
                        <span className="max-w-[150px] truncate">{selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="hover:text-red-400 ml-1"><X size={14}/></button>
                    </div>
                    <button 
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="px-5 py-3 bg-gold-500 hover:bg-gold-400 text-slate-900 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-gold-500/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        {isAnalyzing ? 'جاري التحليل...' : 'تحليل الملف الآن'}
                    </button>
                </div>
            )}
            <input 
                ref={analyzeInputRef} 
                type="file" 
                accept="application/pdf,image/*" 
                className="hidden" 
                onChange={handleFileSelect} 
            />
          </div>
        </div>
      </div>

      {analyzeError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertTriangle size={18}/>
            <span className="text-sm font-bold">{analyzeError}</span>
        </div>
      )}

      {/* Form Fields Grid */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        
        <label>
          <div className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">رقم القضية (اختياري)</div>
          <input
            value={cd.caseNumber || ""}
            onChange={(e) => props.onPatch({ caseNumber: e.target.value })}
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
            placeholder="مثال: 4512039"
          />
          <div className="text-[10px] text-slate-400 mt-1">يساعد الرقم في توثيق الصك النهائي</div>
        </label>

        <label>
          <div className="text-sm font-bold text-slate-700 mb-1">نوع القضية</div>
          <select
            value={cd.caseType}
            onChange={(e) => props.onPatch({ caseType: e.target.value })}
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
          >
              <option value="إدارية">إدارية (ديوان المظالم)</option>
              <option value="تجارية">تجارية</option>
              <option value="جزائية">جزائية</option>
              <option value="أحوال شخصية">أحوال شخصية</option>
              <option value="عمالية">عمالية</option>
              <option value="حقوقية/عامة">عامة (حقوقية)</option>
              <option value="تعويض">طلب تعويض</option>
          </select>
          <div className="text-[10px] text-slate-400 mt-1">يحدد نوع المحكمة وسير الإجراءات</div>
        </label>

        <label className="md:col-span-2">
          <div className="text-sm font-bold text-slate-700 mb-1">المحكمة المختصة</div>
          <input
            value={cd.court}
            onChange={(e) => props.onPatch({ court: e.target.value })}
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
            placeholder="مثال: المحكمة التجارية بالرياض"
          />
          <div className="text-[10px] text-slate-400 mt-1">تأكد من الاختصاص المكاني والنوعي</div>
        </label>

        <label className="md:col-span-2">
          <div className="text-sm font-bold text-slate-700 mb-1">عنوان الدعوى</div>
          <input
            value={cd.caseTitle}
            onChange={(e) => props.onPatch({ caseTitle: e.target.value })}
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
            placeholder="مثال: مطالبة بمستحقات عقد توريد"
          />
           <div className="text-[10px] text-slate-400 mt-1">عنوان مختصر يصف جوهر النزاع</div>
        </label>
        
        <label>
          <div className="text-sm font-bold text-slate-700 mb-1">التاريخ الهجري (اختياري)</div>
          <input
            value={cd.hijriDate || ""}
            onChange={(e) => props.onPatch({ hijriDate: e.target.value })}
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
            placeholder="1445/01/01"
          />
        </label>

        <label>
          <div className="text-sm font-bold text-slate-700 mb-1">التاريخ الميلادي (اختياري)</div>
          <input
            value={cd.gregorianDate || ""}
            onChange={(e) => props.onPatch({ gregorianDate: e.target.value })}
            type="date"
            disabled={isAnalyzing}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
          />
        </label>
      </div>

      {/* Parties */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">أطراف الدعوى</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المدعي</label>
                <div className="flex gap-2 mb-2">
                    <select 
                        value={cd.plaintiff.type}
                        onChange={(e) => props.onPatch({ plaintiff: { ...cd.plaintiff, type: e.target.value as PartyType } })}
                        disabled={isAnalyzing}
                        className="bg-white border border-slate-300 rounded-lg text-xs px-2 py-2 w-24 disabled:bg-slate-100"
                    >
                        <option value="INDIVIDUAL">فرد</option>
                        <option value="COMPANY">شركة</option>
                        <option value="GOVERNMENT">حكومة</option>
                    </select>
                    <input
                        value={cd.plaintiff.name}
                        onChange={(e) => props.onPatch({ plaintiff: { ...cd.plaintiff, name: e.target.value } })}
                        disabled={isAnalyzing}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                        placeholder="الاسم الكامل"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المدعى عليه</label>
                <div className="flex gap-2 mb-2 relative">
                     <select 
                        value={cd.defendant.type}
                        onChange={(e) => props.onPatch({ defendant: { ...cd.defendant, type: e.target.value as PartyType } })}
                        disabled={isGovtLocked || isAnalyzing}
                        className="bg-white border border-slate-300 rounded-lg text-xs px-2 py-2 w-24 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                        <option value="INDIVIDUAL">فرد</option>
                        <option value="COMPANY">شركة</option>
                        <option value="GOVERNMENT">حكومة</option>
                    </select>
                    <input
                        value={cd.defendant.name}
                        onChange={(e) => props.onPatch({ defendant: { ...cd.defendant, name: e.target.value } })}
                        disabled={isAnalyzing}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                        placeholder="الاسم الكامل"
                    />
                    {isGovtLocked && <Lock size={12} className="absolute top-3 right-8 text-slate-400" />}
                </div>
            </div>
          </div>
      </div>

      <label>
        <div className="text-sm font-bold text-slate-700 mb-1">الوقائع</div>
        <textarea
          value={cd.facts}
          onChange={(e) => props.onPatch({ facts: e.target.value })}
          disabled={isAnalyzing}
          className="w-full p-3 rounded-xl border border-slate-300 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
          placeholder="سرد لوقائع الدعوى..."
        />
        <div className="text-[10px] text-slate-400 mt-1">اكتب تسلسلاً زمنياً وواضحاً للأحداث</div>
      </label>

      <label>
        <div className="text-sm font-bold text-slate-700 mb-1">الطلبات الختامية</div>
        <textarea
          value={cd.requests}
          onChange={(e) => props.onPatch({ requests: e.target.value })}
          disabled={isAnalyzing}
          className="w-full p-3 rounded-xl border border-slate-300 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
          placeholder="ماذا تطلب من المحكمة؟"
        />
         <div className="text-[10px] text-slate-400 mt-1">يجب أن تكون الطلبات جازمة ومحددة</div>
      </label>

      <label>
        <div className="text-sm font-bold text-slate-700 mb-1">الأسانيد القانونية</div>
        <textarea
          value={cd.grounds}
          onChange={(e) => props.onPatch({ grounds: e.target.value })}
          disabled={isAnalyzing}
          className="w-full p-3 rounded-xl border border-slate-300 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
          placeholder="المواد النظامية أو القواعد الفقهية المستند إليها..."
        />
         <div className="text-[10px] text-slate-400 mt-1">اختياري: يعزز موقفك القانوني</div>
      </label>
      
      {/* --- NEW SECTION: ADMINISTRATIVE DETAILS (OPTIONAL) --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-slate-100 rounded-lg">
                <BadgeCheck size={18} className="text-slate-600" />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 text-sm">بيانات الدائرة والصك (اختياري)</h3>
                <p className="text-xs text-slate-400">لتخصيص شكل الحكم النهائي وتحديد الأسماء</p>
             </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
                <div className="text-xs font-bold text-slate-500 mb-1">اسم قاضي الدائرة</div>
                <input
                    value={cd.judgeName || ""}
                    onChange={(e) => props.onPatch({ judgeName: e.target.value })}
                    disabled={isAnalyzing}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                    placeholder="مثال: الشيخ فلان الفلاني"
                />
            </label>
            <label>
                <div className="text-xs font-bold text-slate-500 mb-1">اسم أمين السر</div>
                <input
                    value={cd.clerkName || ""}
                    onChange={(e) => props.onPatch({ clerkName: e.target.value })}
                    disabled={isAnalyzing}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                    placeholder="مثال: الشيخ فلان الفلاني"
                />
            </label>
            <label className="md:col-span-2">
                <div className="text-xs font-bold text-slate-500 mb-1">تخصيص ترويسة الصك</div>
                <input
                    value={cd.courtHeaderCustom || ""}
                    onChange={(e) => props.onPatch({ courtHeaderCustom: e.target.value })}
                    disabled={isAnalyzing}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                    placeholder="مثال: المملكة العربية السعودية - وزارة العدل - المحكمة العامة بالرياض"
                />
                <div className="text-[10px] text-slate-400 mt-1">اتركه فارغاً لاستخدام التنسيق الافتراضي</div>
            </label>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">المرفقات (اختياري)</h3>
        <div className="flex gap-3 mb-4">
           <button
             onClick={() => evidenceInputRef.current?.click()}
             disabled={isAnalyzing}
             className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm active:scale-95 disabled:opacity-50"
           >
             <Paperclip size={16} />
             إرفاق مستندات
           </button>
           <input ref={evidenceInputRef} type="file" multiple className="hidden" onChange={handleEvidenceUpload} />
        </div>

        <div className="space-y-2">
          {props.evidence.map((f) => (
              <div key={f.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <div>
                    <div className="font-bold text-sm text-slate-800">{f.name}</div>
                    <div className="text-xs text-slate-400">{Math.round(f.size / 1024)} KB</div>
                  </div>
                </div>
                <button onClick={() => props.onRemoveEvidence(f.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <span className="text-xs font-bold">إزالة</span>
                </button>
              </div>
          ))}
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">يرجى استكمال البيانات التالية للمتابعة:</span>
            <span className="text-sm">{validationError}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={props.onBack}
          disabled={isAnalyzing}
          className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <ChevronLeft className="rotate-180" size={20}/>
          السابق
        </button>

        <button
          onClick={props.onNext}
          disabled={!!validationError || isAnalyzing}
          title={validationError || ""}
          className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-95"
        >
          التالي: تحليل القضية
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
}
