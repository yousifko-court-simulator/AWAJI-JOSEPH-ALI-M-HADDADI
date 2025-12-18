
import { JudgmentData, SimulationState } from "../types/simulation";
import { toArabicNumbers } from "./arabicNumbers";

// --- Types ---
type JudgmentInput = {
  caseData: {
    plaintiff: string;
    defendants: string[];
    caseType: string;
    region: string;
    caseNumber?: string;
    hijriDate: string;
    gregorianDate: string;
    requests: string;
    // New Optional Fields
    judgeName?: string;
    clerkName?: string;
    courtHeaderCustom?: string;
    courtOriginalName?: string;
  };
  analysis: {
    subject: string;
    keyFacts: string[];
    legalBasis: string[];
    damageEstablished: boolean;
    compensationBasis: string;
    // New Dynamic Fields
    expertTestimony?: string;
    witnessTestimony?: string;
  };
};

type JudgmentOutput = {
  header: string;
  facts: string;
  qualification: string;
  reasoning: string;
  ruling: string;
  appeal: string;
  signatures: string;
};

// --- GUARDS & SANITIZERS (طبقة الحماية) ---

function hasLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Removes Memo-like structures and headers to prevent "Memo Dumping" in judgment.
 */
function stripMemoHeaders(text: string): string {
    return text
        .replace(/بسم الله الرحمن الرحيم[\s\S]*?(?:وبعد|الموضوع|المقدمة|السلام عليكم)/gi, "")
        .replace(/أصحاب الفضيلة[\s\S]*?(?:\n|$)/gi, "")
        .replace(/مذكرة قانونية[\s\S]*?(?:\n|$)/gi, "")
        .replace(/لائحة دعوى[\s\S]*?(?:\n|$)/gi, "")
        .replace(/الموضوع:[\s\S]*?(?:\n|$)/gi, "")
        .replace(/السلام عليكم ورحمة الله[\s\S]*?(?:\n|$)/gi, "")
        .replace(/^أ – المقدمة:[\s\S]*?(?=\n)/gm, "") // Specific to common memo formats
        .replace(/^ب – توصيف العقار:[\s\S]*?(?=\n)/gm, "")
        .replace(/^أولاً: الوقائع[\s\S]*?(?=\n)/gm, "")
        .trim();
}

/**
 * ينقي النص من العبارات الإنجليزية الشائعة والزوائد.
 */
function sanitizeText(text: string, fallback: string): string {
  if (!text) return fallback;

  let clean = stripMemoHeaders(text);

  clean = clean
    .replace(/The plaintiff requests[\s\S]*?(?:\n\n|$)/gi, "")
    .replace(/Affirm the illegality[\s\S]*?(?:\n\n|$)/gi, "")
    .replace(/Claimant/gi, "المدعي")
    .replace(/Defendant/gi, "المدعى عليه")
    .trim();

  // If text is still polluted with English
  if (hasLatin(clean)) {
    const stripped = clean.replace(/[A-Za-z]/g, "").trim();
    if (stripped.length < 5) return fallback;
    return stripped;
  }

  return clean;
}

// --- BUILDERS ---

function summarizeFacts(keyFacts: string[], rawSummary: string): string {
  // 1. First cleanup
  let summary = stripMemoHeaders(rawSummary);

  // 2. Logic: If the raw summary is massive (likely a copy-pasted memo > 600 chars),
  // we rely on the AI-extracted `keyFacts` instead to construct a judicial summary.
  // This avoids the "Memo inside Judgment" bug where the user pastes the whole document into the 'facts' field.
  if (summary.length > 600) {
      if (keyFacts && keyFacts.length > 0) {
          // Construct summary from key points
          summary = "تقدم المدعي بدعواه طالباً " + keyFacts.slice(0, 3).join("، و") + ".";
      } else {
          // Fallback: Take first paragraph only or truncate safely
          const firstPara = summary.split('\n')[0];
          if (firstPara.length > 50) {
              summary = firstPara;
          } else {
              summary = summary.substring(0, 300) + "... (تم الاختصار)";
          }
      }
  }

  const safeSummary = sanitizeText(summary, "تتلخص وقائع الدعوى في تقدم المدعي بطلبه للمحكمة.");
  
  // Combine with key facts if summary is short enough
  const safePoints = keyFacts.filter(p => !hasLatin(p) && p.length < 100).join('، و');

  return `
تتلخص وقائع هذه الدعوى في أن المدعي تقدم بصحيفة دعوى، حاصلها:
${safeSummary}
${(safePoints && !safeSummary.includes(safePoints)) ? `وحيث ذكر المدعي في دعواه: ${safePoints}.` : ''}
وبقيد الدعوى وإحالتها لهذه الدائرة، باشرت نظرها وفق المواعيد المقررة نظاماً، وحضر الأطراف، وقدموا مذكراتهم ومستنداتهم التي جرى ضمها لملف القضية.
`.trim();
}

function buildQualification(caseType: string): string {
  const safeType = sanitizeText(caseType, "حقوقية");
  // Ensure we don't have a huge text here either
  const shortType = safeType.length > 50 ? "إدارية/حقوقية" : safeType;
  
  return `
وحيث إن النزاع الماثل يتعلق بـ (${shortType})، وحيث استوفت الدعوى أوضاعها الشكلية، فإن المحكمة تختص بنظرها ولائياً ومكانياً، وتمضي في نظر الموضوع.
  `.trim();
}

function buildReasoning(
  legalBasis: string[],
  damageEstablished: boolean,
  caseType: string,
  expertTestimony?: string,
  witnessTestimony?: string
): string {
  const safeBasis = legalBasis
    .map(b => sanitizeText(b, ""))
    .filter(b => b.length > 0 && b.length < 150) // Filter out long junk
    .join('، و');

  // --- Dynamic Evidence Injection ---
  let evidenceText = "";

  // 1. Witness
  if (witnessTestimony && witnessTestimony.length > 10) {
      const safeWitness = sanitizeText(witnessTestimony, "");
      evidenceText += `
وحيث استمعت الدائرة لشهادة الشاهد، والذي قرر في شهادته: (${safeWitness})، ولما كانت الشهادة قد جاءت متطابقة مع وقائع الدعوى، فإن الدائرة تطمئن إليها وتأخذ بها كقرينة قوية في الإثبات.
`;
  }

  // 2. Expert
  if (expertTestimony && expertTestimony.length > 10) {
      const safeExpert = sanitizeText(expertTestimony, "");
      evidenceText += `
وحيث ندبت الدائرة خبيراً فنياً في الدعوى، والذي انتهى في تقريره إلى النتيجة التالية: (${safeExpert})، ولما كان التقرير قد بني على أسس فنية سليمة، فإن الدائرة تأخذ بما ورد فيه محمولاً على أسبابه.
`;
  }

  return `
وحيث اطلعت الدائرة على أوراق القضية ومستنداتها،
${safeBasis ? `وبالنظر إلى ما استند إليه المدعي من: ${safeBasis}،` : ''}
${evidenceText}
${damageEstablished 
    ? "وحيث ثبت للدائرة توافر أركان المسؤولية من خطأ وضرر وعلاقة سببية، وثبت استحقاق المدعي للتعويض الماجبر للضرر،" 
    : "وحيث لم يثبت للدائرة قيام المسؤولية الموجبة للضمان، وحيث إن الأصل براءة الذمة،"}
وحيث إن الأحكام تبنى على الجزم واليقين لا على الشك والتخمين،
فإن الدائرة تنتهي إلى قضائها الوارد في المنطوق أدناه.
`.trim();
}

function buildRuling(compensationBasis: string, winning: boolean): string {
  // Use strictly specific rulings, NO "as requested" phrases.
  if (winning) {
      return `
أولًا: إلزام المدعى عليهم بتعويض المدعي تعويضاً عادلاً،
ويُقدَّر بمبلغ إجمالي وقدره (يتم التقدير أو تحديده بواسطة قسم الخبراء) ريال سعودي، وذلك جبراً للضرر المادي والمعنوي.

ثانيًا: إلزام المدعى عليهم بالمصاريف القضائية.

ثالثًا: رفض ما عدا ذلك من طلبات.
`.trim();
  } else {
      return `
أولًا: رفض الدعوى لعدم ثبوت الموجب الشرعي والنظامي.

ثانيًا: لا تحكم الدائرة بشيء في المصاريف.
`.trim();
  }
}

export function generateJudgment(input: JudgmentInput): JudgmentOutput {
  const safeDefendant = sanitizeText(input.caseData.defendants.join("، "), "المدعى عليه");
  const safePlaintiff = sanitizeText(input.caseData.plaintiff, "المدعي");
  
  // Clean up Case Type
  let safeCaseType = sanitizeText(input.caseData.caseType, "عامة");
  if (safeCaseType.length > 30) safeCaseType = "دعوى عامة";

  // --- Header Construction ---
  let headerText = "";
  if (input.caseData.courtHeaderCustom) {
      // Use User's Custom Header
      headerText = input.caseData.courtHeaderCustom;
  } else {
      // Default Logic
      const courtName = input.caseData.courtOriginalName || safeCaseType.includes('إدارية') ? 'المحكمة الإدارية' : 'المحكمة المختصة';
      headerText = `المملكة العربية السعودية\nوزارة العدل\n${courtName}`;
  }

  // Use Custom Names or Defaults
  const judge = input.caseData.judgeName || "معاذ علي العريشي";
  const clerk = input.caseData.clerkName || "حاوي عبد الله كيلاني";

  const header = `
${headerText}

الدائرة: (الأولى)
برئاسة: فضيلة الشيخ/ ${judge}
وبحضور أمين السر/ الشيخ ${clerk}
جلسة علنية

نوع القضية: ${safeCaseType}
رقم القضية: ${toArabicNumbers(input.caseData.caseNumber || "تحت القيد")}
التاريخ: ${toArabicNumbers(input.caseData.hijriDate)}
الموافق: ${toArabicNumbers(input.caseData.gregorianDate)}

المدعي: ${safePlaintiff}
المدعى عليهم: ${safeDefendant}
`.trim();

  const facts = summarizeFacts(input.analysis.keyFacts, input.analysis.subject);
  const qualification = buildQualification(input.caseData.caseType);
  const reasoning = buildReasoning(
    input.analysis.legalBasis,
    input.analysis.damageEstablished,
    input.caseData.caseType,
    input.analysis.expertTestimony,
    input.analysis.witnessTestimony
  );
  
  const ruling = buildRuling(
      input.analysis.compensationBasis, 
      input.analysis.damageEstablished
  );

  const appeal = `
للمحكوم عليه حق الاعتراض على هذا الحكم بطريق الاستئناف
خلال ثلاثين يومًا من تاريخ استلام نسخة الحكم.
`.trim();

  const signatures = `
أمين السر
الشيخ ${clerk}
التوقيع

قاضي الدائرة
الشيخ ${judge}
التوقيع والختم
`.trim();

  return {
    header,
    facts,
    qualification,
    reasoning,
    ruling,
    appeal,
    signatures
  };
}

// --- Bridge Function for Application State ---
export function buildJudgmentFromState(state: SimulationState): JudgmentData {
    const cd = state.caseData;
    const analysis = state.analysis;
    
    // Determine winner based on AI analysis probability
    const isWinning = (analysis.winProbability || 50) > 40;
    
    const defaultDate = new Date().toLocaleDateString('en-CA');

    // --- Dynamic Extraction of Testimonies from Chat History ---
    const witnessMessages = state.session.messages
        .filter(m => m.role === 'WITNESS')
        .map(m => m.content)
        .join(' ... ');

    const expertMessages = state.session.messages
        .filter(m => m.role === 'EXPERT')
        .map(m => m.content)
        .join(' ... ');

    const input: JudgmentInput = {
        caseData: {
            plaintiff: cd.plaintiff.name || "المدعي",
            defendants: [cd.defendant.name || "المدعى عليه"],
            caseType: cd.caseType || "حقوقية",
            region: "الرياض",
            caseNumber: cd.caseNumber,
            hijriDate: cd.hijriDate || "١٤٤٦/٠١/٠١",
            gregorianDate: cd.gregorianDate || defaultDate,
            requests: cd.requests || "",
            // Map new optional fields
            judgeName: cd.judgeName,
            clerkName: cd.clerkName,
            courtHeaderCustom: cd.courtHeaderCustom,
            courtOriginalName: cd.court
        },
        analysis: {
            // Priority: Summary -> Facts -> Default
            // We pass the raw text here, the sanitizer will clean it.
            subject: cd.summary || cd.facts || "مطالبة حقوقية",
            keyFacts: analysis.keyPoints || [],
            legalBasis: cd.grounds ? [cd.grounds] : [],
            damageEstablished: isWinning,
            compensationBasis: "تقدير الخبراء",
            expertTestimony: expertMessages,
            witnessTestimony: witnessMessages
        }
    };

    const output = generateJudgment(input);

    return {
        title: "صك الحكم",
        courtHeader: output.header.split('\n').slice(0, 3).join(' - '),
        panelInfo: `الدائرة الأولى - برئاسة الشيخ ${cd.judgeName || "معاذ العريشي"}`,
        caseMeta: [
            `رقم القضية: ${toArabicNumbers(input.caseData.caseNumber || '---')}`,
            `التاريخ: ${toArabicNumbers(input.caseData.gregorianDate)}`
        ],
        reasons: [
            output.facts,
            output.qualification,
            output.reasoning
        ],
        ruling: [output.ruling],
        signBlock: output.signatures.split('\n')
    };
}
