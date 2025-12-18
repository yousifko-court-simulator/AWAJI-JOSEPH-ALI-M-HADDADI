
import React, { useState, useEffect } from "react";
import { Role } from "../types/simulation";
import { AdvisorId, ExpertId, PartyType, SimulationTeamConfig, UserRole } from "../../../types";
import { User, Shield, Briefcase, Gavel, Users, CheckCircle, Scale, Building2, UserCircle } from "lucide-react";

export function RoleSelectPage(props: {
  selected: Role | null;
  onSelect: (r: Role) => void; // Legacy
  onNext: () => void;
  onJumpToEvidence: () => void;
  // New Prop for dispatch
  onConfigComplete?: (config: SimulationTeamConfig) => void;
}) {
  // Local State for the Form
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [opponentType, setOpponentType] = useState<PartyType | null>(null);
  const [expertsEnabled, setExpertsEnabled] = useState(false);
  const [selectedExperts, setSelectedExperts] = useState<ExpertId[]>([]);

  // Derived State
  const userAdvisor: AdvisorId = 'ALYUSUFCO';
  const opponentAdvisor: AdvisorId = opponentType === 'GOVERNMENT' ? 'GOVT_REP' : 'ABU_AWAJI';

  const isReady = userRole && opponentType;

  const handleNext = () => {
      if (!isReady) return;
      
      const config: SimulationTeamConfig = {
          userRole: userRole!,
          userAdvisor,
          opponentType: opponentType!,
          opponentAdvisor,
          expertsEnabled,
          selectedExperts: expertsEnabled ? selectedExperts : []
      };

      // Dispatch to parent
      if (props.onConfigComplete) {
          props.onConfigComplete(config);
      }
      props.onNext();
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">إعداد فريق المحاكاة القضائية</h2>
          <p className="text-slate-500">حدد استراتيجية الجلسة والأطراف المشاركة بدقة لضمان محاكاة واقعية</p>
      </div>

      {/* 1. User Role */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              صفتك في الدعوى
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setUserRole('PLAINTIFF')}
                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${userRole === 'PLAINTIFF' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${userRole === 'PLAINTIFF' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <User size={24} />
                  </div>
                  <div className="text-right">
                      <div className="font-bold text-lg">المدعي</div>
                      <div className="text-xs text-slate-500">صاحب الحق / مقيم الدعوى</div>
                  </div>
                  {userRole === 'PLAINTIFF' && <CheckCircle className="mr-auto text-emerald-500" />}
              </button>

              <button 
                onClick={() => setUserRole('DEFENDANT')}
                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${userRole === 'DEFENDANT' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${userRole === 'DEFENDANT' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Shield size={24} />
                  </div>
                  <div className="text-right">
                      <div className="font-bold text-lg">المدعى عليه</div>
                      <div className="text-xs text-slate-500">الطرف المنسوب إليه الحق</div>
                  </div>
                  {userRole === 'DEFENDANT' && <CheckCircle className="mr-auto text-rose-500" />}
              </button>
          </div>
      </div>

      {/* 2. User Advisor (Fixed) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 to-gold-600"></div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              مستشارك القانوني (ممثل المستخدم)
          </h3>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-900 border-4 border-gold-500 flex items-center justify-center shadow-lg">
                  <Scale className="text-gold-500" size={32} />
              </div>
              <div>
                  <div className="font-bold text-lg text-slate-800">المستشار القانوني البروفيسور اليوسفكو</div>
                  <div className="text-sm text-slate-500">مستشار استراتيجي، داعم، ومصحح للمسار القانوني</div>
                  <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-gold-100 text-gold-800 px-2 py-1 rounded-full font-bold">حاضر دائماً</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-bold">ذكاء اصطناعي</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. Opponent Type & Advisor */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              طبيعة الخصم وممثله
          </h3>
          
          <div className="flex flex-wrap gap-3 mb-6">
              {[
                  { id: 'INDIVIDUAL', label: 'فرد', icon: UserCircle },
                  { id: 'COMPANY', label: 'شركة / مؤسسة', icon: Briefcase },
                  { id: 'GOVERNMENT', label: 'جهة حكومية', icon: Building2 }
              ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOpponentType(opt.id as PartyType)}
                    className={`
                        px-4 py-2 rounded-xl border flex items-center gap-2 transition-all
                        ${opponentType === opt.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}
                    `}
                  >
                      <opt.icon size={18} />
                      {opt.label}
                  </button>
              ))}
          </div>

          {opponentType && (
              <div className="animate-fade-in bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-sm ${opponentType === 'GOVERNMENT' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-rose-100 border-rose-300 text-rose-700'}`}>
                      <Gavel size={24} />
                  </div>
                  <div>
                      <div className="text-xs text-slate-400 font-bold mb-1">سيتم تمثيل الخصم بواسطة:</div>
                      <div className="font-bold text-slate-800">
                          {opponentType === 'GOVERNMENT' ? 'الممثل النظامي للجهات الحكومية' : 'المستشار القانوني (محامي الخصم)'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                          {opponentType === 'GOVERNMENT' ? 'يدفع بعدم الاختصاص، والتمسك بالإجراءات الشكلية' : 'يدفع بإنكار الوقائع، والبحث عن ثغرات في العقد'}
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* 4. Experts */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                الخبراء الفنيين (اختياري)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={expertsEnabled} onChange={e => setExpertsEnabled(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                <span className="text-sm font-bold text-slate-700">تفعيل الخبراء</span>
            </label>
          </div>

          {expertsEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
                  {[
                      { id: 'NAIF_ALARISHI', label: 'الخبير نايف العريشي', sub: 'مركز السموم - تخصص جنائي' },
                      { id: 'ABDULLATIF_HADDADI', label: 'الخبير عبد اللطيف حدادي', sub: 'الأدوية والعقاقير' },
                      { id: 'GENERAL_EXPERT', label: 'خبير عام', sub: 'حسب نوع القضية (هندسي/مالي)' }
                  ].map((exp) => {
                      const isSelected = selectedExperts.includes(exp.id as ExpertId);
                      return (
                          <div 
                            key={exp.id}
                            onClick={() => {
                                if (isSelected) setSelectedExperts(prev => prev.filter(x => x !== exp.id));
                                else setSelectedExperts(prev => [...prev, exp.id as ExpertId]);
                            }}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'}`}
                          >
                              <div className="font-bold text-sm text-slate-800">{exp.label}</div>
                              <div className="text-xs text-slate-500 mt-1">{exp.sub}</div>
                              {isSelected && <div className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"><CheckCircle size={12}/> تم الاختيار</div>}
                          </div>
                      )
                  })}
              </div>
          )}
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-100">
          <button onClick={props.onJumpToEvidence} className="text-slate-400 font-bold text-sm hover:text-slate-600 px-4">
              إرفاق ملف فقط
          </button>
          <div className="flex-1"></div>
          <button 
            onClick={handleNext}
            disabled={!isReady}
            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 flex items-center gap-2 transform active:scale-95 transition-all"
          >
              حفظ الإعدادات والمتابعة
              <CheckCircle size={20} />
          </button>
      </div>
    </div>
  );
}
