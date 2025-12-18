
import React, { useEffect, useRef, useState } from "react";
import { Role, CaseData, TimelineEvent, SimulationPhase, ChatMessage } from "../types/simulation";
import { FileData } from "../../../types";
import { 
  Scale, Gavel, User, Mic, Send, Sparkles, 
  CheckCircle2, Circle, Clock, ChevronLeft,
  Building2, Users, FileText, Loader2, PlayCircle, Save, PenTool, Download, Lock, Wand2, RefreshCw, Paperclip, X, ClipboardList, Microscope
} from "lucide-react";

// Helper to map Role Enums to Human Readable Names
function roleLabel(r: Role | string) {
  if (r === "JUDGE") return "الشيخ معاذ العريشي (رئيس الجلسة)";
  if (r === "CLERK") return "الشيخ حاوي الكيلاني (أمين السر)";
  if (r === "PLAINTIFF") return "المدعي";
  if (r === "DEFENDANT") return "المدعى عليه";
  if (r === "ADVISOR") return "المستشار البروفيسور اليوسفكو (وكيل)";
  if (r === "PRIVATE_OPPONENT") return "المستشار أبو عواجي (محامي الخصم)";
  if (r === "GOVT_ADVISOR") return "الممثل النظامي (الحكومي)";
  if (r === "EXPERT") return "الخبير الفني المختص";
  if (r === "WITNESS") return "الشاهد";
  return r;
}

export function CourtSessionPage(props: {
  role: Role;
  session: any;
  caseData: CaseData;
  isAiThinking?: boolean;
  lastSaved?: Date | null;
  onStart: () => void;
  onAddMessage: (speakerRole: Role | string, speaker: string, content: string, file?: FileData) => void;
  onTriggerAiTurn: (targetRole: Role | string) => void; 
  onBuildJudgment: () => void;
  onGenerateDeed?: (mode: 'generate' | 'correct', detail: 'متوسط' | 'مكثف') => void;
  isGeneratingDeed?: boolean;
  onExport: () => void;
  onBack?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRole, setSelectedRole] = useState<Role | string>("JUDGE");

  const timeline = props.session.timeline as TimelineEvent[];
  const isJudgmentPhase = props.session.phase === 'JUDGMENT' || props.session.phase === 'CLOSED';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.session.messages, props.isAiThinking]);

  const availableRoles = [
      { value: "JUDGE", label: "👨‍⚖️ الشيخ معاذ العريشي (القاضي)" },
      { value: "CLERK", label: "📝 الشيخ حاوي الكيلاني (كاتب الضبط)" },
      { value: "ADVISOR", label: "🎓 البروفيسور اليوسفكو (الوكيل الشرعي)" },
      { value: props.role, label: "👤 المستخدم (أنت)" },
      { value: "EXPERT", label: "🧪 الخبير الفني المختص" },
      { value: "WITNESS", label: "🗣️ الشاهد" },
  ];

  if (props.caseData.defendant.type === 'GOVERNMENT') {
      availableRoles.push({ value: "GOVT_ADVISOR", label: "🏛️ ممثل الجهة الحكومية" });
  } else {
      availableRoles.push({ value: "PRIVATE_OPPONENT", label: "⚔️ المستشار أبو عواجي (الخصم)" });
  }

  const getBubbleStyle = (role: Role | string, isMe: boolean) => {
    if (isMe) return 'bg-slate-800 text-white rounded-tr-none border-slate-800 shadow-md';
    switch (role) {
      case 'JUDGE': return 'bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-lg shadow-sm';
      case 'CLERK': return 'bg-slate-100 border-dashed border-slate-300 text-slate-600 font-mono text-xs';
      case 'ADVISOR': return 'bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg shadow-sm font-semibold';
      case 'EXPERT': return 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg shadow-sm font-serif italic';
      case 'WITNESS': return 'bg-violet-50 border border-violet-200 text-violet-900 rounded-lg shadow-sm italic';
      case 'PRIVATE_OPPONENT':
      case 'GOVT_ADVISOR': return 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none';
      default: return 'bg-white border border-slate-200 text-slate-800 rounded-tl-none';
    }
  };

  const getTimelineIcon = (status: string, phase: SimulationPhase) => {
      if (status === 'completed') return <CheckCircle2 size={16} className="text-emerald-500" />;
      if (status === 'active') return <Loader2 size={16} className="text-gold-500 animate-spin" />;
      if (phase === 'EVIDENCE_REVIEW') return <ClipboardList size={16} className="text-slate-300" />;
      if (phase === 'WITNESS_EXAMINATION') return <Mic size={16} className="text-slate-300" />;
      if (phase === 'EXPERT_REPORT') return <Microscope size={16} className="text-slate-300" />;
      return <Circle size={16} className="text-slate-300" />;
  };

  const handleManualTrigger = () => {
      if (selectedRole !== props.role) {
          props.onTriggerAiTurn(selectedRole);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Content = (reader.result as string).split(',')[1];
      setAttachedFile({ name: file.name, data: base64Content, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUserSend = () => {
    if (!text.trim() && !attachedFile) return;
    props.onAddMessage(props.role, roleLabel(props.role), text, attachedFile || undefined);
    setText("");
    setAttachedFile(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-2xl relative">
      
      {/* 1. MANDATORY TOOLBAR */}
      <div className="bg-slate-900 text-white flex flex-col shrink-0 z-20 shadow-md">
         <div className="flex items-center justify-between p-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                    <Scale size={16} className="text-gold-500" />
                </div>
                <div>
                    <div className="font-bold text-sm">المحاكاة القضائية الذكية</div>
                    <div className="text-[10px] text-slate-400">تعدد الأدوار والاستماع للشهود والخبراء</div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-inner order-2 md:order-1">
                    <span className="text-[10px] text-slate-400 px-1 font-bold hidden md:inline">المتحدث التالي:</span>
                    <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg border border-slate-600 focus:ring-1 focus:ring-gold-500 outline-none cursor-pointer min-w-[140px]"
                        disabled={props.isAiThinking}
                    >
                        {availableRoles.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>

                    {selectedRole !== props.role ? (
                        <button 
                            onClick={handleManualTrigger}
                            disabled={props.isAiThinking}
                            className="bg-gold-600 hover:bg-gold-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                        >
                            {props.isAiThinking ? <Loader2 className="animate-spin" size={14}/> : <PlayCircle size={14} />}
                            <span className="hidden md:inline">تفعيل الدور</span>
                        </button>
                    ) : (
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 flex items-center gap-2 bg-slate-900/50 rounded-lg border border-slate-700">
                            <PenTool size={14} />
                            <span className="hidden md:inline">دورك الآن</span>
                        </div>
                    )}
                </div>

                {isJudgmentPhase && props.onGenerateDeed && (
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 animate-fade-in order-1 md:order-2">
                        <button onClick={() => props.onGenerateDeed?.('generate', 'متوسط')} disabled={props.isGeneratingDeed} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50">
                            {props.isGeneratingDeed ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
                            <span className="hidden md:inline">توليد الصك</span>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={props.onExport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"><Download size={14} /></button>
                {!isJudgmentPhase && (
                    <button onClick={props.onBuildJudgment} disabled={props.session.messages.length < 3} className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border border-rose-400 shadow-sm">
                        <Lock size={14} className="ml-1.5"/> قفل المرافعة
                    </button>
                )}
            </div>
         </div>

         <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-800/50 text-[10px] md:text-xs overflow-x-auto whitespace-nowrap scrollbar-hide">
            <div className="flex items-center gap-1.5 text-slate-300">
                <Building2 size={12} className="text-gold-500"/>
                <span>{props.caseData.court}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5 text-slate-300">
                <Users size={12} className="text-emerald-400"/>
                <span>{props.caseData.plaintiff.name} <span className="text-slate-500">ضد</span> {props.caseData.defendant.name}</span>
            </div>
            {props.session.phase === 'WITNESS_EXAMINATION' && (
              <div className="mr-auto bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 font-bold flex items-center gap-1 animate-pulse">
                <Mic size={10} /> سماع الشهادة
              </div>
            )}
            {props.session.phase === 'EXPERT_REPORT' && (
              <div className="mr-auto bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center gap-1 animate-pulse">
                <Microscope size={10} /> مناقشة الخبير
              </div>
            )}
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          
          <div className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  سجل الإجراءات
              </div>
              <div className="p-2 space-y-1">
                  {timeline.map((event) => (
                      <div 
                        key={event.id}
                        className={`
                            flex items-center gap-3 p-3 rounded-xl text-xs transition-all
                            ${event.status === 'active' ? 'bg-gold-50 text-gold-800 font-bold border border-gold-100 shadow-sm' : ''}
                            ${event.status === 'completed' ? 'text-slate-500 opacity-80' : ''}
                            ${event.status === 'pending' ? 'text-slate-400' : ''}
                        `}
                      >
                          {getTimelineIcon(event.status, event.phase)}
                          <span>{event.label}</span>
                      </div>
                  ))}
              </div>
          </div>

          <div className="flex-1 flex flex-col bg-slate-50 relative">
            {!props.session.started ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-slate-100 animate-pulse"><Gavel className="text-slate-800" size={40} /></div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">القاعة جاهزة للانعقاد</h3>
                    <p className="text-slate-500 max-w-md mb-8 leading-relaxed text-sm">سيقوم القاضي بافتتاح الجلسة واستدعاء الشهود والخبراء حسب سير القضية.</p>
                    <button onClick={props.onStart} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                        <PlayCircle size={24} className="text-gold-500" /> بدء الجلسة الآن
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {props.session.messages.map((m: ChatMessage) => {
                            const isSystem = m.role === 'SYSTEM';
                            const isJudge = m.role === 'JUDGE';
                            const isExpert = m.role === 'EXPERT';
                            const isWitness = m.role === 'WITNESS';
                            const isMe = m.role === props.role;
                            
                            if (isSystem) {
                                return (
                                    <div key={m.id} className="flex justify-center my-4">
                                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-slate-300">{m.content}</span>
                                    </div>
                                );
                            }

                            return (
                                <div key={m.id} className={`flex w-full ${isMe ? 'justify-end' : isJudge ? 'justify-center' : 'justify-start'}`}>
                                    <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : isJudge ? 'items-center w-full max-w-[90%]' : 'items-start'}`}>
                                        
                                        <div className="flex items-center gap-2 mb-1 opacity-80">
                                            {isJudge && <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-gold-500"><Gavel size={10}/></div>}
                                            {isExpert && <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white"><Microscope size={10}/></div>}
                                            {isWitness && <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white"><Mic size={10}/></div>}
                                            <span className="text-[10px] font-bold text-slate-500">{m.speaker}</span>
                                        </div>
                                        
                                        <div className={`
                                            px-4 py-3 text-sm leading-relaxed shadow-sm relative rounded-2xl
                                            ${getBubbleStyle(m.role, isMe)}
                                        `}>
                                            {m.file && (
                                              <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg border ${isMe ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                <FileText size={18} className={isMe ? 'text-gold-400' : 'text-blue-500'} />
                                                <div className="flex flex-col overflow-hidden">
                                                  <span className="text-xs font-bold truncate max-w-[150px]">{m.file.name}</span>
                                                  <span className="text-[9px] opacity-70">مستند قضائي مرفق</span>
                                                </div>
                                              </div>
                                            )}
                                            <div className="whitespace-pre-wrap">{m.content}</div>
                                            <span className={`text-[9px] block mt-1 opacity-50 ${isMe ? 'text-left text-slate-300' : 'text-right text-slate-400'}`}>
                                                {new Date(m.ts).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {props.isAiThinking && (
                             <div className="flex w-full justify-center">
                                <div className="bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2 shadow-inner">
                                    <div className="flex space-x-1 space-x-reverse">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={`bg-white p-4 border-t border-slate-200 shrink-0 transition-all ${selectedRole !== props.role ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {attachedFile && (
                          <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-2 border border-slate-200 animate-fade-in">
                            <div className="flex items-center gap-2 overflow-hidden"><FileText size={16} className="text-slate-600 shrink-0" /><span className="text-xs font-bold text-slate-800 truncate">{attachedFile.name}</span></div>
                            <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                          </div>
                        )}
                        
                        <div className="relative flex items-end gap-2">
                            <div className="flex-1 relative">
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full bg-slate-100 border-0 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all resize-none h-14"
                                    placeholder="اكتب ردك أو توضيحك..."
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                  <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-slate-600 transition-colors"><Paperclip size={18} /></button>
                                  <Mic className="text-slate-400 cursor-pointer hover:text-slate-600" size={18} />
                                </div>
                                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                            </div>
                            <button onClick={handleUserSend} disabled={!text.trim() && !attachedFile} className="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg">
                                <Send className={document.dir === 'rtl' ? 'rotate-180' : ''} size={20} />
                            </button>
                        </div>
                    </div>
                </>
            )}
          </div>
      </div>

      <div className="bg-slate-900 text-slate-500 text-[10px] text-center py-2 shrink-0 border-t border-slate-800">
         Alyusufco Legal AI – نظام المحاكاة القضائية المتكامل © {new Date().getFullYear()}
      </div>
    </div>
  );
}
