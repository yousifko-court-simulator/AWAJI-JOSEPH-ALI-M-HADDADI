
import React, { useState, useRef } from 'react';
import { DocCategory, DocBuilderStep, MissingItem, DocumentRequest, FileData } from '../types';
import { analyzeDocumentNeeds, draftLegalDocument } from '../services/geminiService';
import { 
  FileText, PenTool, FileSignature, UploadCloud, ChevronLeft, 
  CheckCircle, AlertTriangle, Loader2, Download, Printer, 
  ArrowRight, FileCheck, X, Shield, RefreshCw
} from 'lucide-react';

// --- CONSTANTS: Document Lists ---
const MEMO_TYPES = [
  "مذكرة دعوى", "مذكرة جوابية", "مذكرة رد", "مذكرة اعتراض على حكم", "مذكرة استئناف",
  "مذكرة نقض", "مذكرة دفاع", "مذكرة طلب مستعجل", "مذكرة طلب وقف تنفيذ",
  "مذكرة دفوع شكلية", "مذكرة دفوع موضوعية", "مذكرة تعقيب", "مذكرة لائحة اعتراضية",
  "مذكرة طلب تعويض", "مذكرة تظلم إداري", "مذكرة شكوى رسمية", "مذكرة طلب خبير", "مذكرة رد على تقرير خبير"
];

const CONTRACT_TYPES = [
  "عقد بيع", "عقد شراء", "عقد إيجار", "عقد إيجار منتهي بالتمليك", "عقد مقاولة",
  "عقد شراكة", "عقد وكالة", "عقد تنازل", "عقد صلح", "عقد تسوية",
  "عقد عمل", "عقد استشارة", "عقد إدارة", "عقد توريد", "عقد امتياز",
  "عقد استثمار", "عقد مقايضة", "عقد رهن", "عقد ضمان"
];

const OTHER_TYPES = [
  "خطاب رسمي", "لائحة تظلم", "شكوى إدارية", "طلب إفادة", "طلب تعويض",
  "طلب رفع ضرر", "إقرار", "تعهد", "محضر اتفاق", "بيان قانوني",
  "خطاب جهة حكومية", "خطاب محكمة", "رد على جهة رسمية", "نموذج قانوني خاص"
];

const MemoBuilder: React.FC = () => {
  // State
  const [step, setStep] = useState<DocBuilderStep>('CATEGORY_SELECT');
  const [category, setCategory] = useState<DocCategory | null>(null);
  const [docType, setDocType] = useState('');
  
  const [facts, setFacts] = useState('');
  const [attachment, setAttachment] = useState<FileData | null>(null);
  
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  
  const [finalDocument, setFinalDocument] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);
  const [activeMissingItemId, setActiveMissingItemId] = useState<string | null>(null);

  // --- HANDLERS ---

  const handleCategorySelect = (cat: DocCategory) => {
    setCategory(cat);
    setStep('TYPE_SELECT');
  };

  const handleTypeSelect = (type: string) => {
    setDocType(type);
    setStep('INTAKE');
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({ name: file.name, data: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!facts.trim() && !attachment) {
      alert("يرجى كتابة التفاصيل أو إرفاق ملف للبدء.");
      return;
    }
    setAnalyzing(true);
    setStep('ANALYSIS'); // Show loader UI
    try {
      const request: DocumentRequest = {
        category: category!,
        docType,
        facts,
        attachment
      };
      const items = await analyzeDocumentNeeds(request);
      setMissingItems(items);
      setStep('MISSING_ITEMS');
    } catch (e) {
      alert("حدث خطأ في التحليل، يرجى المحاولة مرة أخرى.");
      setStep('INTAKE');
    } finally {
      setAnalyzing(false);
    }
  };

  const resolveItemValue = (id: string, val: string) => {
    setMissingItems(prev => prev.map(item => 
      item.id === id ? { ...item, value: val, isResolved: !!val } : item
    ));
  };

  const resolveItemFile = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setMissingItems(prev => prev.map(item => 
        item.id === id ? { 
          ...item, 
          fileData: { name: file.name, data: base64, mimeType: file.type },
          value: `تم إرفاق الملف: ${file.name}`,
          isResolved: true 
        } : item
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleDrafting = async () => {
    setDrafting(true);
    setStep('DRAFTING');
    try {
      const request: DocumentRequest = {
        category: category!,
        docType,
        facts,
        attachment
      };
      const result = await draftLegalDocument(request, missingItems);
      setFinalDocument(result);
      setStep('FINAL_VIEW');
    } catch (e) {
      alert("فشل التنفيذ.");
      setStep('MISSING_ITEMS');
    } finally {
      setDrafting(false);
    }
  };

  // --- RENDER HELPERS ---

  const getList = () => {
    if (category === 'MEMO') return MEMO_TYPES;
    if (category === 'CONTRACT') return CONTRACT_TYPES;
    return OTHER_TYPES;
  };

  const allResolved = missingItems.every(i => i.isResolved);

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-6 animate-fade-in custom-scrollbar overflow-y-auto">
      
      {/* HEADER */}
      <header className="mb-8 text-center shrink-0">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
          <PenTool className="text-gold-500" /> صانع الوثائق والمذكرات
        </h2>
        <p className="text-slate-500 mt-2">نظام صياغة قانونية متكامل بقيادة المستشار عبد المجيد مساوى حدادي</p>
      </header>

      {/* STEP 1: CATEGORY */}
      {step === 'CATEGORY_SELECT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[
            { id: 'MEMO', label: 'مذكرة قانونية', icon: FileText, desc: 'للمحاكم والجهات القضائية' },
            { id: 'CONTRACT', label: 'عقد نظامي', icon: FileSignature, desc: 'حفظ الحقوق والالتزامات' },
            { id: 'OTHER', label: 'وثيقة أخرى', icon: PenTool, desc: 'خطابات، شكاوى، إقرارات' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleCategorySelect(item.id as DocCategory)}
              className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/10 transition-all flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-50 group-hover:bg-gold-50 flex items-center justify-center transition-colors">
                <item.icon size={40} className="text-slate-400 group-hover:text-gold-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{item.label}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: TYPE SELECT */}
      {step === 'TYPE_SELECT' && (
        <div className="animate-fade-in-up">
           <button onClick={() => setStep('CATEGORY_SELECT')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
             <ChevronLeft className="rotate-180" size={20} /> عودة للتصنيف
           </button>
           <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-gold-500 pr-4">
             اختر نوع {category === 'MEMO' ? 'المذكرة' : category === 'CONTRACT' ? 'العقد' : 'الوثيقة'} المطلوب:
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {getList().map((t) => (
               <button
                 key={t}
                 onClick={() => handleTypeSelect(t)}
                 className="p-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all text-sm text-right shadow-sm"
               >
                 {t}
               </button>
             ))}
           </div>
        </div>
      )}

      {/* STEP 3: INTAKE */}
      {step === 'INTAKE' && (
        <div className="animate-fade-in-up max-w-3xl mx-auto w-full">
           <button onClick={() => setStep('TYPE_SELECT')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
             <ChevronLeft className="rotate-180" size={20} /> عودة
           </button>

           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                  {category === 'MEMO' ? <FileText size={24}/> : <FileSignature size={24}/>}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{docType}</h3>
                  <p className="text-slate-400 text-sm">مرحلة جمع البيانات الأساسية</p>
                </div>
              </div>

              <div className="space-y-6">
                <div 
                   onClick={() => fileInputRef.current?.click()}
                   className={`
                     border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                     ${attachment ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-gold-400 hover:bg-slate-50'}
                   `}
                >
                   <input ref={fileInputRef} type="file" className="hidden" onChange={handleMainFileChange} />
                   {attachment ? (
                     <div className="flex flex-col items-center text-emerald-700">
                       <FileCheck size={48} className="mb-2"/>
                       <span className="font-bold text-lg">{attachment.name}</span>
                       <button 
                         onClick={(e) => { e.stopPropagation(); setAttachment(null); }}
                         className="mt-4 px-4 py-2 bg-white rounded-full text-xs font-bold shadow-sm hover:text-red-500"
                       >
                         إزالة الملف
                       </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center text-slate-400">
                       <UploadCloud size={48} className="mb-2"/>
                       <span className="font-bold text-lg text-slate-600">رفع ملف القضية / العقد القديم</span>
                       <span className="text-sm">PDF, Images (اختياري)</span>
                     </div>
                   )}
                </div>

                <div className="relative flex py-2 items-center">
                   <div className="flex-grow border-t border-slate-200"></div>
                   <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">و / أو</span>
                   <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اكتب تفاصيل طلبك أو الوقائع هنا</label>
                  <textarea 
                    value={facts} 
                    onChange={e => setFacts(e.target.value)} 
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:outline-none min-h-[150px] resize-none" 
                    placeholder="اشرح المشكلة، الأطراف، المبلغ، التواريخ... كلما زاد التفصيل زادت الدقة." 
                  />
                </div>

                <button 
                   onClick={handleAnalyze} 
                   className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                >
                   <Shield size={20}/>
                   بدء التحليل وكشف النواقص
                </button>
              </div>
           </div>
        </div>
      )}

      {/* STEP 4: ANALYSIS LOADING */}
      {step === 'ANALYSIS' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
           <Loader2 size={64} className="text-gold-500 animate-spin mb-6" />
           <h3 className="text-2xl font-bold text-slate-800 mb-2">جاري تحليل الطلب نظامياً...</h3>
           <p className="text-slate-500">يقوم النظام بمطابقة الوقائع مع متطلبات الأنظمة السعودية</p>
        </div>
      )}

      {/* STEP 5: MISSING ITEMS (CRITICAL STAGE) */}
      {step === 'MISSING_ITEMS' && (
        <div className="animate-fade-in-up max-w-4xl mx-auto w-full">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" />
                نواقص يجب استكمالها
              </h3>
              <div className="text-sm font-bold bg-slate-100 px-4 py-2 rounded-full text-slate-600">
                 تم استكمال {missingItems.filter(i => i.isResolved).length} من {missingItems.length}
              </div>
           </div>
           
           <div className="grid grid-cols-1 gap-4 mb-8">
              {missingItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`
                    p-6 rounded-2xl border-2 transition-all relative overflow-hidden
                    ${item.isResolved ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}
                  `}
                >
                   <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                         <h4 className={`font-bold text-lg ${item.isResolved ? 'text-emerald-800' : 'text-slate-800'}`}>
                           {item.label}
                         </h4>
                         <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                      </div>
                      {item.isResolved ? (
                        <CheckCircle className="text-emerald-500" size={24} />
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">مطلوب</span>
                      )}
                   </div>

                   {/* Input Area */}
                   <div className="relative z-10">
                      {item.type === 'FILE' ? (
                        <div className="flex items-center gap-3">
                           {item.fileData ? (
                             <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-emerald-200">
                               <FileCheck size={16} className="text-emerald-600"/>
                               <span className="text-sm font-bold text-emerald-800 truncate max-w-[200px]">{item.fileData.name}</span>
                               <button 
                                 onClick={() => setMissingItems(prev => prev.map(x => x.id === item.id ? {...x, isResolved: false, value: undefined, fileData: undefined} : x))}
                                 className="text-slate-400 hover:text-red-500"
                               >
                                 <X size={14}/>
                               </button>
                             </div>
                           ) : (
                             <>
                               <button 
                                 onClick={() => { setActiveMissingItemId(item.id); itemFileInputRef.current?.click(); }}
                                 className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                               >
                                 <UploadCloud size={16}/> رفع المستند
                               </button>
                               <span className="text-xs text-slate-400">PDF, JPG, PNG</span>
                             </>
                           )}
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          disabled={item.isResolved}
                          value={item.value || ''}
                          onChange={(e) => resolveItemValue(item.id, e.target.value)}
                          placeholder="اكتب الإجابة هنا..."
                          className={`
                            w-full p-3 rounded-xl border outline-none transition-all
                            ${item.isResolved ? 'bg-emerald-100/50 border-emerald-200 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-200'}
                          `}
                        />
                      )}
                      
                      {item.isResolved && item.type === 'TEXT' && (
                         <button 
                           onClick={() => setMissingItems(prev => prev.map(x => x.id === item.id ? {...x, isResolved: false, value: ''} : x))}
                           className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                         >
                           تعديل
                         </button>
                      )}
                   </div>
                </div>
              ))}
           </div>
           
           <input 
             type="file" 
             ref={itemFileInputRef} 
             className="hidden" 
             onChange={(e) => {
               if(activeMissingItemId && e.target.files?.[0]) {
                 resolveItemFile(activeMissingItemId, e.target.files[0]);
               }
             }} 
           />

           <div className="sticky bottom-0 bg-slate-50 pt-4 pb-2 border-t border-slate-200">
             <button 
               onClick={handleDrafting}
               disabled={!allResolved}
               className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex justify-center items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {allResolved ? (
                  <>
                    <CheckCircle size={20} className="text-emerald-400" />
                    تم الاستكمال.. تنفيذ الوثيقة الآن
                  </>
                ) : (
                  <>استكمل جميع النواقص للمتابعة ({missingItems.filter(i => !i.isResolved).length} متبقي)</>
                )}
             </button>
           </div>
        </div>
      )}

      {/* STEP 6: DRAFTING EXECUTION */}
      {step === 'DRAFTING' && (
         <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
             <div className="relative">
               <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-gold-500 flex items-center justify-center mb-6 shadow-2xl relative z-10">
                 <PenTool className="text-white" size={40} />
               </div>
               <div className="absolute top-0 left-0 w-24 h-24 bg-gold-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
             </div>
             
             <h3 className="text-3xl font-bold text-slate-800 mb-2">المحامي عبد المجيد مساوى حدادي</h3>
             <p className="text-slate-500 font-bold mb-8">يقوم الآن بصياغة {docType} وفق الأنظمة...</p>
             
             <div className="flex flex-col gap-3 w-full max-w-md">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                   <CheckCircle size={16} className="text-emerald-500" /> مراجعة الوقائع
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                   <CheckCircle size={16} className="text-emerald-500" /> تدقيق البيانات النظامية
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 animate-pulse">
                   <Loader2 size={16} className="text-gold-500 animate-spin" /> بناء الصياغة القانونية
                </div>
             </div>
         </div>
      )}

      {/* STEP 7: FINAL VIEW */}
      {step === 'FINAL_VIEW' && (
         <div className="animate-fade-in-up h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
               <div>
                 <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                   <CheckCircle className="text-emerald-500" /> تم إصدار الوثيقة
                 </h3>
                 <p className="text-sm text-slate-500">جاهزة للطباعة أو التصدير</p>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setStep('CATEGORY_SELECT')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold">
                    جديد
                  </button>
                  <button 
                    onClick={() => {
                        const blob = new Blob([finalDocument], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${docType}.doc`;
                        link.click();
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500"
                  >
                    <Download size={16}/> Word
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800"
                  >
                    <Printer size={16}/> طباعة
                  </button>
               </div>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm overflow-y-auto">
               <pre className="whitespace-pre-wrap font-serif text-lg leading-loose text-slate-800">
                 {finalDocument}
               </pre>
            </div>
            
            <div className="mt-4 text-center text-xs text-slate-400 shrink-0">
              تم تحرير هذه الوثيقة بواسطة نظام اليوسفكو للذكاء القانوني - بإشراف المحامي عبد المجيد مساوى حدادي
            </div>
         </div>
      )}

    </div>
  );
};

export default MemoBuilder;
