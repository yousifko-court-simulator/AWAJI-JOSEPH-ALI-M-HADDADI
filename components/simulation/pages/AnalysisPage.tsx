
import React from "react";
import { BrainCircuit, AlertTriangle, HelpCircle, Lightbulb, Gavel, ArrowLeft, Loader2, ChevronLeft, TrendingUp, ShieldAlert, Target, Download } from "lucide-react";
import { CaseData } from "../types/simulation";
import { SimulationTeamConfig } from "../../../types";

export function AnalysisPage(props: {
  analysis: any;
  caseData: CaseData;
  teamConfig: SimulationTeamConfig | null;
  onRun: () => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const a = props.analysis;

  const handleExport = () => {
    const data = {
      id: `case_export_${Date.now()}`,
      title: props.caseData.caseTitle || "قضية مصدرة",
      lastUpdated: new Date().toISOString(),
      currentPhase: 'SESSION_OPEN',
      messages: [],
      timeline: [],
      config: {
        courtName: props.caseData.court,
        caseType: props.caseData.caseType,
        userRole: props.teamConfig?.userRole || 'PLAINTIFF',
        parties: {
            plaintiff: props.caseData.plaintiff,
            defendant: props.caseData.defendant
        },
        facts: props.caseData.facts,
        requests: props.caseData.requests,
        grounds: props.caseData.grounds,
        damageDate: props.caseData.gregorianDate,
        teamConfig: props.teamConfig,
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALYUSUFCO_CASE_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "grid", gap: 24 }} className="animate-fade-in">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="relative z-10">
            {/* Top Right Actions */}
            {a.status === "done" && (
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 text-slate-500 hover:text-gold-600 bg-white hover:bg-gold-50 border border-slate-200 hover:border-gold-300 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                        title="تصدير ملف القضية لاستخدامه لاحقاً"
                    >
                        <Download size={16} />
                        تصدير ملف القضية
                    </button>
                </div>
            )}

            <div className="w-16 h-16 bg-slate-900 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-900/20 hover:rotate-6 transition-all duration-500">
                <BrainCircuit className="text-gold-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">المحرك الاستراتيجي الذكي</h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-6 text-sm">
            يقوم النظام بتحليل الوقائع والطلبات مقارنة بالأنظمة السعودية لاستخراج استراتيجية الفوز.
            </p>

            {a.status === "idle" && (
            <button
                onClick={props.onRun}
                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 mx-auto hover:scale-105 transform duration-200"
            >
                <BrainCircuit size={20} />
                بدء التحليل الشامل
            </button>
            )}

            {a.status === "running" && (
            <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="animate-spin text-gold-500 mb-3" size={32} />
                <p className="text-slate-600 font-bold animate-pulse">جاري استدعاء الأنظمة والسوابق القضائية...</p>
            </div>
            )}

            {a.status === "error" && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mt-4 mx-auto max-w-md">
                <p className="font-bold">حدث خطأ في التحليل</p>
                <p className="text-sm">{a.errorMessage}</p>
                <button onClick={props.onRun} className="mt-2 text-sm underline hover:text-red-800">إعادة المحاولة</button>
            </div>
            )}
        </div>
      </div>

      {a.status === "done" && (
        <div className="space-y-6 animate-fade-in-up">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Win Probability Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="absolute bottom-0 w-full h-1 bg-slate-100">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${a.winProbability || 50}%` }}></div>
                 </div>
                 <h4 className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">احتمالية كسب الدعوى</h4>
                 <div className="text-4xl font-black text-slate-800 flex items-baseline gap-1">
                    {a.winProbability || 50}<span className="text-sm text-slate-400">%</span>
                 </div>
                 <div className="mt-2 text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                    <TrendingUp size={12}/> تقدير أولي
                 </div>
              </div>

              {/* Weakness Level */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                 <h4 className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">مستوى المخاطرة</h4>
                 <div className={`text-2xl font-black ${
                     a.weaknessSeverity === 'HIGH' ? 'text-red-500' : 
                     a.weaknessSeverity === 'MEDIUM' ? 'text-amber-500' : 'text-blue-500'
                 }`}>
                    {a.weaknessSeverity === 'HIGH' ? 'مرتفع جداً' : 
                     a.weaknessSeverity === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                 </div>
                 <div className="mt-2 text-xs text-slate-400">بناءً على الثغرات المرصودة</div>
              </div>

              {/* Strategy Focus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                 <h4 className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">التركيز الاستراتيجي</h4>
                 <div className="text-sm font-bold text-slate-800 line-clamp-2">
                    {a.suggestedStrategy?.[0] || "التركيز على عبء الإثبات"}
                 </div>
                 <div className="mt-2 text-gold-500">
                    <Target size={20} />
                 </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Section 
               title="نقاط القوة (المرتكزات)" 
               items={a.keyPoints} 
               icon={<Gavel size={18} className="text-blue-600"/>} 
               bg="bg-blue-50/50" 
               border="border-blue-100" 
             />
             <Section 
               title="الثغرات والمخاطر" 
               items={a.risks} 
               icon={<ShieldAlert size={18} className="text-rose-600"/>} 
               bg="bg-rose-50/50" 
               border="border-rose-100" 
             />
          </div>
          
          <Section 
             title="الأسئلة المتوقعة (تحضير للجلسة)" 
             items={a.questions} 
             icon={<HelpCircle size={18} className="text-amber-600"/>} 
             bg="bg-amber-50/50" 
             border="border-amber-100" 
          />
          
          <Section 
             title="خطة المرافعة المقترحة" 
             items={a.suggestedStrategy} 
             icon={<Lightbulb size={18} className="text-emerald-600"/>} 
             bg="bg-emerald-50/50" 
             border="border-emerald-100" 
          />
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex gap-3 pt-6 border-t border-slate-100">
        <button
          onClick={props.onBack}
          className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="rotate-180" size={20}/>
          السابق
        </button>

        <button
          onClick={props.onNext}
          disabled={a.status !== "done"}
          className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transform active:scale-95"
        >
          بدء جلسة المحاكاة <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  );
}

function Section({ title, items, icon, bg, border }: { title: string; items: string[]; icon: React.ReactNode; bg: string; border: string }) {
  return (
    <div className={`rounded-2xl border ${border} ${bg} p-6 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 mb-4 font-bold text-slate-800">
         <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
         {title}
      </div>
      {items?.length ? (
        <ul className="space-y-3 pr-2">
          {items.map((x, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                {x}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-slate-400 text-sm italic">لا يوجد بيانات.</div>
      )}
    </div>
  );
}
