import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Users,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  School,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { TopicConfig, TeacherSettingsConfig } from '../types';
import {
  getGroupPassword,
  setGroupPassword,
  getGroupPasswordKey
} from '../utils/gasService';

interface IndexSelectionScreenProps {
  topics: TopicConfig[];
  selectedTopicId: string;
  selectedGrade: string;
  selectedClass: string;
  selectedGroup: string;
  teacherSettings: TeacherSettingsConfig;
  gasWebAppUrl?: string;
  onEnterLab: (selection: {
    topicId: string;
    grade: string;
    classNum: string;
    groupName: string;
    password: string;
  }) => void;
  onOpenTeacherDashboard: () => void;
}

export const IndexSelectionScreen: React.FC<IndexSelectionScreenProps> = ({
  topics,
  selectedTopicId,
  selectedGrade,
  selectedClass,
  selectedGroup,
  teacherSettings,
  gasWebAppUrl,
  onEnterLab,
  onOpenTeacherDashboard
}) => {
  const [topicId, setTopicId] = useState<string>(selectedTopicId || topics[0]?.topicId || 'EXP_01');
  
  const currentTopic = useMemo(() => {
    return topics.find((t) => t.topicId === topicId) || topics[0];
  }, [topics, topicId]);

  const [grade, setGrade] = useState<string>(() => {
    if (currentTopic?.grades?.includes(selectedGrade)) return selectedGrade;
    return currentTopic?.grades?.[0] || '1학년';
  });

  const [classNum, setClassNum] = useState<string>(() => {
    if (currentTopic?.classes?.includes(selectedClass)) return selectedClass;
    return currentTopic?.classes?.[0] || '1반';
  });

  const [groupName, setGroupName] = useState<string>(() => {
    if (currentTopic?.groups?.includes(selectedGroup)) return selectedGroup;
    return currentTopic?.groups?.[0] || 'A모둠';
  });

  // Keep grade/class/group valid when topic changes
  useEffect(() => {
    if (!currentTopic.grades.includes(grade)) {
      setGrade(currentTopic.grades[0] || '1학년');
    }
    if (!currentTopic.classes.includes(classNum)) {
      setClassNum(currentTopic.classes[0] || '1반');
    }
    if (!currentTopic.groups.includes(groupName)) {
      setGroupName(currentTopic.groups[0] || 'A모둠');
    }
  }, [currentTopic, grade, classNum, groupName]);

  // Password inputs
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current group already has a password set
  const existingPassword = useMemo(() => {
    return getGroupPassword(topicId, grade, classNum, groupName);
  }, [topicId, grade, classNum, groupName]);

  const isPasswordRequired = teacherSettings?.requireGroupPassword !== false;

  // Clear inputs on group change
  useEffect(() => {
    setPasswordInput('');
    setPasswordConfirm('');
    setErrorMessage(null);
  }, [topicId, grade, classNum, groupName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If teacher disabled group passwords globally
    if (!isPasswordRequired) {
      onEnterLab({
        topicId,
        grade,
        classNum,
        groupName,
        password: ''
      });
      return;
    }

    const inputPw = passwordInput.trim();
    if (!inputPw) {
      setErrorMessage('선생님께 배부받은 모둠 비밀번호를 입력해주세요.');
      return;
    }

    // Teacher master password override check
    const teacherMasterPw = (teacherSettings.teacherPassword || '0000').trim();
    const isTeacherOverride = inputPw === teacherMasterPw;

    if (existingPassword) {
      // Verifying teacher-assigned password
      if (inputPw === existingPassword || isTeacherOverride) {
        onEnterLab({
          topicId,
          grade,
          classNum,
          groupName,
          password: inputPw
        });
      } else {
        setErrorMessage('배부받은 모둠 비밀번호와 일치하지 않습니다. 비밀번호를 다시 확인하거나 선생님께 문의하세요.');
      }
    } else {
      // Group does not have a password assigned by teacher yet
      if (isTeacherOverride) {
        onEnterLab({
          topicId,
          grade,
          classNum,
          groupName,
          password: inputPw
        });
      } else {
        setErrorMessage('선생님께서 아직 이 모둠의 비밀번호를 배정하지 않으셨습니다. 담당 선생님께 문의하세요. (교사용 마스터 비밀번호로 즉시 입장 가능)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-between text-slate-100 selection:bg-indigo-500 selection:text-white px-4 py-8 sm:py-12">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              과학 탐구 보고서 & 데이터 도우미
            </h1>
          </div>
        </div>

        <button
          id="btn-index-teacher-mode"
          onClick={onOpenTeacherDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl transition-all shadow-xs backdrop-blur-xs cursor-pointer"
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>교사 관리 모드</span>
        </button>
      </div>

      {/* Main Login / Selection Card */}
      <div className="max-w-3xl mx-auto w-full my-6 sm:my-8">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Card Title */}
          <div className="border-b border-slate-800 pb-5 mb-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Science Lab Authentication</span>
              </div>
              {gasWebAppUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>구글 시트 연동됨</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  <span>오프라인/로컬 모드</span>
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">
              실험 탐구 주제 및 모둠 선택
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              오늘 수행할 탐구 주제와 소속 학년, 반, 모둠을 선택하고 모둠 비밀번호를 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Topic Select */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  1. 탐구 주제 선택
                </span>
                <span className="text-xs text-indigo-300 font-normal">총 {topics.length}개 주제 등록됨</span>
              </label>
              <div className="relative">
                <select
                  id="index-select-topic"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm sm:text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                >
                  {topics.map((t) => (
                    <option key={t.topicId} value={t.topicId} className="bg-slate-900 text-white">
                      [{t.topicId}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Preview Badge Card */}
              {currentTopic && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-4">
                  <span>
                    <strong className="text-indigo-300">독립변인(X):</strong> {currentTopic.xVarName} ({currentTopic.xUnit})
                  </span>
                  <span>
                    <strong className="text-indigo-300">종속변인(Y):</strong> {currentTopic.yVarName} ({currentTopic.yUnit})
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Grade, Class, Group 3-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Grade */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-400" />
                  2. 학년
                </label>
                <select
                  id="index-select-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {currentTopic.grades.map((g) => (
                    <option key={g} value={g} className="bg-slate-900 text-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-400" />
                  3. 반
                </label>
                <select
                  id="index-select-class"
                  value={classNum}
                  onChange={(e) => setClassNum(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {currentTopic.classes.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group */}
              <div>
                <label className="block text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  4. 우리 모둠
                </label>
                <select
                  id="index-select-group"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-indigo-950/60 border border-indigo-500/60 rounded-2xl px-3.5 py-2.5 text-sm sm:text-base font-bold text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer"
                >
                  {currentTopic.groups.map((grp) => (
                    <option key={grp} value={grp} className="bg-slate-900 text-white">
                      {grp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Group Password Security Section */}
            {isPasswordRequired ? (
              <div className="p-4 sm:p-5 rounded-2xl border bg-indigo-950/30 border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/20 text-indigo-300">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>모둠 비밀번호 인증</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          existingPassword
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                            : 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                        }`}>
                          {existingPassword ? '선생님 배정 완료' : '교사 배정 대기'}
                        </span>
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? '숨기기' : '비밀번호 보기'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-indigo-200/90 leading-relaxed">
                    🔑 <strong>{grade} {classNum} {groupName}</strong>에게 선생님께서 배부해주신 <strong>모둠 비밀번호(4자리)</strong>를 입력해주세요.
                  </p>
                  <div>
                    <input
                      id="input-group-password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="선생님께 배부받은 모둠 비밀번호 입력 (예: 1234)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      maxLength={20}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 gap-1">
                    <span>* 비밀번호를 모를 경우 담당 선생님께 문의하세요.</span>
                    <span>(교사용 마스터 비밀번호로도 입장 가능)</span>
                  </div>
                </div>

                {/* Error Display */}
                {errorMessage && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border bg-emerald-950/20 border-emerald-500/30 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Unlock className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-emerald-200 flex items-center gap-1.5">
                    <span>모둠 비밀번호 인증 미사용 모드 (자유 입장)</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">
                    교사 설정에 따라 비밀번호 입력 없이 <strong>{grade} {classNum} {groupName}</strong>으로 바로 입장할 수 있습니다.
                  </p>
                </div>
              </div>
            )}

            {/* Submit / Enter Lab Button */}
            <button
              id="btn-enter-lab"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>
                {isSubmitting ? '입장 처리 중...' : `${grade} ${classNum} ${groupName} 실험실 입장하기`}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500">
        <p>과학 탐구 데이터 수집 및 실시간 분석 시스템 · 구글 스프레드시트 GAS 연동 지원</p>
      </div>
    </div>
  );
};
