
import React, { useState, useRef, useEffect } from 'react';
import { JudicialCaseProfile, Jurisdiction, PartyType, CaseNature } from '../types';
import { extractCaseProfile } from '../services/geminiService';
import { 
  Gavel, ChevronLeft, Building2, User, FileText, AlertTriangle, ShieldCheck, Eye, Calendar, Scale, Info, UploadCloud, Loader2, Sparkles, Check, Lock, X
} from 'lucide-react';

interface Props {
  onStart: (profile: JudicialCaseProfile) => void;
}

const SimulationSetup: React.FC<Props> = ({ onStart }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<JudicialCaseProfile>({
    jurisdiction: 'COMMERCIAL',
    caseNature: 'OTHER',
    userRole: 'PLAINTIFF',
    parties: {
      plaintiff: { type: 'INDIVIDUAL', name: '' },
      defendant: { type: 'COMPANY', name: '' }
    },
    facts: '',
    requests: '',
    damageDate: ''
  });

  // --- AUTO-DETECT GOVERNMENT ENTITY ---
  useEffect(() => {
    const defName = profile.parties.defendant.name;
    const govtKeywords = /وزارة|هيئة|أمانة|رئاسة|صندوق|الديوان|إمارة|محافظة|بلدية|مؤسسة عامة|مجلس شؤون|الهيئة/i;
    const isGovtName = govtKeywords.test(defName);
    const isAdminCourt = profile.jurisdiction === 'ADMINISTRATIVE';

    if ((isAdminCourt || isGovtName) && profile.parties.defendant.type !== 'GOVERNMENT') {
         setProfile(prev => ({
            ...prev,
            parties: {
                ...prev.parties,
                defendant: { ...prev.parties.defendant, type: 'GOVERNMENT' }
            }
        }));
    }
  }, [profile.jurisdiction, profile.parties.defendant.name, profile.parties.defendant.type]);

  const isGovtLocked = profile.jurisdiction === 'ADMINISTRATIVE' || 
                       /وزارة|هيئة|أمانة|رئاسة|صندوق|الديوان|إمارة|محافظة|بلدية|مؤسسة عامة|مجلس شؤون|الهيئة/i.test(profile.parties.defendant.name);

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const extractedData = await extractCaseProfile({
            name: selectedFile.name,
            data: base64,
            mimeType: selectedFile.type
        });

        setProfile(prev => ({
            ...prev,
            ...extractedData,
            parties: {
                ...prev.parties,
                ...(extractedData.parties || {})
            }
        }));
        setSelectedFile(null); // Clear after successful analysis
      } catch (err) {
        setError("تعذر تحليل الملف. يرجى التأكد من أن الملف واضح أو إدخال البيانات يدوياً.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const getJurisdictionLabel = (j: Jurisdiction) => {
      const map: Record<Jurisdiction, string> = {
          COMMERCIAL: 'المحكمة التجارية',
          ADMINISTRATIVE: 'المحكمة الإدارية',
          CRIMINAL: 'المحكمة الجزائية',
          LABOR: 'المحكمة العمالية',
          PERSONAL: 'محكمة الأحوال الشخصية',
          GENERAL: 'المحكمة العامة'
      };
      return map[j] || j;
  };

  const getNatureLabel = (n: CaseNature) => {
      const map: Record<CaseNature, string> = {
          OTHER: 'أخرى / عامة',
          COMPENSATION: 'دعوى تعويض',
          ANNULMENT: 'دعوى إلغاء',
          COMPENSATION_AND_CORRECTION: 'تعويض وإصلاح ضرر'
      };
      return map[n] || n;
  };

  const validateAndNext = () => {
    setError(null);
    
    // STEP 1 VALIDATION: Parties & Jurisdiction
    if (step === 1) {
        if (!profile.parties.plaintiff.name.trim() || !profile.parties.defendant.name.trim()) {
            setError("يرجى إدخال أسماء الأطراف (المدعي والمدعى عليه)");
            return;
        }

        if (profile.jurisdiction === 'COMMERCIAL' && profile.parties.defendant.type === 'GOVERNMENT') {
            setError("خطأ اختصاص: لا يمكن رفع دعوى تجارية ضد جهة حكومية. يرجى تغيير المحكمة إلى الإدارية.");
            return;
        }
    }
    
    // STEP 2 VALIDATION: Facts & Nature
    if (step === 2) {
         if (!profile.facts.trim() || !profile.requests.trim()) {
             setError("الوقائع والطلبات إلزامية للبدء");
             return;
         }
         
         if (profile.caseNature === 'COMPENSATION' && !profile.damageDate) {
             setError("تاريخ الضرر مطلوب في قضايا التعويض");
             return;
         }

         if (profile.facts.length < 10) {
             setError("الوقائع قصيرة جداً، يرجى كتابة تفاصيل أكثر.");
             return;
         }
    }

    if (step < 3) setStep(step + 1);
  };

  const handleStart = () => {
      if (profile.jurisdiction === 'COMMERCIAL' && profile.parties.defendant.type === 'GOVERNMENT') {
          setError("خطأ اختصاص: لا يمكن رفع دعوى تجارية ضد جهة حكومية.");
          return;
      }
      onStart(profile);
  };

  const inputClass = "w-full p-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-gold-400 focus:outline-none transition-all text-slate-800";
  const labelClass = "block text-sm font-bold text-slate-700 mb-2";

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-6 animate-fade-in">
      <header className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
          <Gavel className="text-gold-500" /> إعداد الجلسة القضائية
        </h2>
        <p className="text-slate-500 mt-2">نظام المحاكاة الصارم - الإصدار 2.0</p>
      </header>

      {/* Progress Bar */}
      <div className="flex justify-center mb-8">
          {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                  <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10
                      ${step >= s ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30' : 'bg-slate-200 text-slate-400'}
                  `}>
                      {s === 3 ? <Eye size={18} /> : s}
                  </div>
                  {s !== 3 && <div className={`w-16 h-1 -mx-1 ${step > s ? 'bg-gold-300' : 'bg-slate-200'}`} />}
              </div>
          ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2 border border-red-200 animate-pulse">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="flex-1 bg-white rounded-3xl shadow-lg border border-slate-200 p-8 overflow-y-auto">
        
        {step === 1 && (
            <div className="space-y-8 animate-fade-in">
                
                {/* AI FILE UPLOAD */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                             <Sparkles className="text-gold-400" size={20} />
                             <h4 className="font-bold text-gold-100">تحليل ملف القضية الذكي</h4>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            ارفع ملف (PDF/صورة) وسيقوم النظام بتعبئة البيانات.
                        </p>
                        
                        {!selectedFile ? (
                           <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzing}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <UploadCloud size={18} />
                                اختيار ملف
                            </button>
                        ) : (
                           <div className="flex items-center gap-3">
                               <div className="bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                                   <FileText size={16} className="text-gold-400"/>
                                   <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                                   <button onClick={() => setSelectedFile(null)} className="hover:text-red-400 ml-1"><X size={14}/></button>
                               </div>
                               <button 
                                   onClick={handleRunAnalysis}
                                   disabled={isAnalyzing}
                                   className="px-5 py-2 bg-gold-500 hover:bg-gold-400 text-slate-900 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"
                               >
                                   {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                   تحليل الآن
                               </button>
                           </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} />
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-800">1. الاختصاص والأطراف</h3>
                    {profile.parties.plaintiff.name && (
                       <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                           <Check size={12}/> البيانات معبأة
                       </span>
                    )}
                </div>
                
                <div>
                    <label className={labelClass}>المحكمة المختصة</label>
                    <div className="relative">
                        <select 
                            value={profile.jurisdiction}
                            onChange={e => setProfile({...profile, jurisdiction: e.target.value as Jurisdiction})}
                            className={inputClass}
                        >
                            <option value="COMMERCIAL">المحكمة التجارية</option>
                            <option value="ADMINISTRATIVE">المحكمة الإدارية (ديوان المظالم)</option>
                            <option value="CRIMINAL">المحكمة الجزائية</option>
                            <option value="LABOR">المحكمة العمالية</option>
                            <option value="PERSONAL">محكمة الأحوال الشخصية</option>
                            <option value="GENERAL">المحكمة العامة</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* ... (Existing Parties Fields) ... */}
                     <div>
                       <label className={labelClass}>اسم المدعي</label>
                       <input 
                          placeholder="الاسم الكامل" 
                          className={inputClass}
                          value={profile.parties.plaintiff.name}
                          onChange={e => setProfile({...profile, parties: {...profile.parties, plaintiff: {...profile.parties.plaintiff, name: e.target.value}}})}
                       />
                     </div>
                     <div>
                       <label className={labelClass}>اسم المدعى عليه</label>
                       <input 
                          placeholder="الاسم الكامل" 
                          className={inputClass}
                          value={profile.parties.defendant.name}
                          onChange={e => setProfile({...profile, parties: {...profile.parties, defendant: {...profile.parties.defendant, name: e.target.value}}})}
                       />
                     </div>
                </div>
            </div>
        )}

        {step === 2 && (
             <div className="space-y-6 animate-fade-in">
                {/* ... (Existing Step 2 Content) ... */}
                <div>
                    <label className={labelClass}>تكييف الدعوى (الطبيعة)</label>
                    <select 
                        value={profile.caseNature}
                        onChange={e => setProfile({...profile, caseNature: e.target.value as CaseNature})}
                        className={inputClass}
                    >
                        <option value="OTHER">أخرى / عامة</option>
                        <option value="COMPENSATION">دعوى تعويض</option>
                        <option value="ANNULMENT">دعوى إلغاء</option>
                        <option value="COMPENSATION_AND_CORRECTION">تعويض وإصلاح ضرر</option>
                    </select>
                </div>

                {profile.caseNature === 'COMPENSATION' && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <label className="text-red-800 font-bold text-sm flex items-center gap-2 mb-2">
                          <AlertTriangle size={16} />
                          تاريخ وقوع الضرر
                        </label>
                        <input 
                            type="date" 
                            className="w-full p-3 rounded-xl border border-red-200 bg-white"
                            value={profile.damageDate}
                            onChange={e => setProfile({...profile, damageDate: e.target.value})}
                        />
                    </div>
                )}

                <div>
                    <label className={labelClass}>وقائع الدعوى</label>
                    <textarea 
                        className={`${inputClass} h-32 resize-none`}
                        value={profile.facts}
                        onChange={e => setProfile({...profile, facts: e.target.value})}
                    ></textarea>
                </div>

                <div>
                    <label className={labelClass}>الطلبات الختامية</label>
                    <textarea 
                        className={`${inputClass} h-24 resize-none`}
                        value={profile.requests}
                        onChange={e => setProfile({...profile, requests: e.target.value})}
                    ></textarea>
                </div>
             </div>
        )}

        {step === 3 && (
            <div className="space-y-6 animate-fade-in">
                 {/* ... (Existing Step 3 Content) ... */}
                 <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <h4 className="font-bold mb-4">ملخص البيانات</h4>
                    <p className="text-sm text-slate-600">المحكمة: {getJurisdictionLabel(profile.jurisdiction)}</p>
                    <p className="text-sm text-slate-600">المدعي: {profile.parties.plaintiff.name}</p>
                    <p className="text-sm text-slate-600">المدعى عليه: {profile.parties.defendant.name}</p>
                 </div>
            </div>
        )}

      </div>

      <div className="mt-6 flex justify-between pt-4 border-t border-slate-100">
        {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-2">
                 <ChevronLeft className="rotate-180" size={18} /> تعديل
             </button>
        ) : <div></div>}
        
        {step < 3 ? (
             <button onClick={validateAndNext} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10">
                 {step === 2 ? 'معاينة وتحقق' : 'التالي'} <ChevronLeft size={18} />
             </button>
        ) : (
             <button onClick={handleStart} className="px-8 py-3 bg-gold-500 text-slate-900 rounded-xl font-bold hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20 flex items-center gap-2">
                 <Gavel size={18} /> بدء المحاكاة
             </button>
        )}
      </div>
    </div>
  );
}
