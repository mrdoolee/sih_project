import React from 'react';
import {
  FlaskConical,
  Users,
  Save,
  BarChart3,
  Printer,
  Sparkles,
  CloudCheck,
  RotateCcw,
  Lock,
  LogOut,
  Home
} from 'lucide-react';
import { TopicConfig } from '../types';

interface HeaderProps {
  topics: TopicConfig[];
  selectedTopic: TopicConfig;
  selectedGrade: string;
  selectedClass: string;
  selectedGroup: string;
  allowClassOverview?: boolean;
  onSelectTopic: (topicId: string) => void;
  onSelectGrade: (grade: string) => void;
  onSelectClass: (cls: string) => void;
  onSelectGroup: (grp: string) => void;
  onSwitchGroup: () => void;
  onSave: () => void;
  onOpenAllGroups: () => void;
  onOpenReportPrint: () => void;
  onResetData: () => void;
  isSaving: boolean;
  isSyncing: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
}

export const Header: React.FC<HeaderProps> = ({
  topics,
  selectedTopic,
  selectedGrade,
  selectedClass,
  selectedGroup,
  allowClassOverview = true,
  onSelectTopic,
  onSelectGrade,
  onSelectClass,
  onSelectGroup,
  onSwitchGroup,
  onSave,
  onOpenAllGroups,
  onOpenReportPrint,
  onResetData,
  isSaving,
  isSyncing,
  hasUnsavedChanges,
  lastSavedAt
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              과학 탐구 활동 보고서 작성 도우미
            </h1>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View All Groups Data Button (Only if allowed by Teacher) */}
          {allowClassOverview && (
            <button
              id="btn-view-all-groups"
              onClick={onOpenAllGroups}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="학급 내 모든 모둠의 데이터와 오버레이 그래프를 비교합니다"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>전체 모둠 데이터 확인</span>
            </button>
          )}

          {/* Save to Sheets Button */}
          <button
            id="btn-save-to-sheets"
            onClick={onSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-900'
            } disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? '시트에 저장 중...' : '시트에 저장'}</span>
          </button>

          {/* Print/Report Builder */}
          <button
            id="btn-print-report"
            onClick={onOpenReportPrint}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="탐구 보고서 PDF 다운로드 및 인쇄"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">보고서 PDF/출력</span>
          </button>

          {/* Go to Start Screen Button */}
          <button
            id="btn-go-home"
            onClick={onSwitchGroup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="주제 및 모둠 선택 화면(첫 화면)으로 이동"
          >
            <Home className="w-4 h-4 text-slate-600" />
            <span>첫 화면으로</span>
          </button>
        </div>
      </div>

      {/* Subject & Group Selection Bar */}
      <div className="bg-slate-50/80 border-t border-slate-200 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Topic & Group Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            {/* Topic Select */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="font-semibold text-slate-600 whitespace-nowrap">탐구 주제:</span>
              <select
                id="select-topic"
                value={selectedTopic.topicId}
                onChange={(e) => onSelectTopic(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[320px] truncate"
              >
                {topics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    [{t.topicId}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Select */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="font-semibold text-slate-600">학년:</span>
              <select
                id="select-grade"
                value={selectedGrade}
                onChange={(e) => onSelectGrade(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {selectedTopic.grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Select */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="font-semibold text-slate-600">반:</span>
              <select
                id="select-class"
                value={selectedClass}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {selectedTopic.classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Group (모둠) Select & Lock Badge */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold text-blue-900">모둠:</span>
              <select
                id="select-group"
                value={selectedGroup}
                onChange={(e) => onSelectGroup(e.target.value)}
                className="bg-transparent font-bold text-blue-900 focus:outline-none cursor-pointer"
              >
                {selectedTopic.groups.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
              <span className="inline-flex items-center text-[11px] text-blue-700 font-semibold bg-blue-100/80 px-1.5 py-0.5 rounded-sm ml-0.5" title="모둠 비밀번호로 보호 중">
                <Lock className="w-2.5 h-2.5 mr-0.5" />
                인증됨
              </span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {lastSavedAt && (
              <span className="hidden lg:inline-flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                마지막 저장: {lastSavedAt}
              </span>
            )}
            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="현재 모둠의 표 데이터 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
