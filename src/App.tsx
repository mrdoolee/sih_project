import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  getGroupTrials,
  getLatestTrialIndex,
  saveGroupData,
  fetchAllGroupsData,
  getFlattenedAllGroupsData,
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
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CreditFooter } from './components/CreditFooter';

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

  // Normalize the bare index URL to the explicit teacher console URL (?page=teacher)
  // so that the entry point of the web app is unambiguous and shareable.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasRoutingParam =
      params.has('mode') || params.has('page') || params.has('topic') || params.has('group');
    if (!hasRoutingParam && !window.location.hash) {
      window.history.replaceState({}, '', `${window.location.pathname}?page=teacher`);
    }
  }, []);

  // Teacher Authentication Modal State (Required when entering teacher console from student view)
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState<boolean>(false);

  const handleOpenTeacherAuth = () => {
    setIsTeacherAuthOpen(true);
  };

  const handleTeacherAuthSuccess = () => {
    setIsTeacherAuthOpen(false);
    setCurrentPage('teacher');
    showToast('교사 관리 모드로 전환되었습니다.');
  };

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

  // Separate dataset for the embedded Teacher Dashboard's tabs 5/6 (전체 모둠
  // 결과, 모둠별 평가), which let the teacher browse ANY topic/grade/class, not
  // just the one currently selected in the student flow above.
  const [teacherAllGroupsData, setTeacherAllGroupsData] = useState<GroupExperimentData[]>(() => getFlattenedAllGroupsData());
  const [isRefreshingTeacherGroups, setIsRefreshingTeacherGroups] = useState(false);

  // Which repeated trial (1차, 2차...) of the current group is loaded in the editor.
  const [selectedTrialIndex, setSelectedTrialIndex] = useState<number>(1);

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
  // Background GAS reconciliation (below) fires async and must not clobber
  // in-progress edits with a slower network response - a ref avoids the
  // stale-closure trap a plain read of the hasUnsavedChanges state would hit.
  const hasUnsavedChangesRef = useRef(false);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
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

  // Confirmation modal for destructive-ish student actions (trial switch/start).
  // A native window.confirm() blocks the whole tab's JS thread while open - it
  // froze this exact flow under browser automation, and is fragile in any
  // sandboxed/embedded context - so this uses the same in-app ConfirmModal the
  // teacher console uses instead.
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    subWarning?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

  const openConfirm = (config: {
    title: string;
    description: string;
    subWarning?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmModal({ isOpen: true, ...config });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Load group data from storage whenever topic, grade, class, or group changes.
  // Defaults to the group's latest trial (1차 if it has never submitted before) -
  // switching trials within the same group is handled separately by handleSwitchTrial.
  const loadActiveGroupData = useCallback(() => {
    const key = getGroupDataKey(selectedTopicId, selectedGrade, selectedClass);
    const store = getStoredAllGroupData();
    const classList = store[key] || [];
    setAllGroupsData(classList);

    const latestTrial = getLatestTrialIndex(classList, selectedGroup);
    setSelectedTrialIndex(latestTrial);

    const existing = classList.find(
      (item) => item.groupName === selectedGroup && (item.trialIndex || 1) === latestTrial
    );
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

  // loadActiveGroupData above is local-storage-only (fast, no flash of
  // blank/stale data). But local storage is per-browser: a student who
  // switches devices, clears their cache, or has stale test data sitting in
  // this browser from before never sees what's actually on the teacher's
  // spreadsheet. Reconcile with GAS in the background and only overwrite the
  // editor if the student hasn't started typing yet, so a slower network
  // response can't stomp on in-progress work.
  useEffect(() => {
    if (!gasConfig.webAppUrl) return;
    let cancelled = false;
    (async () => {
      const freshList = await fetchAllGroupsData(
        selectedTopicId,
        selectedGrade,
        selectedClass,
        gasConfig.webAppUrl
      );
      if (cancelled || hasUnsavedChangesRef.current) return;

      setAllGroupsData(freshList);
      const latestTrial = getLatestTrialIndex(freshList, selectedGroup);
      const existing = freshList.find(
        (item) => item.groupName === selectedGroup && (item.trialIndex || 1) === latestTrial
      );
      if (existing && !hasUnsavedChangesRef.current) {
        setSelectedTrialIndex(latestTrial);
        setPoints(existing.points || []);
        setSelectedTrendline(existing.selectedTrendline || currentTopic.defaultTrendline || 'linear');
        setManualGraphData(existing.manualGraphData);
        setConclusionNotes(existing.conclusionNotes || { summary: '', principle: '', errorAnalysis: '' });
        setLastSavedAt(existing.lastSavedAt);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId, selectedGrade, selectedClass, selectedGroup, gasConfig.webAppUrl]);

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
      lastSavedAt: new Date().toLocaleString('ko-KR'),
      trialIndex: selectedTrialIndex
    };

    const result = await saveGroupData(currentGroupData, gasConfig.webAppUrl);
    setIsSaving(false);
    showToast(result.message);

    if (!result.success) {
      // Save actually failed - keep the unsaved-changes flag so the student
      // knows to retry instead of believing the data is safely stored.
      return;
    }

    setHasUnsavedChanges(false);
    setLastSavedAt(currentGroupData.lastSavedAt);

    // saveGroupData() above already wrote this trial to localStorage
    // synchronously before it ever attempted the (possibly slow) GAS network
    // call. Refresh allGroupsData from that local copy right away instead of
    // waiting on the network-bound fetchAllGroupsData below - otherwise a
    // student who clicks "새 시행" right after saving can hit a window where
    // allGroupsData still doesn't include the trial they just saved, so the
    // "next trial" number gets computed wrong (stays on the same trial
    // instead of advancing) and the editor just silently blanks out.
    const key = getGroupDataKey(selectedTopicId, selectedGrade, selectedClass);
    setAllGroupsData(getStoredAllGroupData()[key] || []);

    // Refresh class dataset from the server too, in case other devices/GAS
    // have newer data than this local copy.
    const updatedClassList = await fetchAllGroupsData(
      selectedTopicId,
      selectedGrade,
      selectedClass,
      gasConfig.webAppUrl
    );
    setAllGroupsData(updatedClassList);

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

  // Pulls fresh measurement/report data for one topic/grade/class combo from
  // GAS for the embedded Teacher Dashboard's tabs 5/6 - separate from
  // handleSyncFromGAS above, which only syncs topics/settings, not
  // student-submitted data.
  const handleRefreshTeacherGroupData = async (topicId: string, grade: string, classNum: string) => {
    if (!gasConfig.webAppUrl) return;
    setIsRefreshingTeacherGroups(true);
    try {
      await fetchAllGroupsData(topicId, grade, classNum, gasConfig.webAppUrl);
      setTeacherAllGroupsData(getFlattenedAllGroupsData());
    } finally {
      setIsRefreshingTeacherGroups(false);
    }
  };

  // Initial distribution parameters parsing (e.g. ?gas=...&topic=...&grade=...&class=...)
  useEffect(() => {
    const params = parseDistributionParams();
    if (params.hasDistributionParams) {
      const effectiveGasUrl = params.gasUrl || gasConfig.webAppUrl;

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

      // A new device has no localStorage cache, so `topics` still holds the
      // hardcoded DEFAULT_TOPICS (EXP_01..04) at this point. Without pulling
      // the teacher's real topics from their sheet, selectedTopicId from the
      // link won't match anything in `topics` and the app silently falls
      // back to topics[0] (the old sample EXP_01 experiment).
      if (effectiveGasUrl) {
        (async () => {
          try {
            const [fetchedTopics, fetchedSettings] = await Promise.all([
              fetchTopicsFromGAS(effectiveGasUrl),
              fetchTeacherSettingsFromGAS(effectiveGasUrl)
            ]);
            if (fetchedTopics && fetchedTopics.length > 0) {
              setTopics(fetchedTopics);
              saveStoredTopics(fetchedTopics);
            }
            if (fetchedSettings) {
              setTeacherSettings(fetchedSettings);
              saveStoredTeacherSettings(fetchedSettings);
            }
          } catch {
            // best-effort; fall back to cached/default topics on failure
          }
        })();
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

  // Every trial (1차, 2차...) this group has actually saved, plus whatever
  // trial is currently open in the editor (even if not saved yet) so the
  // switcher always includes it.
  const groupTrialIndices = useMemo(() => {
    const saved = getGroupTrials(allGroupsData, selectedGroup).map((t) => t.trialIndex || 1);
    return Array.from(new Set([...saved, selectedTrialIndex])).sort((a, b) => a - b);
  }, [allGroupsData, selectedGroup, selectedTrialIndex]);

  // Load a different trial of the same group into the editor without
  // re-authenticating or resetting the topic/grade/class/group selection.
  const applySwitchTrial = (trialIndex: number) => {
    const existing = allGroupsData.find(
      (item) => item.groupName === selectedGroup && (item.trialIndex || 1) === trialIndex
    );
    if (existing) {
      setPoints(existing.points || []);
      setSelectedTrendline(existing.selectedTrendline || currentTopic.defaultTrendline || 'linear');
      setManualGraphData(existing.manualGraphData);
      setConclusionNotes(existing.conclusionNotes || { summary: '', principle: '', errorAnalysis: '' });
      setLastSavedAt(existing.lastSavedAt);
    }
    setSelectedTrialIndex(trialIndex);
    setHasUnsavedChanges(false);
  };

  const handleSwitchTrial = (trialIndex: number) => {
    if (trialIndex === selectedTrialIndex) return;
    if (!hasUnsavedChanges) {
      applySwitchTrial(trialIndex);
      return;
    }
    openConfirm({
      title: '저장하지 않은 변경사항이 있습니다',
      description: '다른 시행으로 이동하면 저장하지 않은 변경사항이 사라집니다. 계속하시겠습니까?',
      confirmText: '이동하기',
      cancelText: '취소',
      onConfirm: () => {
        closeConfirm();
        applySwitchTrial(trialIndex);
      }
    });
  };

  // Start a brand-new, blank trial for this group - previous trials stay
  // saved and reachable via the trial switcher, nothing is overwritten.
  const applyStartNewTrial = () => {
    // Read localStorage directly instead of the allGroupsData React state.
    // saveGroupData() writes to localStorage synchronously before it ever
    // attempts its (possibly slow, network-bound) GAS call, but allGroupsData
    // only catches up once that whole save finishes - a student who saves and
    // immediately clicks "새 시행" can land here before that state update
    // arrives, under-counting existing trials and silently re-blanking the
    // current trial instead of actually advancing to the next one.
    const key = getGroupDataKey(selectedTopicId, selectedGrade, selectedClass);
    const freshClassList = getStoredAllGroupData()[key] || [];
    const existingTrials = getGroupTrials(freshClassList, selectedGroup);
    // If this group has never actually saved anything yet, the blank editor
    // already IS trial 1 - don't skip straight to "2차" with nothing behind it.
    const nextTrial = existingTrials.length === 0 ? 1 : getLatestTrialIndex(freshClassList, selectedGroup) + 1;

    setSelectedTrialIndex(nextTrial);
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
    setHasUnsavedChanges(false);
    showToast(`${nextTrial}차 시행을 새로 시작합니다. 데이터를 입력하고 저장하세요.`);
  };

  const handleStartNewTrial = () => {
    if (!hasUnsavedChanges) {
      applyStartNewTrial();
      return;
    }
    openConfirm({
      title: '저장하지 않은 변경사항이 있습니다',
      description: '새 시행을 시작하면 저장하지 않은 변경사항이 사라집니다. 계속하시겠습니까?',
      confirmText: '새 시행 시작',
      cancelText: '취소',
      onConfirm: () => {
        closeConfirm();
        applyStartNewTrial();
      }
    });
  };

  // Active trendline result for report builder
  const currentTrendResult = useMemo(() => {
    return computeTrendline(selectedTrendline, points);
  }, [selectedTrendline, points]);

  // Must be a stable reference: ManualGraphCanvas has an effect that depends on
  // this callback and fires it on every change. A fresh inline function here on
  // every render would make that effect's dependency change every render too,
  // which calls setManualGraphData -> re-render -> new inline function -> refire,
  // an infinite render loop (confirmed pre-existing, not just theoretical).
  const handleChangeManualGraphData = useCallback((mgData: GroupExperimentData['manualGraphData']) => {
    setManualGraphData(mgData);
    setHasUnsavedChanges(true);
  }, []);

  const activeGroupData: GroupExperimentData = useMemo(() => ({
    topicId: selectedTopicId,
    grade: selectedGrade,
    classNum: selectedClass,
    groupName: selectedGroup,
    points,
    selectedTrendline,
    manualGraphData,
    conclusionNotes,
    lastSavedAt,
    trialIndex: selectedTrialIndex
  }), [selectedTopicId, selectedGrade, selectedClass, selectedGroup, points, selectedTrendline, manualGraphData, conclusionNotes, lastSavedAt, selectedTrialIndex]);

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
          // Refuse an empty topic list - it would make currentTopic undefined
          // everywhere below and crash the student app on the next render.
          if (!tList || tList.length === 0) {
            showToast('탐구 주제 목록은 최소 1개 이상이어야 합니다.');
            return;
          }
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
        allGroupsData={teacherAllGroupsData}
        onRefreshGroupData={handleRefreshTeacherGroupData}
        isRefreshingGroups={isRefreshingTeacherGroups}
        onBackToStudent={() => {
          setCurrentPage('student');
          window.history.replaceState({}, '', `${window.location.pathname}?mode=student`);
        }}
      />
    );
  }

  // 2. Initial Index Screen (Topic, Grade, Class, Group & Password Auth)
  if (!isAuthenticatedGroup) {
    return (
      <>
        <IndexSelectionScreen
          topics={topics}
          selectedTopicId={selectedTopicId}
          selectedGrade={selectedGrade}
          selectedClass={selectedClass}
          selectedGroup={selectedGroup}
          teacherSettings={teacherSettings}
          gasWebAppUrl={gasConfig.webAppUrl}
          onEnterLab={handleEnterLab}
          onOpenTeacherDashboard={handleOpenTeacherAuth}
        />
        <TeacherAuthModal
          isOpen={isTeacherAuthOpen}
          onClose={() => setIsTeacherAuthOpen(false)}
          onSuccess={handleTeacherAuthSuccess}
          teacherSettings={teacherSettings}
          webAppUrl={gasConfig.webAppUrl}
          onPasswordVerified={(pw) => {
            const updated = { ...teacherSettings, teacherPassword: pw };
            setTeacherSettings(updated);
            saveStoredTeacherSettings(updated);
          }}
        />
      </>
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
        onOpenReportPrint={() => setIsPrintModalOpen(true)}
        onResetData={handleResetData}
        groupTrialIndices={groupTrialIndices}
        selectedTrialIndex={selectedTrialIndex}
        onSwitchTrial={handleSwitchTrial}
        onStartNewTrial={handleStartNewTrial}
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
              onChangeManualGraphData={handleChangeManualGraphData}
              allowAutoAnalysis={teacherSettings.allowAutoAnalysis}
              allowMeasurementHint={teacherSettings.allowMeasurementHint}
              trialIndex={selectedTrialIndex}
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
          />
        </div>
      </main>

      {/* Footer */}
      <CreditFooter variant="light" singleLine />

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

      <TeacherAuthModal
        isOpen={isTeacherAuthOpen}
        onClose={() => setIsTeacherAuthOpen(false)}
        onSuccess={handleTeacherAuthSuccess}
        teacherSettings={teacherSettings}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        subWarning={confirmModal.subWarning}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant="warning"
        icon="alert"
      />
    </div>
  );
}
