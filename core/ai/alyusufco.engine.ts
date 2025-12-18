
import { ALYUSUFCO_SYSTEM_PROMPT } from "../personas/alyusufco/alyusufco.system.prompt";
import { buildAlyusufcoPrompt } from "../personas/alyusufco/alyusufco.prompt.template";
import { safeGenerateContent } from "../../services/geminiService";

export async function runAlyusufcoAI({
  mode,
  userRole,
  caseSummary,
  userMemo,
  opponentMemo,
  hearingTranscript
}: {
  mode: "ATTACK" | "DEFENSE" | "MANEUVER";
  userRole: string;
  caseSummary: string;
  userMemo?: string;
  opponentMemo?: string;
  hearingTranscript?: string;
}) {
  const userPrompt = buildAlyusufcoPrompt({
    mode,
    userRole,
    caseSummary,
    userMemo,
    opponentMemo,
    hearingTranscript
  });

  try {
    const response = await safeGenerateContent(
      [{ role: 'user', parts: [{ text: userPrompt }] }],
      {
        systemInstruction: ALYUSUFCO_SYSTEM_PROMPT,
        temperature: 0.7 
      }
    );

    return {
        speaker: "المستشار القانوني البروفيسور اليوسفكو",
        content: response.text || "...",
        signature: "حرر بمعاونة المستشار القانوني البروفيسور اليوسفكو"
    };
  } catch (error) {
    console.error("Alyusufco Engine Error", error);
    return {
        speaker: "المستشار القانوني البروفيسور اليوسفكو",
        content: "عذراً، حدث خطأ في معالجة الاستشارة.",
        signature: ""
    };
  }
}
