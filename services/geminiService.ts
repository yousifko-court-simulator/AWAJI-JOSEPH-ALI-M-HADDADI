
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { MemoData, Message, CaseConfig, FileData, AdvisorSettings, StructuredCaseAnalysis, JudicialCaseProfile, DocCategory, DocumentRequest, MissingItem, JudgmentAnalysisResult } from "../types";
import { AnalysisResult, CaseData, ChatMessage, Role, EvidenceFile } from "../components/simulation/types/simulation";
import { 
  GLOBAL_SYSTEM_PROMPT, 
  JUDGE_PROMPT, 
  CLERK_PROMPT,
  ALYUSUFCO_ADVISOR_PROMPT, 
  OPPONENT_COUNSEL_PROMPT, 
  GOVT_ADVISOR_PROMPT, 
  EXPERT_NAIF_PROMPT,
  EXPERT_ABDULLATIF_PROMPT, 
  EXPERT_GENERAL_PROMPT,
  WITNESS_PROMPT 
} from "../logic/prompts";

const MODEL_NAME = "gemini-2.5-flash"; 

const getApiKey = () => {
  let key = '';
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    key = process.env.API_KEY;
  }
  return localStorage.getItem('GEMINI_API_KEY') || key || '';
};

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STRICT_ARABIC_INSTRUCTION = `
⚠️ تعليمات لغوية صارمة جداً:
1. المخرجات باللغة العربية الفصحى حصراً.
2. يمنع استخدام أي جملة بالإنجليزية.
3. المصطلحات القانونية يجب أن توافق الأنظمة السعودية.
`;

export const safeGenerateContent = async (contents: any, config: any = {}, retries = 3): Promise<GenerateContentResponse> => {
  const ai = getAIClient();
  try {
    return await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: config
    });
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.status === 429;
    if (isQuotaError && retries > 0) {
      await wait(4000); 
      return safeGenerateContent(contents, config, retries - 1);
    }
    throw error;
  }
};

const buildContentParts = (text: string, file?: FileData | null) => {
  const parts: any[] = [];
  if (file) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    parts.push({ text: `[تم إرفاق ملف: ${file.name}]` });
  }
  parts.push({ text: text + "\n\n" + STRICT_ARABIC_INSTRUCTION });
  return parts;
};

// --- SIMULATION LOGIC ---

export const simulateSessionTurn = async (
  history: ChatMessage[], 
  targetRole: Role, 
  caseData: CaseData, 
  phase: string,
  evidence: EvidenceFile[]
): Promise<string> => {
  
  let systemPrompt = GLOBAL_SYSTEM_PROMPT;
  switch (targetRole) {
    case 'JUDGE': systemPrompt += "\n" + JUDGE_PROMPT; break;
    case 'CLERK': systemPrompt += "\n" + CLERK_PROMPT; break;
    case 'ADVISOR': systemPrompt += "\n" + ALYUSUFCO_ADVISOR_PROMPT; break;
    case 'PRIVATE_OPPONENT': systemPrompt += "\n" + OPPONENT_COUNSEL_PROMPT; break;
    case 'GOVT_ADVISOR': systemPrompt += "\n" + GOVT_ADVISOR_PROMPT; break;
    case 'EXPERT': 
       if (caseData.caseType.includes('جزائية')) systemPrompt += "\n" + EXPERT_NAIF_PROMPT;
       else if (caseData.caseType.includes('طب')) systemPrompt += "\n" + EXPERT_ABDULLATIF_PROMPT;
       else systemPrompt += "\n" + EXPERT_GENERAL_PROMPT;
       break;
    case 'WITNESS': systemPrompt += "\n" + WITNESS_PROMPT; break;
    default: systemPrompt += "\n" + OPPONENT_COUNSEL_PROMPT;
  }

  // Phase-specific guidance
  let phaseInstruction = "";
  if (phase === 'EVIDENCE_REVIEW' && targetRole === 'JUDGE') {
    const evidenceList = evidence.map(e => e.name).join('، ');
    phaseInstruction = `
      أنت الآن في مرحلة "فحص الأدلة". 
      الأدلة المتاحة في ملف القضية هي: [${evidenceList}].
      تعليمات بروتوكولية:
      1. قم باستعراض الأدلة واحداً تلو الآخر (راجع سجل الحوار لتعرف ما الذي تمت مناقشته).
      2. لكل دليل جديد، قدم تعليقاً قضائياً أولياً عليه.
      3. اطلب من المستخدم (أو المستشار) توضيح "وجه الاستدلال" بهذا الدليل وما هي أهميته القانونية في إثبات دعواه.
      4. لا تنتقل للدليل التالي حتى يكتمل النقاش حول الدليل الحالي.
      5. إذا كانت الأدلة معقدة، اطلب من "الخبير الفني" إعطاء رأيه في الدليل.
    `;
  } else if (phase === 'WITNESS_EXAMINATION' && targetRole === 'WITNESS') {
    phaseInstruction = `أنت الآن "الشاهد" في الجلسة. أجب على أسئلة القاضي أو الأطراف بناءً على سياق الوقائع: (${caseData.facts})، كن صادقاً وبسيطاً في لغتك.`;
  } else if (phase === 'EXPERT_REPORT' && targetRole === 'EXPERT') {
    phaseInstruction = `بصفتك الخبير الفني، قدم تقريرك الشفوي المختصر للمحكمة حول النقاط الفنية في القضية: (${caseData.summary}).`;
  }

  const context = `
    [سياق الجلسة]
    المحكمة: ${caseData.court} | القضية: ${caseData.caseTitle}
    المرحلة: ${phase}
    الوقائع: ${caseData.facts}
    
    ${phaseInstruction}
    
    أنت الآن تتحدث بلسان (${targetRole}). قم بالرد بمهنية وواقعية وبما يخدم سير الجلسة الإجرائي.
  `;

  const chatHistory = history.map(msg => ({
    role: msg.isAiGenerated ? 'model' : 'user',
    parts: [{ text: `${msg.speaker}: ${msg.content}` + (msg.file ? ` [مرفق مستند: ${msg.file.name}]` : "") }]
  }));

  try {
    const response = await safeGenerateContent(
      [...chatHistory, { role: 'user', parts: [{ text: context }] }],
      { systemInstruction: systemPrompt, temperature: 0.5 }
    );
    return response.text || "...";
  } catch (error) {
    console.error("Simulation Turn Error", error);
    return "عذراً، حدث خطأ في التواصل مع القاعة الافتراضية.";
  }
};

export const analyzeJudgmentDeeply = async (text: string, file?: FileData | null): Promise<JudgmentAnalysisResult> => {
    const prompt = `${STRICT_ARABIC_INSTRUCTION}\nأنت مستشار تدقيق أحكام...`;
    const response = await safeGenerateContent([{ role: 'user', parts: buildContentParts(prompt + "\n\n" + text, file) }], { responseMimeType: "application/json" });
    return JSON.parse(response.text || "{}");
};
export const analyzeDocumentNeeds = async (request: DocumentRequest): Promise<MissingItem[]> => {
  const prompt = `${STRICT_ARABIC_INSTRUCTION}\nحلل طلب الوثيقة القانونية واستخرج النواقص...`;
  const response = await safeGenerateContent([{ role: 'user', parts: buildContentParts(prompt, request.attachment) }], { responseMimeType: "application/json" });
  const json = JSON.parse(response.text || "{}");
  return (json.missingItems || []).map((item: any) => ({ ...item, isResolved: false }));
};
export const draftLegalDocument = async (request: DocumentRequest, missingItems: MissingItem[]): Promise<string> => {
  const prompt = `${STRICT_ARABIC_INSTRUCTION}\nأنت المحامي عبد المجيد مساوى حدادي. صغ الوثيقة القانونية...`;
  const parts = buildContentParts(prompt, request.attachment);
  const response = await safeGenerateContent([{ role: 'user', parts }]);
  return response.text || "تعذر إنشاء الوثيقة.";
};
export const analyzeSimulationCase = async (caseData: CaseData, evidenceCount: number): Promise<Omit<AnalysisResult, "status">> => {
  const prompt = `${STRICT_ARABIC_INSTRUCTION}\nحلل القضية لبناء محاكاة (JSON)...`;
  const response = await safeGenerateContent([{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: "application/json" });
  return JSON.parse(response.text || "{}");
};
export const extractCaseProfile = async (file: FileData): Promise<Partial<JudicialCaseProfile>> => {
  const prompt = `${STRICT_ARABIC_INSTRUCTION}\nاستخرج بيانات القضية من الملف...`;
  const response = await safeGenerateContent([{ role: 'user', parts: buildContentParts(prompt, file) }], { responseMimeType: "application/json" });
  return JSON.parse(response.text || "{}");
};
export const generateSuggestedReplies = async (history: ChatMessage[], userRole: Role, caseData: CaseData): Promise<string[]> => {
  const prompt = `${STRICT_ARABIC_INSTRUCTION}\nاقترح 3 ردود ذكية...`;
  const response = await safeGenerateContent([{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: "application/json" });
  const json = JSON.parse(response.text || "{}");
  return json.replies || [];
};
export const askGlobalAssistant = async (query: string, file?: FileData | null) => {
    const res = await safeGenerateContent([{ role: 'user', parts: buildContentParts(query, file) }]);
    return res.text || "أنا هنا للمساعدة.";
}
export const getLegalAdvice = async (query: string, file?: FileData | null) => {
    const res = await safeGenerateContent([{ role: 'user', parts: buildContentParts(query, file) }]);
    return res.text || "عذراً لم أتمكن من الإجابة.";
}
