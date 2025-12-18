
import { SimulationPhase, SimulationRole, CaseConfig } from "../types";

// --- 1. THE STRICT LINEAR FLOW ---
const FLOW: SimulationPhase[] = [
  'SESSION_OPEN',
  'PRELIMINARY_CHECKS',
  'CLAIM_PRESENTATION',
  'JUDGE_QUESTIONS_TO_CLAIMANT',
  'DEFENSE_RESPONSE',
  'JUDGE_QUESTIONS_TO_DEFENDANT',
  'EVIDENCE_REVIEW', // Phase where Expert is often called
  'WITNESS_EXAMINATION', // Dedicated phase for Witness
  'EXPERT_REPORT', // Detailed discussion of expert findings
  'MOTIONS_AND_REQUESTS',
  'FINAL_PLEADINGS',
  'DELIBERATION',
  'JUDGMENT',
  'CLOSED'
];

export const getPhaseLabel = (phase: SimulationPhase): string => {
  const map: Record<SimulationPhase, string> = {
    SESSION_OPEN: 'افتتاح الجلسة',
    PRELIMINARY_CHECKS: 'التحقق الأولي',
    CLAIM_PRESENTATION: 'تقديم الدعوى',
    JUDGE_QUESTIONS_TO_CLAIMANT: 'سؤال المدعي',
    DEFENSE_RESPONSE: 'جواب المدعى عليه',
    JUDGE_QUESTIONS_TO_DEFENDANT: 'سؤال المدعى عليه',
    EVIDENCE_REVIEW: 'فحص ومناقشة الأدلة',
    WITNESS_EXAMINATION: 'سماع الشهود واستجوابهم',
    MOTIONS_AND_REQUESTS: 'الطلبات العارضة',
    EXPERT_APPOINTMENT: 'ندب خبير',
    EXPERT_REPORT: 'مناقشة تقرير الخبير',
    FINAL_PLEADINGS: 'المرافعة الختامية',
    DELIBERATION: 'المداولة',
    JUDGMENT: 'النطق بالحكم',
    CHARGE_READING: 'تلاوة التهم',
    EXAMINATION: 'استجواب المتهم',
    CLOSED: 'انتهت الجلسة'
  };
  return map[phase] || phase;
};

export const getNextPhase = (current: SimulationPhase): SimulationPhase => {
  const idx = FLOW.indexOf(current);
  if (idx === -1 || idx === FLOW.length - 1) return 'CLOSED';
  return FLOW[idx + 1];
};

export const resolveOpponentRole = (config: CaseConfig): SimulationRole => {
  if (config.teamConfig) {
      if (config.teamConfig.opponentType === 'GOVERNMENT') return 'GOVT_ADVISOR';
      return 'PRIVATE_OPPONENT';
  }
  const isGovt = config.parties.defendant.type === 'GOVERNMENT';
  return isGovt ? 'GOVT_ADVISOR' : 'PRIVATE_OPPONENT';
};

// --- ORCHESTRATOR LOGIC ---
export const resolveNextSpeaker = (
  phase: SimulationPhase,
  lastSpeaker: SimulationRole,
  config: CaseConfig
): SimulationRole => {
  const userRole = config.teamConfig ? config.teamConfig.userRole : config.userRole;
  const userIsPlaintiff = userRole === 'PLAINTIFF';
  
  const userSide = 'USER';
  const opponentSide = resolveOpponentRole(config);
  const advisor = 'USER_ADVISOR'; 

  switch (phase) {
    case 'EVIDENCE_REVIEW':
      // Cycle: Judge -> Expert (if complex) -> User/Advisor -> Opponent -> Judge
      if (lastSpeaker === 'JUDGE') return config.teamConfig?.expertsEnabled ? 'EXPERT' : 'USER';
      if (lastSpeaker === 'EXPERT') return 'USER';
      if (lastSpeaker === 'USER') return advisor;
      if (lastSpeaker === advisor) return opponentSide;
      return 'JUDGE';
    
    case 'WITNESS_EXAMINATION':
      // Cycle: Judge calls Witness -> Witness answers -> User asks -> Opponent asks -> Judge
      if (lastSpeaker === 'JUDGE') return 'WITNESS';
      if (lastSpeaker === 'WITNESS') return 'USER';
      if (lastSpeaker === 'USER') return opponentSide;
      if (lastSpeaker === opponentSide) return 'JUDGE';
      return 'JUDGE';

    case 'EXPERT_REPORT':
      if (lastSpeaker === 'JUDGE') return 'EXPERT';
      if (lastSpeaker === 'EXPERT') return advisor;
      if (lastSpeaker === advisor) return opponentSide;
      return 'JUDGE';

    default:
      // Default linear logic for other phases
      if (lastSpeaker === 'JUDGE') return userIsPlaintiff ? userSide : opponentSide;
      if (lastSpeaker === userSide) return advisor;
      if (lastSpeaker === advisor) return opponentSide;
      if (lastSpeaker === opponentSide) return 'JUDGE';
      return 'JUDGE';
  }
};

export const isDuplicateTurn = (
  nextSpeaker: SimulationRole,
  phase: SimulationPhase,
  history: { speakerRole?: SimulationRole; stage?: SimulationPhase | string; content: string }[]
): boolean => {
    const phaseMessages = history.filter(m => m.stage === phase);
    
    if (nextSpeaker === 'JUDGE' && phaseMessages.length > 0) {
        if (phase === 'JUDGMENT' && phaseMessages.some(m => m.content.includes("حكمت"))) return true;
        const lastMsg = phaseMessages[phaseMessages.length - 1];
        if (lastMsg.speakerRole === 'JUDGE') return true;
    }

    // Expert and Witness phases can be longer
    if (phase === 'EVIDENCE_REVIEW' || phase === 'WITNESS_EXAMINATION' || phase === 'EXPERT_REPORT') {
        if (phaseMessages.length >= 10 && nextSpeaker === 'JUDGE') return true;
    }

    if (phaseMessages.length >= 15) return true;
    return false;
};
