import React, { useRef, useState } from 'react';
import { X, Printer, Download, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { TopicConfig, GroupExperimentData, TrendlineResult, getEffectiveReportQuestions } from '../types';
import { filterValidPoints } from '../utils/mathAnalysis';
import { exportReportToPDF } from '../utils/pdfExport';
import { printElement, openPrintWindow } from '../utils/printHelper';
import { ReportGraphView } from './ReportGraphView';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicConfig;
  groupData: GroupExperimentData;
  trendResult: TrendlineResult;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  topic,
  groupData,
  trendResult
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validPoints = filterValidPoints(groupData.points);
  const reportQuestions = getEffectiveReportQuestions(topic);
  const notes = groupData.conclusionNotes || { summary: '', principle: '', errorAnalysis: '', answers: {} };

  // Legacy summary/principle/errorAnalysis fields only ever represented a
  // fixed 3-question shape; for topics with a different question count
  // (e.g. EXP_02's 4 questions) positional fallback mislabels answers, so
  // only use it when the topic actually has exactly 3 questions. See the
  // matching guard in ReportBuilder.tsx.
  const useLegacyPositionalSync = reportQuestions.length === 3;

  const getAnswer = (qId: string, idx: number): string => {
    if (notes.answers && notes.answers[qId] !== undefined) {
      return notes.answers[qId];
    }
    if (useLegacyPositionalSync) {
      if (idx === 0 && notes.summary) return notes.summary;
      if (idx === 1 && notes.principle) return notes.principle;
      if (idx === 2 && notes.errorAnalysis) return notes.errorAnalysis;
    }
    return '';
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || isExportingPDF) return;
    setErrorMessage(null);
    try {
      setIsExportingPDF(true);
      await exportReportToPDF(reportRef.current, topic, groupData);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.warn('PDF direct export failed, falling back to printable sheet:', err);
      try {
        await printElement(reportRef.current, {
          title: `과학탐구보고서_${groupData.grade}_${groupData.classNum}_${groupData.groupName}_${groupData.trialIndex || 1}차`,
          pageOrientation: 'portrait'
        });
      } catch (printErr) {
        setErrorMessage('PDF 생성 중 오류가 발생했습니다. 상단의 [인쇄] 버튼을 이용해 PDF로 저장하세요.');
      }
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!reportRef.current || isPrinting) return;
    setIsPrinting(true);
    setErrorMessage(null);
    try {
      await printElement(reportRef.current, {
        title: `과학탐구보고서_${groupData.grade}_${groupData.classNum}_${groupData.groupName}_${groupData.trialIndex || 1}차`,
        pageOrientation: 'portrait'
      });
    } catch (err) {
      console.warn('Direct print failed, attempting popup window print:', err);
      openPrintWindow(reportRef.current, `과학탐구보고서_${groupData.grade}_${groupData.classNum}_${groupData.groupName}_${groupData.trialIndex || 1}차`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenNewWindow = () => {
    if (!reportRef.current) return;
    openPrintWindow(reportRef.current, `과학탐구보고서_${groupData.grade}_${groupData.classNum}_${groupData.groupName}_${groupData.trialIndex || 1}차`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Controls */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold">과학 탐구 보고서 저장 및 인쇄</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Primary PDF Direct Download Button */}
            <button
              id="btn-direct-download-pdf"
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white rounded-lg transition-all shadow-md cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>PDF 생성 중...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>PDF 다운로드 완료!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>PDF 파일로 다운로드</span>
                </>
              )}
            </button>

            {/* Sub Browser Print Button */}
            <button
              id="btn-modal-print-window"
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-60"
              title="A4 인쇄 / PDF 저장 창 열기"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isPrinting ? '인쇄 준비 중...' : 'A4 인쇄'}</span>
            </button>

            {/* Open in new popup tab */}
            <button
              type="button"
              onClick={handleOpenNewWindow}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="새 창으로 인쇄 창 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>새 창</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error message banner if any */}
        {errorMessage && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-amber-600 font-bold hover:underline">
              확인
            </button>
          </div>
        )}

        {/* Printable & Downloadable Report Content */}
        <div
          id="printable-report-area"
          ref={reportRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 space-y-6 printable-area"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              과학 탐구 실험 결과 보고서
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {topic.title}
            </p>
            <div className="flex justify-center items-center gap-4 text-xs font-semibold pt-2 text-slate-700">
              <span>학년/반: {groupData.grade} {groupData.classNum}</span>
              <span>•</span>
              <span>모둠명: <strong className="text-blue-700">{groupData.groupName}</strong></span>
              <span>•</span>
              <span>시행: <strong className="text-blue-700">{groupData.trialIndex || 1}차</strong></span>
              <span>•</span>
              <span>작성일시: {groupData.lastSavedAt || new Date().toLocaleDateString('ko-KR')}</span>
            </div>
          </div>

          {/* Section 1: Variables */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 border-l-3 border-blue-600 pl-2">
              1. 탐구 변인 및 실험 조건
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-600">독립변인 (조작 변인): </span>
                <strong className="text-slate-900">{topic.xVarName} ({topic.xUnit})</strong>
              </div>
              <div>
                <span className="font-semibold text-slate-600">종속변인 (측정 변인): </span>
                <strong className="text-slate-900">{topic.yVarName} ({topic.yUnit})</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Data Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-600 pl-2">
              2. 실험 측정 데이터
            </h3>
            <table className="w-full text-xs text-center border-collapse border border-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-300 py-1.5 px-2">차수</th>
                  <th className="border border-slate-300 py-1.5 px-2">{topic.xVarName} ({topic.xUnit})</th>
                  <th className="border border-slate-300 py-1.5 px-2">{topic.yVarName} ({topic.yUnit})</th>
                  <th className="border border-slate-300 py-1.5 px-2">비고/메모</th>
                </tr>
              </thead>
              <tbody>
                {groupData.points.map((pt, idx) => (
                  <tr key={pt.id} className={pt.isOutlier ? 'bg-slate-100 text-slate-400 line-through' : ''}>
                    <td className="border border-slate-300 py-1.5 px-2">{idx + 1}</td>
                    <td className="border border-slate-300 py-1.5 px-2 font-mono">{pt.x !== '' ? pt.x : '-'}</td>
                    <td className="border border-slate-300 py-1.5 px-2 font-mono">{pt.y !== '' ? pt.y : '-'}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-left">{pt.isOutlier ? '(이상치 제외)' : pt.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Student Graph & Relationship Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 border-l-3 border-indigo-600 pl-2">
                3. 학생 직접 작도 그래프 및 관계식
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                (학생이 모눈종이에 직접 찍은 점 및 작도한 직선/곡선)
              </span>
            </div>

            {/* Visual Graph with Grid, Points, and Student Drawn Lines/Curves */}
            <ReportGraphView
              topic={topic}
              groupData={groupData}
              trendResult={trendResult}
            />

            {/* Student Drawing Summary Box */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>작도 모드:</strong>{' '}
                  {!groupData.manualGraphData?.hasDrawn && (!groupData.manualGraphData?.studentPoints || groupData.manualGraphData.studentPoints.length === 0)
                    ? '작도 미완료'
                    : groupData.manualGraphData?.toolMode === 'freehand'
                    ? '자유 곡선 펜 작도'
                    : groupData.manualGraphData?.toolMode === 'quadratic'
                    ? '3점 곡선 자 작도 (2차 포물선)'
                    : '직선 자 작도 (1차 비례/선형)'}
                </span>
                <span>
                  <strong>측정값 작도 일치도:</strong>{' '}
                  <strong className="text-indigo-800">
                    {groupData.manualGraphData?.studentPoints && groupData.manualGraphData.studentPoints.length > 0
                      ? `${groupData.manualGraphData.matchStatus?.percent ?? 0}% (${groupData.manualGraphData.matchStatus?.matchedCount ?? 0}/${groupData.manualGraphData.matchStatus?.total ?? 0}개 일치)`
                      : '0% (점 작도 전)'}
                  </strong>
                </span>
              </div>
              <div>
                <strong>학생 도출 관계식:</strong>{' '}
                {groupData.manualGraphData?.hasAdjustedRuler || (groupData.manualGraphData?.studentPoints && groupData.manualGraphData.studentPoints.length > 0) ? (
                  <code className="px-2 py-0.5 bg-white border border-indigo-300 rounded font-bold text-indigo-900 ml-1">
                    {groupData.manualGraphData?.toolMode === 'quadratic' && groupData.manualGraphData?.studentQuadraticCurve
                      ? groupData.manualGraphData.studentQuadraticCurve.eqString
                      : groupData.manualGraphData?.studentLineEquation?.eqString || '미작도'}
                  </code>
                ) : (
                  <span className="text-slate-500 font-medium ml-1">
                    미작도 (실험 그래프 탭에서 점을 찍고 자를 조절하여 작도하세요)
                  </span>
                )}
              </div>
              {topic.slopeMeaningGuide && (
                <div className="text-slate-600 pt-1 border-t border-indigo-100 leading-relaxed">
                  <strong>기울기/수학적 관계의 물리적 의미:</strong> {topic.slopeMeaningGuide}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Dynamic Written Analysis & Conclusions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-l-3 border-slate-800 pl-2">
              4. 자료 해석 및 과학적 개념 도출 (총 {reportQuestions.length}문항)
            </h3>

            <div className="space-y-2.5 text-xs">
              {reportQuestions.map((q, idx) => {
                const ans = getAnswer(q.id, idx);
                return (
                  <div key={q.id || idx} className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/40">
                    <div className="flex items-baseline gap-1.5 font-bold text-slate-800">
                      <span className="text-blue-700 font-extrabold">{idx + 1}.</span>
                      <span className="text-slate-900">{q.title}</span>
                      <span className="text-slate-500 font-normal text-[11px] ml-1">({q.question})</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-slate-300 font-sans">
                      {ans || '(작성 내용 없음)'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
