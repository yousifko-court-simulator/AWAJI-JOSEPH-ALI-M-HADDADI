import React, { useState, useRef } from 'react';
import { analyzeJudgmentDeeply } from '../services/geminiService';
import { FileData, JudgmentAnalysisResult, FlawItem } from '../types';
import { 
  UploadCloud, Search, AlertTriangle, CheckCircle, FileSearch, X, FileCheck, 
  Printer, Download, ShieldAlert, Scale, BrainCircuit, ArrowRight, Gavel, 
  ChevronDown, Copy, Loader2, FileText
} from 'lucide-react';

// Define FlawCardProps
interface FlawCardProps {
  flaw: FlawItem;
  getSeverityBadge: (s: string) => React.ReactNode;
}

// Move FlawCard definition before usage or keep it if hoisting is not the issue (it's likely the type definition).
// Defining it here to be safe and clear.
const FlawCard: React.FC<FlawCardProps> = ({ flaw, getSeverityBadge }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-3">
    <div className="flex justify-between items-start mb-2">
       <h5 className="font-bold text-slate-800">{flaw.title}</h5>
       {getSeverityBadge(flaw.severity)}
    </div>
    <p className="text-sm text-slate-600 mb-2">{flaw.description}</p>
    {flaw.legalRef && (
      <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg w-fit">
         <Scale size={12} />
         {flaw.legalRef}
      </div>
    )}
  </div>
);

const Analyzer: React.FC = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<FileData | null>(null);
  const [result, setResult] = useState<JudgmentAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'FLAWS' | 'STRATEGY' | 'DRAFT'>('SUMMARY');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      
      setFile({
        name: selectedFile.name,
        data: base64Content,
        mimeType: selectedFile.type
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !file) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeJudgmentDeeply(text, file);
      setResult(data);
      setActiveTab('FLAWS'); // Focus on flaws first
    } catch (error) {
      alert("حدث خطأ أثناء التحليل العميق للصك.");
    } finally {
      setLoading(false);
    }
  };

  // --- Score Color Logic ---
  const getScoreColor = (score: number) => {
      if (score > 75) return 'text-emerald-500 border-emerald-500 bg-emerald-50';
      if (score > 40) return 'text-amber-500 border-amber-500 bg-amber-50';
      return 'text-red-500 border-red-500 bg-red-50';
  };

  const getSeverityBadge = (s: string) => {
      if (s === 'HIGH') return <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">ثغرة قاتلة (High)</span>;
      if (s === 'MEDIUM') return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">ثغرة مؤثرة (Medium)</span>;
      return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">ملحوظة (Low)</span>;
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in max-w-7xl mx-auto w-full overflow-hidden">
      
      {/* Header */}
      <header className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FileSearch className="text-gold-500" />
          مدقق الأحكام العليا (Cassation AI)
        </h2>
        <p className="text-slate-500 mt-2">
          نظام فحص الصكوك المتقدم - يكتشف العيوب الشكلية والموضوعية ويقدر نسبة نقض الحكم.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* LEFT PANEL: INPUT */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pb-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             {/* File Upload */}
             <div className="mb-4">
                {!file ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-500 group"
                  >
                    <UploadCloud size={32} className="mb-2 text-slate-400 group-hover:text-gold-500 transition-colors" />
                    <span className="font-bold">رفع صك الحكم (PDF)</span>
                    <span className="text-xs text-slate-400 mt-1">يتم استخراج النص تلقائياً</span>
                    <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                         <FileCheck size={24} />
                       </div>
                       <div className="overflow-hidden">
                         <p className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{file.name}</p>
                         <p className="text-xs text-emerald-600">جاهز للتحليل</p>
                       </div>
                     </div>
                     <button onClick={removeFile} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors">
                       <X size={20} />
                     </button>
                  </div>
                )}
             </div>

             <label className="block text-sm font-bold text-slate-700 mb-2">
               أو الصق نص الحكم / ملاحظاتك هنا:
             </label>
             <textarea
                className="w-full h-40 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none resize-none bg-slate-50 text-sm"
                placeholder="مثال: أصدرت الدائرة التجارية الأولى حكمها برفض الدعوى تأسيساً على..."
                value={text}
                onChange={(e) => setText(e.target.value)}
             ></textarea>

             <button
                onClick={handleAnalyze}
                disabled={loading || (!text && !file)}
                className="mt-6 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/10 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                {loading ? 'جاري الفحص الدقيق...' : 'بدء التدقيق واستخراج الثغرات'}
              </button>
           </div>

           {/* Tips */}
           <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-800 flex items-center gap-2 text-sm mb-2">
                <ShieldAlert size={16} /> معايير الفحص:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                 <li>القصور في التسبيب</li>
                 <li>الفساد في الاستدلال</li>
                 <li>مخالفة المبادئ الشرعية والنظامية</li>
                 <li>الإخلال بحق الدفاع</li>
                 <li>العيوب الشكلية والاختصاص</li>
              </ul>
           </div>
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
               <Scale size={64} className="mb-4 opacity-20" />
               <p className="text-lg font-bold">بانتظار الحكم للتحليل</p>
               <p className="text-sm">ارفع الصك أو الصق النص لتبدأ عملية التدقيق</p>
            </div>
          ) : (
             <>
               {/* Result Header */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-xl font-bold text-slate-800">تقرير التدقيق والطعن</h3>
                       <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(result.appealSuccessProbability)}`}>
                          نسبة النقض: {result.appealSuccessProbability}%
                       </span>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-2">{result.summary}</p>
                  </div>
                  <button onClick={() => window.print()} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors">
                    <Printer size={20} />
                  </button>
               </div>

               {/* Tabs */}
               <div className="flex border-b border-slate-200 px-6 gap-6 overflow-x-auto">
                  {[
                    { id: 'SUMMARY', label: 'المنطق والملخص' },
                    { id: 'FLAWS', label: `الثغرات (${result.formalFlaws.length + result.substantiveFlaws.length})` },
                    { id: 'STRATEGY', label: 'استراتيجية النقض' },
                    { id: 'DRAFT', label: 'مسودة اللائحة' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-gold-500 text-gold-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
               </div>

               {/* Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  {activeTab === 'SUMMARY' && (
                    <div className="space-y-6 animate-fade-in">
                       <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <ArrowRight className="text-gold-500" size={18} /> منطق الحكم (Ruling Logic)
                          </h4>
                          <p className="text-slate-600 leading-relaxed text-sm">{result.rulingLogic}</p>
                       </div>
                    </div>
                  )}

                  {activeTab === 'FLAWS' && (
                    <div className="space-y-4 animate-fade-in">
                       {result.formalFlaws.length > 0 && (
                         <div>
                           <h4 className="font-bold text-slate-800 mb-3 text-sm">العيوب الشكلية (Formal)</h4>
                           {result.formalFlaws.map((flaw, i) => (
                             <FlawCard key={i} flaw={flaw} getSeverityBadge={getSeverityBadge} />
                           ))}
                         </div>
                       )}
                       
                       {result.substantiveFlaws.length > 0 && (
                         <div>
                           <h4 className="font-bold text-slate-800 mb-3 text-sm">العيوب الموضوعية (Substantive)</h4>
                           {result.substantiveFlaws.map((flaw, i) => (
                             <FlawCard key={i} flaw={flaw} getSeverityBadge={getSeverityBadge} />
                           ))}
                         </div>
                       )}

                       {result.formalFlaws.length === 0 && result.substantiveFlaws.length === 0 && (
                         <div className="text-center py-10 text-slate-400">
                           <CheckCircle size={48} className="mx-auto mb-2 text-emerald-300" />
                           لا توجد ثغرات واضحة في هذا الحكم.
                         </div>
                       )}
                    </div>
                  )}

                  {activeTab === 'STRATEGY' && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BrainCircuit className="text-gold-500" /> الاستراتيجية المقترحة
                        </h4>
                        <div className="prose prose-sm max-w-none text-slate-700 leading-loose whitespace-pre-line">
                            {result.recommendedStrategy}
                        </div>
                    </div>
                  )}

                  {activeTab === 'DRAFT' && (
                    <div className="animate-fade-in h-full flex flex-col">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-y-auto font-serif leading-loose text-lg text-slate-900 whitespace-pre-wrap relative">
                             <button 
                                onClick={() => { navigator.clipboard.writeText(result.draftAppealMemo); alert('تم النسخ'); }}
                                className="absolute top-4 left-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                title="نسخ النص"
                             >
                               <Copy size={18} />
                             </button>
                             {result.draftAppealMemo}
                        </div>
                    </div>
                  )}
               </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyzer;