import React, { useState } from 'react';
import {
  X,
  Settings,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Save,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { TopicConfig, GASConfig, TrendlineType } from '../types';
import { getGASCodeTemplate } from '../utils/gasService';

interface TeacherSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasConfig: GASConfig;
  onSaveGASConfig: (config: GASConfig) => void;
  topics: TopicConfig[];
  onSaveTopics: (topics: TopicConfig[]) => void;
  onSyncFromGAS: () => Promise<boolean>;
  isSyncing: boolean;
}

export const TeacherSettingsModal: React.FC<TeacherSettingsModalProps> = ({
  isOpen,
  onClose,
  gasConfig,
  onSaveGASConfig,
  topics,
  onSaveTopics,
  onSyncFromGAS,
  isSyncing
}) => {
  const [activeTab, setActiveTab] = useState<'gas' | 'topics'>('gas');
  const [webAppUrl, setWebAppUrl] = useState(gasConfig.webAppUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Edit / Add Topic State
  const [editingTopic, setEditingTopic] = useState<TopicConfig | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  const gasCode = getGASCodeTemplate();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveUrl = () => {
    onSaveGASConfig({
      ...gasConfig,
      webAppUrl: webAppUrl.trim()
    });
    setTestStatus('설정이 저장되었습니다.');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl) {
      setTestStatus('⚠️ Web App URL을 먼저 입력해 주세요.');
      return;
    }
    setTestStatus('연결 테스트 중...');
    const success = await onSyncFromGAS();
    if (success) {
      setTestStatus('✅ 구글 스프레드시트와 성공적으로 연결되었습니다!');
    } else {
      setTestStatus('❌ 연결에 실패했습니다. Web App 배포 시 "액세스 권한: 모든 사용자"로 설정되었는지 확인하세요.');
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    if (topics.length <= 1) {
      return;
    }
    const updated = topics.filter((t) => t.topicId !== topicId);
    onSaveTopics(updated);
  };

  const handleStartAdd = () => {
    const nextNum = topics.length + 1;
    const newId = `EXP_${String(nextNum).padStart(2, '0')}`;
    setEditingTopic({
      topicId: newId,
      title: '새로운 과학 탐구 실험',
      grades: ['1학년', '2학년', '3학년'],
      classes: ['1반', '2반', '3반', '4반'],
      groups: ['A모둠', 'B모둠', 'C모둠', 'D모둠', 'E모둠', 'F모둠'],
      xVarName: '독립변인 X',
      xUnit: '단위',
      yVarName: '종속변인 Y',
      yUnit: '단위',
      defaultTrendline: 'linear',
      conceptGuide: '실험을 통해 발견할 수 있는 과학적 원리를 안내합니다.',
      slopeMeaningGuide: '그래프 기울기의 물리적 의미를 설명합니다.',
      active: true,
      coreQuestions: ['X와 Y 사이에는 어떤 관계가 성립하는가?']
    });
    setIsAddingTopic(true);
  };

  const handleSaveEditingTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;

    if (isAddingTopic) {
      onSaveTopics([...topics, editingTopic]);
    } else {
      const updated = topics.map((t) => (t.topicId === editingTopic.topicId ? editingTopic : t));
      onSaveTopics(updated);
    }
    setEditingTopic(null);
    setIsAddingTopic(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">교사용 환경설정 & 구글 시트(GAS) 연동</h2>
              <p className="text-xs text-slate-300">
                다중 탐구 주제, 모둠 목록(A모둠, B모둠...) 및 Google Apps Script 웹앱 관리
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('gas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'gas'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Google Apps Script (GAS) 연동
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'topics'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            탐구 주제 및 모둠 목록 관리 ({topics.length}개)
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 text-slate-800">
          {activeTab === 'gas' ? (
            <div className="space-y-5">
              {/* URL Configuration Box */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>배포된 Google Apps Script (GAS) 웹 앱 URL</span>
                  </label>
                  <span className="text-[11px] text-blue-700 font-medium">실시간 양방향 동기화</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs px-3 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0"
                  >
                    URL 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isSyncing}
                    className="px-3 py-2 text-xs font-bold text-blue-800 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors shrink-0 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>동기화 테스트</span>
                  </button>
                </div>

                {testStatus && (
                  <p className="text-xs font-medium text-slate-700 mt-1">{testStatus}</p>
                )}
              </div>

              {/* Step-by-step Setup Guide */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🛠️ 구글 스프레드시트 3분 완성 설정 방법</span>
                </h3>

                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <li>
                    새 구글 스프레드시트를 생성하고 상단 메뉴에서 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.
                  </li>
                  <li>
                    기존 기본 코드를 모두 삭제하고 아래의 <strong>[GAS 코드 복사]</strong> 버튼을 눌러 그대로 붙여넣습니다.
                  </li>
                  <li>
                    우측 상단 <strong>[배포] → [새 배포]</strong>를 클릭하고 유형으로 <strong>[웹 앱]</strong>을 선택합니다.
                  </li>
                  <li>
                    <span className="text-rose-600 font-bold">중요:</span> <strong>[액세스 권한]</strong>을 반드시 <strong>"모든 사용자 (Anyone)"</strong>로 설정하고 [배포]합니다.
                  </li>
                  <li>
                    발급된 <strong>웹 앱 URL (https://script.google.com/macros/s/.../exec)</strong>을 복사하여 상단 입력창에 넣고 [URL 저장]을 누르면 완료됩니다!
                  </li>
                </ol>

                {/* Copyable Code Box */}
                <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
                  <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-xs">
                    <span className="font-mono text-slate-400">GoogleAppsScript.gs (Apps Script 전문)</span>
                    <button
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? '복사됨!' : 'GAS 코드 복사'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed text-blue-200">
                    {gasCode}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Topics Tab */
            <div className="space-y-4">
              {editingTopic ? (
                /* Edit/Add Form */
                <form onSubmit={handleSaveEditingTopic} className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900">
                      {isAddingTopic ? '➕ 새 탐구 주제 추가' : `✏️ [${editingTopic.topicId}] 주제 수정`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingTopic(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      취소
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700">주제 ID (고유 코드)</label>
                      <input
                        type="text"
                        required
                        disabled={!isAddingTopic}
                        value={editingTopic.topicId}
                        onChange={(e) => setEditingTopic({ ...editingTopic, topicId: e.target.value })}
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">탐구 주제명</label>
                      <input
                        type="text"
                        required
                        value={editingTopic.title}
                        onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">대상 학년 목록 (콤마 구분)</label>
                      <input
                        type="text"
                        value={editingTopic.grades.join(', ')}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            grades: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        placeholder="1학년, 2학년, 3학년"
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">대상 반 목록 (콤마 구분)</label>
                      <input
                        type="text"
                        value={editingTopic.classes.join(', ')}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            classes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        placeholder="1반, 2반, 3반, 4반"
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>모둠 목록 (병렬 지정: 콤마 구분)</span>
                        <span className="text-[11px] font-normal text-blue-600">
                          예: A모둠, B모둠, C모둠, D모둠 또는 1모둠, 2모둠, 3모둠
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTopic.groups.join(', ')}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            groups: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        placeholder="A모둠, B모둠, C모둠, D모둠, E모둠, F모둠"
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">독립변인(X)명 및 단위</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="text"
                          required
                          value={editingTopic.xVarName}
                          onChange={(e) => setEditingTopic({ ...editingTopic, xVarName: e.target.value })}
                          placeholder="추의 무게"
                          className="flex-1 p-2 border border-slate-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          required
                          value={editingTopic.xUnit}
                          onChange={(e) => setEditingTopic({ ...editingTopic, xUnit: e.target.value })}
                          placeholder="N"
                          className="w-20 p-2 border border-slate-300 rounded bg-white text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">종속변인(Y)명 및 단위</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="text"
                          required
                          value={editingTopic.yVarName}
                          onChange={(e) => setEditingTopic({ ...editingTopic, yVarName: e.target.value })}
                          placeholder="늘어난 길이"
                          className="flex-1 p-2 border border-slate-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          required
                          value={editingTopic.yUnit}
                          onChange={(e) => setEditingTopic({ ...editingTopic, yUnit: e.target.value })}
                          placeholder="cm"
                          className="w-20 p-2 border border-slate-300 rounded bg-white text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">기본 권장 추세선 모델</label>
                      <select
                        value={editingTopic.defaultTrendline}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            defaultTrendline: e.target.value as TrendlineType
                          })
                        }
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      >
                        <option value="proportional">원점통과 비례 (y = ax)</option>
                        <option value="linear">선형 (y = ax + b)</option>
                        <option value="inverse">반비례 (y = k / x)</option>
                        <option value="quadratic">2차 다항식 (y = ax² + bx + c)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700">과학적 개념 및 원리 가이드</label>
                      <textarea
                        rows={2}
                        value={editingTopic.conceptGuide}
                        onChange={(e) => setEditingTopic({ ...editingTopic, conceptGuide: e.target.value })}
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700">기울기/수식의 물리적 의미 설명</label>
                      <textarea
                        rows={2}
                        value={editingTopic.slopeMeaningGuide}
                        onChange={(e) => setEditingTopic({ ...editingTopic, slopeMeaningGuide: e.target.value })}
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white"
                        placeholder="그래프의 기울기 (늘어난 길이 / 무게)는 용수철 상수의 역수(1/k)를 의미합니다."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>탐구 핵심 질문 및 생각거리 (줄바꿈으로 구분)</span>
                        <span className="text-[11px] font-normal text-emerald-700">
                          학생 화면의 점(•) 불릿 리스트에 한 줄씩 표시됩니다.
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={(editingTopic.coreQuestions || []).join('\n')}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            coreQuestions: e.target.value
                              .split('\n')
                              .map((q) => q.trim().replace(/^[-•*]\s*/, ''))
                              .filter(Boolean)
                          })
                        }
                        placeholder={'추의 무게가 2배, 3배로 증가할 때 늘어난 길이는 어떻게 변하는가?\n그래프의 기울기는 용수철의 어떤 성질을 나타내는가?'}
                        className="w-full mt-1 p-2 border border-slate-300 rounded bg-white font-sans text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingTopic(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                    >
                      주제 저장
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      등록된 탐구 주제 목록입니다. 학생 웹앱에서 선택하여 사용할 수 있습니다.
                    </p>
                    <button
                      onClick={handleStartAdd}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 주제 추가</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {topics.map((t) => (
                      <div
                        key={t.topicId}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                              {t.topicId}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>변인: {t.xVarName}({t.xUnit}) ⟷ {t.yVarName}({t.yUnit})</span>
                            <span>모둠: <strong className="text-blue-700">{t.groups.join(', ')}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setEditingTopic(t);
                              setIsAddingTopic(false);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(t.topicId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
