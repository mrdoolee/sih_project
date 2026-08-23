import React, { useState, useEffect, useMemo } from 'react';
import {
  TopicConfig,
  GroupExperimentData,
  GroupEvaluation,
  DataPoint,
  getEffectiveReportQuestions
} from '../types';
import {
  getStoredEvaluation,
  saveEvaluationToGAS,
  fetchEvaluationsFromGAS,
  getStoredEvaluations
} from '../utils/gasService';
import { printElement } from '../utils/printHelper';
import {
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Printer,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line
} from 'recharts';

interface ResultsEvaluationDashboardProps {
  topics: TopicConfig[];
  allGroupsData: GroupExperimentData[];
  gasWebAppUrl: string;
  onRefreshData?: () => void;
  isLoading?: boolean;
}

export const ResultsEvaluationDashboard: React.FC<ResultsEvaluationDashboardProps> = ({
  topics,
  allGroupsData,
  gasWebAppUrl,
  onRefreshData,
  isLoading
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.topicId || 'EXP_01');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');

  // Local evaluations store
  const [evaluations, setEvaluations] = useState<Record<string, GroupEvaluation>>(() => getStoredEvaluations());
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active topic
  const currentTopic = useMemo(() => {
    return topics.find((t) => t.topicId === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  // Keep grade/class/group in sync when topic changes
  useEffect(() => {
    if (currentTopic) {
      if (!selectedGrade || !currentTopic.grades.includes(selectedGrade)) {
        setSelectedGrade(currentTopic.grades[0] || '1학년');
      }
      if (!selectedClass || !currentTopic.classes.includes(selectedClass)) {
        setSelectedClass(currentTopic.classes[0] || '1반');
      }
      if (!selectedGroupName || !currentTopic.groups.includes(selectedGroupName)) {
        setSelectedGroupName(currentTopic.groups[0] || 'A모둠');
      }
    }
  }, [currentTopic]);

  const [isFetchingGAS, setIsFetchingGAS] = useState(false);
  const handleManualFetchEvaluations = async () => {
    if (!gasWebAppUrl || !gasWebAppUrl.startsWith('http')) return;
    setIsFetchingGAS(true);
    try {
      const fetched = await fetchEvaluationsFromGAS(gasWebAppUrl);
      if (fetched) {
        setEvaluations(fetched);
        setSaveMessage({ type: 'success', text: '스프레드시트에서 최신 평가 데이터를 성공적으로 불러왔습니다.' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch {
      setSaveMessage({ type: 'error', text: '평가 데이터 불러오기 중 오류가 발생했습니다.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsFetchingGAS(false);
    }
  };

  // Listen to local evaluation updates
  useEffect(() => {
    const handleUpdated = (e: CustomEvent) => {
      if (e.detail) setEvaluations(e.detail);
    };
    window.addEventListener('science_lab_evaluations_updated', handleUpdated as EventListener);
    return () => {
      window.removeEventListener('science_lab_evaluations_updated', handleUpdated as EventListener);
    };
  }, []);

  // Filter group data matching current criteria
  const matchingClassGroups = useMemo(() => {
    return allGroupsData.filter(
      (g) => g.topicId === selectedTopicId && g.grade === selectedGrade && g.classNum === selectedClass
    );
  }, [allGroupsData, selectedTopicId, selectedGrade, selectedClass]);

  // Selected group data
  const currentGroupData = useMemo(() => {
    return (
      matchingClassGroups.find((g) => g.groupName === selectedGroupName) ||
      allGroupsData.find(
        (g) =>
          g.topicId === selectedTopicId &&
          g.grade === selectedGrade &&
          g.classNum === selectedClass &&
          g.groupName === selectedGroupName
      ) ||
      null
    );
  }, [matchingClassGroups, allGroupsData, selectedTopicId, selectedGrade, selectedClass, selectedGroupName]);

  // Current group evaluation state
  const currentEvalKey = `${selectedTopicId}__${selectedGrade}__${selectedClass}__${selectedGroupName}`;
  const existingEval = evaluations[currentEvalKey];

  const [formScore, setFormScore] = useState<string>('A');
  const [formFeedback, setFormFeedback] = useState<string>('');
  const [formAccuracy, setFormAccuracy] = useState<number>(5);
  const [formInterpretation, setFormInterpretation] = useState<number>(5);
  const [formReasoning, setFormReasoning] = useState<number>(5);
  const [formErrorAnalysis, setFormErrorAnalysis] = useState<number>(5);
  const [formAttitude, setFormAttitude] = useState<number>(5);
  const [formEvaluator, setFormEvaluator] = useState<string>('과학교사');

  // Sync form inputs when selected group or existingEval changes
  useEffect(() => {
    if (existingEval) {
      setFormScore(existingEval.score || 'A');
      setFormFeedback(existingEval.feedbackComment || '');
      setFormAccuracy(existingEval.rubricScores?.accuracy ?? 5);
      setFormInterpretation(existingEval.rubricScores?.graphInterpretation ?? 5);
      setFormReasoning(existingEval.rubricScores?.scientificReasoning ?? 5);
      setFormErrorAnalysis(existingEval.rubricScores?.errorAnalysis ?? 5);
      setFormAttitude(existingEval.rubricScores?.attitude ?? 5);
      setFormEvaluator(existingEval.evaluator || '과학교사');
    } else {
      setFormScore('A');
      setFormFeedback('');
      setFormAccuracy(5);
      setFormInterpretation(5);
      setFormReasoning(5);
      setFormErrorAnalysis(5);
      setFormAttitude(5);
      setFormEvaluator('과학교사');
    }
    setSaveMessage(null);
  }, [currentEvalKey, existingEval]);

  // Total rubric score calculation
  const totalRubricScore = formAccuracy + formInterpretation + formReasoning + formErrorAnalysis + formAttitude;
  const scaledScore100 = Math.round((totalRubricScore / 25) * 100);

  // Save evaluation handler
  const handleSaveEvaluation = async () => {
    setIsSavingEval(true);
    setSaveMessage(null);

    const newEval: GroupEvaluation = {
      topicId: selectedTopicId,
      grade: selectedGrade,
      classNum: selectedClass,
      groupName: selectedGroupName,
      score: formScore,
      feedbackComment: formFeedback,
      rubricScores: {
        accuracy: formAccuracy,
        graphInterpretation: formInterpretation,
        scientificReasoning: formReasoning,
        errorAnalysis: formErrorAnalysis,
        attitude: formAttitude
      },
      evaluator: formEvaluator || '과학교사',
      evaluatedAt: new Date().toLocaleString('ko-KR')
    };

    const res = await saveEvaluationToGAS(newEval, gasWebAppUrl);
    setIsSavingEval(false);
    if (res.success) {
      setSaveMessage({ type: 'success', text: res.message });
      setEvaluations((prev) => ({ ...prev, [currentEvalKey]: newEval }));
    } else {
      setSaveMessage({ type: 'error', text: res.message || '저장 중 오류가 발생했습니다.' });
    }
  };

  // Linear regression calculation for current group
  const regressionResult = useMemo(() => {
    if (!currentGroupData || !currentGroupData.points || currentGroupData.points.length < 2) return null;
    const validPoints = currentGroupData.points.filter((p) => !p.isOutlier && !isNaN(p.x) && !isNaN(p.y));
    if (validPoints.length < 2) return null;

    const n = validPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (const p of validPoints) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R^2
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const r = denominator !== 0 ? numerator / denominator : 0;
    const r2 = r * r;

    return {
      slope: Number(slope.toFixed(4)),
      intercept: Number(intercept.toFixed(4)),
      r2: Number(r2.toFixed(4)),
      count: n
    };
  }, [currentGroupData]);

  // Points prepared for Recharts Scatter with trendline
  const chartData = useMemo(() => {
    if (!currentGroupData?.points) return [];
    return currentGroupData.points.map((p) => ({
      x: p.x,
      y: p.y,
      order: p.order,
      isOutlier: p.isOutlier,
      note: p.note
    }));
  }, [currentGroupData]);

  const trendlineData = useMemo(() => {
    if (!regressionResult || chartData.length === 0) return [];
    const xValues = chartData.map((d) => d.x);
    const minX = Math.min(0, ...xValues);
    const maxX = Math.max(...xValues) * 1.15;
    return [
      { x: minX, y: regressionResult.slope * minX + regressionResult.intercept },
      { x: maxX, y: regressionResult.slope * maxX + regressionResult.intercept }
    ];
  }, [regressionResult, chartData]);

  // Print Handlers
  const handlePrintGroupReport = () => {
    printElement('printable-group-evaluation-report', {
      title: `[탐구평가서]_${selectedTopicId}_${selectedGrade}_${selectedClass}_${selectedGroupName}`,
      pageOrientation: 'portrait'
    });
  };

  const handlePrintClassSummary = () => {
    printElement('printable-class-evaluation-summary', {
      title: `[학급종합평가표]_${selectedTopicId}_${selectedGrade}_${selectedClass}`,
      pageOrientation: 'landscape'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter & Controls Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>탐구 결과 확인 & 평가</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  교사 전용 대시보드
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                모둠별 측정값, 회귀 분석 그래프, 학생 결론 답변을 통합 검토하고 채점 및 피드백을 기록합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualFetchEvaluations}
              disabled={isFetchingGAS || isLoading || !gasWebAppUrl}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="구글 스프레드시트에서 학생 탐구 데이터와 평가 결과를 새로 불러옵니다."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGAS || isLoading ? 'animate-spin' : ''}`} />
              <span>📥 시트에서 불러오기</span>
            </button>
            <button
              type="button"
              onClick={handlePrintClassSummary}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="학급 전체 모둠 제출현황 및 평가 취합표 인쇄"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>학급 종합표 인쇄/PDF</span>
            </button>
          </div>
        </div>

        {/* 4-Step Selection Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Topic Select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. 탐구 주제</span>
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {topics.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  [{t.topicId}] {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. 학년</span>
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currentTopic?.grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Class Select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. 반</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currentTopic?.classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Group Select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>4. 평가 대상 모둠</span>
            </label>
            <select
              value={selectedGroupName}
              onChange={(e) => setSelectedGroupName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currentTopic?.groups.map((grp) => {
                const groupData = allGroupsData.find(
                  (g) =>
                    g.topicId === selectedTopicId &&
                    g.grade === selectedGrade &&
                    g.classNum === selectedClass &&
                    g.groupName === grp
                );
                const evalItem = evaluations[`${selectedTopicId}__${selectedGrade}__${selectedClass}__${grp}`];
                const ptCount = groupData?.points?.length || 0;
                const statusTag = evalItem ? `[평가:${evalItem.score}]` : ptCount > 0 ? `[제출:${ptCount}건]` : '[미제출]';
                return (
                  <option key={grp} value={grp}>
                    {grp} {statusTag}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Group Tabs Pills */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 shrink-0 mr-1">모둠 바로가기:</span>
          {currentTopic?.groups.map((grp) => {
            const isSelected = grp === selectedGroupName;
            const groupData = allGroupsData.find(
              (g) =>
                g.topicId === selectedTopicId &&
                g.grade === selectedGrade &&
                g.classNum === selectedClass &&
                g.groupName === grp
            );
            const evalItem = evaluations[`${selectedTopicId}__${selectedGrade}__${selectedClass}__${grp}`];
            const hasData = (groupData?.points?.length || 0) > 0;

            return (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroupName(grp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : hasData
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{grp}</span>
                {evalItem ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-bold">
                    {evalItem.score || '✓'}
                  </span>
                ) : hasData ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Review & Evaluation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Student Submission (Measurements, Graph, Q&A) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Summary for Current Group */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-sm border border-indigo-500/30">
                  {selectedGrade} {selectedClass} {selectedGroupName}
                </span>
                <span className="text-xs text-slate-400">
                  최종 제출: {currentGroupData?.lastSavedAt || '기록 없음'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {currentTopic?.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={handlePrintGroupReport}
              className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>모둠 보고서 인쇄 / PDF</span>
            </button>
          </div>

          {/* 1. Graph Visualizer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>모둠 실험 데이터 그래프 & 회귀선</span>
              </h4>
              {regressionResult && (
                <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-800/60">
                  y = {regressionResult.slope}x {regressionResult.intercept >= 0 ? `+ ${regressionResult.intercept}` : `- ${Math.abs(regressionResult.intercept)}`} (R²={regressionResult.r2})
                </div>
              )}
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 sm:h-72 w-full bg-slate-950 rounded-2xl p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 25, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={currentTopic?.xVarName || 'X'}
                      unit={currentTopic?.xUnit ? ` ${currentTopic.xUnit}` : ''}
                      stroke="#94a3b8"
                      fontSize={11}
                      label={{
                        value: `${currentTopic?.xVarName || 'X'}${currentTopic?.xUnit ? ` (${currentTopic.xUnit})` : ''}`,
                        position: 'bottom',
                        offset: 10,
                        fill: '#94a3b8',
                        fontSize: 11
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={currentTopic?.yVarName || 'Y'}
                      unit={currentTopic?.yUnit ? ` ${currentTopic.yUnit}` : ''}
                      stroke="#94a3b8"
                      fontSize={11}
                      label={{
                        value: `${currentTopic?.yVarName || 'Y'}${currentTopic?.yUnit ? ` (${currentTopic.yUnit})` : ''}`,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        fill: '#94a3b8',
                        fontSize: 11
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-200 shadow-xl">
                            <p className="font-bold text-indigo-300">
                              {data.order ? `${data.order}차 측정` : '데이터점'}
                            </p>
                            <p>
                              {currentTopic?.xVarName}: <span className="text-white font-mono">{data.x} {currentTopic?.xUnit}</span>
                            </p>
                            <p>
                              {currentTopic?.yVarName}: <span className="text-white font-mono">{data.y} {currentTopic?.yUnit}</span>
                            </p>
                            {data.isOutlier && (
                              <p className="text-rose-400 font-semibold mt-1">⚠️ 이상치 처리됨</p>
                            )}
                            {data.note && (
                              <p className="text-slate-400 text-[11px] mt-0.5">메모: {data.note}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="측정값"
                      data={chartData}
                      fill="#6366f1"
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isOutlier) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#f43f5e"
                              stroke="#ffffff"
                              strokeWidth={1.5}
                            />
                          );
                        }
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill="#6366f1"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        );
                      }}
                    />
                    {trendlineData.length > 0 && (
                      <Line
                        type="linear"
                        data={trendlineData}
                        dataKey="y"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={false}
                        legendType="none"
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 bg-slate-950/60 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800">
                <Users className="w-6 h-6 mb-1 text-slate-600" />
                <span>해당 모둠에서 제출한 측정 데이터가 아직 없습니다.</span>
              </div>
            )}
          </div>

          {/* 2. Measurements Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>측정 데이터 기록표 ({currentGroupData?.points?.length || 0}회차)</span>
              </span>
            </h4>

            {currentGroupData?.points && currentGroupData.points.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">차수</th>
                      <th className="py-2.5 px-3">{currentTopic?.xVarName} ({currentTopic?.xUnit})</th>
                      <th className="py-2.5 px-3">{currentTopic?.yVarName} ({currentTopic?.yUnit})</th>
                      <th className="py-2.5 px-3">상태</th>
                      <th className="py-2.5 px-3">측정 메모</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                    {currentGroupData.points.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono text-indigo-300">{p.order || idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium text-white">{p.x}</td>
                        <td className="py-2 px-3 font-mono font-medium text-white">{p.y}</td>
                        <td className="py-2 px-3">
                          {p.isOutlier ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                              이상치 제외
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                              유효 측정
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 truncate max-w-xs">{p.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl">
                측정 데이터가 비어 있습니다.
              </div>
            )}
          </div>

          {/* 3. Student Conclusion & Report Q&A Answers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>학생 제출 결론 및 보고서 서술 답변</span>
            </h4>

            {(() => {
              const effectiveQuestions = getEffectiveReportQuestions(currentTopic);
              if (effectiveQuestions && effectiveQuestions.length > 0) {
                return (
                  <div className="space-y-3">
                    {effectiveQuestions.map((q, idx) => {
                      const qKey = q.id || `q${idx + 1}`;
                      // find answer
                      const ans =
                        (currentGroupData?.conclusionNotes?.answers &&
                          currentGroupData.conclusionNotes.answers[qKey]) ||
                        (idx === 0
                          ? currentGroupData?.conclusionNotes?.summary
                          : idx === 1
                          ? currentGroupData?.conclusionNotes?.principle
                          : idx === 2
                          ? currentGroupData?.conclusionNotes?.errorAnalysis
                          : '');

                      return (
                        <div
                          key={q.id || idx}
                          className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-bold shrink-0">
                              문항 {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-200">{q.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{q.question}</p>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                            {ans ? (
                              <span>{ans}</span>
                            ) : (
                              <span className="text-slate-500 italic">학생이 작성한 답변이 없습니다.</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400">[1. 자료 해석 및 규칙성]</span>
                    <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-100">
                      {currentGroupData?.conclusionNotes?.summary || (
                        <span className="text-slate-500 italic">답변 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400">[2. 과학적 개념 및 원리 도출]</span>
                    <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-100">
                      {currentGroupData?.conclusionNotes?.principle || (
                        <span className="text-slate-500 italic">답변 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400">[3. 오차 분석 및 토의]</span>
                    <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-100">
                      {currentGroupData?.conclusionNotes?.errorAnalysis || (
                        <span className="text-slate-500 italic">답변 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column (5 cols): Teacher Evaluation & Feedback Panel (Compact & Sticky Fixed) */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 sticky top-4 self-start">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">모둠 평가 & 피드백 작성</h3>
                  <p className="text-[10px] text-slate-400">
                    {selectedGrade} {selectedClass} {selectedGroupName} | 환산 총점: <span className="font-bold text-indigo-400">{scaledScore100}점</span> ({totalRubricScore}/25)
                  </p>
                </div>
              </div>

              {existingEval && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> 평가완료
                </span>
              )}
            </div>

            {/* Score / Grade Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300">
                  1. 종합 성취도 등급
                </label>
                <span className="text-[10px] font-bold text-indigo-300">현재: {formScore}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {['A+', 'A', 'B', 'C', '재시도'].map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setFormScore(grade)}
                    className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      formScore === grade
                        ? 'bg-indigo-600 text-white shadow-xs scale-102'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 Rubric Criteria Sliders/Rating (Separated into 4. Error Analysis & 5. Attitude) */}
            <div className="space-y-1.5 pt-0.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                2. 5대 탐구 역량 루브릭 채점 (각 1~5점)
              </label>

              {/* 1. Accuracy */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-300 truncate block">1. 데이터 측정·기록</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormAccuracy(val)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                        formAccuracy === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Graph Interpretation */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-300 truncate block">2. 그래프·규칙성 해석</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormInterpretation(val)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                        formInterpretation === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Scientific Reasoning */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-300 truncate block">3. 과학적 결론 도출</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormReasoning(val)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                        formReasoning === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Error Analysis (Separated) */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-amber-300 truncate block">4. 오차 원인 분석</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormErrorAnalysis(val)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                        formErrorAnalysis === val
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Attitude (Separated) */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-emerald-300 truncate block">5. 탐구 태도 & 협동</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormAttitude(val)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                        formAttitude === val
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Teacher Feedback Comment */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                3. 교사 맞춤 피드백 및 총평
              </label>
              <textarea
                value={formFeedback}
                onChange={(e) => setFormFeedback(e.target.value)}
                placeholder="모둠 학생들에게 전달할 격려와 보완할 오차 분석/개념 피드백을 입력하세요..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
              />
            </div>

            {/* Evaluator name */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">평가자:</span>
              <input
                type="text"
                value={formEvaluator}
                onChange={(e) => setFormEvaluator(e.target.value)}
                placeholder="과학교사"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Save Message Banner */}
            {saveMessage && (
              <div
                className={`p-2 rounded-xl text-xs font-medium ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Save Button */}
            <button
              type="button"
              id="btn-save-group-eval"
              onClick={handleSaveEvaluation}
              disabled={isSavingEval}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isSavingEval ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>스프레드시트에 저장 중...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>평가 및 피드백 저장 (구글 시트 연동)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Printable A4 Group Report */}
      <div id="printable-group-evaluation-report" className="hidden">
        <div className="p-8 max-w-3xl mx-auto text-slate-900 bg-white font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold">과학 탐구 실험 모둠 결과 및 교사 평가서</h1>
            <p className="text-sm text-slate-600 mt-1">
              탐구 주제: {currentTopic?.title} | {selectedGrade} {selectedClass} {selectedGroupName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs">
            <div>
              <p><strong>• 학년 / 반 / 모둠:</strong> {selectedGrade} {selectedClass} {selectedGroupName}</p>
              <p className="mt-1"><strong>• 측정 데이터 수:</strong> {currentGroupData?.points?.length || 0}건</p>
              {regressionResult && (
                <p className="mt-1"><strong>• 도출 수식:</strong> y = {regressionResult.slope}x + {regressionResult.intercept} (R²={regressionResult.r2})</p>
              )}
            </div>
            <div>
              <p><strong>• 종합 평가 등급:</strong> <span className="text-base font-bold text-indigo-700">{formScore}</span></p>
              <p className="mt-1"><strong>• 평가 일시:</strong> {existingEval?.evaluatedAt || new Date().toLocaleDateString('ko-KR')}</p>
              <p className="mt-1"><strong>• 평가 교사:</strong> {formEvaluator || '과학교사'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold border-b border-slate-400 pb-1 mb-2">1. 실험 측정 데이터</h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2">차수</th>
                  <th className="border border-slate-300 p-2">{currentTopic?.xVarName} ({currentTopic?.xUnit})</th>
                  <th className="border border-slate-300 p-2">{currentTopic?.yVarName} ({currentTopic?.yUnit})</th>
                  <th className="border border-slate-300 p-2">이상치 여부</th>
                  <th className="border border-slate-300 p-2">측정 메모</th>
                </tr>
              </thead>
              <tbody>
                {currentGroupData?.points && currentGroupData.points.length > 0 ? (
                  currentGroupData.points.map((p, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-2">{p.order || idx + 1}</td>
                      <td className="border border-slate-300 p-2">{p.x}</td>
                      <td className="border border-slate-300 p-2">{p.y}</td>
                      <td className="border border-slate-300 p-2">{p.isOutlier ? '이상치' : '정상'}</td>
                      <td className="border border-slate-300 p-2">{p.note || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-slate-300 p-4 text-center text-slate-500">데이터 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-bold border-b border-slate-400 pb-1">2. 모둠 결론 서술 답변</h3>
            <div className="p-3 border border-slate-300 rounded-lg text-xs space-y-2">
              <p><strong>[1. 자료 해석]</strong> {currentGroupData?.conclusionNotes?.summary || '-'}</p>
              <p><strong>[2. 과학 원리]</strong> {currentGroupData?.conclusionNotes?.principle || '-'}</p>
              <p><strong>[3. 오차 분석]</strong> {currentGroupData?.conclusionNotes?.errorAnalysis || '-'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold border-b border-slate-400 pb-1 mb-2">3. 5대 역량 루브릭 채점 및 교사 총평</h3>
            <div className="grid grid-cols-5 gap-2 mb-3 text-center text-xs">
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <p className="text-slate-600">1. 측정정밀도</p>
                <p className="text-sm font-bold">{formAccuracy} / 5</p>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <p className="text-slate-600">2. 그래프해석</p>
                <p className="text-sm font-bold">{formInterpretation} / 5</p>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <p className="text-slate-600">3. 과학결론도출</p>
                <p className="text-sm font-bold">{formReasoning} / 5</p>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <p className="text-slate-600">4. 오차원인분석</p>
                <p className="text-sm font-bold text-amber-700">{formErrorAnalysis} / 5</p>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <p className="text-slate-600">5. 탐구태도·협동</p>
                <p className="text-sm font-bold text-emerald-700">{formAttitude} / 5</p>
              </div>
            </div>

            <div className="p-4 border border-slate-400 rounded-xl bg-slate-50 text-xs">
              <p className="font-bold mb-1">교사 피드백 및 조언 (총점: {scaledScore100}점 / 등급: {formScore}):</p>
              <p className="whitespace-pre-wrap">{formFeedback || '모둠 실험 및 보고서가 성실히 완료되었습니다.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Class Summary Table */}
      <div id="printable-class-evaluation-summary" className="hidden">
        <div className="p-8 max-w-5xl mx-auto text-slate-900 bg-white font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold">과학 탐구 실험 학급 종합 평가 및 제출 현황표</h1>
            <p className="text-sm text-slate-600 mt-1">
              주제: {currentTopic?.title} | 대상: {selectedGrade} {selectedClass}
            </p>
          </div>

          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-slate-300 p-2">모둠명</th>
                <th className="border border-slate-300 p-2">측정건수</th>
                <th className="border border-slate-300 p-2">도출 수식(기울기)</th>
                <th className="border border-slate-300 p-2">결론서술</th>
                <th className="border border-slate-300 p-2">평가등급</th>
                <th className="border border-slate-300 p-2">루브릭 평균</th>
                <th className="border border-slate-300 p-2">교사 총평 피드백</th>
              </tr>
            </thead>
            <tbody>
              {currentTopic?.groups.map((grp) => {
                const groupData = allGroupsData.find(
                  (g) =>
                    g.topicId === selectedTopicId &&
                    g.grade === selectedGrade &&
                    g.classNum === selectedClass &&
                    g.groupName === grp
                );
                const evalItem = evaluations[`${selectedTopicId}__${selectedGrade}__${selectedClass}__${grp}`];
                const ptCount = groupData?.points?.length || 0;
                const hasReport = Boolean(
                  groupData?.conclusionNotes?.summary ||
                  groupData?.conclusionNotes?.principle ||
                  groupData?.conclusionNotes?.answers
                );
                const rubricAvg = evalItem?.rubricScores
                  ? (
                      ((evalItem.rubricScores.accuracy || 0) +
                        (evalItem.rubricScores.graphInterpretation || 0) +
                        (evalItem.rubricScores.scientificReasoning || 0) +
                        (evalItem.rubricScores.errorAnalysis || 0) +
                        (evalItem.rubricScores.attitude || 0)) /
                      5
                    ).toFixed(1)
                  : '-';

                return (
                  <tr key={grp}>
                    <td className="border border-slate-300 p-2 font-bold">{grp}</td>
                    <td className="border border-slate-300 p-2">{ptCount}건</td>
                    <td className="border border-slate-300 p-2 font-mono">
                      {ptCount >= 2 ? '산출됨' : '-'}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {hasReport ? '제출 완료' : '미제출'}
                    </td>
                    <td className="border border-slate-300 p-2 font-bold text-indigo-700">
                      {evalItem?.score || '-'}
                    </td>
                    <td className="border border-slate-300 p-2">{rubricAvg}</td>
                    <td className="border border-slate-300 p-2 truncate max-w-xs">
                      {evalItem?.feedbackComment || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
