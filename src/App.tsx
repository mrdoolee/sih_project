import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  TopicConfig,
  GroupExperimentData,
  DataPoint,
  TrendlineType,
  GASConfig,
  TeacherSettingsConfig
} from './types';
import {
  getStoredTopics,
  saveStoredTopics,
  getStoredGASConfig,
  saveStoredGASConfig,
  getStoredAllGroupData,
  saveStoredAllGroupData,
  getStoredTeacherSettings,
  saveStoredTeacherSettings,
  getGroupDataKey,
  saveGroupData,
  fetchAllGroupsData,
  fetchTopicsFromGAS,
  fetchTeacherSettingsFromGAS
} from './utils/gasService';
import { parseDistributionParams } from './utils/distributionHelper';
import { computeTrendline } from './utils/mathAnalysis';
import { Header } from './components/Header';
import { DataTable } from './components/DataTable';
import { ChartPanel } from './components/ChartPanel';
import { ReportBuilder } from './components/ReportBuilder';
import { AllGroupsModal } from './components/AllGroupsModal';
import { PrintableReportModal } from './components/PrintableReportModal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { IndexSelectionScreen } from './components/IndexSelectionScreen';

export default function App() {
  // Page Routing: 'teacher' (default index) or 'student' (accessed via distributed link ?mode=student or explicit button)
  const [currentPage, setCurrentPage] = useState<'student' | 'teacher'>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const page = params.get('page');
    // If student mode or student page or specific student parameters exist in URL
    if (mode === 'student' || page === 'student' || params.has('topic') || params.has('group') || window.location.hash === '#student') {
      return 'student';
    }
    // Explicit teacher mode or hash
    if (page === 'teacher' || mode === 'teacher' || window.location.hash === '#teacher') {
      return 'teacher';
    }
    // Default entry (index) is Teacher Console
    return 'teacher';
  });

  // Topics, GAS Config & Teacher Settings
  const [topics, setTopics] = useState<TopicConfig[]>(() => getStoredTopics());
  const [gasConfig, setGASConfig] = useState<GASConfig>(() => getStoredGASConfig());
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettingsConfig>(() => getStoredTeacherSettings());

  // Active selections
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => topics[0]?.topicId || 'EXP_01');
  
  const currentTopic = useMemo(() => {
    return topics.find((t) => t.topicId === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  const [selectedGrade, setSelectedGrade] = useState<string>(() => currentTopic?.grades[0] || '1학년');
  const [selectedClass, setSelectedClass] = useState<string>(() => currentTopic?.classes[0] || '1반');
  const [selectedGroup, setSelectedGroup] = useState<string>(() => currentTopic?.groups[0] || 'A모둠');

  // Group Authentication State
  const [isAuthenticatedGroup, setIsAuthenticatedGroup] = useState<boolean>(false);
  const [currentGroupPassword, setCurrentGroupPassword] = useState<string>('');

  // Handle Lab Entry from Index Screen
  const handleEnterLab = (selection: {
    topicId: string;
    grade: string;
    classNum: string;
    groupName: string;
    password: string;
  }) => {
    setSelectedTopicId(selection.topicId);
    setSelectedGrade(selection.grade);
    setSelectedClass(selection.classNum);
    setSelectedGroup(selection.groupName);
    setCurrentGroupPassword(selection.password);
    setIsAuthenticatedGroup(true);
    showToast(`${selection.grade} ${selection.classNum} ${selection.groupName}으로 입장했습니다.`);
  };

  // Handle Group Switch
  const handleSwitchGroup = () => {
    setIsAuthenticatedGroup(false);
    setCurrentGroupPassword('');
  };

  // Ensure selections stay valid when topic changes
  useEffect(() => {
    if (!currentTopic.grades.includes(selectedGrade)) {
      setSelectedGrade(currentTopic.grades[0] || '1학년');
    }
    if (!currentTopic.classes.includes(selectedClass)) {
      setSelectedClass(currentTopic.classes[0] || '1반');
    }
    if (!currentTopic.groups.includes(selectedGroup)) {
      setSelectedGroup(currentTopic.groups[0] || 'A모둠');
    }
  }, [currentTopic, selectedGrade, selectedClass, selectedGroup]);

  // All groups dataset for current Topic + Grade + Class
  const [allGroupsData, setAllGroupsData] = useState<GroupExperimentData[]>([]);
  
  // Current active group's data
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [selectedTrendline, setSelectedTrendline] = useState<TrendlineType>(
    () => currentTopic?.defaultTrendline || 'linear'
  );
  const [manualGraphData, setManualGraphData] = useState<GroupExperimentData['manualGraphData']>();
  const [conclusionNotes, setConclusionNotes] = useState<GroupExperimentData['conclusionNotes']>({
    summary: '',
    principle: '',
    errorAnalysis: ''
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isAllGroupsOpen, setIsAllGroupsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load group data from storage whenever topic, grade, class, or group changes
  const loadActiveGroupData = useCallback(() => {
    const key = getGroupDataKey(selectedTopicId, selectedGrade, selectedClass);
    const store = getStoredAllGroupData();
    const classList = store[key] || [];
    setAllGroupsData(classList);

    const existing = classList.find((item) => item.groupName === selectedGroup);
    if (existing) {
      setPoints(existing.points || []);
      setSelectedTrendline(existing.selectedTrendline || currentTopic.defaultTrendline || 'linear');
      setManualGraphData(existing.manualGraphData);
      setConclusionNotes(existing.conclusionNotes || { summary: '', principle: '', errorAnalysis: '' });
      setLastSavedAt(existing.lastSavedAt);
    } else {
      // Default empty state with 4 initial blank rows
      setPoints([
        { id: '1', order: 1, x: '', y: '', isOutlier: false },
        { id: '2', order: 2, x: '', y: '', isOutlier: false },
        { id: '3', order: 3, x: '', y: '', isOutlier: false },
        { id: '4', order: 4, x: '', y: '', isOutlier: false }
      ]);
      setSelectedTrendline(currentTopic.defaultTrendline || 'linear');
      setManualGraphData(undefined);
      setConclusionNotes({ summary: '', principle: '', errorAnalysis: '' });
      setLastSavedAt(undefined);
    }
    setHasUnsavedChanges(false);
  }, [selectedTopicId, selectedGrade, selectedClass, selectedGroup, currentTopic]);

  useEffect(() => {
    loadActiveGroupData();
  }, [loadActiveGroupData]);

  // Handle Save
  const handleSaveData = async () => {
    setIsSaving(true);
    const currentGroupData: GroupExperimentData = {
      topicId: selectedTopicId,
      grade: selectedGrade,
      classNum: selectedClass,
      groupName: selectedGroup,
      groupPassword: currentGroupPassword || undefined,
      points,
      selectedTrendline,
      manualGraphData,
      conclusionNotes,
      lastSavedAt: new Date().toLocaleString('ko-KR')
    };

    const result = await saveGroupData(currentGroupData, gasConfig.webAppUrl);
    setIsSaving(false);
    setHasUnsavedChanges(false);
    setLastSavedAt(currentGroupData.lastSavedAt);

    // Refresh class dataset
    const updatedClassList = await fetchAllGroupsData(
      selectedTopicId,
      selectedGrade,
      selectedClass,
      gasConfig.webAppUrl
    );
    setAllGroupsData(updatedClassList);

    showToast(result.message);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  // Sync settings and topics from GAS
  const handleSyncFromGAS = async (): Promise<boolean> => {
    if (!gasConfig.webAppUrl) return false;
    setIsSyncing(true);
    try {
      const [fetchedTopics, fetchedSettings] = await Promise.all([
        fetchTopicsFromGAS(gasConfig.webAppUrl),
        fetchTeacherSettingsFromGAS(gasConfig.webAppUrl)
      ]);
      let success = false;
      if (fetchedTopics && fetchedTopics.length > 0) {
        setTopics(fetchedTopics);
        saveStoredTopics(fetchedTopics);
        success = true;
      }
      if (fetchedSettings) {
        setTeacherSettings(fetchedSettings);
        saveStoredTeacherSettings(fetchedSettings);
        success = true;
      }
      if (success) {
        showToast('스프레드시트에서 최신 환경설정 및 주제를 동기화했습니다.');
      }
      return success;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial distribution parameters parsing (e.g. ?gas=...&topic=...&grade=...&class=...)
  useEffect(() => {
    const params = parseDistributionParams();
    if (params.hasDistributionParams) {
      if (params.gasUrl && params.gasUrl !== gasConfig.webAppUrl) {
        const newConfig = { ...gasConfig, webAppUrl: params.gasUrl };
        setGASConfig(newConfig);
        saveStoredGASConfig(newConfig);
        showToast('선생님 구글 시트 URL이 등록되었습니다.');
      }

      if (params.topicId) {
        setSelectedTopicId(params.topicId);
      }
      if (params.grade) {
        setSelectedGrade(params.grade);
      }
      if (params.classNum) {
        setSelectedClass(params.classNum);
      }
    }
  }, []);

  // Refresh All Groups Data for modal
  const handleRefreshAllGroups = async () => {
    setIsSyncing(true);
    const list = await fetchAllGroupsData(
      selectedTopicId,
      selectedGrade,
      selectedClass,
      gasConfig.webAppUrl
    );
    setAllGroupsData(list);
    setIsSyncing(false);
    showToast('전체 모둠 최신 데이터를 불러왔습니다.');
  };

  // Load sample values for active topic
  const handleLoadSample = () => {
    if (selectedTopicId === 'EXP_01') {
      setPoints([
        { id: '1', order: 1, x: 0.5, y: 1.25, isOutlier: false, note: '추 1개' },
        { id: '2', order: 2, x: 1.0, y: 2.45, isOutlier: false, note: '추 2개' },
        { id: '3', order: 3, x: 1.5, y: 3.70, isOutlier: false, note: '추 3개' },
        { id: '4', order: 4, x: 2.0, y: 4.95, isOutlier: false, note: '추 4개' },
        { id: '5', order: 5, x: 2.5, y: 6.20, isOutlier: false, note: '추 5개' }
      ]);
      setSelectedTrendline('proportional');
      setConclusionNotes({
        summary: '추의 무게가 0.5N씩 늘어날 때마다 늘어난 길이가 약 1.23cm씩 비례하여 늘어남.',
        principle: '작용한 외력(중력)과 용수철 탄성력의 크기가 정비례하는 훅의 법칙 확인.',
        errorAnalysis: '눈금을 수평 각도로 정밀하게 관측함.'
      });
    } else if (selectedTopicId === 'EXP_02') {
      setPoints([
        { id: '1', order: 1, x: 100, y: 60.0, isOutlier: false, note: '대기압' },
        { id: '2', order: 2, x: 120, y: 50.2, isOutlier: false },
        { id: '3', order: 3, x: 150, y: 40.1, isOutlier: false },
        { id: '4', order: 4, x: 200, y: 30.0, isOutlier: false },
        { id: '5', order: 5, x: 240, y: 24.8, isOutlier: false }
      ]);
      setSelectedTrendline('inverse');
      setConclusionNotes({
        summary: '기체 압력이 2배(100->200)가 될 때 부피는 절반(60->30)으로 줄어듦.',
        principle: '온도가 일정할 때 일정량의 기체의 부피는 압력에 반비례함 (P·V = k).',
        errorAnalysis: '주사기 피스톤의 마찰로 인한 미세 오차 고려.'
      });
    } else if (selectedTopicId === 'EXP_03') {
      setPoints([
        { id: '1', order: 1, x: 1.0, y: 50, isOutlier: false },
        { id: '2', order: 2, x: 2.0, y: 102, isOutlier: false },
        { id: '3', order: 3, x: 3.0, y: 151, isOutlier: false },
        { id: '4', order: 4, x: 4.0, y: 198, isOutlier: false },
        { id: '5', order: 5, x: 5.0, y: 250, isOutlier: false }
      ]);
      setSelectedTrendline('linear');
      setConclusionNotes({
        summary: '전압(V)을 높일수록 전류(mA)가 일정 비율로 증가함.',
        principle: '도선에 흐르는 전류는 전압에 정비례함 (옴의 법칙 V=IR).',
        errorAnalysis: '도선의 온도 상승으로 인한 저항 변화 확인 필요.'
      });
    } else {
      setPoints([
        { id: '1', order: 1, x: 10, y: 12, isOutlier: false },
        { id: '2', order: 2, x: 25, y: 28, isOutlier: false },
        { id: '3', order: 3, x: 37, y: 45, isOutlier: false, note: '최적 온도 부근' },
        { id: '4', order: 4, x: 50, y: 18, isOutlier: false, note: '효소 변성 시작' },
        { id: '5', order: 5, x: 65, y: 3, isOutlier: false, note: '거의 반응 없음' }
      ]);
      setSelectedTrendline('quadratic');
      setConclusionNotes({
        summary: '체온 부근(약 37°C)에서 산소 발생량이 최대이며, 50°C 이상에서는 급감함.',
        principle: '효소는 단백질로 이루어져 있어 고온에서 입체 구조가 변성되어 활성을 잃음.',
        errorAnalysis: '항온 수조의 온도 유지 정밀도.'
      });
    }
    setHasUnsavedChanges(true);
    showToast('예시 실험 데이터를 불러왔습니다.');
  };

  // Reset active group data
  const handleResetData = () => {
    setPoints([
      { id: '1', order: 1, x: '', y: '', isOutlier: false },
      { id: '2', order: 2, x: '', y: '', isOutlier: false },
      { id: '3', order: 3, x: '', y: '', isOutlier: false },
      { id: '4', order: 4, x: '', y: '', isOutlier: false }
    ]);
    setConclusionNotes({ summary: '', principle: '', errorAnalysis: '' });
    setHasUnsavedChanges(true);
    showToast('표 데이터를 초기화했습니다.');
  };

  // Active trendline result for report builder
  const currentTrendResult = useMemo(() => {
    return computeTrendline(selectedTrendline, points);
  }, [selectedTrendline, points]);

  const activeGroupData: GroupExperimentData = useMemo(() => ({
    topicId: selectedTopicId,
    grade: selectedGrade,
    classNum: selectedClass,
    groupName: selectedGroup,
    points,
    selectedTrendline,
    manualGraphData,
    conclusionNotes,
    lastSavedAt
  }), [selectedTopicId, selectedGrade, selectedClass, selectedGroup, points, selectedTrendline, manualGraphData, conclusionNotes, lastSavedAt]);

  // If on teacher page view
  if (currentPage === 'teacher') {
    return (
      <TeacherDashboard
        gasConfig={gasConfig}
        onSaveGASConfig={(cfg) => {
          setGASConfig(cfg);
          saveStoredGASConfig(cfg);
          showToast('GAS 연동 설정이 저장되었습니다.');
        }}
        topics={topics}
        onSaveTopics={(tList) => {
          setTopics(tList);
          saveStoredTopics(tList);
          showToast('탐구 주제 목록이 저장되었습니다.');
        }}
        teacherSettings={teacherSettings}
        onSaveTeacherSettings={(stg) => {
          setTeacherSettings(stg);
          saveStoredTeacherSettings(stg);
          showToast('교사 설정이 즉시 적용되었습니다.');
        }}
        onSyncFromGAS={handleSyncFromGAS}
        isSyncing={isSyncing}
        onBackToStudent={() => {
          setCurrentPage('student');
          // Clear query params if any
          if (window.location.search.includes('teacher') || window.location.hash.includes('teacher')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  // 2. Initial Index Screen (Topic, Grade, Class, Group & Password Auth)
  if (!isAuthenticatedGroup) {
    return (
      <IndexSelectionScreen
        topics={topics}
        selectedTopicId={selectedTopicId}
        selectedGrade={selectedGrade}
        selectedClass={selectedClass}
        selectedGroup={selectedGroup}
        teacherSettings={teacherSettings}
        gasWebAppUrl={gasConfig.webAppUrl}
        onEnterLab={handleEnterLab}
        onOpenTeacherDashboard={() => setCurrentPage('teacher')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-blue-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        topics={topics}
        selectedTopic={currentTopic}
        selectedGrade={selectedGrade}
        selectedClass={selectedClass}
        selectedGroup={selectedGroup}
        allowClassOverview={teacherSettings.allowClassOverview}
        onSelectTopic={(id) => {
          setSelectedTopicId(id);
          // When topic changes in lab, prompt user to re-verify for that topic
          setIsAuthenticatedGroup(false);
          setCurrentGroupPassword('');
        }}
        onSelectGrade={(g) => {
          setSelectedGrade(g);
          setIsAuthenticatedGroup(false);
          setCurrentGroupPassword('');
        }}
        onSelectClass={(c) => {
          setSelectedClass(c);
          setIsAuthenticatedGroup(false);
          setCurrentGroupPassword('');
        }}
        onSelectGroup={(grp) => {
          if (grp !== selectedGroup) {
            setSelectedGroup(grp);
            setIsAuthenticatedGroup(false);
            setCurrentGroupPassword('');
          }
        }}
        onSwitchGroup={handleSwitchGroup}
        onSave={handleSaveData}
        onOpenAllGroups={() => setIsAllGroupsOpen(true)}
        onOpenSettings={() => setCurrentPage('teacher')}
        onOpenReportPrint={() => setIsPrintModalOpen(true)}
        onResetData={handleResetData}
        isSaving={isSaving}
        isSyncing={isSyncing}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
      />

      {/* Main Workspace (Split View + Bottom Report Builder) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Split View: Table on Left, Chart on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Data Table (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col">
            <DataTable
              topic={currentTopic}
              groupName={selectedGroup}
              points={points}
              onChangePoints={(newPts) => {
                setPoints(newPts);
                setHasUnsavedChanges(true);
              }}
              onLoadSample={handleLoadSample}
            />
          </div>

          {/* Right Column: Chart & Trendline (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col">
            <ChartPanel
              topic={currentTopic}
              groupName={selectedGroup}
              points={points}
              selectedTrendline={selectedTrendline}
              manualGraphData={manualGraphData}
              onChangeManualGraphData={(mgData) => {
                setManualGraphData(mgData);
                setHasUnsavedChanges(true);
              }}
              allowAutoAnalysis={teacherSettings.allowAutoAnalysis}
              onChangeTrendline={(t) => {
                setSelectedTrendline(t);
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        </div>

        {/* Bottom Panel: Scientific Concept & Inquiry Report Builder */}
        <div>
          <ReportBuilder
            topic={currentTopic}
            groupData={activeGroupData}
            trendResult={currentTrendResult}
            onChangeNotes={(notes) => {
              setConclusionNotes(notes);
              setHasUnsavedChanges(true);
            }}
            onPrint={() => setIsPrintModalOpen(true)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 no-print">
        <p>과학 탐구 보고서 작성 도움 웹앱 · Google Apps Script & 스프레드시트 기반 데이터 통합 시스템</p>
      </footer>

      {/* Modals */}
      <AllGroupsModal
        isOpen={isAllGroupsOpen}
        onClose={() => setIsAllGroupsOpen(false)}
        topic={currentTopic}
        grade={selectedGrade}
        classNum={selectedClass}
        allGroupsData={allGroupsData}
        onRefresh={handleRefreshAllGroups}
        isRefreshing={isSyncing}
      />

      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        topic={currentTopic}
        groupData={activeGroupData}
        trendResult={currentTrendResult}
      />
    </div>
  );
}
