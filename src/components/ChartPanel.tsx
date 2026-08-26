import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Activity,
  PenTool,
  Cpu,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import {
  DataPoint,
  TopicConfig,
  TrendlineType,
  TrendlineResult,
  StudentManualGraphData
} from '../types';
import { filterValidPoints, computeTrendline } from '../utils/mathAnalysis';
import { ManualGraphCanvas } from './ManualGraphCanvas';

interface ChartPanelProps {
  topic: TopicConfig;
  groupName: string;
  points: DataPoint[];
  selectedTrendline: TrendlineType;
  onChangeTrendline: (type: TrendlineType) => void;
  manualGraphData?: StudentManualGraphData;
  onChangeManualGraphData?: (data: StudentManualGraphData) => void;
  allowAutoAnalysis?: boolean;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  topic,
  groupName,
  points,
  selectedTrendline,
  onChangeTrendline,
  manualGraphData,
  onChangeManualGraphData,
  allowAutoAnalysis = true
}) => {
  // Main view mode: 'manual' (default: student plots and draws ruler) or 'auto' (computer regression analysis)
  const [viewMode, setViewMode] = useState<'manual' | 'auto'>('manual');

  // If teacher disables auto analysis, ensure we stay in manual mode
  const currentViewMode = allowAutoAnalysis ? viewMode : 'manual';

  const validPoints = useMemo(() => filterValidPoints(points), [points]);

  // Compute trendline results
  const trendResult: TrendlineResult = useMemo(() => {
    return computeTrendline(selectedTrendline, points);
  }, [selectedTrendline, points]);

  // Build chart dataset with fine-grained interpolation curve for trendline
  const chartData = useMemo(() => {
    if (validPoints.length === 0) return [];

    const xVals = validPoints.map((p) => p.x);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const margin = (maxX - minX) * 0.1 || (maxX * 0.1) || 1;
    const startX = Math.max(0, minX - margin);
    const endX = maxX + margin;

    // Generate curve points
    const steps = 60;
    const stepSize = (endX - startX) / steps;
    const curvePoints: Array<{ x: number; trendY: number | null; actualY?: number; label?: string }> = [];

    for (let i = 0; i <= steps; i++) {
      const curX = startX + i * stepSize;
      const predictedY = trendResult.predict(curX);
      curvePoints.push({
        x: Number(curX.toFixed(3)),
        trendY: predictedY !== null && !isNaN(predictedY) && isFinite(predictedY) ? Number(predictedY.toFixed(3)) : null
      });
    }

    // Merge actual data points
    const merged = [...curvePoints];
    validPoints.forEach((vp) => {
      merged.push({
        x: vp.x,
        actualY: vp.y,
        trendY: trendResult.predict(vp.x) !== null ? Number(trendResult.predict(vp.x)?.toFixed(3)) : null,
        label: `${groupName} 측정값`
      });
    });

    return merged.sort((a, b) => a.x - b.x);
  }, [validPoints, trendResult, groupName]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Primary Top Tab Navigation: Manual (Default) vs Automated (Option) */}
      <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {allowAutoAnalysis ? (
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('manual')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  currentViewMode === 'manual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>✏️ 직접 그리기 (모눈종이 작도)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/50 rounded-full text-blue-100 font-normal">
                  기본 활동
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('auto')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  currentViewMode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>🤖 컴퓨터 자동 분석 그래프</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/40 rounded-full text-indigo-200 font-normal">
                  옵션/비교
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-950/80 rounded-lg border border-blue-800/60 text-xs text-blue-200 font-semibold">
              <PenTool className="w-3.5 h-3.5 text-blue-400" />
              <span>모눈종이 직접 작도 활동</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-300 flex items-center gap-1.5">
          <span className="text-slate-400">탐구 변인:</span>
          <span className="font-semibold text-blue-300">{topic.xVarName}({topic.xUnit})</span>
          <span className="text-slate-500">vs</span>
          <span className="font-semibold text-emerald-300">{topic.yVarName}({topic.yUnit})</span>
        </div>
      </div>

      {/* VIEW MODE 1: MANUAL STUDENT GRAPH CANVAS (DEFAULT) */}
      {currentViewMode === 'manual' ? (
        <div className="flex-1 flex flex-col">
          <ManualGraphCanvas
            topic={topic}
            groupName={groupName}
            points={points}
            manualGraphData={manualGraphData}
            onChangeManualGraphData={onChangeManualGraphData}
            allowAutoAnalysis={allowAutoAnalysis}
            onSwitchToAuto={allowAutoAnalysis ? () => setViewMode('auto') : undefined}
          />
        </div>
      ) : (
        /* VIEW MODE 2: AUTOMATED COMPUTER CHART & REGRESSION (OPTION) */
        <div className="flex-1 flex flex-col">
          {/* Sub Header with Trendline Model Controls */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">추세선 모델 선택:</span>
            </div>

            {/* Trendline Model Buttons */}
            <div className="flex items-center flex-wrap gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onChangeTrendline('proportional')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTrendline === 'proportional'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="원점을 지나는 비례 관계 (y = ax)"
              >
                원점비례 (y=ax)
              </button>
              <button
                type="button"
                onClick={() => onChangeTrendline('linear')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTrendline === 'linear'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="일반 1차 선형 관계 (y = ax + b)"
              >
                선형 (y=ax+b)
              </button>
              <button
                type="button"
                onClick={() => onChangeTrendline('inverse')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTrendline === 'inverse'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="반비례 관계 (y = k / x)"
              >
                반비례 (y=k/x)
              </button>
              <button
                type="button"
                onClick={() => onChangeTrendline('quadratic')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTrendline === 'quadratic'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2차 곡선 관계 (y = ax² + bx + c)"
              >
                2차곡선 (y=ax²)
              </button>
            </div>
          </div>

          {/* Regression Equation & R² Status Banner */}
          <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">최적 추세식:</span>
              <code className="px-2 py-0.5 rounded bg-white text-indigo-900 font-bold border border-indigo-200 text-[13px]">
                {trendResult.equation}
              </code>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">결정계수 (R²):</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                    trendResult.r2 >= 0.95
                      ? 'bg-emerald-100 text-emerald-800'
                      : trendResult.r2 >= 0.85
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  R² = {trendResult.r2.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Main Automated Chart Area */}
          <div className="p-3 flex-1 min-h-[280px]">
            {validPoints.length === 0 ? (
              <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <Activity className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <p className="font-medium text-slate-600">그래프를 렌더링할 데이터가 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">
                  좌측 표에 {topic.xVarName}과 {topic.yVarName} 값을 입력하면 실시간으로 그려집니다.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 15, right: 25, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    name={topic.xVarName}
                    unit={` ${topic.xUnit}`}
                    label={{
                      value: `${topic.xVarName} (${topic.xUnit})`,
                      position: 'insideBottom',
                      offset: -12,
                      fontSize: 12,
                      fill: '#334155',
                      fontWeight: 600
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    name={topic.yVarName}
                    unit={` ${topic.yUnit}`}
                    label={{
                      value: `${topic.yVarName} (${topic.yUnit})`,
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      fontSize: 12,
                      fill: '#334155',
                      fontWeight: 600
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                            <div className="font-bold text-blue-300 border-b border-slate-700 pb-1">
                              {data.actualY !== undefined ? `📍 ${groupName} 측정점` : '📈 추세선 예측치'}
                            </div>
                            <div>
                              {topic.xVarName} (X): <span className="font-semibold text-amber-300">{data.x} {topic.xUnit}</span>
                            </div>
                            {data.actualY !== undefined && (
                              <div>
                                측정 {topic.yVarName} (Y): <span className="font-semibold text-emerald-300">{data.actualY} {topic.yUnit}</span>
                              </div>
                            )}
                            {data.trendY !== null && data.trendY !== undefined && (
                              <div className="text-indigo-200">
                                추세선 예측치: {data.trendY} {topic.yUnit}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 6, fontSize: 11 }}
                  />
                  <ReferenceLine x={0} stroke="#cbd5e1" />
                  <ReferenceLine y={0} stroke="#cbd5e1" />

                  {/* Trendline Curve */}
                  <Line
                    type="monotone"
                    dataKey="trendY"
                    name={`${trendResult.name}`}
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  {/* Actual Data Points Scatter */}
                  <Scatter
                    dataKey="actualY"
                    name={`${groupName} 실측치`}
                    fill="#2563eb"
                    stroke="#1e40af"
                    strokeWidth={1.5}
                    shape="circle"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

