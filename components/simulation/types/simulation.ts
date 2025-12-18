
import { SimulationTeamConfig, FileData } from "../../../types";

export type Role = "PLAINTIFF" | "DEFENDANT" | "JUDGE" | "CLERK" | "ADVISOR" | "EXPERT" | "WITNESS" | "PRIVATE_OPPONENT" | "GOVT_ADVISOR";

export type Step = "ROLE" | "CASE_DATA" | "ANALYSIS" | "SESSION" | "JUDGMENT";

export type SimulationPhase =
  | 'SESSION_OPEN'
  | 'PRELIMINARY_CHECKS'
  | 'CLAIM_PRESENTATION'
  | 'JUDGE_QUESTIONS_TO_CLAIMANT'
  | 'DEFENSE_RESPONSE'
  | 'JUDGE_QUESTIONS_TO_DEFENDANT'
  | 'EVIDENCE_REVIEW'
  | 'WITNESS_EXAMINATION'
  | 'MOTIONS_AND_REQUESTS'
  | 'EXPERT_APPOINTMENT'
  | 'EXPERT_REPORT'
  | 'FINAL_PLEADINGS'
  | 'DELIBERATION'
  | 'JUDGMENT'
  | 'CHARGE_READING'
  | 'EXAMINATION'
  | 'CLOSED';

export type TimelineEvent = {
  id: string;
  phase: SimulationPhase;
  label: string;
  status: "pending" | "active" | "completed";
};

export type EvidenceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  blobUrl?: string;
};

export type PartyType = "INDIVIDUAL" | "COMPANY" | "GOVERNMENT";

export type Party = {
  name: string;
  type: PartyType;
  idNumber?: string;
  phone?: string;
  address?: string;
};

export type CaseData = {
  caseTitle: string;
  caseType: string;
  court: string;
  caseNumber?: string;
  hijriDate?: string;
  gregorianDate?: string;
  summary: string;

  plaintiff: Party;
  defendant: Party;

  requests: string;
  facts: string;
  grounds: string;

  // --- NEW OPTIONAL FIELDS ---
  judgeName?: string;
  clerkName?: string;
  courtHeaderCustom?: string;
};

export type AnalysisResult = {
  status: "idle" | "running" | "done" | "error";
  model?: string;
  keyPoints: string[];
  risks: string[];
  questions: string[];
  suggestedStrategy: string[];
  winProbability?: number; 
  weaknessSeverity?: "LOW" | "MEDIUM" | "HIGH"; 
  draftJudgmentHints?: string[];
  raw?: string;
  errorMessage?: string;
};

export type ChatMessage = {
  id: string;
  role: Role | "SYSTEM";
  speaker: string;
  content: string;
  ts: number;
  isAiGenerated?: boolean;
  file?: FileData; // Added for PDF attachments in chat
};

export type JudgmentData = {
  title: string;
  courtHeader: string;
  panelInfo: string;
  caseMeta: string[];
  reasons: string[];
  ruling: string[];
  signBlock: string[];
};

export type SimulationState = {
  step: Step;
  role: Role | null;
  teamConfig: SimulationTeamConfig | null;

  caseData: CaseData;
  evidence: EvidenceFile[];

  analysis: AnalysisResult;

  session: {
    started: boolean;
    turn: number;
    phase: SimulationPhase;
    timeline: TimelineEvent[];
    messages: ChatMessage[];
    nextSpeakerRole: Role | null;
    suggestedReplies: string[]; 
  };

  judgment: {
    built: boolean;
    data: JudgmentData | null;
  };
};
