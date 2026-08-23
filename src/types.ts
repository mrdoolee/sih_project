export type TrendlineType = 'linear' | 'proportional' | 'inverse' | 'quadratic' | 'power';

export interface ReportQuestionConfig {
  id: string;          // e.g. "q1", "q2", "q3"
  title: string;       // e.g. "자료 해석 (규칙성 요약)", "과학적 개념 & 법칙 도출", "오차 분석 및 토의", "실생활 적용 및 확장"
  question: string;    // e.g. "추의 무게가 변할 때 늘어난 길이는 어떻게 변했나요?"
  placeholder?: string;// e.g. "예: 추의 무게가 2배, 3배로 증가함에 따라..."
}

export interface TopicConfig {
  topicId: string;
  title: string;
  grades: string[];
  classes: string[];
  groups: string[]; // e.g. ["A모둠", "B모둠", "C모둠", "D모둠", "E모둠", "F모둠"] or ["1모둠", "2모둠"]
  xVarName: string;
  xUnit: string;
  yVarName: string;
  yUnit: string;
  defaultTrendline: TrendlineType;
  conceptGuide: string;
  slopeMeaningGuide: string;
  active: boolean;
  coreQuestions?: string[];
  reportQuestions?: ReportQuestionConfig[]; // Fully customizable question list & count
}

export function getDefaultReportQuestions(topic: Partial<TopicConfig>): ReportQuestionConfig[] {
  const x = topic.xVarName || '독립변인(X)';
  const y = topic.yVarName || '종속변인(Y)';
  return [
    {
      id: 'q1',
      title: '자료 해석 (규칙성 요약)',
      question: `${x}가 변할 때 ${y}는 어떻게 변했나요?`,
      placeholder: `예: ${x}가 2배, 3배로 증가함에 따라 ${y}도 일정하게 증가하는 경향을 관찰하였다.`
    },
    {
      id: 'q2',
      title: '과학적 개념 & 법칙 도출',
      question: '실험 결과와 그래프 기울기/수식으로부터 알 수 있는 원리는?',
      placeholder: '예: 실험 결과로부터 두 변인 사이에는 정비례 관계가 성립함을 확인하였으며, 이는 OOO의 법칙을 지지한다.'
    },
    {
      id: 'q3',
      title: '오차 분석 및 토의',
      question: '이론값과 차이가 생긴 원인이나 실험 시 주의할 점은?',
      placeholder: '예: 측정 도구의 최소 눈금 한계, 공기 저항, 시차 오차 등으로 인해 약간의 오차가 발생하였다.'
    }
  ];
}

export function getEffectiveReportQuestions(topic: TopicConfig): ReportQuestionConfig[] {
  if (topic.reportQuestions && Array.isArray(topic.reportQuestions) && topic.reportQuestions.length > 0) {
    return topic.reportQuestions;
  }
  return getDefaultReportQuestions(topic);
}

export interface DataPoint {
  id: string;
  order: number;
  x: number | '';
  y: number | '';
  isOutlier: boolean;
  note?: string;
}

export interface ManualPlotPoint {
  id: string;
  x: number;
  y: number;
  matchedDataId?: string;
}

export interface StudentManualGraphData {
  studentPoints: ManualPlotPoint[];
  toolMode: 'plot' | 'line' | 'quadratic' | 'freehand';
  lineOriginFixed: boolean;
  linePoint1: { x: number; y: number };
  linePoint2: { x: number; y: number };
  curveP1: { x: number; y: number };
  curveP2: { x: number; y: number };
  curveP3: { x: number; y: number };
  freehandPaths: Array<Array<{ x: number; y: number }>>;
  studentLineEquation: {
    slope: number;
    intercept: number;
    eqString: string;
  };
  studentQuadraticCurve?: {
    a: number;
    b: number;
    c: number;
    eqString: string;
  };
  matchStatus?: {
    matchedCount: number;
    total: number;
    percent: number;
  };
  hasDrawn?: boolean;
  hasPlotted?: boolean;
  hasAdjustedRuler?: boolean;
}

export interface ConclusionNotes {
  summary: string;
  principle: string;
  errorAnalysis: string;
  answers?: Record<string, string>; // Dynamic mapping: question ID or index -> student answer string
}

export interface GroupExperimentData {
  topicId: string;
  grade: string;
  classNum: string;
  groupName: string;
  groupPassword?: string; // 모둠 비밀번호 (타 모둠 도용 제출 방지)
  points: DataPoint[];
  selectedTrendline?: TrendlineType;
  manualGraphData?: StudentManualGraphData; // Student's manual graph drawings
  conclusionNotes: ConclusionNotes;
  lastSavedAt?: string;
}

export interface GroupAuthRecord {
  key: string;            // topicId-grade-classNum-groupName
  topicId: string;
  grade: string;
  classNum: string;
  groupName: string;
  password: string;
  updatedAt?: string;
}

export type GroupPasswordStore = Record<string, string>; // key -> password string

export interface TrendlineResult {
  type: TrendlineType;
  name: string;
  equation: string;
  formula: string;
  r2: number;
  slope?: number;
  intercept?: number;
  k?: number;
  a?: number;
  b?: number;
  c?: number;
  validPointsCount: number;
  predict: (x: number) => number | null;
}

export interface ScientificInsight {
  relationshipType: 'direct_proportional' | 'linear_with_offset' | 'inverse_proportional' | 'quadratic' | 'uncertain';
  relationshipTitle: string;
  description: string;
  slopeInterpretation?: string;
  r2Quality: 'excellent' | 'good' | 'moderate' | 'poor';
  r2Comment: string;
  outlierCount: number;
  outlierWarning?: string;
  recommendedQuestion: string;
}

export interface GroupEvaluation {
  topicId: string;
  grade: string;
  classNum: string;
  groupName: string;
  score?: string; // e.g. "상 / 중 / 하", "우수", "95점"
  feedbackComment: string; // 교사 코멘트 및 피드백
  rubricScores?: {
    accuracy?: number; // 1. 데이터 측정 및 기록 (1-5)
    graphInterpretation?: number; // 2. 그래프 작도 및 규칙성 해석 (1-5)
    scientificReasoning?: number; // 3. 과학적 원리 및 결론 도출 (1-5)
    errorAnalysis?: number; // 4. 오차 원인 분석 (1-5)
    attitude?: number; // 5. 탐구 태도 (1-5)
  };
  evaluatedAt?: string;
  evaluator?: string;
}

export interface GASConfig {
  webAppUrl: string;
  sheetId?: string;
  autoSync: boolean;
}

export interface TeacherSettingsConfig {
  teacherPassword: string;     // default '0000'
  allowClassOverview: boolean; // [전체 모둠 데이터 확인] ON/OFF (default: true)
  allowAutoAnalysis: boolean;  // [컴퓨터 자동 분석 그래프] ON/OFF (default: true)
  requireGroupPassword: boolean; // [모둠 비밀번호 인증 사용] ON/OFF (default: true)
}
