import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TopicConfig, GroupExperimentData, TrendlineResult, getEffectiveReportQuestions } from '../types';

interface ReportBuilderProps {
  topic: TopicConfig;
  groupData: GroupExperimentData;
  trendResult: TrendlineResult;
  onChangeNotes: (notes: GroupExperimentData['conclusionNotes']) => void;
}

const STEP_BADGE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'focus:ring-blue-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'focus:ring-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'focus:ring-amber-500' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'focus:ring-purple-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'focus:ring-rose-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'focus:ring-indigo-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'focus:ring-teal-500' }
];

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  topic,
  groupData,
  trendResult,
  onChangeNotes
}) => {
  const [showHints, setShowHints] = useState(true);

  const notes = groupData.conclusionNotes || {
    summary: '',
    principle: '',
    errorAnalysis: '',
    answers: {}
  };

  const reportQuestions = getEffectiveReportQuestions(topic);

  // The legacy summary/principle/errorAnalysis fields only ever represented
  // exactly 3 fixed questions (자료해석/원리/오차분석 in that order). That
  // mapping is meaningless for topics with a different question count/order
  // (e.g. EXP_02 has 4 questions where index 2 is "입자 운동 관점 해석", not
  // error analysis) - syncing by position there silently mislabels answers.
  // notes.answers (keyed by question id) is the authoritative source for
  // every topic; the legacy fields are only kept in sync for the classic
  // 3-question shape so old exports/printouts that still read them directly
  // keep working.
  const useLegacyPositionalSync = reportQuestions.length === 3;

  const getAnswerValue = (qId: string, idx: number): string => {
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

  const handleQuestionChange = (qId: string, idx: number, value: string) => {
    const updatedAnswers = {
      ...(notes.answers || {}),
      [qId]: value
    };

    const updatedNotes = {
      ...notes,
      answers: updatedAnswers
    };

    if (useLegacyPositionalSync) {
      if (idx === 0) updatedNotes.summary = value;
      if (idx === 1) updatedNotes.principle = value;
      if (idx === 2) updatedNotes.errorAnalysis = value;
    }

    onChangeNotes(updatedNotes);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>과학적 개념 도출 및 탐구 보고서 작성</span>
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            ({groupData.grade} {groupData.classNum} {groupData.groupName})
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
            총 {reportQuestions.length}문항
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>도움말/힌트</span>
            {showHints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Guided Questions / Hint Box */}
      {showHints && (topic.conceptGuide || (topic.coreQuestions && topic.coreQuestions.length > 0)) && (
        <div className="bg-emerald-50/60 border-b border-emerald-100 p-3 text-xs text-emerald-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>탐구 핵심 질문 및 생각거리</span>
          </div>
          {topic.conceptGuide && (
            <p className="text-emerald-800 leading-relaxed pl-5">
              {topic.conceptGuide}
            </p>
          )}
          {topic.coreQuestions && topic.coreQuestions.length > 0 && (
            <ul className="list-disc list-inside pl-5 text-emerald-800 space-y-0.5">
              {topic.coreQuestions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dynamic Customizable Inquiry Report Form - Vertical Layout */}
      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 bg-slate-50/40">
        {reportQuestions.map((q, idx) => {
          const color = STEP_BADGE_COLORS[idx % STEP_BADGE_COLORS.length];
          const val = getAnswerValue(q.id, idx);

          return (
            <div
              key={q.id || idx}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
            >
              {/* Question Header & Title */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs`}>
                    {idx + 1}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                    {q.title}
                  </h3>
                </div>
                {val.trim() && (
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    작성됨 ({val.trim().length}자)
                  </span>
                )}
              </div>

              {/* Question Subtext */}
              <div className="pl-7">
                <p className="text-xs sm:text-[13px] text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2.5">
                  {q.question}
                </p>

                {/* Textarea */}
                <textarea
                  id={`input-report-${q.id || idx}`}
                  rows={3}
                  value={val}
                  onChange={(e) => handleQuestionChange(q.id, idx, e.target.value)}
                  placeholder={q.placeholder || '내용을 서술하세요...'}
                  className={`w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 ${color.border} focus:border-transparent focus:outline-none bg-white placeholder:text-slate-400 leading-relaxed resize-y transition-all`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
