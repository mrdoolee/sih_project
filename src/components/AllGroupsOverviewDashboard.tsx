import React, { useState, useMemo } from 'react';
import {
  TopicConfig,
  GroupExperimentData,
  DataPoint
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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line
} from 'recharts';

interface AllGroupsOverviewDashboardProps {
  topics: TopicConfig[];
  allGroupsData: GroupExperimentData[];
  gasWebAppUrl: string;
  onRefreshData?: () => void;
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
  const [selectedGrade, setSelectedGrade] = useState<string>('1학년');
  const [selectedClass, setSelectedClass] = useState<string>('1반');
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

  // Current stored evaluations
  const evaluations = useMemo(() => getStoredEvaluations(), []);

  // Filter groups for selected Topic, Grade, Class
  const classGroupsList = useMemo(() => {
    return allGroupsData.filter(
      (g) => g.topicId === selectedTopicId && g.grade === selectedGrade && g.classNum === selectedClass
    );
  }, [allGroupsData, selectedTopicId, selectedGrade, selectedClass]);

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
        evaluation: evaluation || null
      };
    });
  }, [expectedGroups, classGroupsList, selectedTopicId, selectedGrade, selectedClass, evaluations]);

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
    const totalPoints = fullGroupsData.reduce((acc, g) => acc + g.pointCount, 0);
    const avgPoints = submitted > 0 ? (totalPoints / submitted).toFixed(1) : '0';
    return { total, submitted, evaluated, avgPoints };
  }, [expectedGroups, fullGroupsData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      '학년',
      '반',
      '모둠명',
      '제출상태',
      '데이터수',
      `측정데이터(${currentTopic?.xName || 'X'} / ${currentTopic?.yName || 'Y'})`,
      '선택추세선',
      '결론요약',
      '오차원인분석',
      '교사평가등급',
      '교사피드백'
    ];

    const rows = fullGroupsData.map((item) => {
      const g = item.data;
      const ptsStr = g?.points?.map((p) => `(${p.x}, ${p.y})`).join('; ') || '없음';
      return [
        selectedGrade,
        selectedClass,
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
    link.setAttribute('download', `${currentTopic?.title || '탐구'}_${selectedGrade}_${selectedClass}_전체모둠데이터.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    printElement('all-groups-overview-printable', {
      title: `${currentTopic?.title} - ${selectedGrade} ${selectedClass} 전체 모둠 탐구 결과표`
    });
  };

  // Prepare Chart Multi-Series Data
  const chartDataSeries = useMemo(() => {
    return fullGroupsData
      .filter((g) => g.isSubmitted && g.data && g.data.points.length > 0)
      .map((g, idx) => {
        const color = GROUP_COLORS[g.groupName] || COLOR_PALETTE[idx % COLOR_PALETTE.length];
        return {
          groupName: g.groupName,
          color,
          points: (g.data?.points || []).map((p) => ({
            x: p.x,
            y: p.y,
            group: g.groupName
          }))
        };
      });
  }, [fullGroupsData]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Selector Control Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                반 전체 통합 조회
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                4. 전체 모둠 탐구 결과 확인
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              같은 반의 모든 모둠이 제출한 실험 측정 데이터, 그래프, 결론 및 오차 분석을 구조화된 테이블로 한눈에 비교·분석합니다.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onRefreshData && (
              <button
                type="button"
                id="btn-all-groups-refresh"
                onClick={onRefreshData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                title="스프레드시트에서 최신 모둠 데이터를 다시 불러옵니다."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>📥 시트에서 불러오기</span>
              </button>
            )}

            <button
              type="button"
              id="btn-all-groups-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
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
        </div>

        {/* Filters Grid */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  {t.title} ({t.xName} vs {t.yName})
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
      <div id="all-groups-overview-printable" className="space-y-6">
        {/* Printable Header (Visible on print) */}
        <div className="hidden print:block mb-4 p-4 border-b border-slate-300">
          <h1 className="text-xl font-bold text-slate-900">
            [{selectedGrade} {selectedClass}] {currentTopic?.title} - 전체 모둠 탐구 결과 종합표
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            독립변인(X): {currentTopic?.xName} ({currentTopic?.xUnit}) | 종속변인(Y): {currentTopic?.yName} ({currentTopic?.yUnit}) | 출력일시: {new Date().toLocaleString()}
          </p>
        </div>

        {/* VIEW 1: STRUCTURED MASTER TABLE (전체 데이터 종합 테이블) */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600" />
                  <span>{selectedGrade} {selectedClass} 모둠별 데이터 종합 테이블</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 모둠의 측정값(X, Y 쌍), 선택 추세선, 결론 요약 및 채점 상태를 한 번에 검토합니다.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
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
                    <th className="py-3 px-3.5 text-center w-16">모둠</th>
                    <th className="py-3 px-3 text-center w-20">상태</th>
                    <th className="py-3 px-3 text-center w-16">측정수</th>
                    <th className="py-3 px-4 min-w-[200px]">
                      측정 데이터 ({currentTopic?.xName} [{currentTopic?.xUnit}] ➔ {currentTopic?.yName} [{currentTopic?.yUnit}])
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
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-black"
                            style={{
                              backgroundColor: `${GROUP_COLORS[item.groupName] || '#6366f1'}18`,
                              color: GROUP_COLORS[item.groupName] || '#4f46e5'
                            }}
                          >
                            {item.groupName}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          {isSub ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>제출됨</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>미제출</span>
                            </span>
                          )}
                        </td>

                        {/* Point Count */}
                        <td className="py-3.5 px-3 text-center font-bold">
                          {isSub ? `${pts.length}개` : '-'}
                        </td>

                        {/* Data Points Sequence */}
                        <td className="py-3.5 px-4">
                          {isSub && pts.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                              {pts.map((p, pIdx) => (
                                <span
                                  key={p.id || pIdx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-mono"
                                  title={`점 ${pIdx + 1}: ${currentTopic?.xName}=${p.x}, ${currentTopic?.yName}=${p.y}`}
                                >
                                  ({p.x}, <span className="font-bold text-indigo-700">{p.y}</span>)
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
                              {g.selectedTrendline === 'linear' && '비례 (직선)'}
                              {g.selectedTrendline === 'linear_offset' && '직선 (절편)'}
                              {g.selectedTrendline === 'inverse' && '반비례 (곡선)'}
                              {g.selectedTrendline === 'quadratic' && '이차곡선'}
                              {g.selectedTrendline === 'none' && '추세선 없음'}
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
                <span>측정값 비교 매트릭스 ({currentTopic?.xName}에 따른 모둠별 {currentTopic?.yName} 비교)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 모둠의 측정 데이터를 포인트 순서(1번, 2번...) 및 X값에 따라 가로-세로 매트릭스로 정렬하여 오차와 경향성을 한눈에 비교합니다.
              </p>
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
                    const pts = g?.points || [];
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
                          return (
                            <td
                              key={ptIndex}
                              className="p-2.5 border border-slate-200 text-center font-mono text-[11px]"
                            >
                              {p ? (
                                <div className="bg-slate-50 p-1 rounded-md border border-slate-200">
                                  <span className="text-slate-500">{p.x}, </span>
                                  <span className="font-bold text-indigo-700">{p.y}</span>
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

        {/* VIEW 3: CLASS MULTI-SCATTER CHART (반 전체 산점도 & 추세 비교 차트) */}
        {viewMode === 'chart' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>반 전체 모둠 산점도 중첩 시각화 ({selectedGrade} {selectedClass})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 모둠의 측정 데이터 포인트를 모둠별 고유 색상으로 하나의 차트에 시각화하여 반 전체 경향성과 오차 분포를 파악합니다.
                </p>
              </div>

              {/* Group Legend Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {chartDataSeries.map((s) => (
                  <span
                    key={s.groupName}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-50 border border-slate-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.groupName} ({s.points.length}점)</span>
                  </span>
                ))}
              </div>
            </div>

            {chartDataSeries.length > 0 ? (
              <div className="w-full h-80 sm:h-96 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={currentTopic?.xName || 'X'}
                      unit={currentTopic?.xUnit ? ` ${currentTopic.xUnit}` : ''}
                      stroke="#64748b"
                      fontSize={11}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={currentTopic?.yName || 'Y'}
                      unit={currentTopic?.yUnit ? ` ${currentTopic.yUnit}` : ''}
                      stroke="#64748b"
                      fontSize={11}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <div className="font-bold text-indigo-300">{data.group}</div>
                            <div>
                              {currentTopic?.xName || 'X'}: <span className="font-mono">{data.x}</span> {currentTopic?.xUnit}
                            </div>
                            <div>
                              {currentTopic?.yName || 'Y'}: <span className="font-mono text-emerald-300">{data.y}</span> {currentTopic?.yUnit}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    {chartDataSeries.map((series) => (
                      <Scatter
                        key={series.groupName}
                        name={series.groupName}
                        data={series.points}
                        fill={series.color}
                        shape="circle"
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">제출된 모둠 측정 데이터가 없습니다.</p>
                <p className="text-xs text-slate-400">학생들이 실험 데이터를 입력하면 실시간으로 차트에 표시됩니다.</p>
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
                <span>모둠별 탐구 질문지 답변 비교 ({selectedGrade} {selectedClass})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                이 탐구 주제의 질문 문항에 대해 각 모둠 학생들이 작성한 서술형 답변을 한눈에 나란히 비교합니다.
              </p>
            </div>

            {/* Questions Comparison Cards */}
            <div className="space-y-6">
              {(currentTopic?.questions || []).map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-xs shrink-0">
                      질문 {qIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">{q.prompt}</h4>
                      {q.guide && <p className="text-[11px] text-slate-500 mt-0.5">가이드: {q.guide}</p>}
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
