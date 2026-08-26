import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  KeyRound,
  Grid,
  List,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { TopicConfig } from '../types';
import { getGroupPasswordKey } from '../utils/gasService';
import { printElement, openPrintWindow } from '../utils/printHelper';

// A4 portrait fits a 2-column x 6-row grid of cut-out cards per sheet.
const CARDS_PER_PAGE = 12;

interface GroupPasswordPrintModalProps {
  isOpen?: boolean;
  topics: TopicConfig[];
  currentTopicId?: string;
  initialTopicId?: string;
  passwords: Record<string, string>;
  onClose: () => void;
}

export const GroupPasswordPrintModal: React.FC<GroupPasswordPrintModalProps> = ({
  isOpen = true,
  topics,
  currentTopicId,
  initialTopicId,
  passwords,
  onClose
}) => {
  const defaultTopicId = currentTopicId || initialTopicId || topics[0]?.topicId || '';
  const [selectedTopicId, setSelectedTopicId] = useState<string>(defaultTopicId);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync selected topic if prop changes
  useEffect(() => {
    if (currentTopicId || initialTopicId) {
      setSelectedTopicId(currentTopicId || initialTopicId || '');
    }
  }, [currentTopicId, initialTopicId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const topic = topics.find((t) => t.topicId === selectedTopicId) || topics[0];

  const filteredGrades = filterGrade === 'all' ? (topic?.grades || []) : [filterGrade];
  const filteredClasses = filterClass === 'all' ? (topic?.classes || []) : [filterClass];

  // Generate list of items to print
  const items: Array<{
    key: string;
    grade: string;
    classNum: string;
    groupName: string;
    password: string;
  }> = [];

  if (topic) {
    filteredGrades.forEach((g) => {
      filteredClasses.forEach((c) => {
        topic.groups.forEach((grp) => {
          const key = getGroupPasswordKey(topic.topicId, g, c, grp);
          const pw = passwords[key] || '미배정';
          items.push({
            key,
            grade: g,
            classNum: c,
            groupName: grp,
            password: pw
          });
        });
      });
    });
  }

  // Split the cut-out cards into fixed-size sheets so a card never straddles a
  // page boundary and gets sliced in half by the printer.
  const cardPages: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += CARDS_PER_PAGE) {
    cardPages.push(items.slice(i, i + CARDS_PER_PAGE));
  }

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const docTitle = `[비밀번호배부표]_${topic?.title || '과학탐구실험'}`;
      await printElement('printable-password-area', {
        title: docTitle,
        pageOrientation: 'portrait'
      });
    } catch (err) {
      console.warn('Iframe print failed, attempting popup window print:', err);
      openPrintWindow('printable-password-area', `[비밀번호배부표]_${topic?.title || '과학탐구실험'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenNewWindowPrint = () => {
    openPrintWindow('printable-password-area', `[비밀번호배부표]_${topic?.title || '과학탐구실험'}`);
  };

  return (
    <div
      id="modal-backdrop-password-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      {/* Print-specific style tag for crisp A4 output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-password-area, #printable-password-area * {
            visibility: visible;
          }
          #printable-password-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          /* A single cut-out ticket must never be sliced across two sheets. */
          .password-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>모둠별 비밀번호 배부 카드 & 명렬표 인쇄</span>
                <span className="text-xs font-normal text-indigo-300">
                  (총 {items.length}개 모둠)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                수업 전 학생들에게 배부할 카드 티켓 또는 교사 보관용 명렬표를 A4 규격으로 출력합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-do-print-password"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>인쇄 준비 중...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>지금 인쇄하기</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleOpenNewWindowPrint}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              title="새 창 팝업으로 인쇄 창 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>새 창 인쇄</span>
            </button>
            <button
              type="button"
              id="btn-close-print-modal-top"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters (Hidden during print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 no-print flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Format selector */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>배부용 카드 (오리기용)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>교사용 명렬표</span>
            </button>
          </div>

          {/* Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Topic Filter */}
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-600">주제:</span>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {topics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    [{t.topicId}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            {topic && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-600">학년:</span>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="all">전체 학년</option>
                  {topic.grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Filter */}
            {topic && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-600">반:</span>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="all">전체 반</option>
                  {topic.classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          <div
            id="printable-password-area"
            className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-3xl mx-auto min-h-[500px]"
          >
            {/* Header on Printed Document */}
            <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  과학 탐구 실험실 모둠 로그인 비밀번호 배부표
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  탐구 주제: <strong>[{topic?.topicId}] {topic?.title}</strong>
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono">
                <div>인쇄 일자: {new Date().toLocaleDateString('ko-KR')}</div>
                <div>총 {items.length}개 모둠 카드</div>
              </div>
            </div>

            {/* Cards View (Cut-out Cards for students) */}
            {viewMode === 'cards' && (
              <div className="space-y-3.5">
                {cardPages.map((pageItems, pageIdx) => (
                  <div
                    key={`pwpage-${pageIdx}`}
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
                      pageIdx < cardPages.length - 1 ? 'page-break' : ''
                    }`}
                  >
                {pageItems.map((item) => (
                  <div
                    key={item.key}
                    className="password-card p-4 rounded-xl border-2 border-dashed border-slate-300 bg-white relative hover:border-slate-400 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>과학 탐구 실험실 모둠 로그인 티켓</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {item.grade} {item.classNum}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <div className="text-base font-extrabold text-slate-900">
                            {item.groupName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[170px]">
                            {topic?.title}
                          </div>
                        </div>

                        {/* Password Block */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500">비밀번호</div>
                          <div className={`font-mono text-sm font-extrabold px-3 py-1 rounded-lg border ${
                            item.password && item.password !== '미배정'
                              ? 'bg-slate-900 text-emerald-400 border-slate-700'
                              : 'bg-slate-100 text-slate-400 border-slate-300'
                          }`}>
                            {item.password}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Guide */}
                    <div className="mt-2.5 pt-1.5 border-t border-slate-200/80 text-[9px] text-slate-500 flex items-center justify-between">
                      <span>* 실험실 접속 후 위 모둠명과 비밀번호를 입력하세요.</span>
                      <span className="font-mono text-slate-400">✂️ 자르는 선</span>
                    </div>
                  </div>
                ))}
                  </div>
                ))}
              </div>
            )}

            {/* Table View (Teacher Reference) */}
            {viewMode === 'table' && (
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-2 px-3 w-12 text-center">No</th>
                      <th className="py-2 px-3 w-20">학년</th>
                      <th className="py-2 px-3 w-20">반</th>
                      <th className="py-2 px-3 w-24">모둠명</th>
                      <th className="py-2 px-3 w-32">배정 비밀번호</th>
                      <th className="py-2 px-3">학생 대표 서명 / 비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, idx) => (
                      <tr key={item.key} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.grade}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.classNum}</td>
                        <td className="py-2 px-3 font-bold text-indigo-700">{item.groupName}</td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.password}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 border-b border-dotted border-slate-200">
                          {/* Signature line blank */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notice Footer in Print */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-sans">
              비밀번호 분실 시 담당 과학 선생님께 문의하여 초기화하거나 재발급받을 수 있습니다.
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between no-print text-xs">
          <span className="text-slate-500">
            총 <strong>{items.length}개</strong> 모둠 비밀번호가 준비되었습니다.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-close-print-modal-bottom"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>인쇄 중...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 인쇄하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
