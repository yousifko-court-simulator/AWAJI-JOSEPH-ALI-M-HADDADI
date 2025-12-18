
import { useMemo, useReducer, useEffect, useState } from "react";
import { StepBar } from "./ui/StepBar";
import { RoleSelectPage } from "./pages/RoleSelectPage";
import { CaseDataPage } from "./pages/CaseDataPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CourtSessionPage } from "./pages/CourtSessionPage";
import { JudgmentPrintPage } from "./pages/JudgmentPrintPage";
import { buildJudgmentFromState } from "./utils/judgmentBuilder";
import { initialState, simulationReducer } from "./state/machine";
import { Step, EvidenceFile, SimulationState, Role, PartyType, JudgmentData } from "./types/simulation";
import { extractCaseProfile, analyzeSimulationCase, simulateSessionTurn, generateSuggestedReplies } from "../../services/geminiService";
import { generateOrCorrectJudgmentDeed } from "../../services/judgmentService";
import { fileToBlobUrl, makeId } from "./utils/fileHelpers";
import { SavedCaseSession, FileData } from "../../types";

export function SimulationModule(props: { initialSession?: SavedCaseSession | null }) {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [customJudgment, setCustomJudgment] = useState<JudgmentData | null>(null);
  const [isGeneratingDeed, setIsGeneratingDeed] = useState(false);

  useEffect(() => {
    if (props.initialSession) {
      dispatch({ type: "RESTORE_SESSION", session: props.initialSession });
    } else {
        const autoSaved = localStorage.getItem('autosave_session');
        if (autoSaved) {
            try {
                const session = JSON.parse(autoSaved);
                dispatch({ type: "RESTORE_SESSION", session });
                setLastSaved(new Date());
            } catch(e) { console.error("Auto-save load failed", e); }
        }
    }
  }, [props.initialSession]);

  useEffect(() => {
      if (state.step !== 'SESSION' || !state.session.started) return;

      const timer = setInterval(() => {
          const config = {
              courtName: state.caseData.court,
              caseType: state.caseData.caseType,
              userRole: state.role,
              parties: { 
                  plaintiff: state.caseData.plaintiff, 
                  defendant: state.caseData.defendant 
              },
              facts: state.caseData.facts,
              requests: state.caseData.requests,
              grounds: state.caseData.grounds,
              damageDate: state.caseData.gregorianDate,
              teamConfig: state.teamConfig
          };

          const sessionToSave = {
              id: 'autosave',
              title: `حفظ تلقائي - ${state.caseData.court}`,
              config: config,
              messages: state.session.messages.map(m => ({
                  id: m.id,
                  role: m.role === state.role ? 'user' : (m.role === 'SYSTEM' ? 'system' : 'model'),
                  speakerRole: m.speaker === 'النظام' ? 'SYSTEM' : (m.role as any), 
                  content: m.content,
                  timestamp: new Date(m.ts).toISOString(),
                  stage: state.session.phase,
                  file: m.file
              })),
              currentPhase: state.session.phase,
              lastUpdated: new Date().toISOString()
          };

          localStorage.setItem('autosave_session', JSON.stringify(sessionToSave));
          setLastSaved(new Date());
      }, 120000); 

      return () => clearInterval(timer);
  }, [state]);


  const canGo = (step: Step) => {
    if (step === "ROLE") return true;
    if (step === "CASE_DATA") return state.teamConfig !== null;
    if (step === "ANALYSIS") return state.teamConfig !== null && (state.caseData.caseTitle.trim().length > 0 || state.evidence.length > 0);
    if (step === "SESSION") return state.teamConfig !== null && (state.analysis.status === "done" || state.caseData.summary.trim().length > 0);
    if (step === "JUDGMENT") return state.session.messages.length > 0 || state.analysis.status === "done";
    return false;
  };

  const onGo = (s: Step) => dispatch({ type: "SET_STEP", step: s });

  const judgmentData = useMemo(() => {
    if (!state.judgment.built) return null;
    if (customJudgment) return customJudgment;
    return buildJudgmentFromState(state);
  }, [state, customJudgment]);

  const handleAnalyzeFile = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const profile = await extractCaseProfile({
            name: file.name,
            data: base64,
            mimeType: file.type
          });

          const mapJurisdictionToArabic = (j: string | undefined): string => {
             const m: Record<string, string> = {
                 'COMMERCIAL': 'تجارية',
                 'ADMINISTRATIVE': 'إدارية',
                 'LABOR': 'عمالية',
                 'CRIMINAL': 'جزائية',
                 'PERSONAL': 'أحوال شخصية',
                 'GENERAL': 'حقوقية/عامة'
             };
             return m[j || ''] || 'تجارية';
          };
          
          const jurisdictionAr = mapJurisdictionToArabic(profile.jurisdiction);

          const patch: Partial<SimulationState["caseData"]> = {
            court: profile.jurisdiction ? `المحكمة ال${jurisdictionAr}` : '',
            caseType: jurisdictionAr,
            caseTitle: profile.facts ? (
               profile.caseNature === 'COMPENSATION' ? 'دعوى تعويض' : 
               profile.caseNature === 'ANNULMENT' ? 'دعوى إلغاء' : 
               `دعوى ${jurisdictionAr}`
            ) : '',
            summary: profile.facts || '',
            facts: profile.facts || '',
            requests: profile.requests || '',
            grounds: profile.grounds || '',
            plaintiff: { 
                name: profile.parties?.plaintiff?.name || "", 
                type: (profile.parties?.plaintiff?.type as PartyType) || "INDIVIDUAL" 
            },
            defendant: { 
                name: profile.parties?.defendant?.name || "", 
                type: (profile.parties?.defendant?.type as PartyType) || "COMPANY" 
            },
            gregorianDate: profile.damageDate || new Date().toISOString().split('T')[0],
          };

          dispatch({ type: "UPDATE_CASE", patch });

          const evidenceFile: EvidenceFile = {
            id: makeId("ev"),
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            blobUrl: fileToBlobUrl(file),
          };
          dispatch({ type: "ADD_EVIDENCE", files: [evidenceFile] });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleAiTurn = async (targetRole: Role | string) => {
      if (isAiThinking) return;
      setIsAiThinking(true);

      try {
        const responseText = await simulateSessionTurn(
          state.session.messages,
          targetRole as Role,
          state.caseData,
          state.session.phase,
          state.evidence
        );

        // Procedural recording logic for Evidence Review
        if (state.session.phase === 'EVIDENCE_REVIEW' && targetRole === 'JUDGE') {
           const mentionedEvidence = state.evidence.find(e => responseText.includes(e.name));
           if (mentionedEvidence) {
              dispatch({
                  type: "SESSION_ADD_MESSAGE",
                  speakerRole: "SYSTEM",
                  speaker: "النظام",
                  content: `إجراء: القاضي يفحص الدليل (${mentionedEvidence.name}) ويناقش وجه الاستدلال به.`
              });
           }
        }

        let speakerName = "النظام";
        if (targetRole === "JUDGE") speakerName = "الشيخ معاذ العريشي (رئيس الجلسة)";
        else if (targetRole === "CLERK") speakerName = "الشيخ حاوي الكيلاني (أمين السر)";
        else if (targetRole === "PLAINTIFF") speakerName = state.caseData.plaintiff.name || "المدعي";
        else if (targetRole === "DEFENDANT") speakerName = state.caseData.defendant.name || "المدعى عليه";
        else if (targetRole === "ADVISOR") speakerName = "المستشار البروفيسور اليوسفكو";
        else if (targetRole === "EXPERT") speakerName = "الخبير الفني";
        else if (targetRole === "WITNESS") speakerName = "الشاهد";
        else if (targetRole === "PRIVATE_OPPONENT") speakerName = "المستشار أبو عواجي (محامي الخصم)";
        else if (targetRole === "GOVT_ADVISOR") speakerName = "ممثل الجهة الحكومية";

        dispatch({
          type: "SESSION_ADD_MESSAGE",
          speakerRole: targetRole as (Role | "SYSTEM"),
          speaker: speakerName,
          content: responseText
        });

        dispatch({ type: "SESSION_NEXT_TURN" });

      } catch (e) {
        console.error("AI Turn Error", e);
      } finally {
        setIsAiThinking(false);
      }
  };

  const handleGenerateDeed = async (mode: 'generate' | 'correct', detail: 'متوسط' | 'مكثف') => {
      setIsGeneratingDeed(true);
      try {
          const rawText = await generateOrCorrectJudgmentDeed({
              mode: mode,
              detailLevel: detail,
              fixedMeta: {
                  judgeName: state.caseData.judgeName || "معاذ علي العريشي",
                  clerkName: state.caseData.clerkName || "حاوي عبد الله كيلاني",
                  courtName: state.caseData.court.includes("إدارية") ? "المحكمة الإدارية" : "المحكمة المختصة",
                  courtCity: "بجازان", 
                  circuitName: "(الأولى)"
              },
              caseMeta: {
                  caseTitle: state.caseData.caseTitle,
                  caseType: "إدارية", 
                  hijriDate: state.caseData.hijriDate || "١٤٤٧/٠١/٠١",
                  gregorianDate: state.caseData.gregorianDate || "2025-01-01",
                  plaintiff: state.caseData.plaintiff.name,
                  defendants: [state.caseData.defendant.name],
                  caseNumber: state.caseData.caseNumber
              },
              simulationLog: state.session.messages.map(m => ({
                  role: m.speaker,
                  text: m.content,
                  stage: m.role 
              })),
              currentJudgmentText: mode === 'correct' ? customJudgment?.reasons.join('\n') || "" : undefined
          });

          const fullText = rawText;
          const rulingIndex = fullText.indexOf("حكمت الدائرة");
          
          let factsAndReasons = fullText;
          let rulingText = "";
          
          if (rulingIndex > -1) {
              factsAndReasons = fullText.substring(0, rulingIndex);
              rulingText = fullText.substring(rulingIndex);
          }

          setCustomJudgment({
              title: "صك الحكم",
              courtHeader: state.caseData.courtHeaderCustom || "المملكة العربية السعودية - ديوان المظالم",
              panelInfo: `الدائرة الأولى - برئاسة الشيخ ${state.caseData.judgeName || "معاذ العريشي"}`,
              caseMeta: [`رقم القضية: ${state.caseData.caseNumber || '---'}`, `التاريخ: ${state.caseData.gregorianDate}`],
              reasons: [factsAndReasons],
              ruling: [rulingText],
              signBlock: [`أمين السر: ${state.caseData.clerkName || "حاوي كيلاني"}`, `القاضي: ${state.caseData.judgeName || "معاذ العريشي"}`]
          });
          
          dispatch({ type: "BUILD_JUDGMENT" });

      } catch (e) {
          console.error("Deed Gen Error", e);
          alert("حدث خطأ أثناء توليد الصك. يرجى المحاولة مرة أخرى.");
      } finally {
          setIsGeneratingDeed(false);
      }
  };

  return (
    <div style={{ padding: 18, display: "grid", gap: 16, direction: "rtl" }}>
      <StepBar current={state.step} canGo={canGo} onGo={onGo} />

      {state.step === "ROLE" && (
        <RoleSelectPage
          selected={state.role}
          onSelect={(r) => dispatch({ type: "SET_ROLE", role: r })} 
          onConfigComplete={(c) => dispatch({ type: "SET_TEAM_CONFIG", config: c })}
          onNext={() => dispatch({ type: "SET_STEP", step: "CASE_DATA" })}
          onJumpToEvidence={() => dispatch({ type: "SET_STEP", step: "CASE_DATA" })}
        />
      )}

      {state.step === "CASE_DATA" && (
        <CaseDataPage
          caseData={state.caseData}
          evidence={state.evidence}
          onPatch={(patch) => dispatch({ type: "UPDATE_CASE", patch })}
          onAddEvidence={(files) => dispatch({ type: "ADD_EVIDENCE", files })}
          onRemoveEvidence={(id) => dispatch({ type: "REMOVE_EVIDENCE", id })}
          onNext={() => dispatch({ type: "SET_STEP", step: "ANALYSIS" })}
          onBack={() => dispatch({ type: "SET_STEP", step: "ROLE" })}
          onAnalyzeFile={handleAnalyzeFile}
        />
      )}

      {state.step === "ANALYSIS" && (
        <AnalysisPage
          analysis={state.analysis}
          caseData={state.caseData}
          teamConfig={state.teamConfig}
          onRun={async () => {
            dispatch({ type: "RUN_ANALYSIS_START" });
            try {
              const result = await analyzeSimulationCase(state.caseData, state.evidence.length);
              dispatch({ type: "RUN_ANALYSIS_SUCCESS", result });
            } catch (e: any) {
              dispatch({ type: "RUN_ANALYSIS_ERROR", message: e?.message || "تعذر التحليل" });
            }
          }}
          onNext={() => dispatch({ type: "SET_STEP", step: "SESSION" })}
          onBack={() => dispatch({ type: "SET_STEP", step: "CASE_DATA" })}
        />
      )}

      {state.step === "SESSION" && state.role && (
        <CourtSessionPage
          role={state.role}
          session={state.session}
          caseData={state.caseData}
          isAiThinking={isAiThinking}
          lastSaved={lastSaved}
          onStart={() => dispatch({ type: "SESSION_START" })}
          onAddMessage={(speakerRole, speaker, content, file) => {
            dispatch({ type: "SESSION_ADD_MESSAGE", speakerRole: speakerRole as (Role | "SYSTEM"), speaker, content, file });
            dispatch({ type: "SESSION_NEXT_TURN" });
          }}
          onTriggerAiTurn={handleAiTurn}
          onBuildJudgment={() => {
              dispatch({ type: "BUILD_JUDGMENT" });
          }}
          onGenerateDeed={handleGenerateDeed}
          isGeneratingDeed={isGeneratingDeed}
          onBack={() => dispatch({ type: "SET_STEP", step: "ANALYSIS" })}
          onExport={() => {
              const exportData: SavedCaseSession = {
                  id: `session_${Date.now()}`,
                  title: state.caseData.caseTitle || `جلسة ${state.caseData.court}`,
                  config: {
                      courtName: state.caseData.court,
                      userRole: (state.teamConfig?.userRole || state.role) as any,
                      jurisdiction: state.caseData.caseType.includes('إدارية') ? 'ADMINISTRATIVE' : 
                                    state.caseData.caseType.includes('تجارية') ? 'COMMERCIAL' :
                                    state.caseData.caseType.includes('جزائية') ? 'CRIMINAL' :
                                    state.caseData.caseType.includes('عمالية') ? 'LABOR' :
                                    state.caseData.caseType.includes('أحوال') ? 'PERSONAL' : 'GENERAL',
                      caseNature: state.caseData.caseType.includes('تعويض') ? 'COMPENSATION' : 'OTHER',
                      parties: {
                          plaintiff: state.caseData.plaintiff,
                          defendant: state.caseData.defendant
                      },
                      facts: state.caseData.facts,
                      requests: state.caseData.requests,
                      grounds: state.caseData.grounds,
                      damageDate: state.caseData.gregorianDate,
                      evidenceText: "",
                      teamConfig: state.teamConfig || undefined
                  },
                  messages: state.session.messages.map(m => ({
                      id: m.id,
                      role: m.role === state.role ? 'user' : (m.role === 'SYSTEM' ? 'system' : 'model'),
                      speakerRole: m.speaker === 'النظام' ? 'SYSTEM' : (m.role as any),
                      content: m.content,
                      timestamp: new Date(m.ts).toISOString(),
                      stage: state.session.phase,
                      file: m.file
                  })),
                  timeline: [],
                  currentPhase: state.session.phase,
                  lastUpdated: new Date().toISOString()
              };

              try {
                  const savedRaw = localStorage.getItem('saved_cases');
                  const saved = savedRaw ? JSON.parse(savedRaw) : [];
                  saved.push(exportData);
                  localStorage.setItem('saved_cases', JSON.stringify(saved));
                  setLastSaved(new Date());
              } catch(e) { console.error(e); }

              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `ALYUSUFCO_SESSION_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }}
        />
      )}

      {state.step === "JUDGMENT" && judgmentData && (
        <JudgmentPrintPage
          judgment={judgmentData}
          onPrint={() => {
            const iframe = document.getElementById("judgment_iframe") as HTMLIFrameElement | null;
            if (!iframe) return;
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          }}
        />
      )}
    </div>
  );
}
