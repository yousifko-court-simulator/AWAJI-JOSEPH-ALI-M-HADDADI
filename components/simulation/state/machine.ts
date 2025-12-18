
import { AnalysisResult, EvidenceFile, Role, SimulationState, Step, SimulationPhase, TimelineEvent, CaseData, ChatMessage } from "../types/simulation";
import { makeId } from "../utils/fileHelpers";
import { getNextPhase, resolveNextSpeaker, isDuplicateTurn } from "../../../logic/simulationStateMachine";
import { CaseConfig, PartyType, CaseNature, Jurisdiction, SavedCaseSession, SimulationTeamConfig, FileData } from "../../../types";

export type SimulationAction =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_TEAM_CONFIG"; config: SimulationTeamConfig }
  | { type: "SET_ROLE"; role: Role } // Legacy fallback
  | { type: "UPDATE_CASE"; patch: Partial<SimulationState["caseData"]> }
  | { type: "ADD_EVIDENCE"; files: EvidenceFile[] }
  | { type: "REMOVE_EVIDENCE"; id: string }
  | { type: "RUN_ANALYSIS_START" }
  | { type: "RUN_ANALYSIS_SUCCESS"; result: Omit<AnalysisResult, "status"> }
  | { type: "RUN_ANALYSIS_ERROR"; message: string }
  | { type: "SESSION_START" }
  | { type: "SESSION_ADD_MESSAGE"; speakerRole: Role | "SYSTEM"; speaker: string; content: string; file?: FileData }
  | { type: "SESSION_SET_SUGGESTIONS"; suggestions: string[] }
  | { type: "SESSION_NEXT_TURN" }
  | { type: "BUILD_JUDGMENT" }
  | { type: "RESET_SIMULATION" }
  | { type: "RESTORE_SESSION"; session: SavedCaseSession };

const INITIAL_TIMELINE: TimelineEvent[] = [
  { id: 't1', phase: 'SESSION_OPEN', label: 'افتتاح الجلسة', status: 'pending' },
  { id: 't2', phase: 'PRELIMINARY_CHECKS', label: 'التحقق الأولي', status: 'pending' },
  { id: 't3', phase: 'CLAIM_PRESENTATION', label: 'تقديم الدعوى', status: 'pending' },
  { id: 't4', phase: 'DEFENSE_RESPONSE', label: 'الجواب والدفع', status: 'pending' },
  { id: 't5', phase: 'EVIDENCE_REVIEW', label: 'فحص الأدلة', status: 'pending' },
  { id: 't6', phase: 'FINAL_PLEADINGS', label: 'المرافعة الختامية', status: 'pending' },
  { id: 't7', phase: 'JUDGMENT', label: 'النطق بالحكم', status: 'pending' },
];

export const initialState: SimulationState = {
  step: "ROLE",
  role: null,
  teamConfig: null,

  caseData: {
    caseTitle: "",
    caseType: "إدارية",
    court: "ديوان المظالم — المحكمة الإدارية",
    caseNumber: "",
    hijriDate: "",
    gregorianDate: "",
    summary: "",
    plaintiff: { name: "", type: "INDIVIDUAL" },
    defendant: { name: "", type: "GOVERNMENT" },
    requests: "",
    facts: "",
    grounds: "",
    judgeName: "",
    clerkName: "",
    courtHeaderCustom: "",
  },

  evidence: [],

  analysis: {
    status: "idle",
    keyPoints: [],
    risks: [],
    questions: [],
    suggestedStrategy: [],
  },

  session: {
    started: false,
    turn: 0,
    phase: 'SESSION_OPEN',
    timeline: INITIAL_TIMELINE,
    messages: [],
    nextSpeakerRole: null,
    suggestedReplies: [],
  },

  judgment: {
    built: false,
    data: null,
  },
};

function canGo(step: Step, s: SimulationState): boolean {
  if (step === "ROLE") return true;
  if (step === "CASE_DATA") return s.teamConfig !== null;
  if (step === "ANALYSIS") return s.teamConfig !== null && (s.caseData.caseTitle.trim().length > 0 || s.evidence.length > 0);
  if (step === "SESSION") return s.teamConfig !== null && (s.analysis.status === "done" || (s.caseData.summary.trim().length > 0));
  if (step === "JUDGMENT") return s.session.messages.length > 0 || s.analysis.status === "done";
  return false;
}

// Map internal state to logic config
function mapStateToConfig(s: SimulationState): CaseConfig {
    return {
        jurisdiction: (s.caseData.court.includes('إدارية') ? 'ADMINISTRATIVE' : 'COMMERCIAL') as Jurisdiction,
        caseNature: (s.caseData.caseType.includes('تعويض') ? 'COMPENSATION' : 'OTHER') as CaseNature,
        userRole: s.teamConfig?.userRole || 'PLAINTIFF',
        parties: {
            plaintiff: { name: s.caseData.plaintiff.name, type: s.caseData.plaintiff.type as PartyType },
            defendant: { name: s.caseData.defendant.name, type: s.caseData.defendant.type as PartyType }
        },
        damageDate: s.caseData.gregorianDate,
        facts: s.caseData.facts,
        requests: s.caseData.requests,
        courtName: s.caseData.court,
        evidenceText: "",
        grounds: s.caseData.grounds,
        teamConfig: s.teamConfig || undefined
    };
}

function updateTimeline(timeline: TimelineEvent[], currentPhase: SimulationPhase): TimelineEvent[] {
    return timeline.map(t => {
        const phasesOrder: SimulationPhase[] = ['SESSION_OPEN', 'PRELIMINARY_CHECKS', 'CLAIM_PRESENTATION', 'DEFENSE_RESPONSE', 'EVIDENCE_REVIEW', 'FINAL_PLEADINGS', 'JUDGMENT', 'CLOSED'];
        const currIdx = phasesOrder.indexOf(currentPhase);
        const tIdx = phasesOrder.indexOf(t.phase);
        
        if (t.phase === currentPhase) return { ...t, status: 'active' };
        if (tIdx < currIdx && tIdx !== -1) return { ...t, status: 'completed' };
        return { ...t, status: 'pending' };
    });
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case "SET_STEP": {
      if (!canGo(action.step, state)) return state;
      return { ...state, step: action.step };
    }

    case "SET_TEAM_CONFIG":
      return { 
          ...state, 
          teamConfig: action.config,
          role: action.config.userRole === 'PLAINTIFF' ? 'PLAINTIFF' : 'DEFENDANT',
          caseData: {
              ...state.caseData,
              plaintiff: { ...state.caseData.plaintiff, type: action.config.userRole === 'PLAINTIFF' ? 'INDIVIDUAL' : action.config.opponentType },
              defendant: { ...state.caseData.defendant, type: action.config.userRole === 'DEFENDANT' ? 'INDIVIDUAL' : action.config.opponentType }
          }
      };

    case "SET_ROLE":
      return { ...state, role: action.role };

    case "UPDATE_CASE":
      return { ...state, caseData: { ...state.caseData, ...action.patch } };

    case "ADD_EVIDENCE":
      return { ...state, evidence: [...state.evidence, ...action.files] };

    case "REMOVE_EVIDENCE":
      return { ...state, evidence: state.evidence.filter((f) => f.id !== action.id) };

    case "RUN_ANALYSIS_START":
      return { ...state, analysis: { ...state.analysis, status: "running", errorMessage: undefined } };

    case "RUN_ANALYSIS_SUCCESS":
      return { ...state, analysis: { status: "done", ...action.result } };

    case "RUN_ANALYSIS_ERROR":
      return { ...state, analysis: { ...state.analysis, status: "error", errorMessage: action.message } };

    case "SESSION_START": {
      const initialPhase = 'SESSION_OPEN';
      return {
        ...state,
        step: "SESSION",
        session: {
          ...state.session,
          started: true,
          turn: 1,
          phase: initialPhase,
          timeline: updateTimeline(state.session.timeline, initialPhase),
          nextSpeakerRole: "JUDGE",
          messages: [
            ...state.session.messages,
            {
              id: makeId("msg"),
              role: "SYSTEM",
              speaker: "النظام",
              content: "تم افتتاح الجلسة القضائية، والتحقق من هوية الأطراف.",
              ts: Date.now(),
            },
          ],
        },
      };
    }

    case "SESSION_ADD_MESSAGE":
      return {
        ...state,
        session: {
          ...state.session,
          suggestedReplies: [],
          messages: [
            ...state.session.messages,
            {
              id: makeId("msg"),
              role: action.speakerRole,
              speaker: action.speaker,
              content: action.content,
              ts: Date.now(),
              file: action.file,
              isAiGenerated: action.speakerRole !== state.role && action.speakerRole !== "SYSTEM"
            },
          ],
        },
      };

    case "SESSION_SET_SUGGESTIONS":
        return {
            ...state,
            session: {
                ...state.session,
                suggestedReplies: action.suggestions
            }
        };

    case "SESSION_NEXT_TURN": {
      if (state.session.phase === 'CLOSED') {
          return { ...state, session: { ...state.session, nextSpeakerRole: null } };
      }

      const config = mapStateToConfig(state);
      const messages = state.session.messages;
      const logicMessages = messages.map(m => ({
          ...m,
          role: (m.role === state.role ? 'user' : 'model') as any,
          speakerRole: (m.role === 'JUDGE' ? 'JUDGE' : 
                        m.role === state.role ? 'USER' :
                        m.role === 'PLAINTIFF' ? (state.role === 'DEFENDANT' ? 'PRIVATE_OPPONENT' : 'USER') :
                        m.role === 'DEFENDANT' ? (state.role === 'PLAINTIFF' ? 'PRIVATE_OPPONENT' : 'USER') : 
                        m.role) as any,
          timestamp: new Date(m.ts).toISOString(),
          stage: state.session.phase
      }));

      let nextSimRole = resolveNextSpeaker(
          state.session.phase, 
          logicMessages[logicMessages.length - 1]?.speakerRole || 'JUDGE', 
          config
      );

      let nextPhase: SimulationPhase = state.session.phase;
      
      if (isDuplicateTurn(nextSimRole, state.session.phase, logicMessages)) {
           nextPhase = getNextPhase(state.session.phase);
           nextSimRole = resolveNextSpeaker(nextPhase, 'JUDGE', config); 
      }

      let nextRole: Role | null = "JUDGE";
      const opponentRole = state.role === 'PLAINTIFF' ? 'DEFENDANT' : 'PLAINTIFF';

      if (nextSimRole === 'JUDGE') nextRole = 'JUDGE';
      else if (nextSimRole === 'USER') nextRole = state.role;
      else if (nextSimRole === 'USER_ADVISOR') nextRole = 'ADVISOR'; 
      else if (nextSimRole === 'GOVT_ADVISOR' || nextSimRole === 'PRIVATE_OPPONENT') nextRole = opponentRole;
      else if (nextSimRole === 'WITNESS') nextRole = 'WITNESS';
      else if (nextSimRole === 'EXPERT') nextRole = 'EXPERT';
      else if (nextSimRole === 'SYSTEM') nextRole = null;

      if (nextPhase === 'CLOSED') {
          nextRole = null;
      }

      return {
        ...state,
        session: {
          ...state.session,
          turn: state.session.turn + 1,
          phase: nextPhase,
          timeline: updateTimeline(state.session.timeline, nextPhase),
          nextSpeakerRole: nextRole,
        },
      };
    }

    case "BUILD_JUDGMENT":
      return { ...state, step: "JUDGMENT", judgment: { ...state.judgment, built: true } };

    case "RESET_SIMULATION":
      return initialState;

    case "RESTORE_SESSION": {
      const s = action.session;
      const config = s.config;
      
      const mapJurisdiction = (j: string) => {
          if (j === 'COMMERCIAL') return 'تجارية';
          if (j === 'ADMINISTRATIVE') return 'إدارية';
          if (j === 'CRIMINAL') return 'جزائية';
          if (j === 'LABOR') return 'عمالية';
          if (j === 'PERSONAL') return 'أحوال شخصية';
          return 'حقوقية/عامة';
      };

      const newCaseData: CaseData = {
          caseTitle: s.title || config.courtName,
          caseType: (config as any).caseType || mapJurisdiction(config.jurisdiction),
          court: config.courtName,
          summary: config.facts,
          plaintiff: { name: config.parties.plaintiff.name, type: config.parties.plaintiff.type as PartyType },
          defendant: { name: config.parties.defendant.name, type: config.parties.defendant.type as PartyType },
          requests: config.requests,
          facts: config.facts,
          grounds: config.grounds || "",
          hijriDate: "",
          gregorianDate: config.damageDate || "",
          judgeName: "",
          clerkName: "",
          courtHeaderCustom: ""
      };
      
      const role = config.userRole as Role;

      const teamConfig: SimulationTeamConfig = config.teamConfig || {
          userRole: config.userRole,
          userAdvisor: 'ALYUSUFCO',
          opponentType: config.parties.defendant.type,
          opponentAdvisor: config.parties.defendant.type === 'GOVERNMENT' ? 'GOVT_REP' : 'ABU_AWAJI',
          expertsEnabled: false,
          selectedExperts: []
      };

      const newMessages: ChatMessage[] = s.messages.map(m => {
          let r: Role | "SYSTEM" = "SYSTEM";
          if (m.speakerRole === 'JUDGE') r = "JUDGE";
          else if (m.speakerRole === 'USER') r = role; 
          else if (m.speakerRole === 'USER_ADVISOR') r = "ADVISOR";
          else if (m.speakerRole === 'GOVT_ADVISOR' || m.speakerRole === 'PRIVATE_OPPONENT') r = role === 'PLAINTIFF' ? 'DEFENDANT' : 'PLAINTIFF';
          else if (m.speakerRole === 'WITNESS') r = "WITNESS";
          else if (m.speakerRole === 'EXPERT') r = "EXPERT";
          else if (m.role === 'model') r = role === 'PLAINTIFF' ? 'DEFENDANT' : 'PLAINTIFF'; 
          
          return {
              id: m.id,
              role: r,
              speaker: m.speakerRole || "Unknown",
              content: m.content,
              ts: new Date(m.timestamp).getTime(),
              isAiGenerated: m.role === 'model'
          };
      });

      return {
          ...state,
          step: "SESSION",
          role: role,
          teamConfig: teamConfig,
          caseData: newCaseData,
          analysis: {
              ...state.analysis,
              status: "done" 
          },
          session: {
              ...state.session,
              started: true,
              messages: newMessages,
              phase: s.currentPhase as SimulationPhase,
              timeline: updateTimeline(state.session.timeline, s.currentPhase as SimulationPhase),
              nextSpeakerRole: "JUDGE" 
          }
      };
    }

    default:
      return state;
  }
}
