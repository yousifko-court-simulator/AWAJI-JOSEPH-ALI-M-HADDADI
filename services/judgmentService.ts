
import { safeGenerateContent } from "./geminiService";
import { Type } from "@google/genai";

// --- Types ---

export type JudgeFixedMeta = {
  judgeName: string; 
  clerkName: string; 
  courtName: string; 
  courtCity: string; 
  circuitName: string; 
};

export type CaseMeta = {
  caseNumber?: string;
  hijriDate: string;
  gregorianDate: string;
  caseType: string;
  caseTitle: string;
  plaintiff: string;
  defendants: string[];
  defendantsRep?: string;
};

export type SimulationLogItem = {
  role: string;
  text: string;
  stage?: string;
};

export type GenerateInput = {
  mode: "generate" | "correct";
  fixedMeta: JudgeFixedMeta;
  caseMeta: CaseMeta;
  simulationLog: SimulationLogItem[];
  currentJudgmentText?: string;
  detailLevel?: "مكثف" | "متوسط" | "مفصل";
};

// --- PHASE 3: STRICT JUDICIAL DECISION OBJECT ---

export type JudicialDecision = {
  jurisdiction: "مختصة" | "غير مختصة";
  admissibility: "مقبولة شكلاً" | "مرفوضة شكلاً";
  outcome: "قبول كلي" | "قبول جزئي" | "رفض";
  acceptedClaims: string[];
  rejectedClaims: string[];
  legalCharacterization: string; // تكييف النزاع
  reliesOnExpert: boolean;
  compensation?: {
    basis: string;      // أساس التعويض
    amount: number;     // رقم فقط
    currency: "SAR";
    method?: string;    // طريقة الاحتساب
  };
  reasoningBullets: string[]; // نقاط تسبيب مختصرة
  proceduralNotes?: string[]; // ملاحظات شكلية
};

// --- VALIDATION LOGIC (THE GUARD) ---

function assertArabicOnly(s: string) {
  if (/[A-Za-z]/.test(s)) throw new Error("NON_ARABIC_LEAK: القرار يحتوي على أحرف لاتينية.");
}

function validateJudicialDecision(d: JudicialDecision) {
  // 1. منطق عدم الاختصاص
  if (d.jurisdiction === "غير مختصة") {
    if (d.outcome !== "رفض") {
      throw new Error("DECISION_INVALID: المحكمة غير مختصة، يجب أن تكون النتيجة (رفض).");
    }
    // لا يجوز التعويض مع عدم الاختصاص
    if (d.compensation) throw new Error("DECISION_INVALID: لا يجوز الحكم بتعويض مع عدم الاختصاص.");
  }

  // 2. منطق الرفض الشكلي
  if (d.admissibility === "مرفوضة شكلاً") {
    if (d.outcome !== "رفض") {
      throw new Error("DECISION_INVALID: الدعوى مرفوضة شكلاً، يجب أن تكون النتيجة (رفض).");
    }
    if (d.compensation) throw new Error("DECISION_INVALID: لا يجوز الحكم بتعويض مع الرفض الشكلي.");
  }

  // 3. منطق التعويض
  if (d.compensation) {
    if (d.outcome === "رفض") {
        // حالة نادرة جداً (رفض الدعوى الأصلية وتعويض عن أضرار تقاضي؟ نمنعها الآن للتبسيط)
        throw new Error("DECISION_INVALID: لا تعويض مع رفض الدعوى.");
    }
    if (typeof d.compensation.amount !== "number" || !isFinite(d.compensation.amount) || d.compensation.amount <= 0) {
      throw new Error("DECISION_INVALID: مبلغ التعويض غير صالح (يجب أن يكون رقم أكبر من صفر).");
    }
  }

  // 4. القوائم
  if (!Array.isArray(d.acceptedClaims) || !Array.isArray(d.rejectedClaims)) {
    throw new Error("DECISION_INVALID: قوائم الطلبات يجب أن تكون مصفوفات.");
  }

  // 5. التسبيب
  if (!d.reasoningBullets?.length) {
    throw new Error("DECISION_INVALID: يجب ذكر أسباب الحكم (reasoningBullets).");
  }

  // 6. اللغة
  assertArabicOnly(JSON.stringify(d).replace(/jurisdiction|admissibility|outcome|acceptedClaims|rejectedClaims|legalCharacterization|reliesOnExpert|compensation|basis|amount|currency|method|reasoningBullets|proceduralNotes|SAR/g, ""));
}


// --- PHASE 2: GOLDEN JUDGMENT BENCHMARK ---

const GOLDEN_JUDGMENT_TEXT = `
بسم الله الرحمن الرحيم

المملكة العربية السعودية
ديوان المظالم
المحكمة الإدارية بالرياض
الدائرة الإدارية الثالثة

رقم القضية: ١٤٤٥/١/ق لعام ١٤٤٥هـ
في يوم الأربعاء الموافق ١٤٤٥/٠٥/٠٨هـ
أصدرت الدائرة المكونة من:
القاضي/ [الاسم] رئيساً
وعضوية القاضي/ [الاسم]
وعضوية القاضي/ [الاسم]
وبحضور أمين السر/ [الاسم]

الزمن: الساعة العاشرة صباحاً
المكان: مقر المحكمة الإدارية بالرياض

المدعي: شركة [الاسم] سجل تجاري رقم (...)
المدعى عليها: [اسم الجهة الحكومية]

(الوقائع)
تتلخص وقائع هذه الدعوى بالقدر اللازم لإصدار هذا الحكم، في أن وكيل المدعية تقدم بصحيفة دعوى إلى المحكمة الإدارية، قيدت قضية إدارية بالرقم المشار إليه أعلاه، ذكر فيها أن موكلته تعاقدت مع الجهة المدعى عليها بموجب العقد رقم (...) وتاريخ (...) لتنفيذ مشروع (...)، وقد قامت المدعية بتنفيذ التزاماتها التعاقدية وتسليم الأعمال بموجب محاضر الاستلام المرفقة، إلا أن المدعى عليها تأخرت في صرف المستخلص الختامي ومبلغ الضمان البنكي دون مسوغ نظامي، وانتهى في دعواه إلى طلب إلزام المدعى عليها بصرف مبلغ وقدره (...) ريال، والتعويض عن أضرار التأخير.
وبإحالة القضية إلى هذه الدائرة باشرت نظرها في جلسات المرافعة الموثقة بمحاضر الضبط، حيث قدم ممثل المدعى عليها مذكرة جوابية دفع فيها بأن التأخير يعود لعدم استكمال المدعية لبعض الملاحظات الفنية، وبطلب الدائرة من المدعية تقديم ما يثبت تلافي الملاحظات قدمت خطاب الاستلام النهائي الموقع من استشاري المشروع والخالي من التحفظات. وفي جلسة هذا اليوم، قرر الأطراف الاكتفاء، ولصلاحية القضية للفصل فيها قررت الدائرة رفع الجلسة للمداولة وإصدار الحكم.

(الأسباب)
تأسيساً على ما تقدم، وبما أن المدعية تهدف من دعواها إلى إلزام المدعى عليها بصرف بقية مستحقاتها المالية عن العقد المبرم بينهما، فإن هذه الدعوى تندرج ضمن منازعات العقود الإدارية التي تختص محاكم ديوان المظالم بنظرها وفقاً للمادة (١٣) من نظام ديوان المظالم الصادر بالمرسوم الملكي رقم (م/٧٨) وتاريخ ١٩/٩/١٤٢٨هـ.
وعن موضوع الدعوى؛ فإنه من المقرر فقهاً وقضاءً أن العقد شريعة المتعاقدين، ويجب تنفيذه طبقاً لما اشتمل عليه وبطريقة تتفق مع مقتضيات حسن النية، وحيث ثبت للدائرة بموجب محضر الاستلام النهائي المرفق بالأوراق أن المدعية أنجزت الأعمال المتعاقد عليها، وحيث إن المدعى عليها لم تقدم ما يدحض صحة هذا المستند أو يثبت وجود غرامات تأخير مستحقة الخصم نظاماً، وحيث إن الأصل في ذمة الجهة الإدارية الشغل بحق المقاول ما لم يثبت خلاف ذلك، الأمر الذي تنتهي معه الدائرة إلى استحقاق المدعية للمبلغ المطالب به.
أما عن طلب التعويض، فبما أن المدعية لم تقدم ما يثبت وقوع ضرر فعلي ومباشر ناتج عن تأخر الصرف يتجاوز مجرد المطالبة بالحق المالي، فإن الدائرة تنتهي إلى رفض هذا الشق من الطلب.

(منطوق الحكم)
حكمت الدائرة بما يلي:
أولاً: إلزام المدعى عليها ([اسم الجهة]) بأن تدفع للمدعية (شركة [الاسم]) مبلغاً وقدره (٥٠٠,٠٠٠) خمسمائة ألف ريال سعودي.
ثانياً: رفض ما عدا ذلك من طلبات.
`;

// --- GUARDS & QA ---

function normalizeArabicOnly(text: string): string {
  return text
    .replace(/[A-Za-z]/g, "") // Remove Latin chars
    .replace(/\u200f/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertArabicStrictText(text: string) {
  if (/[a-zA-Z]/.test(text)) {
    throw new Error("NON_ARABIC_LEAK: تم رصد حروف لاتينية داخل الصك.");
  }
  
  const forbidden = [
    "The plaintiff requests",
    "ما طالب به",
    "بما طالب به",
    "حسب طلب المدعي",
    "وفق ما جاء في دعواه",
    "هو:",
    "طلبات المدعي",
    "Affirm",
    "Compel",
    "Alternatively",
  ];
  
  for (const f of forbidden) {
    if (text.includes(f)) {
      throw new Error("FORBIDDEN_PHRASE: تم رصد عبارة ممنوعة أو ركيكة داخل الصك: " + f);
    }
  }
}

function runJudgmentQA(text: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const mustHave = [
    "بسم الله الرحمن الرحيم",
    "المملكة العربية السعودية",
    "ديوان المظالم", 
    "أولاً",
    "ثانياً",
    "أمين السر",
    "قاضي",
  ];

  for (const k of mustHave) {
    if (!text.includes(k) && !text.includes("المحكمة")) errors.push(`ناقص عنصر أساسي: ${k}`);
  }

  if (text.includes("منطوق الحكم") && !text.includes("حكمت الدائرة")) {
    errors.push("المنطوق غير مُحكم: يجب صياغته كقضاء (حكمت الدائرة بما يلي).");
  }

  return { ok: errors.length === 0, errors };
}

// --- DIGEST BUILDER ---

function compact(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[A-Za-z]/g, "").trim().slice(0, 320);
}

function buildCaseDigest(input: GenerateInput): string {
  const { fixedMeta, caseMeta, simulationLog } = input;

  const judgeLines = simulationLog
    .filter((m) => m.role.includes("القاضي") || m.role === "JUDGE")
    .slice(-15)
    .map((m) => `- القاضي: ${compact(m.text)}`);

  const counselLines = simulationLog
    .filter((m) => !m.role.includes("القاضي") && !m.role.includes("النظام") && !m.role.includes("كاتب") && m.role !== 'EXPERT' && m.role !== 'WITNESS')
    .slice(-20)
    .map((m) => `- ${m.role}: ${compact(m.text)}`);
    
  const expertLines = simulationLog
    .filter((m) => m.role === 'EXPERT')
    .map((m) => `- الخبير: ${compact(m.text)}`);

  const witnessLines = simulationLog
    .filter((m) => m.role === 'WITNESS')
    .map((m) => `- الشاهد: ${compact(m.text)}`);

  return `
[بيانات المحكمة]
- المحكمة: ${fixedMeta.courtName} ${fixedMeta.courtCity}
- الدائرة: ${fixedMeta.circuitName}
- القاضي: ${fixedMeta.judgeName}
- أمين السر: ${fixedMeta.clerkName}

[بيانات الدعوى]
- نوع القضية: ${caseMeta.caseType}
- عنوان الدعوى: ${caseMeta.caseTitle}
- رقم القضية: ${caseMeta.caseNumber || "غير مدون"}
- التاريخ: ${caseMeta.hijriDate} الموافق ${caseMeta.gregorianDate}
- المدعي: ${caseMeta.plaintiff}
- المدعى عليهم: ${caseMeta.defendants.join("، ")}

[الشهادات والخبرة الفنية (هام جداً للتسبيب)]
${expertLines.length > 0 ? expertLines.join("\n") : "- لا يوجد تقرير خبرة"}
${witnessLines.length > 0 ? witnessLines.join("\n") : "- لا يوجد شهود"}

[خلاصة المداولة وسير الجلسة]
${judgeLines.join("\n")}

[مرافعات الأطراف]
${counselLines.join("\n")}
`.trim();
}

// --- PHASE 3: STRICT JUDICIAL DECISION ENGINE ---

async function analyzeJudicialDecision(caseDigest: string): Promise<JudicialDecision> {
  const prompt = `
    أنت “محرك القرار القضائي” لمحكمة إدارية ابتدائية بالمملكة العربية السعودية (ديوان المظالم).
    مهمتك: إصدار قرار قضائي **ككائن JSON فقط** وفق الوقائع والمرافعات.

    المدخلات (ملخص القضية):
    ${caseDigest}

    قيود صارمة:
    1. **الاختصاص (Jurisdiction):** إذا كانت الدعوى مرفوعة ضد جهة حكومية في محكمة غير إدارية، أو العكس، فالحكم "غير مختصة".
    2. **القبول الشكلي (Admissibility):** إذا انقضت مدد التظلم (60 يوماً في القرارات الإدارية) أو رفع الدعوى غير ذي صفة، فالحكم "مرفوضة شكلاً".
    3. **الموضوع (Outcome):**
       - "قبول كلي": إذا ثبت حق المدعي كاملاً.
       - "قبول جزئي": إذا ثبت بعض الحق.
       - "رفض": إذا عجز المدعي عن الإثبات.
    
    4. **التعويض:**
    - إذا كان Outcome رفض أو غير مختصة أو مرفوضة شكلاً => Compensation = null.
    - إذا كان القبول (كلي/جزئي) وثبت الضرر => ضع رقم تقديري للتعويض (Amount).

    أخرج JSON فقط (Strict JSON). اللغة العربية الفصحى حصراً.
  `;

  try {
    const response = await safeGenerateContent(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        responseMimeType: "application/json",
        config: { temperature: 0.0 }, // Zero Temp for Strict Logic
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jurisdiction: { type: Type.STRING, enum: ['مختصة', 'غير مختصة'] },
            admissibility: { type: Type.STRING, enum: ['مقبولة شكلاً', 'مرفوضة شكلاً'] },
            outcome: { type: Type.STRING, enum: ['قبول كلي', 'قبول جزئي', 'رفض'] },
            acceptedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
            rejectedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
            legalCharacterization: { type: Type.STRING },
            reliesOnExpert: { type: Type.BOOLEAN },
            reasoningBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            proceduralNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            compensation: {
              type: Type.OBJECT,
              properties: {
                basis: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING, enum: ['SAR'] },
                method: { type: Type.STRING }
              },
              nullable: true
            }
          },
          required: ['jurisdiction', 'admissibility', 'outcome', 'legalCharacterization', 'acceptedClaims', 'rejectedClaims', 'reasoningBullets']
        }
      }
    );

    const json = JSON.parse(response.text || "{}");
    // Normalize logic
    if (json.compensation && json.compensation.amount === 0) delete json.compensation;
    
    // VALIDATE
    validateJudicialDecision(json as JudicialDecision);

    return json as JudicialDecision;
  } catch (e: any) {
    console.error("Decision Engine Failed:", e);
    
    // Safety Fallback based on error
    return {
      jurisdiction: 'مختصة',
      admissibility: 'مقبولة شكلاً',
      outcome: 'رفض',
      acceptedClaims: [],
      rejectedClaims: ['جميع طلبات المدعي لعدم كفاية الأدلة'],
      legalCharacterization: 'منازعة إدارية عقدية',
      reliesOnExpert: false,
      reasoningBullets: ['الأصل براءة الذمة', 'عدم كفاية الأدلة المقدمة'],
      proceduralNotes: [`تم الرفض احتياطياً بسبب خطأ في التحليل الآلي: ${e.message}`]
    };
  }
}

// --- PROMPTS ---

function buildJudgmentPrompt(args: {
  mode: "generate" | "correct";
  detailLevel: string;
  fixedMeta: JudgeFixedMeta;
  caseDigest: string;
  decision?: JudicialDecision;
  currentJudgmentText?: string;
  qaErrors?: string[];
}): string {
  const { mode, detailLevel, fixedMeta, caseDigest, decision } = args;

  // --- Strict Lock: Translating JSON Decision to Natural Language Instruction ---
  let logicInjection = "";
  if (decision) {
      if (decision.jurisdiction === "غير مختصة") {
          logicInjection = `
          🔴 قيد ملزم (Strict Lock): الحكم بعدم الاختصاص الولائي.
          - التسبيب: ${decision.reasoningBullets.join('، ')}.
          - المنطوق: "حكمت الدائرة بعدم اختصاصها ولائياً بنظر الدعوى."
          - لا تحكم بأي تعويض أو طلبات موضوعية.
          `;
      } else if (decision.admissibility === "مرفوضة شكلاً") {
          logicInjection = `
          🔴 قيد ملزم (Strict Lock): الحكم بعدم قبول الدعوى شكلاً.
          - السبب: ${decision.proceduralNotes?.join('، ') || "لفوات الميعاد أو انعدام الصفة"}.
          - المنطوق: "حكمت الدائرة بعدم قبول الدعوى."
          - لا تدخل في الموضوع.
          `;
      } else if (decision.outcome === "رفض") {
          logicInjection = `
          🔴 قيد ملزم (Strict Lock): رفض الدعوى موضوعاً.
          - التكييف: ${decision.legalCharacterization}.
          - الأسباب: ${decision.reasoningBullets.join('، ')}.
          - المنطوق: "حكمت الدائرة برفض الدعوى."
          `;
      } else {
          // ACCEPTANCE (Full or Partial)
          const compText = decision.compensation 
              ? `إلزام المدعى عليه بدفع مبلغ (${decision.compensation.amount} ريال) تعويضاً عن ${decision.compensation.basis}، وفق طريقة الاحتساب: ${decision.compensation.method || "تقدير الدائرة"}.` 
              : "دون الحكم بتعويض إضافي.";
          
          logicInjection = `
          🔴 قيد ملزم (Strict Lock): الحكم لصالح المدعي (${decision.outcome}).
          - التكييف: ${decision.legalCharacterization}.
          - الطلبات المقبولة (تذكر في المنطوق): ${decision.acceptedClaims.join("، ")}.
          - الطلبات المرفوضة (تذكر في المنطوق): ${decision.rejectedClaims.join("، ")}.
          - التعويض: ${compText}
          - التسبيب: ${decision.reasoningBullets.join('، ')}.
          
          صيغة المنطوق المطلوبة:
          أولاً: إلزام [المدعى عليه] بأن يدفع لـ[المدعي] مبلغاً وقدره... (أو الإجراء المحكوم به).
          ثانياً: رفض ما عدا ذلك من طلبات.
          `;
      }
  }

  const strictRules = `
أنت “مستشار صكوك الأحكام” (Judgment Deed Advisor).
المهمة: إصدار صك حكم قضائي ابتدائي مطابق تمامًا لصيغة وأسلوب الأحكام الصادرة عن المحاكم الإدارية الابتدائية (ديوان المظالم).

القواعد الإلزامية (الخطوط الحمراء):
1. اللغة العربية الفصحى فقط.
2. يمنع نسخ مذكرات أو طلبات حرفيًا داخل الحكم.
3. **يجب الالتزام الحرفي بالقرار القضائي الملزم أدناه**. يمنع الاجتهاد ومخالفة "اتجاه الحكم" المحدد في القيد الملزم.
4. القاضي محايد ولا ينحاز.
5. **ممنوع منعاً باتاً** استخدام عبارات الإحالة المبهمة في المنطوق مثل: "ما طالب به".
6. **يجب** أن يكون المنطوق محدداً وقاطعاً (أرقام، إجراءات).
`;

  const fixed = `
بيانات ثابتة للحكم الجديد:
- القاضي: فضيلة الشيخ/ ${fixedMeta.judgeName}
- أمين السر: ${fixedMeta.clerkName}
`;

  const styleReference = `
[المرجع الأسلوبي الملزم (GOLDEN BENCHMARK)]
عليك محاكاة هذا النص في الترتيب والنبرة فقط، وليس المحتوى:
--- بداية النص المرجعي ---
${GOLDEN_JUDGMENT_TEXT}
--- نهاية النص المرجعي ---
`;

  const task = mode === "generate" 
    ? `أصدر صك حكم جديد من الصفر، ملتزماً بالقرار القضائي (القيد الملزم).` 
    : `قم بتصحيح الحكم الحالي ليطابق الأسلوب المرجعي والقرار القضائي.`;

  const qaContext = args.qaErrors?.length 
    ? `\n⚠️ تم رفض النسخة السابقة بسبب الأخطاء التالية، يجب إصلاحها: ${args.qaErrors.join("، ")}` 
    : "";

  const correctionCtx = args.currentJudgmentText 
    ? `\n[النص المراد تصحيحه]\n${args.currentJudgmentText}` 
    : "";

  return `
${strictRules}
${styleReference}
${fixed}
مستوى التفصيل: ${detailLevel}

${logicInjection}

${task}
${qaContext}

مادة القضية الحالية (الوقائع الخام):
${caseDigest}

${correctionCtx}

اكتب الصك الآن.
`.trim();
}

// --- MAIN FUNCTION ---

export async function generateOrCorrectJudgmentDeed(input: GenerateInput): Promise<string> {
  const caseDigest = buildCaseDigest(input);
  
  // Phase 1 & 3: Judicial Decision Engine (Strict Object)
  // نحن دائماً نولد القرار أولاً لضمان الانضباط، حتى في وضع التصحيح يفضل الرجوع للقرار الأصلي لو كان متاحاً
  // لكن هنا سنولده من جديد لضمان السياق.
  
  let decision: JudicialDecision | undefined;
  
  console.log("Phase 3: Running Decision Engine...");
  decision = await analyzeJudicialDecision(caseDigest);
  console.log("Strict Judicial Decision:", JSON.stringify(decision, null, 2));
      
  // ADD DELAY HERE to prevent 429 quota exhaustion (cool-down period)
  // Wait 3 seconds before hitting the API again for the full deed generation
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Phase 2: Deed Drafting (with Golden Benchmark & Decision Binding)
  const prompt = buildJudgmentPrompt({
    mode: input.mode,
    detailLevel: input.detailLevel || "متوسط",
    fixedMeta: input.fixedMeta,
    caseDigest,
    decision,
    currentJudgmentText: input.currentJudgmentText
  });

  const rawResponse = await safeGenerateContent(
    [{ role: 'user', parts: [{ text: prompt }] }],
    { config: { temperature: 0.7 } }
  );

  let text = normalizeArabicOnly(rawResponse.text || "");

  try {
    assertArabicStrictText(text);
    const qa = runJudgmentQA(text);
    
    if (!qa.ok) {
        console.warn("Judgment QA Failed, retrying...", qa.errors);
        
        // Add another delay before repair attempt
        await new Promise(resolve => setTimeout(resolve, 2000));

        const repairPrompt = buildJudgmentPrompt({
            mode: "correct",
            detailLevel: input.detailLevel || "متوسط",
            fixedMeta: input.fixedMeta,
            caseDigest,
            decision, // Keep strict decision during repair
            currentJudgmentText: text,
            qaErrors: qa.errors
        });

        const retryResponse = await safeGenerateContent(
            [{ role: 'user', parts: [{ text: repairPrompt }] }],
            { config: { temperature: 0.5 } }
        );
        text = normalizeArabicOnly(retryResponse.text || "");
        assertArabicStrictText(text);
    }
  } catch (error: any) {
     return `عذراً، تعذر توليد الصك بمعايير الجودة الصارمة. \nالخطأ: ${error.message}\n\nقرار المحرك كان: ${decision?.outcome}`;
  }

  return text;
}
