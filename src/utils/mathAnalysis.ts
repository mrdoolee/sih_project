import { DataPoint, TrendlineResult, TrendlineType, ScientificInsight, TopicConfig } from '../types';

export interface ValidPoint {
  x: number;
  y: number;
  id: string;
}

export function filterValidPoints(points: DataPoint[]): ValidPoint[] {
  return points
    .filter((p) => !p.isOutlier && p.x !== '' && p.y !== '' && !isNaN(Number(p.x)) && !isNaN(Number(p.y)))
    .map((p) => ({ x: Number(p.x), y: Number(p.y), id: p.id }))
    .sort((a, b) => a.x - b.x);
}

// Calculate R-squared given actual and predicted values
function calculateR2(actuals: number[], predicteds: number[]): number {
  if (actuals.length < 2) return 0;
  const n = actuals.length;
  const meanY = actuals.reduce((acc, v) => acc + v, 0) / n;
  
  let ssTot = 0;
  let ssRes = 0;
  
  for (let i = 0; i < n; i++) {
    ssTot += Math.pow(actuals[i] - meanY, 2);
    ssRes += Math.pow(actuals[i] - predicteds[i], 2);
  }
  
  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  const r2 = 1 - ssRes / ssTot;
  return Math.max(0, Math.min(1, r2)); // Clamp between 0 and 1
}

// Linear Regression: y = ax + b
export function calculateLinear(points: ValidPoint[]): TrendlineResult {
  const n = points.length;
  if (n < 2) {
    return {
      type: 'linear',
      name: '선형 추세선 (y = ax + b)',
      equation: '데이터 부족 (최소 2점 필요)',
      formula: 'y = ax + b',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) {
    return {
      type: 'linear',
      name: '선형 추세선',
      equation: '수직선 형태 (기울기 무한대)',
      formula: 'y = ax + b',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const actuals = points.map((p) => p.y);
  const predicteds = points.map((p) => slope * p.x + intercept);
  const r2 = calculateR2(actuals, predicteds);

  const sign = intercept >= 0 ? '+' : '-';
  const absInt = Math.abs(intercept).toFixed(3);
  const eqStr = `y = ${slope.toFixed(3)}x ${sign} ${absInt}`;

  return {
    type: 'linear',
    name: '선형 추세선 (y = ax + b)',
    equation: eqStr,
    formula: 'y = ax + b',
    r2: Number(r2.toFixed(4)),
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    validPointsCount: n,
    predict: (x: number) => slope * x + intercept
  };
}

// Proportional (Through Origin): y = ax
export function calculateProportional(points: ValidPoint[]): TrendlineResult {
  const n = points.length;
  if (n < 1) {
    return {
      type: 'proportional',
      name: '원점통과 비례 (y = ax)',
      equation: '데이터 부족',
      formula: 'y = ax',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  let sumXY = 0;
  let sumX2 = 0;

  for (const p of points) {
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  if (sumX2 === 0) {
    return {
      type: 'proportional',
      name: '원점통과 비례',
      equation: 'x값이 모두 0',
      formula: 'y = ax',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  const slope = sumXY / sumX2;
  const actuals = points.map((p) => p.y);
  const predicteds = points.map((p) => slope * p.x);
  const r2 = calculateR2(actuals, predicteds);

  return {
    type: 'proportional',
    name: '원점통과 비례 (y = ax)',
    equation: `y = ${slope.toFixed(3)}x`,
    formula: 'y = ax',
    r2: Number(r2.toFixed(4)),
    slope: Number(slope.toFixed(4)),
    intercept: 0,
    validPointsCount: n,
    predict: (x: number) => slope * x
  };
}

// Inverse Regression: y = k / x
export function calculateInverse(points: ValidPoint[]): TrendlineResult {
  const nonZeroPoints = points.filter((p) => Math.abs(p.x) > 1e-6);
  const n = nonZeroPoints.length;

  if (n < 2) {
    return {
      type: 'inverse',
      name: '반비례 곡선 (y = k / x)',
      equation: '데이터 부족 (x ≠ 0 최소 2점 필요)',
      formula: 'y = k / x',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  // Let u = 1 / x, then y = k * u (linear through origin)
  let sumUY = 0;
  let sumU2 = 0;

  for (const p of nonZeroPoints) {
    const u = 1 / p.x;
    sumUY += u * p.y;
    sumU2 += u * u;
  }

  if (sumU2 === 0) {
    return {
      type: 'inverse',
      name: '반비례 곡선',
      equation: '계산 불가',
      formula: 'y = k / x',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  const k = sumUY / sumU2;
  const actuals = nonZeroPoints.map((p) => p.y);
  const predicteds = nonZeroPoints.map((p) => k / p.x);
  const r2 = calculateR2(actuals, predicteds);

  return {
    type: 'inverse',
    name: '반비례 곡선 (y = k / x)',
    equation: `y = ${k.toFixed(2)} / x`,
    formula: 'y = k / x',
    r2: Number(r2.toFixed(4)),
    k: Number(k.toFixed(4)),
    validPointsCount: n,
    predict: (x: number) => (Math.abs(x) > 1e-6 ? k / x : null)
  };
}

// Quadratic Regression: y = ax^2 + bx + c
export function calculateQuadratic(points: ValidPoint[]): TrendlineResult {
  const n = points.length;
  if (n < 3) {
    return {
      type: 'quadratic',
      name: '2차 다항식 곡선 (y = ax² + bx + c)',
      equation: '데이터 부족 (최소 3점 필요)',
      formula: 'y = ax² + bx + c',
      r2: 0,
      validPointsCount: n,
      predict: () => null
    };
  }

  // Normal equations for polynomial degree 2
  let s0 = n;
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let t0 = 0, t1 = 0, t2 = 0;

  for (const p of points) {
    const x = p.x;
    const y = p.y;
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    t0 += y;
    t1 += x * y;
    t2 += x2 * y;
  }

  // Gaussian elimination for 3x3 matrix:
  // [ s4 s3 s2 | t2 ]
  // [ s3 s2 s1 | t1 ]
  // [ s2 s1 s0 | t0 ]
  const matrix = [
    [s4, s3, s2, t2],
    [s3, s2, s1, t1],
    [s2, s1, s0, t0]
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    if (Math.abs(matrix[i][i]) < 1e-12) {
      return calculateLinear(points); // fallback to linear
    }

    for (let k = i + 1; k < 3; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j <= 3; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }

  const sol = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = matrix[i][3];
    for (let j = i + 1; j < 3; j++) {
      sum -= matrix[i][j] * sol[j];
    }
    sol[i] = sum / matrix[i][i];
  }

  const [a, b, c] = sol;
  const actuals = points.map((p) => p.y);
  const predicteds = points.map((p) => a * p.x * p.x + b * p.x + c);
  const r2 = calculateR2(actuals, predicteds);

  const bSign = b >= 0 ? '+' : '-';
  const cSign = c >= 0 ? '+' : '-';
  const eqStr = `y = ${a.toFixed(3)}x² ${bSign} ${Math.abs(b).toFixed(3)}x ${cSign} ${Math.abs(c).toFixed(3)}`;

  return {
    type: 'quadratic',
    name: '2차 다항식 곡선 (y = ax² + bx + c)',
    equation: eqStr,
    formula: 'y = ax² + bx + c',
    r2: Number(r2.toFixed(4)),
    a: Number(a.toFixed(4)),
    b: Number(b.toFixed(4)),
    c: Number(c.toFixed(4)),
    validPointsCount: n,
    predict: (x: number) => a * x * x + b * x + c
  };
}

export function computeTrendline(type: TrendlineType, points: DataPoint[]): TrendlineResult {
  const valid = filterValidPoints(points);
  switch (type) {
    case 'proportional':
      return calculateProportional(valid);
    case 'inverse':
      return calculateInverse(valid);
    case 'quadratic':
      return calculateQuadratic(valid);
    case 'linear':
    default:
      return calculateLinear(valid);
  }
}

// Generate rich educational insight based on data and regression results
export function generateScientificInsight(
  topic: TopicConfig,
  points: DataPoint[],
  currentResult: TrendlineResult
): ScientificInsight {
  const valid = filterValidPoints(points);
  const outlierCount = points.filter((p) => p.isOutlier).length;

  if (valid.length < 2) {
    return {
      relationshipType: 'uncertain',
      relationshipTitle: '데이터 수집 중',
      description: '의미 있는 과학적 경향성을 분석하기 위해 최소 3개 이상의 측정값을 입력해 주세요.',
      r2Quality: 'moderate',
      r2Comment: '측정값이 더 입력되면 정확한 결정계수(R²) 및 관계식을 분석합니다.',
      outlierCount,
      recommendedQuestion: '독립변인을 일정 간격으로 변화시키며 종속변인의 변화를 관찰하세요.'
    };
  }

  // Check R2 quality
  let r2Quality: 'excellent' | 'good' | 'moderate' | 'poor' = 'moderate';
  let r2Comment = '';
  if (currentResult.r2 >= 0.98) {
    r2Quality = 'excellent';
    r2Comment = `결정계수 R² = ${currentResult.r2.toFixed(4)}로 실험 데이터가 이론적 모델과 매우 일치하며 오차가 극히 적습니다.`;
  } else if (currentResult.r2 >= 0.92) {
    r2Quality = 'good';
    r2Comment = `결정계수 R² = ${currentResult.r2.toFixed(4)}로 뚜렷한 상관관계와 유의미한 경향성을 보여줍니다.`;
  } else if (currentResult.r2 >= 0.75) {
    r2Quality = 'moderate';
    r2Comment = `결정계수 R² = ${currentResult.r2.toFixed(4)}로 경향성은 관찰되나 측정 과정에서의 오차나 이상치가 포함되어 있을 수 있습니다.`;
  } else {
    r2Quality = 'poor';
    r2Comment = `결정계수 R² = ${currentResult.r2.toFixed(4)}로 데이터의 산포도가 높습니다. 다른 추세선 모델을 시도하거나 이상치를 확인해 보세요.`;
  }

  // Interpret slope / formula according to trendline
  let relType: ScientificInsight['relationshipType'] = 'uncertain';
  let relTitle = '';
  let desc = '';
  let slopeInterpretation = topic.slopeMeaningGuide;

  if (currentResult.type === 'proportional' || (currentResult.type === 'linear' && Math.abs(currentResult.intercept || 0) < 0.2)) {
    relType = 'direct_proportional';
    const slopeVal = currentResult.slope ?? 1;
    relTitle = `${topic.xVarName}와 ${topic.yVarName}는 정비례 관계 (y = ax)`;
    desc = `독립변인(${topic.xVarName})이 2배, 3배 증가할 때 종속변인(${topic.yVarName})도 약 ${slopeVal.toFixed(2)}배 비율로 일정하게 증가합니다. 그래프가 원점을 지나는 직선에 가깝습니다.`;
  } else if (currentResult.type === 'linear') {
    relType = 'linear_with_offset';
    const slopeVal = currentResult.slope ?? 0;
    const isPositive = slopeVal >= 0;
    relTitle = `${topic.xVarName}와 ${topic.yVarName}는 ${isPositive ? '양의' : '음의'} 선형 관계 (y = ax + b)`;
    desc = `${topic.xVarName}가 증가할 때 ${topic.yVarName}는 ${isPositive ? '일정하게 증가' : '일정하게 감소'}합니다. y절편(${currentResult.intercept?.toFixed(2)} ${topic.yUnit})은 초기값 또는 기본 영점 오차를 의미할 수 있습니다.`;
  } else if (currentResult.type === 'inverse') {
    relType = 'inverse_proportional';
    relTitle = `${topic.xVarName}와 ${topic.yVarName}는 반비례 관계 (y = k / x)`;
    desc = `${topic.xVarName}가 2배, 3배로 증가할 때 ${topic.yVarName}는 1/2배, 1/3배로 감소합니다. 두 변인의 곱(${topic.xVarName} × ${topic.yVarName} ≈ ${currentResult.k?.toFixed(1)})이 거의 일정하게 유지됩니다.`;
  } else if (currentResult.type === 'quadratic') {
    relType = 'quadratic';
    relTitle = `${topic.xVarName}에 따른 2차 곡선 또는 극대/극소 변화`;
    desc = `${topic.xVarName}의 변화에 따라 ${topic.yVarName}가 단순 비례하지 않고 완만한 곡선을 그리며 특정 구간에서 최대치에 도달하거나 급변합니다.`;
  }

  // Outlier detection check
  let outlierWarning: string | undefined;
  if (valid.length >= 3) {
    const residuals = valid.map((p) => {
      const pred = currentResult.predict(p.x);
      return pred !== null ? Math.abs(p.y - pred) : 0;
    });
    const maxRes = Math.max(...residuals);
    const maxIdx = residuals.indexOf(maxRes);
    const meanY = valid.reduce((a, b) => a + b.y, 0) / valid.length;
    
    if (meanY > 0 && maxRes / meanY > 0.25) {
      const suspiciousPoint = valid[maxIdx];
      outlierWarning = `측정점 (X=${suspiciousPoint.x}, Y=${suspiciousPoint.y})이 추세선 예측치에서 다소 벗어나 있습니다. 눈금 읽기나 실험 조건에 이상이 없었는지 확인해보세요.`;
    }
  }

  const recommendedQuestion = topic.coreQuestions && topic.coreQuestions.length > 0
    ? topic.coreQuestions[0]
    : '이 실험 결과가 제시하는 일반적인 과학 법칙을 자신의 언어로 정리해보세요.';

  return {
    relationshipType: relType,
    relationshipTitle: relTitle,
    description: desc,
    slopeInterpretation,
    r2Quality,
    r2Comment,
    outlierCount,
    outlierWarning,
    recommendedQuestion
  };
}
