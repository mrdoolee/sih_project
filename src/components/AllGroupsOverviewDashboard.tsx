import React, { useState, useMemo, useEffect } from 'react';
import {
  TopicConfig,
  GroupExperimentData,
  DataPoint,
  getEffectiveReportQuestions
} from '../types';
import { getStoredEvaluations } from '../utils/gasService';
import { printElement } from '../utils/printHelper';
import {
  Table,
  Layers,
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Search,
  Filter,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Line
} from 'recharts';
import { filterValidPoints, computeTrendline } from '../utils/mathAnalysis';

interface AllGroupsOverviewDashboardProps {
  topics: TopicConfig[];
  allGroupsData: GroupExperimentData[];
  gasWebAppUrl: string;
  onRefreshData?: (topicId: string, grade: string, classNum: string) => Promise<void>;
  isLoading?: boolean;
  onSelectGroupForDetail?: (topicId: string, grade: string, classNum: string, groupName: string) => void;
}

const GROUP_COLORS: Record<string, string> = {
  'A모둠': '#3b82f6', // blue
  'B모둠': '#10b981', // emerald
  'C모둠': '#f59e0b', // amber
  'D모둠': '#8b5cf6', // purple
  'E모둠': '#ec4899', // pink
  'F모둠': '#06b6d4', // cyan
  'G모둠': '#f97316', // orange
  'H모둠': '#84cc16', // lime
};

const COLOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

export const AllGroupsOverviewDashboard: React.FC<AllGroupsOverviewDashboardProps> = ({
  topics,
  allGroupsData,
  gasWebAppUrl,
  onRefreshData,
  isLoading,
  onSelectGroupForDetail
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.topicId || 'EXP_01');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  // Which repeated trial (1차, 2차...) of the class is being viewed.
  const [selectedTrialIndex, setSelectedTrialIndex] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'table' | 'matrix' | 'chart' | 'qa'>('table');
  const [searchFilter, setSearchFilter] = useState('');

  // Current topic
  const currentTopic = useMemo(() => {
    return topics.find((t) => t.topicId === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  // Available grades and classes
  const availableGrades = currentTopic?.grades || ['1학년', '2학년', '3학년'];
  const availableClasses = currentTopic?.classes || ['1반', '2반', '3반', '4반'];
  const expectedGroups = currentTopic?.groups || ['A모둠', 'B모둠', 'C모둠', 'D모둠', 'E모둠', 'F모둠'];

  // Keep grade/class valid whenever the topic changes - a hardcoded '1학년'/
  // '1반' default silently stops matching any submitted data for topics whose
  // grades/classes don't start there (e.g. a topic offering only 2/3학년),
  // since the <select> then displays its first option while selectedGrade
  // internally stays on the stale/invalid value.
  useEffect(() => {
    if (currentTopic) {
      if (!selectedGrade || !currentTopic.grades.includes(selectedGrade)) {
        setSelectedGrade(currentTopic.grades[0] || '1학년');
      }
      if (!selectedClass || !currentTopic.classes.includes(selectedClass)) {
        setSelectedClass(currentTopic.classes[0] || '1반');
      }
    }
  }, [currentTopic]);

  // Current stored evaluations
  const evaluations = useMemo(() => getStoredEvaluations(), []);

  // Report questions actually configured for this topic (falls back to the 3 defaults)
  const reportQuestions = useMemo(() => {
    return currentTopic ? getEffectiveReportQuestions(currentTopic) : [];
  }, [currentTopic]);

  // Every record for this Topic+Grade+Class across ALL trials - the base for
  // both the trial selector's option list and the per-group trial-count badges.
  const classGroupsAllTrials = useMemo(() => {
    return allGroupsData.filter(
      (g) => g.topicId === selectedTopicId && g.grade === selectedGrade && g.classNum === selectedClass
    );
  }, [allGroupsData, selectedTopicId, selectedGrade, selectedClass]);

  // Which trial numbers exist anywhere in this class right now.
  const availableTrialIndices = useMemo(() => {
    const set = new Set<number>();
    classGroupsAllTrials.forEach((g) => set.add(g.trialIndex || 1));
    if (set.size === 0) set.add(1);
    return Array.from(set).sort((a, b) => a - b);
  }, [classGroupsAllTrials]);

  // Default to the most recent trial whenever the topic/grade/class changes -
  // availableTrialIndices is derived from the same inputs so it's already
  // fresh by the time this effect runs.
  useEffect(() => {
    setSelectedTrialIndex(availableTrialIndices[availableTrialIndices.length - 1] || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId, selectedGrade, selectedClass]);

  // How many trials each group has recorded, independent of which one is shown.
  const trialCountByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    classGroupsAllTrials.forEach((g) => {
      map[g.groupName] = (map[g.groupName] || 0) + 1;
    });
    return map;
  }, [classGroupsAllTrials]);

  // Only the selected trial's records feed every table/matrix/chart below.
  const classGroupsList = useMemo(() => {
    return classGroupsAllTrials.filter((g) => (g.trialIndex || 1) === selectedTrialIndex);
  }, [classGroupsAllTrials, selectedTrialIndex]);

  // Map each expected group to either its submitted data or placeholder
  const fullGroupsData = useMemo(() => {
    return expectedGroups.map((groupName) => {
      const match = classGroupsList.find((g) => g.groupName === groupName);
      const evalKey = `${selectedTopicId}__${selectedGrade}__${selectedClass}__${groupName}`;
      const evaluation = evaluations[evalKey];
      return {
        groupName,
        data: match || null,
        isSubmitted: !!match && (match.points?.length > 0 || !!match.conclusionNotes?.summary),
        pointCount: match?.points?.length || 0,
        evaluation: evaluation || null,
        trialCount: trialCountByGroup[groupName] || 0
      };
    });
  }, [expectedGroups, classGroupsList, selectedTopicId, selectedGrade, selectedClass, evaluations, trialCountByGroup]);

  // Filtered by search if any
  const displayedGroups = useMemo(() => {
    if (!searchFilter.trim()) return fullGroupsData;
    const q = searchFilter.toLowerCase();
    return fullGroupsData.filter((item) => {
      const gNameMatch = item.groupName.toLowerCase().includes(q);
      const sumMatch = item.data?.conclusionNotes?.summary?.toLowerCase().includes(q);
      return gNameMatch || sumMatch;
    });
  }, [fullGroupsData, searchFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = expectedGroups.length;
    const submitted = fullGroupsData.filter((g) => g.isSubmitted).length;
    const evaluated = fullGroupsData.filter((g) => !!g.evaluation?.score).length;
    // Outlier-flagged rows are not usable measurements, so they don't count here.
    const totalPoints = fullGroupsData.reduce(
      (acc, g) => acc + filterValidPoints(g.data?.points || []).length,
      0
    );
    const avgPoints = submitted > 0 ? (totalPoints / submitted).toFixed(1) : '0';
    return { total, submitted, evaluated, avgPoints };
  }, [expectedGroups, fullGroupsData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      '학년',
      '반',
      '시행회차',
      '모둠명',
      '제출상태',
      '데이터수',
      `측정데이터(${currentTopic?.xVarName || 'X'} / ${currentTopic?.yVarName || 'Y'})`,
      '선택추세선',
      '결론요약',
      '오차원인분석',
      '교사평가등급',
      '교사피드백'
    ];

    const rows = fullGroupsData.map((item) => {
      const g = item.data;
      const ptsStr =
        g?.points
          ?.filter((p) => p.x !== '' && p.y !== '')
          .map((p) => `(${p.x}, ${p.y})${p.isOutlier ? '[이상치]' : ''}`)
          .join('; ') || '없음';
      return [
        selectedGrade,
        selectedClass,
        `${selectedTrialIndex}차`,
        item.groupName,
        item.isSubmitted ? '제출완료' : '미제출',
        item.pointCount.toString(),
        `"${ptsStr}"`,
        g?.selectedTrendline || '미선택',
        `"${(g?.conclusionNotes?.summary || '').replace(/"/g, '""')}"`,
        `"${(g?.conclusionNotes?.errorAnalysis || '').replace(/"/g, '""')}"`,
        item.evaluation?.score || '미평가',
        `"${(item.evaluation?.feedbackComment || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentTopic?.title || '탐구'}_${selectedGrade}_${selectedClass}_${selectedTrialIndex}차_전체모둠데이터.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report - the master table and the matrix are both wide, so they only
  // fit an A4 sheet in landscape with the horizontal scroll containers unlocked.
  const handlePrint = () => {
    printElement('all-groups-overview-printable', {
      title: `${currentTopic?.title} - ${selectedGrade} ${selectedClass} ${selectedTrialIndex}차 전체 모둠 탐구 결과표`,
      pageOrientation: 'landscape',
      margin: '8mm'
    });
  };

  // Per-group metrics. Outliers the students flagged are excluded from the
  // regression and from every "valid" count, exactly like the student-side view.
  const groupMetrics = useMemo(() => {
    return fullGroupsData.map((g, idx) => {
      const rawPoints = g.data?.points || [];
      const valid = filterValidPoints(rawPoints);
      const outliers = rawPoints.filter(
        (p) => p.isOutlier && p.x !== '' && p.y !== '' && !isNaN(Number(p.x)) && !isNaN(Number(p.y))
      );
      const trendType = g.data?.selectedTrendline || currentTopic?.defaultTrendline || 'linear';
      return {
        groupName: g.groupName,
        color: GROUP_COLORS[g.groupName] || COLOR_PALETTE[idx % COLOR_PALETTE.length],
        hasData: valid.length > 0,
        validCount: valid.length,
        outlierCount: outliers.length,
        points: valid,
        outlierPoints: outliers.map((p) => ({ x: Number(p.x), y: Number(p.y), group: g.groupName })),
        trend: computeTrendline(trendType, rawPoints)
      };
    });
  }, [fullGroupsData, currentTopic]);

  // Multi-series overlay dataset: sampled trendline curve per group plus the
  // group's own measured points, matching the student "전체 모둠 데이터 확인" chart.
  const { overlayData, overlayXDomain, overlayYDomain } = useMemo(() => {
    const active = groupMetrics.filter((gm) => gm.hasData);
    const allPoints = active.flatMap((gm) => gm.points);
    const allOutliers = active.flatMap((gm) => gm.outlierPoints);
    if (allPoints.length === 0) {
      return { overlayData: [], overlayXDomain: [0, 10], overlayYDomain: [0, 10] };
    }

    const xVals = [...allPoints, ...allOutliers].map((p) => p.x);
    const yVals = [...allPoints, ...allOutliers].map((p) => p.y);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const marginX = (maxX - minX) * 0.1 || 1;
    const marginY = (maxY - minY) * 0.1 || 1;

    const rows: Array<{ x: number; [key: string]: any }> = [];

    const steps = 40;
    const startX = Math.max(0, minX - marginX);
    const stepSize = (maxX + marginX - startX) / steps;
    for (let i = 0; i <= steps; i++) {
      const curX = startX + i * stepSize;
      const row: { x: number; [key: string]: any } = { x: Number(curX.toFixed(3)) };
      active.forEach((gm) => {
        const pred = gm.trend.predict(curX);
        row[`${gm.groupName}_trend`] =
          pred !== null && !isNaN(pred) && isFinite(pred) ? Number(pred.toFixed(3)) : null;
      });
      rows.push(row);
    }

    active.forEach((gm) => {
      gm.points.forEach((pt) => {
        rows.push({ x: pt.x, [`${gm.groupName}_actual`]: pt.y });
      });
      gm.outlierPoints.forEach((pt) => {
        rows.push({ x: pt.x, [`${gm.groupName}_outlier`]: pt.y });
      });
    });

    rows.sort((a, b) => a.x - b.x);

    return {
      overlayData: rows,
      overlayXDomain: [Math.max(0, Math.floor(minX - marginX)), Math.ceil(maxX + marginX)],
      overlayYDomain: [Math.max(0, Math.floor(minY - marginY)), Math.ceil(maxY + marginY)]
    };
  }, [groupMetrics]);

  const activeGroupMetrics = groupMetrics.filter((gm) => gm.hasData);
  const totalOutlierCount = groupMetrics.reduce((acc, gm) => acc + gm.outlierCount, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Selector Control Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              반 전체 통합 조회
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              5. 전체 모둠 탐구 결과 확인
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            같은 반의 모든 모둠이 제출한 실험 측정 데이터, 그래프, 결론 및 오차 분석을 구조화된 테이블로 한눈에 비교·분석합니다.
          </p>
        </div>

        {/* Actions below description */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            id="btn-all-groups-refresh"
            onClick={() => onRefreshData?.(selectedTopicId, selectedGrade, selectedClass)}
            disabled={isLoading || !gasWebAppUrl}
            title={gasWebAppUrl ? '구글 스프레드시트에서 이 학년/반의 최신 제출 데이터를 다시 불러옵니다.' : 'GAS 연동 URL이 설정되어 있지 않습니다.'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '불러오는 중...' : '새로고침'}</span>
          </button>

          <button
            type="button"
            id="btn-all-groups-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드</span>
          </button>

          <button
            type="button"
            id="btn-all-groups-print"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>결과표 인쇄 / PDF</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Topic Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              🧪 탐구 주제 선택
            </label>
            <select
              id="select-all-groups-topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {topics.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  {t.title} ({t.xVarName} vs {t.yVarName})
                </option>
              ))}
            </select>
          </div>

          {/* Grade Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              🎓 학년 선택
            </label>
            <select
              id="select-all-groups-grade"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Class Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              🏫 학급(반) 선택
            </label>
            <select
              id="select-all-groups-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Trial (회차) Select - lets the teacher pick which repeated attempt
              of the experiment to view; each trial's data is recorded and
              shown fully separately from the others. */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              🔁 시행 회차 선택
            </label>
            <select
              id="select-all-groups-trial"
              value={selectedTrialIndex}
              onChange={(e) => setSelectedTrialIndex(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {availableTrialIndices.map((t) => (
                <option key={t} value={t}>
                  {t}차 시행
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Modes & Summary Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              id="btn-viewmode-table"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>전체 데이터 종합표</span>
            </button>

            <button
              type="button"
              id="btn-viewmode-matrix"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>측정값 비교 매트릭스</span>
            </button>

            <button
              type="button"
              id="btn-viewmode-chart"
              onClick={() => setViewMode('chart')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>반 전체 그래프 중첩 비교</span>
            </button>

            <button
              type="button"
              id="btn-viewmode-qa"
              onClick={() => setViewMode('qa')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'qa'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>질문 답변 비교</span>
            </button>
          </div>

          {/* Mini Stat Summary */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              전체 {stats.total}개 모둠
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              제출 {stats.submitted}개
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              채점 {stats.evaluated}개
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Display based on View Mode */}
      {/* Print rules for the wide result tables: the on-screen layout relies on
          horizontal/vertical scroll containers, which clip their content when
          printed. Unlock them and shrink the type so a full row set fits. */}
      <style>{`
        @media print {
          #all-groups-overview-printable .overflow-x-auto,
          #all-groups-overview-printable .overflow-y-auto,
          #all-groups-overview-printable .overflow-hidden {
            overflow: visible !important;
            max-height: none !important;
          }
          #all-groups-overview-printable table {
            width: 100% !important;
            table-layout: auto;
            font-size: 9px !important;
          }
          #all-groups-overview-printable th,
          #all-groups-overview-printable td {
            padding: 3px 4px !important;
            min-width: 0 !important;
            max-width: none !important;
            word-break: break-word;
            white-space: normal !important;
          }
          #all-groups-overview-printable tr,
          #all-groups-overview-printable .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          #all-groups-overview-printable .shadow-sm,
          #all-groups-overview-printable .shadow-xs {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div id="all-groups-overview-printable" className="space-y-6">
        {/* Printable Header (Visible on print) */}
        <div className="hidden print:block mb-4 p-4 border-b border-slate-300">
          <h1 className="text-xl font-bold text-slate-900">
            [{selectedGrade} {selectedClass} / {selectedTrialIndex}차 시행] {currentTopic?.title} - 전체 모둠 탐구 결과 종합표
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            독립변인(X): {currentTopic?.xVarName} ({currentTopic?.xUnit}) | 종속변인(Y): {currentTopic?.yVarName} ({currentTopic?.yUnit}) | 출력일시: {new Date().toLocaleString()}
          </p>
        </div>

        {/* VIEW 1: STRUCTURED MASTER TABLE (전체 데이터 종합 테이블) */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600" />
                  <span>{selectedGrade} {selectedClass} · {selectedTrialIndex}차 모둠별 데이터 종합 테이블</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 모둠의 측정값(X, Y 쌍), 선택 추세선, 결론 요약 및 채점 상태를 한 번에 검토합니다.
                </p>
                {totalOutlierCount > 0 && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">
                    ⚠️ 학생이 이상치로 표시한 측정값 {totalOutlierCount}개는 붉은색 취소선으로 구분되며, 측정수와 추세선 계산에서 제외됩니다.
                  </p>
                )}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64 no-print">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="모둠명 / 결론 내용 검색..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-24 whitespace-nowrap">모둠</th>
                    <th className="py-3 px-3 text-center w-24 whitespace-nowrap">상태</th>
                    <th className="py-3 px-3 text-center w-16 whitespace-nowrap">측정수</th>
                    <th className="py-3 px-4 min-w-[200px]">
                      측정 데이터 ({currentTopic?.xVarName} [{currentTopic?.xUnit}] ➔ {currentTopic?.yVarName} [{currentTopic?.yUnit}])
                    </th>
                    <th className="py-3 px-3 text-center w-28">선택 추세선</th>
                    <th className="py-3 px-4 min-w-[180px]">핵심 결론 요약</th>
                    <th className="py-3 px-4 min-w-[180px]">오차 원인 분석</th>
                    <th className="py-3 px-3 text-center w-24">평가/등급</th>
                    {onSelectGroupForDetail && (
                      <th className="py-3 px-3 text-center w-20 print:hidden">상세/평가</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedGroups.map((item) => {
                    const g = item.data;
                    const pts = g?.points || [];
                    const isSub = item.isSubmitted;
                    const evalScore = item.evaluation?.score;
                    const metrics = groupMetrics.find((m) => m.groupName === item.groupName);

                    return (
                      <tr
                        key={item.groupName}
                        className={`transition-colors hover:bg-indigo-50/40 ${
                          !isSub ? 'bg-slate-50/40 text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {/* Group Name */}
                        <td className="py-3.5 px-3.5 text-center font-bold">
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-black whitespace-nowrap"
                            style={{
                              backgroundColor: `${GROUP_COLORS[item.groupName] || '#6366f1'}18`,
                              color: GROUP_COLORS[item.groupName] || '#4f46e5'
                            }}
                          >
                            {item.groupName}
                          </span>
                          {/* Shown regardless of which trial is currently selected,
                              so the teacher never misses that other rounds exist. */}
                          {item.trialCount > 1 && (
                            <div
                              className="mt-1 text-[10px] font-bold text-purple-700 whitespace-nowrap"
                              title="이 모둠이 기록한 전체 시행 횟수"
                            >
                              총 {item.trialCount}회 시행
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          {isSub ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>제출됨</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 whitespace-nowrap">
                              <Clock className="w-3 h-3" />
                              <span>미제출</span>
                            </span>
                          )}
                        </td>

                        {/* Point Count (outliers are excluded from the usable count) */}
                        <td className="py-3.5 px-3 text-center font-bold">
                          {isSub ? (
                            <div className="leading-tight">
                              <div>{metrics?.validCount ?? pts.length}개</div>
                              {(metrics?.outlierCount || 0) > 0 && (
                                <div className="text-[10px] font-bold text-rose-600 whitespace-nowrap">
                                  이상치 {metrics?.outlierCount}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Data Points Sequence */}
                        <td className="py-3.5 px-4">
                          {isSub && pts.some((p) => p.x !== '' && p.y !== '') ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                              {/* A still-blank trailing row (student added a row but
                                  never filled it in) gets saved along with the real
                                  data - skip it here instead of showing an empty "(, )" chip. */}
                              {pts
                                .filter((p) => p.x !== '' && p.y !== '')
                                .map((p, pIdx) => (
                                <span
                                  key={p.id || pIdx}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium border shrink-0 font-mono ${
                                    p.isOutlier
                                      ? 'bg-rose-50 text-rose-700 border-rose-300 line-through decoration-rose-400'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title={
                                    p.isOutlier
                                      ? `점 ${pIdx + 1} (이상치 처리됨 - 추세선 계산 제외): ${currentTopic?.xVarName}=${p.x}, ${currentTopic?.yVarName}=${p.y}`
                                      : `점 ${pIdx + 1}: ${currentTopic?.xVarName}=${p.x}, ${currentTopic?.yVarName}=${p.y}`
                                  }
                                >
                                  {p.isOutlier && <span className="not-italic no-underline">⚠️</span>}
                                  ({p.x}, <span className={`font-bold ${p.isOutlier ? 'text-rose-700' : 'text-indigo-700'}`}>{p.y}</span>)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">입력된 데이터 없음</span>
                          )}
                        </td>

                        {/* Trendline */}
                        <td className="py-3.5 px-3 text-center">
                          {isSub && g?.selectedTrendline ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {/* Labels must cover every TrendlineType - 'proportional'
                                  and 'power' were missing and rendered an empty cell. */}
                              {g.selectedTrendline === 'linear' && '직선 (절편)'}
                              {g.selectedTrendline === 'proportional' && '비례 (원점)'}
                              {g.selectedTrendline === 'inverse' && '반비례 (곡선)'}
                              {g.selectedTrendline === 'quadratic' && '이차곡선'}
                              {g.selectedTrendline === 'power' && '멱함수'}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Summary */}
                        <td className="py-3.5 px-4">
                          {isSub && g?.conclusionNotes?.summary ? (
                            <p className="line-clamp-2 text-[11px] text-slate-700 leading-relaxed">
                              {g.conclusionNotes.summary}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">미작성</span>
                          )}
                        </td>

                        {/* Error Analysis */}
                        <td className="py-3.5 px-4">
                          {isSub && g?.conclusionNotes?.errorAnalysis ? (
                            <p className="line-clamp-2 text-[11px] text-slate-700 leading-relaxed">
                              {g.conclusionNotes.errorAnalysis}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">미작성</span>
                          )}
                        </td>

                        {/* Evaluation Score */}
                        <td className="py-3.5 px-3 text-center">
                          {evalScore ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>{evalScore}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">미채점</span>
                          )}
                        </td>

                        {/* Action Link to Tab 5 */}
                        {onSelectGroupForDetail && (
                          <td className="py-3.5 px-3 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() =>
                                onSelectGroupForDetail(selectedTopicId, selectedGrade, selectedClass, item.groupName)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="모둠별 상세 결과 확인 및 채점 페이지로 이동합니다."
                            >
                              <Eye className="w-3 h-3" />
                              <span>평가</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: MEASUREMENT MATRIX TABLE (포인트별/X값별 가로 매트릭스 비교표) */}
        {viewMode === 'matrix' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>측정값 비교 매트릭스 · {selectedTrialIndex}차 ({currentTopic?.xVarName}에 따른 모둠별 {currentTopic?.yVarName} 비교)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 모둠의 측정 데이터를 포인트 순서(1번, 2번...) 및 X값에 따라 가로-세로 매트릭스로 정렬하여 오차와 경향성을 한눈에 비교합니다.
              </p>
              {totalOutlierCount > 0 && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">
                  ⚠️ 학생이 이상치로 표시한 측정값 {totalOutlierCount}개는 붉은색 취소선으로 구분되며, 추세선 계산에서 제외됩니다.
                </p>
              )}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-800 font-bold">
                  <tr>
                    <th className="p-3 border border-slate-200 text-center w-24 bg-slate-200/70">
                      모둠명
                    </th>
                    <th className="p-3 border border-slate-200 text-center w-20">
                      상태
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                      <th key={idx} className="p-2.5 border border-slate-200 text-center min-w-[90px]">
                        <div>측정 {idx}</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          (X, Y)
                        </div>
                      </th>
                    ))}
                    <th className="p-3 border border-slate-200 text-center min-w-[100px]">
                      추세선
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {fullGroupsData.map((item) => {
                    const g = item.data;
                    // Drop still-blank trailing rows (a student added a row but never
                    // filled it in) - otherwise they show up as an empty measurement slot.
                    const pts = (g?.points || []).filter((p) => p.x !== '' && p.y !== '');
                    return (
                      <tr key={item.groupName} className="hover:bg-slate-50">
                        <td className="p-3 border border-slate-200 text-center font-bold bg-slate-50/50">
                          <span
                            className="font-bold text-xs"
                            style={{ color: GROUP_COLORS[item.groupName] || '#4f46e5' }}
                          >
                            {item.groupName}
                          </span>
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center">
                          {item.isSubmitted ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              제출
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-100">
                              미제출
                            </span>
                          )}
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((ptIndex) => {
                          const p = pts[ptIndex];
                          const isLastColumn = ptIndex === 7;
                          const hiddenCount = pts.length - 8;
                          return (
                            <td
                              key={ptIndex}
                              className="p-2.5 border border-slate-200 text-center font-mono text-[11px]"
                            >
                              {p ? (
                                <div
                                  className={`relative p-1 rounded-md border ${
                                    p.isOutlier
                                      ? 'bg-rose-50 border-rose-300 line-through decoration-rose-400'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                  title={p.isOutlier ? '이상치로 표시된 측정값 (추세선 계산 제외)' : undefined}
                                >
                                  {p.isOutlier && (
                                    <span className="absolute -top-1.5 -left-1.5 text-[9px] no-underline">⚠️</span>
                                  )}
                                  <span className={p.isOutlier ? 'text-rose-500' : 'text-slate-500'}>{p.x}, </span>
                                  <span className={`font-bold ${p.isOutlier ? 'text-rose-700' : 'text-indigo-700'}`}>{p.y}</span>
                                  {isLastColumn && hiddenCount > 0 && (
                                    <span
                                      className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                      title={`${hiddenCount}개의 추가 측정값이 이 표에 표시되지 않았습니다. 측정 수 열을 확인하세요.`}
                                    >
                                      +{hiddenCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2.5 border border-slate-200 text-center text-[11px] font-semibold text-slate-700">
                          {g?.selectedTrendline || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: CLASS MULTI-SERIES OVERLAY CHART (반 전체 그래프 중첩 비교) */}
        {viewMode === 'chart' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>전체 모둠 측정점 및 추세선 겹쳐보기 ({selectedGrade} {selectedClass} · {selectedTrialIndex}차)</span>
              </h3>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                각 모둠별 고유 색상 점과 실선 추세선
              </span>
            </div>

            {/* Custom legend - one badge per group, so it never wraps raggedly.
                Includes the trendline equation and R² inline so the fit
                quality is readable straight off the legend, not just from
                the summary box below the chart. */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              {activeGroupMetrics.map((gm) => (
                <span
                  key={gm.groupName}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 whitespace-nowrap"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: gm.color }} />
                  <span>
                    {gm.groupName} ({gm.validCount}점
                    {gm.outlierCount > 0 && (
                      <span className="text-rose-600"> · 이상치 {gm.outlierCount}</span>
                    )}
                    )
                  </span>
                  <span className="font-mono font-semibold text-indigo-700">{gm.trend.equation}</span>
                  <span className="text-slate-500 font-normal">R²={gm.trend.r2}</span>
                </span>
              ))}
              {totalOutlierCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-rose-500 bg-white" />
                  <span>이상치 (추세선 제외)</span>
                </span>
              )}
            </div>

            {activeGroupMetrics.length > 0 ? (
              <div className="w-full h-80 sm:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={overlayData} margin={{ top: 10, right: 30, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={overlayXDomain}
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: `${currentTopic?.xVarName || 'X'} (${currentTopic?.xUnit || ''})`,
                        position: 'insideBottom',
                        offset: -15,
                        fontSize: 12,
                        fill: '#334155',
                        fontWeight: 600
                      }}
                    />
                    <YAxis
                      type="number"
                      domain={overlayYDomain}
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: `${currentTopic?.yVarName || 'Y'} (${currentTopic?.yUnit || ''})`,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        fontSize: 12,
                        fill: '#334155',
                        fontWeight: 600
                      }}
                    />
                    <Tooltip
                      isAnimationActive={false}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0].payload;

                        // Only measured points get a tooltip; the sampled trendline
                        // rows carry no student-entered value worth showing.
                        const measured = activeGroupMetrics
                          .map((gm) => ({
                            gm,
                            actual: item[`${gm.groupName}_actual`],
                            outlier: item[`${gm.groupName}_outlier`]
                          }))
                          .filter(
                            (e) =>
                              (e.actual !== undefined && e.actual !== null) ||
                              (e.outlier !== undefined && e.outlier !== null)
                          );
                        if (measured.length === 0) return null;

                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 max-w-xs">
                            <div className="font-bold text-amber-300 border-b border-slate-700 pb-1">
                              {currentTopic?.xVarName || 'X'} = {item.x} {currentTopic?.xUnit}
                            </div>
                            {measured.map(({ gm, actual, outlier }) => {
                              const isOut = outlier !== undefined && outlier !== null;
                              return (
                                <div key={gm.groupName} className="flex items-center justify-between gap-3">
                                  <span className="font-semibold" style={{ color: gm.color }}>
                                    {gm.groupName}:
                                  </span>
                                  <span className={isOut ? 'text-rose-300' : 'text-slate-200'}>
                                    {isOut ? `${outlier} (이상치)` : actual} {currentTopic?.yUnit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="#cbd5e1" />
                    <ReferenceLine y={0} stroke="#cbd5e1" />

                    {activeGroupMetrics.map((gm) => (
                      <React.Fragment key={gm.groupName}>
                        <Line
                          type="monotone"
                          dataKey={`${gm.groupName}_trend`}
                          name={`${gm.groupName} 추세`}
                          stroke={gm.color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Scatter
                          dataKey={`${gm.groupName}_actual`}
                          name={`${gm.groupName} 실측치`}
                          fill={gm.color}
                          stroke="#ffffff"
                          strokeWidth={1}
                          isAnimationActive={false}
                        />
                        <Scatter
                          dataKey={`${gm.groupName}_outlier`}
                          name={`${gm.groupName} 이상치`}
                          fill="#ffffff"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          shape="circle"
                          isAnimationActive={false}
                        />
                      </React.Fragment>
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">제출된 모둠 측정 데이터가 없습니다.</p>
                <p className="text-xs text-slate-400">학생들이 실험 데이터를 입력하면 실시간으로 차트에 표시됩니다.</p>
              </div>
            )}

            {/* Trendline/R² summary box - one card per submitted group, so the
                fit quality is readable at a glance without hovering the chart. */}
            {activeGroupMetrics.length > 0 && (
              <div className="pt-1 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2.5">모둠별 추세선 · R² 요약</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {activeGroupMetrics.map((gm) => (
                    <div
                      key={gm.groupName}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: gm.color }} />
                        <span className="text-slate-800">{gm.groupName}</span>
                        <span className="ml-auto text-[10px] font-semibold text-slate-500">{gm.validCount}점</span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>식: <code className="text-indigo-900 font-semibold">{gm.trend.equation}</code></div>
                        <div>
                          R²:{' '}
                          <strong
                            className={gm.trend.r2 >= 0.95 ? 'text-emerald-700' : 'text-slate-800'}
                          >
                            {gm.trend.r2}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: QUESTION & ANSWER COMPARISON TABLE (탐구 질문 답변 비교) */}
        {viewMode === 'qa' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>모둠별 탐구 질문지 답변 비교 ({selectedGrade} {selectedClass} · {selectedTrialIndex}차)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                이 탐구 주제의 질문 문항에 대해 각 모둠 학생들이 작성한 서술형 답변을 한눈에 나란히 비교합니다.
              </p>
            </div>

            {/* Questions Comparison Cards */}
            {reportQuestions.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">이 탐구 주제에 설정된 보고서 질문이 없습니다.</p>
                <p className="text-xs text-slate-400">탐구주제 관리 탭에서 보고서 질문을 먼저 구성해주세요.</p>
              </div>
            )}
            <div className="space-y-6">
              {reportQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-xs shrink-0 whitespace-nowrap">
                      질문 {qIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">{q.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{q.question}</p>
                    </div>
                  </div>

                  {/* Answers by Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                    {fullGroupsData.map((item) => {
                      const ans = item.data?.conclusionNotes?.answers?.[q.id] ||
                                  (qIdx === 0 ? item.data?.conclusionNotes?.summary :
                                   qIdx === 1 ? item.data?.conclusionNotes?.principle :
                                   qIdx === 2 ? item.data?.conclusionNotes?.errorAnalysis : '');

                      return (
                        <div
                          key={item.groupName}
                          className={`p-3 rounded-lg border text-xs space-y-1 ${
                            ans ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100/50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-bold text-xs"
                              style={{ color: GROUP_COLORS[item.groupName] || '#4f46e5' }}
                            >
                              {item.groupName}
                            </span>
                            {ans ? (
                              <span className="text-[10px] text-emerald-600 font-bold">작성완료</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">미작성</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">
                            {ans || '작성된 답변이 없습니다.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
