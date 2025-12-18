
import { GoogleGenAI } from "@google/genai";
import { 
  JudicialCaseProfile, 
  SimulationStage, 
  SpeakerRole, 
  UserRole, 
  PartyType, 
  Message,
  Jurisdiction
} from "../types";

// --- CONSTANTS ---
const NEXT_STAGE_MAP: Record<SimulationStage, SimulationStage> = {
  'SETUP': 'OPENING',
  'OPENING': 'CLAIMANT_PLEADING',
  'CLAIMANT_PLEADING': 'JUDGE_QUESTIONS',
  'JUDGE_QUESTIONS': 'OPPONENT_RESPONSE',
  'OPPONENT_RESPONSE': 'REBUTTAL',
  'REBUTTAL': 'WITNESS_SESSION', 
  'WITNESS_SESSION': 'EXPERT_SESSION',
  'EXPERT_SESSION': 'DELIBERATION',
  'DELIBERATION': 'JUDGMENT',
  'JUDGMENT': 'CLOSED',
  'CLOSED': 'CLOSED'
};

const STAGE_LABELS_AR: Record<SimulationStage, string> = {
  'SETUP': 'إعداد الجلسة',
  'OPENING': 'افتتاح الجلسة',
  'CLAIMANT_PLEADING': 'دعوى المدعي',
  'JUDGE_QUESTIONS': 'مناقشة القاضي',
  'OPPONENT_RESPONSE': 'جواب المدعى عليه',
  'REBUTTAL': 'الرد والتعقيب',
  'WITNESS_SESSION': 'سماع الشهود',
  'EXPERT_SESSION': 'رأي الخبير',
  'DELIBERATION': 'المداولة',
  'JUDGMENT': 'النطق بالحكم',
  'CLOSED': 'انتهت الجلسة'
};

// --- EVENTS ---
export type EngineEvent = 
  | { type: 'UPDATE'; stage: SimulationStage; speaker: SpeakerRole; messages: Message[] }
  | { type: 'ERROR'; message: string }
  | { type: 'STOPPED' };

type Listener = (event: EngineEvent) => void;

// --- ENGINE CLASS ---
export class CourtSimulationEngine {
  private profile: JudicialCaseProfile;
  private stage: SimulationStage = 'SETUP';
  private messages: Message[] = [];
  private listeners: Listener[] = [];
  private llm: GoogleGenAI;
  private isProcessing = false;

  constructor(profile: JudicialCaseProfile, apiKey: string) {
    this.validateProfile(profile);
    this.profile = profile;
    this.llm = new GoogleGenAI({ apiKey });
  }

  // --- 1. VALIDATION (The Gatekeeper) ---
  private validateProfile(profile: JudicialCaseProfile) {
    if (profile.caseNature === 'COMPENSATION' && !profile.damageDate) {
      throw new Error("تاريخ الضرر إلزامي في قضايا التعويض");
    }
    
    // Rule: Government disputes go to Administrative Court usually
    if (profile.jurisdiction === 'COMMERCIAL' && profile.parties.defendant.type === 'GOVERNMENT') {
      throw new Error("لا يمكن مقاضاة جهة حكومية في المحكمة التجارية (الاختصاص للمحكمة الإدارية)");
    }

    if (!profile.facts || !profile.requests) {
      throw new Error("البيانات الأساسية للقضية ناقصة");
    }
  }

  // --- 2. STATE MACHINE (The Authority) ---
  public start() {
    this.stage = 'OPENING';
    this.emitUpdate();
    this.processTurn(); // Trigger first turn (usually Judge)
  }

  public getStage() { return this.stage; }
  public getMessages() { return this.messages; }
  public getStageLabel() { return STAGE_LABELS_AR[this.stage]; }

  public getCurrentSpeaker(): SpeakerRole {
    if (this.stage === 'CLOSED') return 'SYSTEM';

    switch (this.stage) {
      case 'OPENING':
      case 'JUDGE_QUESTIONS':
      case 'DELIBERATION':
      case 'JUDGMENT':
        return 'JUDGE';

      case 'CLAIMANT_PLEADING':
        return this.profile.userRole === 'PLAINTIFF' ? 'USER' : 'USER_ADVISOR'; 
        
      case 'OPPONENT_RESPONSE':
        return this.profile.userRole === 'DEFENDANT' ? 'USER' : this.resolveOpponentRole();

      case 'REBUTTAL':
        return this.profile.userRole === 'PLAINTIFF' ? 'USER' : 'USER_ADVISOR';
      
      case 'WITNESS_SESSION':
        return 'WITNESS';
      
      case 'EXPERT_SESSION':
        return 'EXPERT';
        
      default:
        return 'JUDGE';
    }
  }
  
  // Resolve who is the speaker when it's NOT the user and NOT the judge
  private resolveSpeakerRoleForAI(): SpeakerRole {
      const currentSpeaker = this.getCurrentSpeaker();
      if (currentSpeaker === 'USER') return 'USER'; 
      
      // Handle Opponent Logic
      if (this.stage === 'CLAIMANT_PLEADING' && this.profile.userRole === 'DEFENDANT') {
          return this.profile.parties.plaintiff.type === 'GOVERNMENT' ? 'GOVT_ADVISOR' : 'PRIVATE_OPPONENT';
      }
      
      if (this.stage === 'REBUTTAL' && this.profile.userRole === 'DEFENDANT') {
           return this.profile.parties.plaintiff.type === 'GOVERNMENT' ? 'GOVT_ADVISOR' : 'PRIVATE_OPPONENT';
      }

      if (this.stage === 'OPPONENT_RESPONSE' && this.profile.userRole === 'PLAINTIFF') {
          return this.resolveOpponentRole();
      }

      // Handle Witness/Expert
      if (currentSpeaker === 'WITNESS') return 'WITNESS';
      if (currentSpeaker === 'EXPERT') return 'EXPERT';

      return 'JUDGE';
  }

  private resolveOpponentRole(): SpeakerRole {
    // If Defendant is Government -> GOVT_ADVISOR
    if (this.profile.parties.defendant.type === 'GOVERNMENT') return 'GOVT_ADVISOR';
    // Else -> PRIVATE_OPPONENT (Abu Awaji)
    return 'PRIVATE_OPPONENT';
  }

  // --- 3. EXECUTION ---
  
  public async submitUserAction(text: string) {
    if (this.stage === 'CLOSED' || this.isProcessing) return;
    if (this.getCurrentSpeaker() !== 'USER') {
      this.emitError("ليس دورك الآن للتحدث");
      return;
    }

    this.addMessage('user', 'USER', text);
    await this.advanceStage();
  }

  private async processTurn() {
    if (this.stage === 'CLOSED') return;

    const speaker = this.getCurrentSpeaker();
    
    // If it's User's turn, we stop and wait for input.
    if (speaker === 'USER') {
      this.isProcessing = false;
      this.emitUpdate();
      return; 
    }

    // It's AI's turn
    this.isProcessing = true;
    this.emitUpdate(); 

    try {
      const aiSpeaker = this.resolveSpeakerRoleForAI();
      const responseText = await this.generateAIResponse(aiSpeaker);
      
      this.addMessage('model', aiSpeaker, responseText);
      await this.advanceStage();

    } catch (error) {
      console.error(error);
      this.emitError("حدث خطأ في معالجة الرد الآلي");
      this.isProcessing = false;
    }
  }

  private async advanceStage() {
    const next = NEXT_STAGE_MAP[this.stage];
    if (!next) {
        this.stage = 'CLOSED';
    } else {
        this.stage = next;
    }

    this.emitUpdate();

    if (this.stage !== 'CLOSED') {
        setTimeout(() => this.processTurn(), 1500);
    } else {
        this.isProcessing = false;
        this.emitUpdate(); 
    }
  }

  private addMessage(role: 'user' | 'model', speaker: SpeakerRole, content: string) {
    this.messages = [...this.messages, {
      id: Date.now().toString(),
      role,
      speakerRole: speaker,
      content,
      timestamp: new Date(),
      stage: this.stage
    }];
  }

  // --- 4. GEMINI INTEGRATION ---
  private async generateAIResponse(role: SpeakerRole): Promise<string> {
    const prompt = this.buildPrompt(role);
    
    try {
      const result = await this.llm.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.4 } 
      });
      return result.text || "لا يوجد رد.";
    } catch (e) {
      console.error("Gemini Error", e);
      return "عذراً، حدث خطأ تقني.";
    }
  }

  private buildPrompt(role: SpeakerRole): string {
    const p = this.profile;
    const history = this.messages.map(m => `${m.speakerRole}: ${m.content}`).join('\n');
    
    const roleDesc = role === 'JUDGE' ? "قاضي المحكمة" : 
                     role === 'GOVT_ADVISOR' ? "الممثل النظامي للجهة الحكومية" :
                     role === 'PRIVATE_OPPONENT' ? "محامي الخصم" : 
                     role === 'WITNESS' ? "الشاهد في القضية" :
                     role === 'EXPERT' ? "الخبير الفني" :
                     "محامي الطرف الآخر";

    const context = `
      أنت تقوم بدور (${roleDesc}) في محاكاة قضائية سعودية.
      المحكمة: ${p.jurisdiction}
      نوع القضية: ${p.caseNature}
      المدعي: ${p.parties.plaintiff.name} (${p.parties.plaintiff.type})
      المدعى عليه: ${p.parties.defendant.name} (${p.parties.defendant.type})
      الوقائع: ${p.facts}
      الطلبات: ${p.requests}
      
      المرحلة الحالية: ${STAGE_LABELS_AR[this.stage]}
      
      سجل الحوار السابق:
      ${history}
    `;

    let instruction = "";
    if (role === 'JUDGE') {
        if (this.stage === 'OPENING') instruction = "افتتح الجلسة رسمياً وتحقق من الأطراف باختصار.";
        else if (this.stage === 'JUDGE_QUESTIONS') instruction = "اطرح سؤالاً جوهرياً واحداً للاستيضاح.";
        else if (this.stage === 'DELIBERATION') instruction = "لخص الموقف القضائي قبل الحكم.";
        else if (this.stage === 'JUDGMENT') instruction = "أصدر منطوق الحكم النهائي بناء على الوقائع والأنظمة السعودية (حكم فاصل).";
        else if (this.stage === 'WITNESS_SESSION') instruction = "وجه سؤالاً مباشراً للشاهد للتحقق من واقعة معينة.";
        else if (this.stage === 'EXPERT_SESSION') instruction = "اطلب رأي الخبير الفني في نقطة محددة.";
    } else if (role === 'GOVT_ADVISOR') {
        instruction = "دافع عن الجهة الحكومية وتمسك بالنظام والإجراءات الشكلية وعدم الاختصاص إن وجد.";
    } else if (role === 'WITNESS') {
        instruction = "أجب على الأسئلة بصدق واختصار شديد، ولا تتبرع بمعلومات لم تُسأل عنها. تحدث كشخص عادي وليس قانوني.";
    } else if (role === 'EXPERT') {
        instruction = "قدم رأيك الفني بموضوعية وحياد ومصطلحات مهنية دقيقة.";
    } else {
        instruction = "دافع عن موكلك وقدم دفوعاً قانونية قوية.";
    }

    return `${context}\n\nالتعليمات: ${instruction}\nتحدث باللغة العربية الفصحى القانونية (أو العامية المهذبة للشاهد). كن موجزاً ومباشراً.`;
  }

  // --- UTILS ---
  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emitUpdate() {
    const speaker = this.getCurrentSpeaker();
    this.listeners.forEach(l => l({ 
        type: 'UPDATE', 
        stage: this.stage, 
        speaker, 
        messages: this.messages 
    }));
  }

  private emitError(msg: string) {
    this.listeners.forEach(l => l({ type: 'ERROR', message: msg }));
  }
}
