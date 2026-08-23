import React, { useState, useMemo } from 'react';
import {
  X,
  BarChart3,
  RefreshCw,
  Layers,
  Table as TableIcon,
  TrendingUp,
  Award,
  CheckCircle2,
  Users
} from 'lucide-react';
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
  TopicConfig,
  GroupExperimentData,
  TrendlineType
} from '../types';
import { filterValidPoints, computeTrendline } from '../utils/mathAnalysis';

interface AllGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicConfig;
  grade: string;
  classNum: string;
  allGroupsData: GroupExperimentData[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

const GROUP_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#ea580c', // orange
  '#9333ea', // purple
  '#e11d48', // rose
  '#0891b2', // cyan
  '#ca8a04', // yellow-amber
  '#4f46e5', // indigo
  '#059669', // emerald
  '#db2777'  // pink
];

export const AllGroupsModal: React.FC<AllGroupsModalProps> = ({
  isOpen,
  onClose,
  topic,
  grade,
  classNum,
  allGroupsData,
  onRefresh,
  isRefreshing
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});

  // Get distinct group names from topic or existing data
  const groupNames = useMemo(() => {
    const list = new Set<string>();
    topic.groups.forEach((g) => list.add(g));
    allGroupsData.forEach((d) => list.add(d.groupName));
    return Array.from(list);
  }, [topic, allGroupsData]);

  // Assign color to each group
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    groupNames.forEach((name, idx) => {
      map[name] = GROUP_COLORS[idx % GROUP_COLORS.length];
    });
    return map;
  }, [groupNames]);

  // Compute trendline and metrics for each group
  const groupMetrics = useMemo(() => {
    return groupNames.map((gName) => {
      const gData = allGroupsData.find((d) => d.groupName === gName);
      const points = gData ? gData.points : [];
      const valid = filterValidPoints(points);
      const trendType: TrendlineType = gData?.selectedTrendline || topic.defaultTrendline || 'linear';
      const trend = computeTrendline(trendType, points);

      return {
        groupName: gName,
        hasData: valid.length > 0,
        validCount: valid.length,
        points: valid,
        trend,
        conclusion: gData?.conclusionNotes?.summary || (gData?.conclusionNotes?.answers ? Object.values(gData.conclusionNotes.answers).filter(Boolean).join(' / ') : '') || '',
        principle: gData?.conclusionNotes?.principle || '',
        lastSavedAt: gData?.lastSavedAt
      };
    });
  }, [groupNames, allGroupsData, topic]);

  // Prepare multi-series chart data
  const { chartData, xDomain, yDomain } = useMemo(() => {
    const allValidPoints = groupMetrics.flatMap((g) => g.points);
    if (allValidPoints.length === 0) {
      return { chartData: [], xDomain: [0, 10], yDomain: [0, 10] };
    }

    const xVals = allValidPoints.map((p) => p.x);
    const yVals = allValidPoints.map((p) => p.y);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    const marginX = (maxX - minX) * 0.1 || 1;
    const marginY = (maxY - minY) * 0.1 || 1;

    // Collect scatter items for each group
    const combinedData: Array<{ x: number; [key: string]: number | string | null | undefined }> = [];

    // Curve evaluation points
    const steps = 40;
    const stepSize = (maxX + marginX - Math.max(0, minX - marginX)) / steps;
    const startX = Math.max(0, minX - marginX);

    for (let i = 0; i <= steps; i++) {
      const curX = startX + i * stepSize;
      const row: { x: number; [key: string]: any } = { x: Number(curX.toFixed(3)) };

      groupMetrics.forEach((gm) => {
        if (gm.hasData) {
          const pred = gm.trend.predict(curX);
          row[`${gm.groupName}_trend`] = pred !== null && !isNaN(pred) && isFinite(pred) ? Number(pred.toFixed(3)) : null;
        }
      });
      combinedData.push(row);
    }

    // Add individual scatter points
    groupMetrics.forEach((gm) => {
      if (gm.hasData) {
        gm.points.forEach((pt) => {
          combinedData.push({
            x: pt.x,
            [`${gm.groupName}_actual`]: pt.y,
            groupLabel: gm.groupName
          });
        });
      }
    });

    combinedData.sort((a, b) => a.x - b.x);

    return {
      chartData: combinedData,
      xDomain: [Math.max(0, Math.floor(minX - marginX)), Math.ceil(maxX + marginX)],
      yDomain: [Math.max(0, Math.floor(minY - marginY)), Math.ceil(maxY + marginY)]
    };
  }, [groupMetrics]);

  // Overall class averages
  const classAvgSlope = useMemo(() => {
    const validTrends = groupMetrics.filter((g) => g.hasData && g.trend.slope !== undefined);
    if (validTrends.length === 0) return null;
    const sum = validTrends.reduce((acc, g) => acc + (g.trend.slope || 0), 0);
    return (sum / validTrends.length).toFixed(3);
  }, [groupMetrics]);

  const classAvgR2 = useMemo(() => {
    const validTrends = groupMetrics.filter((g) => g.hasData && g.trend.r2 > 0);
    if (validTrends.length === 0) return null;
    const sum = validTrends.reduce((acc, g) => acc + g.trend.r2, 0);
    return (sum / validTrends.length).toFixed(4);
  }, [groupMetrics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  전체 모둠 데이터 통합 비교
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {grade} {classNum}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                {topic.title} ({topic.xVarName} ⟷ {topic.yVarName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              title="구글 스프레드시트에서 최신 데이터 다시 불러오기"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '불러오는 중...' : '새로고침'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar with View Tabs & Class Summary Stats */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('chart')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                activeTab === 'chart'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>다중 오버레이 그래프</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                activeTab === 'table'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>모둠별 통계 비교표</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600">
              참여 모둠: <strong className="text-slate-900">{groupMetrics.filter((g) => g.hasData).length}</strong> / {groupNames.length}개
            </span>
            {classAvgSlope && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  학급 평균 기울기: <strong className="text-indigo-700">{classAvgSlope}</strong>
                </span>
              </>
            )}
            {classAvgR2 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  학급 평균 R²: <strong className="text-emerald-700">{classAvgR2}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'chart' ? (
            <div className="space-y-4">
              {/* Overlay Chart */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-700">
                    전체 모둠 측정점 및 추세선 겹쳐보기 (Multi-Series Overlay)
                  </span>
                  <span className="text-slate-400">
                    각 모둠별 고유 색상 점과 실선 추세선
                  </span>
                </div>

                <div className="h-[360px] w-full">
                  {chartData.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-300 mb-2" />
                      <p>아직 입력된 모둠 데이터가 없습니다.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 30, bottom: 25, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={xDomain}
                          tick={{ fontSize: 11 }}
                          stroke="#64748b"
                          label={{
                            value: `${topic.xVarName} (${topic.xUnit})`,
                            position: 'insideBottom',
                            offset: -15,
                            fontSize: 12,
                            fill: '#334155',
                            fontWeight: 600
                          }}
                        />
                        <YAxis
                          type="number"
                          domain={yDomain}
                          tick={{ fontSize: 11 }}
                          stroke="#64748b"
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
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 max-w-xs">
                                  <div className="font-bold text-amber-300 border-b border-slate-700 pb-1">
                                    {topic.xVarName} (X) = {item.x} {topic.xUnit}
                                  </div>
                                  {groupMetrics.map((gm) => {
                                    const actual = item[`${gm.groupName}_actual`];
                                    const trend = item[`${gm.groupName}_trend`];
                                    if (actual === undefined && trend === undefined) return null;
                                    return (
                                      <div key={gm.groupName} className="flex items-center justify-between gap-3">
                                        <span className="font-semibold" style={{ color: colorMap[gm.groupName] }}>
                                          {gm.groupName}:
                                        </span>
                                        <span className="text-slate-200">
                                          {actual !== undefined ? `실측 ${actual}` : `추세 ${trend}`} {topic.yUnit}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                        />
                        <ReferenceLine x={0} stroke="#cbd5e1" />
                        <ReferenceLine y={0} stroke="#cbd5e1" />

                        {/* Render Lines & Scatters for each group */}
                        {groupMetrics.map((gm) => {
                          if (!gm.hasData) return null;
                          const color = colorMap[gm.groupName];
                          return (
                            <React.Fragment key={gm.groupName}>
                              <Line
                                type="monotone"
                                dataKey={`${gm.groupName}_trend`}
                                name={`${gm.groupName} 추세`}
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                              <Scatter
                                dataKey={`${gm.groupName}_actual`}
                                name={`${gm.groupName} 실측치`}
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth={1}
                              />
                            </React.Fragment>
                          );
                        })}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Group Badges List */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {groupMetrics.map((gm) => {
                  const color = colorMap[gm.groupName];
                  return (
                    <div
                      key={gm.groupName}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex flex-col justify-between text-xs"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          ></span>
                          <span className="text-slate-800">{gm.groupName}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            gm.hasData
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {gm.hasData ? `${gm.validCount}개 측정` : '미입력'}
                        </span>
                      </div>
                      {gm.hasData ? (
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <div>식: <code className="text-indigo-900 font-semibold">{gm.trend.equation}</code></div>
                          <div>R²: <strong className="text-slate-800">{gm.trend.r2}</strong></div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">데이터 대기중</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">모둠명</th>
                    <th className="py-2.5 px-3 text-center">측정 수</th>
                    <th className="py-2.5 px-3">추세선 방정식</th>
                    <th className="py-2.5 px-3 text-center">기울기 (a)</th>
                    <th className="py-2.5 px-3 text-center">결정계수 (R²)</th>
                    <th className="py-2.5 px-3">학생 결론 요약</th>
                    <th className="py-2.5 px-3 text-right">저장 시각</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  {groupMetrics.map((gm) => {
                    const color = colorMap[gm.groupName];
                    return (
                      <tr key={gm.groupName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          ></span>
                          <span>{gm.groupName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                          {gm.validCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-900 font-medium">
                          {gm.hasData ? gm.trend.equation : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {gm.hasData && gm.trend.slope !== undefined ? gm.trend.slope : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {gm.hasData ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                gm.trend.r2 >= 0.95
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {gm.trend.r2}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[240px] truncate text-slate-600">
                          {gm.conclusion || '(작성 미완료)'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          {gm.lastSavedAt || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            💡 모둠별 기울기와 R²를 비교하여 실험 오차 원인과 경향성을 토의해보세요.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
