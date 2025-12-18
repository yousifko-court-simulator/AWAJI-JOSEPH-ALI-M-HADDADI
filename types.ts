
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SIMULATION = 'SIMULATION',
  MEMO_BUILDER = 'MEMO_BUILDER',
  JUDGMENT_ANALYZER = 'JUDGMENT_ANALYZER',
  LEGAL_ADVISOR = 'LEGAL_ADVISOR',
  CASE_MANAGER = 'CASE_MANAGER',
  SETTINGS = 'SETTINGS'
}

export type RoleType = 'user' | 'model' | 'system';

// --- STRICT TYPES FOR ENGINE ---
export type Jurisdiction = 'ADMINISTRATIVE' | 'COMMERCIAL' | 'CRIMINAL' | 'LABOR' | 'GENERAL' | 'PERSONAL';
export type PartyType = 'INDIVIDUAL' | 'COMPANY' | 'GOVERNMENT';
export type UserRole = 'PLAINTIFF' | 'DEFENDANT';
export type CaseNature = 'COMPENSATION' | 'ANNULMENT' | 'COMPENSATION_AND_CORRECTION' | 'OTHER';

export type SimulationStage =
  | 'SETUP'
  | 'OPENING'
  | 'CLAIMANT_PLEADING'
  | 'JUDGE_QUESTIONS'
  | 'OPPONENT_RESPONSE'
  | 'REBUTTAL'
  | 'WITNESS_SESSION'
  | 'EXPERT_SESSION'
  | 'DELIBERATION'
  | 'JUDGMENT'
  | 'CLOSED';

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

export type SimulationRole = 'JUDGE' | 'USER' | 'USER_ADVISOR' | 'PRIVATE_OPPONENT' | 'GOVT_ADVISOR' | 'WITNESS' | 'EXPERT' | 'SYSTEM' | 'CLERK';

export type AdvisorId = 'ALYUSUFCO' | 'GOVT_REP' | 'ABU_AWAJI';
export type ExpertId = 'NAIF_ALARISHI' | 'ABDULLATIF_HADDADI' | 'GENERAL_EXPERT';

export interface SimulationTeamConfig {
    userRole: UserRole;
    userAdvisor: AdvisorId;
    opponentType: PartyType;
    opponentAdvisor: AdvisorId;
    expertsEnabled: boolean;
    selectedExperts: ExpertId[];
}

export type SpeakerRole = SimulationRole;

export interface Message {
  id: string;
  role: RoleType;
  speakerRole?: SpeakerRole;
  content: string;
  timestamp: Date;
  stage?: SimulationStage;
}

export interface CaseConfig {
  jurisdiction: Jurisdiction;
  caseNature: CaseNature;
  userRole: UserRole;
  parties: {
    plaintiff: { name: string; type: PartyType };
    defendant: { name: string; type: PartyType };
  };
  facts: string;
  requests: string;
  grounds?: string;
  evidenceText?: string;
  damageDate?: string;
  courtName: string;
  teamConfig?: SimulationTeamConfig;
}

export interface FileData {
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface MemoData {
  courtName: string;
  plaintiff: string;
  defendant: string;
  requests: string;
  facts: string;
  evidence?: string;
  attachment?: FileData | null;
}

export interface SavedCaseSession {
    id: string;
    title: string;
    config: CaseConfig;
    messages: {
        id: string;
        role: RoleType;
        speakerRole?: SpeakerRole;
        content: string;
        timestamp: string;
        stage?: string;
    }[];
    timeline?: any[];
    currentPhase?: string;
    lastUpdated: string;
}

export interface AdvisorSettings {
  name: string;
  role: string;
  tone: string;
}

export interface JudicialCaseProfile {
    jurisdiction: Jurisdiction;
    caseNature: CaseNature;
    userRole: UserRole;
    parties: {
        plaintiff: { type: PartyType, name: string };
        defendant: { type: PartyType, name: string };
    };
    facts: string;
    requests: string;
    grounds?: string;
    damageDate?: string;
}

export interface StructuredCaseAnalysis {
    caseType: Jurisdiction;
    opponentType: 'GOVERNMENT' | 'PRIVATE';
    facts_summary: string;
    requests_summary: string;
    evidence_analysis: string;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
    recommendation: string;
}

// --- NEW DOCUMENT BUILDER TYPES ---

export type DocCategory = 'MEMO' | 'CONTRACT' | 'OTHER';

export type DocBuilderStep = 
  | 'CATEGORY_SELECT'
  | 'TYPE_SELECT'
  | 'INTAKE'
  | 'ANALYSIS'
  | 'MISSING_ITEMS'
  | 'DRAFTING'
  | 'FINAL_VIEW';

export interface MissingItem {
  id: string;
  label: string;
  description: string;
  type: 'FILE' | 'TEXT';
  isResolved: boolean;
  value?: string; // Text answer or File name
  fileData?: FileData | null;
}

export interface DocumentRequest {
  category: DocCategory;
  docType: string;
  facts: string;
  attachment?: FileData | null;
}

// --- NEW ADVANCED ANALYZER TYPES ---
export interface FlawItem {
  type: 'FORMAL' | 'SUBSTANTIVE'; // شكلي vs موضوعي
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  legalRef?: string; // المادة النظامية المستند عليها
}

export interface JudgmentAnalysisResult {
  summary: string; // ملخص الحكم
  rulingLogic: string; // على ماذا استند القاضي؟
  formalFlaws: FlawItem[]; // عيوب شكلية
  substantiveFlaws: FlawItem[]; // عيوب موضوعية
  appealSuccessProbability: number; // نسبة مئوية
  recommendedStrategy: string; // نصيحة استراتيجية
  draftAppealMemo: string; // مسودة لائحة اعتراضية
}
