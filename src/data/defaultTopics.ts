import { TopicConfig, GroupExperimentData } from '../types';

export const DEFAULT_TOPICS: TopicConfig[] = [
  {
    topicId: 'EXP_01',
    title: '용수철에 매단 추의 무게와 늘어난 길이 (훅의 법칙)',
    grades: ['1학년', '2학년', '3학년'],
    classes: ['1반', '2반', '3반', '4반', '5반'],
    groups: ['A모둠', 'B모둠', 'C모둠', 'D모둠', 'E모둠', 'F모둠'],
    xVarName: '추의 무게',
    xUnit: 'N',
    yVarName: '늘어난 길이',
    yUnit: 'cm',
    defaultTrendline: 'proportional',
    conceptGuide: '용수철이 탄성 한계 내에 있을 때, 늘어난 길이는 작용한 힘(추의 무게)의 크기에 정비례합니다. (훅의 법칙 F = kx)',
    slopeMeaningGuide: '그래프의 기울기 (늘어난 길이 / 무게)는 용수철 상수의 역수(1/k)를 의미합니다. 기울기가 클수록 용수철이 쉽게 늘어납니다.',
    active: true,
    coreQuestions: [
      '추의 무게가 2배, 3배로 증가할 때 늘어난 길이는 어떻게 변하는가?',
      '그래프의 기울기는 용수철의 어떤 성질(단단함, 부드러움)을 나타내는가?',
      '원점을 지나는 직선이 나오는 이유는 무엇인가?'
    ],
    reportQuestions: [
      {
        id: 'q1',
        title: '자료 해석 (규칙성 요약)',
        question: '추의 무게가 변할 때 늘어난 길이는 어떻게 변했나요?',
        placeholder: '예: 추의 무게가 2배, 3배로 증가함에 따라 늘어난 길이도 일정하게 비례하여 증가하는 규칙성을 관찰하였다.'
      },
      {
        id: 'q2',
        title: '과학적 개념 & 법칙 도출',
        question: '실험 결과와 그래프 기울기/수식으로부터 알 수 있는 과학적 원리는 무엇인가요?',
        placeholder: '예: 늘어난 길이는 추의 무게에 정비례하며, 이는 훅의 법칙(F=kx)을 만족함을 확인하였다. 기울기는 1/k를 나타낸다.'
      },
      {
        id: 'q3',
        title: '오차 분석 및 토의',
        question: '이론값과 차이가 생긴 원인이나 실험 과정에서 주의할 점은 무엇인가요?',
        placeholder: '예: 눈금을 수평으로 읽지 않아 발생한 시차 오차와 용수철 자체의 미세한 무게 영향이 있었다.'
      }
    ]
  },
  {
    topicId: 'EXP_02',
    title: '기체의 압력과 부피 관계 (보일의 법칙)',
    grades: ['1학년', '2학년', '3학년'],
    classes: ['1반', '2반', '3반', '4반'],
    groups: ['1모둠', '2모둠', '3모둠', '4모둠', '5모둠', '6모둠'],
    xVarName: '기체의 압력 (P)',
    xUnit: 'kPa',
    yVarName: '기체의 부피 (V)',
    yUnit: 'mL',
    defaultTrendline: 'inverse',
    conceptGuide: '온도가 일정할 때 일정한 양의 기체의 부피는 압력에 반비례합니다. (보일의 법칙 P·V = k)',
    slopeMeaningGuide: '곡선에서 각 점의 (압력 × 부피) 값은 기체의 양과 온도에 의해 결정되는 일정한 상수를 나타냅니다.',
    active: true,
    coreQuestions: [
      '압력이 2배, 3배로 커질 때 부피는 어떻게 줄어드는가?',
      '압력과 부피의 곱(P×V)을 계산해보면 어떤 규칙이 나타나는가?',
      '그래프가 x축이나 y축과 만나지 않는 이유는 무엇인가?'
    ],
    reportQuestions: [
      {
        id: 'q1',
        title: '자료 해석 (규칙성 요약)',
        question: '기체의 압력이 변할 때 기체의 부피는 어떻게 변했나요?',
        placeholder: '예: 압력이 2배, 3배로 증가할 때 기체의 부피는 1/2배, 1/3배로 감소하는 반비례 경향을 나타내었다.'
      },
      {
        id: 'q2',
        title: '보일의 법칙 및 수식 관계 (P·V)',
        question: '압력과 부피의 곱(P×V)을 계산해보고 발견한 과학적 원리를 서술하세요.',
        placeholder: '예: 압력과 부피의 곱(P×V)이 거의 일정한 상수값을 유지하여 보일의 법칙이 성립함을 입증하였다.'
      },
      {
        id: 'q3',
        title: '기체 입자 운동 관점의 해석',
        question: '기체 입자의 충돌 횟수와 공간의 관점에서 이 현상을 어떻게 설명할 수 있나요?',
        placeholder: '예: 부피가 줄어들면 단위 면적당 기체 입자의 충돌 횟수가 늘어나 압력이 커지게 된다.'
      },
      {
        id: 'q4',
        title: '오차 요인 및 환경 통제 토의',
        question: '실험 도중 주사기를 만질 때 온도가 변하거나 기체가 누출될 가능성에 대해 토의하세요.',
        placeholder: '예: 주사기를 잡은 손의 체온으로 인해 기체 온도가 상승하거나 미세한 기체 누출이 오차 원인이 될 수 있다.'
      }
    ]
  },
  {
    topicId: 'EXP_03',
    title: '니크롬선의 전압과 전류 관계 (옴의 법칙)',
    grades: ['2학년', '3학년'],
    classes: ['1반', '2반', '3반', '4반', '5반', '6반'],
    groups: ['A모둠', 'B모둠', 'C모둠', 'D모둠', 'E모둠', 'F모둠', 'G모둠', 'H모둠'],
    xVarName: '전압 (V)',
    xUnit: 'V',
    yVarName: '전류 (I)',
    yUnit: 'mA',
    defaultTrendline: 'linear',
    conceptGuide: '도선에 흐르는 전류의 세기는 전압에 비례하고 저항에 반비례합니다. (옴의 법칙 V = IR, I = V/R)',
    slopeMeaningGuide: '그래프의 기울기 (전류/전압)는 전기 전도도(컨덕턴스 = 1/저항)를 의미합니다. 저항이 클수록 기울기가 완만해집니다.',
    active: true,
    coreQuestions: [
      '전압을 2배, 3배로 높일 때 전류계의 눈금은 어떻게 변하는가?',
      '그래프의 기울기를 통해 니크롬선의 저항값을 어떻게 계산할 수 있는가?',
      '전류의 단위가 mA일 때 저항(Ω)을 구하려면 어떻게 환산해야 하는가?'
    ],
    reportQuestions: [
      {
        id: 'q1',
        title: '자료 해석 (규칙성 요약)',
        question: '전압이 증가할 때 전류는 어떻게 변했나요?',
        placeholder: '예: 전압을 1V씩 올릴 때마다 전류계의 측정값이 일정하게 증가하는 선형 비례 관계를 보였다.'
      },
      {
        id: 'q2',
        title: '옴의 법칙 및 저항값 계산',
        question: '그래프의 기울기 또는 관계식으로부터 니크롬선의 저항값(Ω)을 구하고 원리를 서술하세요.',
        placeholder: '예: 기울기(I/V)의 역수를 계산하여 니크롬선의 저항이 약 OO Ω임을 산출하였고, 옴의 법칙(V=IR)을 확인하였다.'
      },
      {
        id: 'q3',
        title: '오차 분석 및 주의점',
        question: '전류가 흐르면서 발생한 열이 저항값에 미친 영향이나 접촉 저항에 대해 토의하세요.',
        placeholder: '예: 전류가 흐르며 니크롬선에 열이 발생하여 온도가 상승함에 따라 저항이 미세하게 증가하는 오차가 있었다.'
      }
    ]
  },
  {
    topicId: 'EXP_04',
    title: '온도에 따른 효소(카탈레이스)의 반응 속도',
    grades: ['2학년', '3학년'],
    classes: ['1반', '2반', '3반'],
    groups: ['빨강모둠', '주황모둠', '노랑모둠', '초록모둠', '파랑모둠'],
    xVarName: '반응 온도',
    xUnit: '°C',
    yVarName: '산소 발생량 (1분간)',
    yUnit: 'mL',
    defaultTrendline: 'quadratic',
    conceptGuide: '효소는 단백질로 이루어져 있어 최적 온도(약 37~40°C)까지는 반응 속도가 증가하지만, 고온에서는 단백질 변성으로 반응 속도가 급감합니다.',
    slopeMeaningGuide: '곡선의 최고점(극대점)은 효소의 최적 온도를 나타냅니다.',
    active: true,
    coreQuestions: [
      '온도가 상승함에 따라 반응 속도가 계속 증가하지 않는 이유는 무엇인가?',
      '최적 온도는 몇 °C 부근에서 나타나는가?',
      '끓인 감자즙(또는 간)을 사용했을 때 거품이 발생하지 않는 원인은 무엇인가?'
    ],
    reportQuestions: [
      {
        id: 'q1',
        title: '자료 해석 (온도 구간별 경향)',
        question: '반응 온도가 올라감에 따라 1분간 산소 발생량은 어떻게 변화하였나요?',
        placeholder: '예: 37°C 부근까지는 산소 발생량이 급격히 증가하다가, 60°C 이상의 고온에서는 급격히 감소하였다.'
      },
      {
        id: 'q2',
        title: '효소의 최적 온도 및 활성 원리',
        question: '카탈레이스 효소의 최적 온도는 몇 도 부근이며, 온도가 효소 반응에 미치는 영향을 설명하세요.',
        placeholder: '예: 분자 운동이 활발해지는 최적 온도(약 38°C)에서 반응 속도가 최대가 됨을 확인하였다.'
      },
      {
        id: 'q3',
        title: '고온에서의 단백질 변성 분석',
        question: '고온에서 거품(산소) 발생이 급격히 줄어들거나 멈추는 이유를 효소의 화학적 구조와 연결하여 서술하세요.',
        placeholder: '예: 효소의 주성분인 단백질이 열에 의해 입체 구조가 변성되어 기질 결합 부위가 파괴되었기 때문이다.'
      }
    ]
  }
];

// Rich sample mock data for all groups so preview and class comparison look brilliant immediately
export const SAMPLE_ALL_GROUPS_DATA: Record<string, GroupExperimentData[]> = {
  'EXP_01-2학년-3반': [
    {
      topicId: 'EXP_01',
      grade: '2학년',
      classNum: '3반',
      groupName: 'A모둠',
      selectedTrendline: 'proportional',
      points: [
        { id: '1', order: 1, x: 0.5, y: 1.25, isOutlier: false, note: '추 1개' },
        { id: '2', order: 2, x: 1.0, y: 2.45, isOutlier: false, note: '추 2개' },
        { id: '3', order: 3, x: 1.5, y: 3.70, isOutlier: false, note: '추 3개' },
        { id: '4', order: 4, x: 2.0, y: 4.95, isOutlier: false, note: '추 4개' },
        { id: '5', order: 5, x: 2.5, y: 6.20, isOutlier: false, note: '추 5개' }
      ],
      conclusionNotes: {
        summary: '추의 무게가 0.5N씩 늘어날 때마다 용수철의 길이가 약 1.23cm씩 일정하게 늘어났다.',
        principle: '늘어난 길이는 추의 무게에 정비례하며, 훅의 법칙(F = kx)을 만족한다.',
        errorAnalysis: '눈금을 수평으로 읽지 않아 0.05cm 내외의 시차 오차가 발생했을 수 있다.'
      },
      lastSavedAt: '2026-08-22 10:15:30'
    },
    {
      topicId: 'EXP_01',
      grade: '2학년',
      classNum: '3반',
      groupName: 'B모둠',
      selectedTrendline: 'proportional',
      points: [
        { id: '1', order: 1, x: 0.5, y: 1.15, isOutlier: false },
        { id: '2', order: 2, x: 1.0, y: 2.30, isOutlier: false },
        { id: '3', order: 3, x: 1.5, y: 3.50, isOutlier: false },
        { id: '4', order: 4, x: 2.0, y: 4.65, isOutlier: false },
        { id: '5', order: 5, x: 2.5, y: 5.80, isOutlier: false }
      ],
      conclusionNotes: {
        summary: '추의 무게가 증가함에 따라 늘어난 길이가 비례하여 증가함.',
        principle: '용수철의 탄성력과 추의 중력이 평형을 이루며 정비례 관계를 증명함.',
        errorAnalysis: '용수철 자체 무게의 영향이 약간 존재함.'
      },
      lastSavedAt: '2026-08-22 10:17:42'
    },
    {
      topicId: 'EXP_01',
      grade: '2학년',
      classNum: '3반',
      groupName: 'C모둠',
      selectedTrendline: 'proportional',
      points: [
        { id: '1', order: 1, x: 0.5, y: 1.30, isOutlier: false },
        { id: '2', order: 2, x: 1.0, y: 2.55, isOutlier: false },
        { id: '3', order: 3, x: 1.5, y: 3.85, isOutlier: false },
        { id: '4', order: 4, x: 2.0, y: 5.10, isOutlier: false },
        { id: '5', order: 5, x: 2.5, y: 6.40, isOutlier: false }
      ],
      conclusionNotes: {
        summary: '추 무게 1N 증가 시 약 2.55cm 신장됨.',
        principle: '훅의 법칙 확인, 기울기를 통해 탄성계수를 역산할 수 있음.',
        errorAnalysis: '추가 흔들릴 때 측정하여 미세한 오차가 발생함.'
      },
      lastSavedAt: '2026-08-22 10:19:10'
    },
    {
      topicId: 'EXP_01',
      grade: '2학년',
      classNum: '3반',
      groupName: 'D모둠',
      selectedTrendline: 'proportional',
      points: [
        { id: '1', order: 1, x: 0.5, y: 1.20, isOutlier: false },
        { id: '2', order: 2, x: 1.0, y: 2.40, isOutlier: false },
        { id: '3', order: 3, x: 1.5, y: 3.65, isOutlier: false },
        { id: '4', order: 4, x: 2.0, y: 4.80, isOutlier: false },
        { id: '5', order: 5, x: 2.5, y: 6.05, isOutlier: false }
      ],
      conclusionNotes: {
        summary: '그래프가 원점을 지나는 완벽한 직선에 가까움.',
        principle: '탄성력과 외력의 비례 관계.',
        errorAnalysis: '자 눈금의 최소 단위(1mm) 한계로 인한 오차.'
      },
      lastSavedAt: '2026-08-22 10:21:05'
    }
  ]
};
