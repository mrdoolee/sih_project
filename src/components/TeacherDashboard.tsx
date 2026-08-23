import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff,
  Cpu,
  BarChart3,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  Save,
  AlertCircle,
  Send,
  Table,
  HelpCircle,
  Info,
  Sparkles,
  BookOpen,
  Database,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  UploadCloud,
  FileText,
  Printer,
  Wand2,
  Shuffle,
  QrCode,
  Share2,
  FlaskConical,
  LayoutGrid
} from 'lucide-react';
import {
  TopicConfig,
  GASConfig,
  TeacherSettingsConfig,
  TrendlineType,
  ReportQuestionConfig,
  GroupPasswordStore,
  GroupExperimentData,
  getEffectiveReportQuestions,
  getDefaultReportQuestions
} from '../types';
import {
  getGASCodeTemplate,
  fetchTeacherSettingsFromGAS,
  saveTeacherSettingsToGAS,
  fetchTopicsFromGAS,
  saveTopicsToGAS,
  getAllGroupPasswords,
  saveStoredGroupPasswords,
  resetGroupPassword,
  fetchGroupPasswordsFromGAS,
  setGroupPassword,
  getGroupPasswordKey,
  saveAllGroupPasswordsToGAS,
  generateBulkGroupPasswords,
  clearAllGroupPasswords,
  getFlattenedAllGroupsData
} from '../utils/gasService';
import { GroupPasswordPrintModal } from './GroupPasswordPrintModal';
import { ClassroomShareModal } from './ClassroomShareModal';
import { ResultsEvaluationDashboard } from './ResultsEvaluationDashboard';
import { AllGroupsOverviewDashboard } from './AllGroupsOverviewDashboard';
import { StudentShareLayer } from './StudentShareLayer';

interface TeacherDashboardProps {
  gasConfig: GASConfig;
  onSaveGASConfig: (config: GASConfig) => void;
  topics: TopicConfig[];
  onSaveTopics: (topics: TopicConfig[]) => void;
  teacherSettings: TeacherSettingsConfig;
  onSaveTeacherSettings: (settings: TeacherSettingsConfig) => void;
  onSyncFromGAS: () => Promise<boolean>;
  isSyncing: boolean;
  onBackToStudent?: () => void;
  allGroupsData?: GroupExperimentData[];
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  gasConfig,
  onSaveGASConfig,
  topics,
  onSaveTopics,
  teacherSettings,
  onSaveTeacherSettings,
  onSyncFromGAS,
  isSyncing,
  onBackToStudent,
  allGroupsData
}) => {
  // Password lock state (session-persisted)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('science_lab_teacher_auth') === 'true';
  });
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSyncingSettings, setIsSyncingSettings] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Change in Tab 1
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [confirmPwInput, setConfirmPwInput] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwChangeStatus, setPwChangeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tab order:
  // 기본 설정 메뉴: 1. GAS연동 ('gas'), 2. 기능제어/환경설정 ('permissions'), 3. 탐구주제/모둠관리 ('topics'), 4. 학생 배부 링크 & QR 생성 ('share')
  // 탐구 결과 확인 메뉴: 5. 전체 모둠 탐구 결과 확인 ('all_groups'), 6. 모둠별 탐구 결과 확인 & 평가 ('evaluations')
  const [activeTab, setActiveTab] = useState<'gas' | 'permissions' | 'topics' | 'share' | 'all_groups' | 'evaluations'>('gas');
  const [topicsSubTab, setTopicsSubTab] = useState<'topicsList' | 'passwords'>('topicsList');
  const [webAppUrl, setWebAppUrl] = useState(gasConfig.webAppUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const isGasConnected = Boolean(gasConfig.webAppUrl && gasConfig.webAppUrl.trim().startsWith('http'));

  // Group Passwords Management state
  const [passwordsState, setPasswordsState] = useState<GroupPasswordStore>(() => getAllGroupPasswords());
  const [pwFilterTopic, setPwFilterTopic] = useState<string>(() => topics[0]?.topicId || 'EXP_01');
  const [pwFilterGrade, setPwFilterGrade] = useState<string>('all');
  const [pwFilterClass, setPwFilterClass] = useState<string>('all');
  const [isSyncingPasswords, setIsSyncingPasswords] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingGroupPw, setEditingGroupPw] = useState<{ key: string; topicId: string; grade: string; classNum: string; groupName: string; pw: string } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Topics Sync state & guide toggle
  const [isSyncingTopics, setIsSyncingTopics] = useState(false);
  const [topicSyncFeedback, setTopicSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showTopicGuide, setShowTopicGuide] = useState(true);

  // Edit / Add Topic State
  const [editingTopic, setEditingTopic] = useState<TopicConfig | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // Classroom QR & Link Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const gasCode = getGASCodeTemplate();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPassword = teacherSettings.teacherPassword || '0000';
    if (enteredPassword.trim() === correctPassword.trim()) {
      setIsUnlocked(true);
      sessionStorage.setItem('science_lab_teacher_auth', 'true');
      setLoginError(null);
      setEnteredPassword('');
    } else {
      setLoginError('비밀번호가 일치하지 않습니다. (초기 기본값: 0000)');
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('science_lab_teacher_auth');
    setEnteredPassword('');
  };

  // Sync settings directly from Google Spreadsheet [환경설정] tab
  const handleFetchSettingsFromSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭을 확인하세요.'
      });
      setTimeout(() => setSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingSettings(true);
    try {
      const fetched = await fetchTeacherSettingsFromGAS(gasConfig.webAppUrl);
      if (fetched) {
        onSaveTeacherSettings(fetched);
        setSyncFeedback({
          type: 'success',
          message: '구글 스프레드시트 [환경설정] 탭에서 최신 설정(비밀번호, 권한)을 성공적으로 불러왔습니다!'
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: '스프레드시트에서 설정을 가져오지 못했습니다. Web App 배포 상태를 확인하세요.'
        });
      }
    } catch {
      setSyncFeedback({
        type: 'error',
        message: '스프레드시트 통신 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingSettings(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Push current settings to Google Spreadsheet [환경설정] tab
  const handlePushSettingsToSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭을 먼저 설정하세요.'
      });
      setTimeout(() => setSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingSettings(true);
    try {
      const ok = await saveTeacherSettingsToGAS(teacherSettings, gasConfig.webAppUrl);
      if (ok) {
        setSyncFeedback({
          type: 'success',
          message: '현재 환경설정이 구글 스프레드시트 [환경설정] 탭에 성공적으로 동기화되었습니다.'
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: '스프레드시트에 저장하지 못했습니다. Web App 배포 권한을 확인하세요.'
        });
      }
    } catch {
      setSyncFeedback({
        type: 'error',
        message: '스프레드시트 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingSettings(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentCorrect = teacherSettings.teacherPassword || '0000';
    if (currentPwInput.trim() !== currentCorrect.trim()) {
      setPwChangeStatus({
        type: 'error',
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
      return;
    }
    if (!newPwInput.trim() || newPwInput.trim().length < 4) {
      setPwChangeStatus({
        type: 'error',
        message: '새 비밀번호는 4자리 이상 입력해주세요.'
      });
      return;
    }
    if (newPwInput.trim() !== confirmPwInput.trim()) {
      setPwChangeStatus({
        type: 'error',
        message: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.'
      });
      return;
    }

    const updated: TeacherSettingsConfig = {
      ...teacherSettings,
      teacherPassword: newPwInput.trim()
    };
    onSaveTeacherSettings(updated);

    setCurrentPwInput('');
    setNewPwInput('');
    setConfirmPwInput('');
    setPwChangeStatus({
      type: 'success',
      message: '교사 비밀번호가 로컬에 변경되었습니다. 스프레드시트에 반영하려면 상단의 [시트로 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setPwChangeStatus(null), 4000);
  };

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
    setTestStatus('✅ 구글 시트 Web App URL이 저장되었습니다.');
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
      setTestStatus('✅ 구글 스프레드시트와 성공적으로 연결되었습니다! (수동 동기화 모드)');
    } else {
      setTestStatus('❌ 연결에 실패했습니다. Web App 배포 시 "액세스 권한: 모든 사용자"로 설정되었는지 확인하세요.');
    }
  };

  const [masterSyncFeedback, setMasterSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncingMaster, setIsSyncingMaster] = useState<boolean>(false);

  // Master: Fetch all from spreadsheet
  const handleFetchAllMasterFromSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setMasterSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. URL을 먼저 저장하세요.'
      });
      setTimeout(() => setMasterSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingMaster(true);
    try {
      let successCount = 0;
      const fetchedSettings = await fetchTeacherSettingsFromGAS(gasConfig.webAppUrl);
      if (fetchedSettings) {
        onSaveTeacherSettings(fetchedSettings);
        successCount++;
      }
      const fetchedTopics = await fetchTopicsFromGAS(gasConfig.webAppUrl);
      if (fetchedTopics && fetchedTopics.length > 0) {
        onSaveTopics(fetchedTopics);
        successCount++;
      }
      const fetchedPasswords = await fetchGroupPasswordsFromGAS(gasConfig.webAppUrl);
      if (fetchedPasswords) {
        setPasswordsState(fetchedPasswords);
        saveStoredGroupPasswords(fetchedPasswords);
        successCount++;
      }
      if (onSyncFromGAS) {
        await onSyncFromGAS();
      }

      setMasterSyncFeedback({
        type: 'success',
        message: `스프레드시트에서 모든 설정 및 데이터를 성공적으로 불러왔습니다! (${successCount}개 항목 동기화)`
      });
    } catch {
      setMasterSyncFeedback({
        type: 'error',
        message: '스프레드시트에서 데이터를 불러오는 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingMaster(false);
      setTimeout(() => setMasterSyncFeedback(null), 5000);
    }
  };

  // Master: Push all to spreadsheet
  const handlePushAllMasterToSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setMasterSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. URL을 먼저 저장하세요.'
      });
      setTimeout(() => setMasterSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingMaster(true);
    try {
      await saveTeacherSettingsToGAS(teacherSettings, gasConfig.webAppUrl);
      await saveTopicsToGAS(topics, gasConfig.webAppUrl);
      await saveAllGroupPasswordsToGAS(passwordsState, gasConfig.webAppUrl);

      setMasterSyncFeedback({
        type: 'success',
        message: '현재 웹의 모든 설정(환경설정, 주제목록, 모둠비밀번호)을 스프레드시트에 성공적으로 내보냈습니다!'
      });
    } catch {
      setMasterSyncFeedback({
        type: 'error',
        message: '스프레드시트로 내보내는 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingMaster(false);
      setTimeout(() => setMasterSyncFeedback(null), 5000);
    }
  };

  const handleToggleClassOverview = () => {
    const updated: TeacherSettingsConfig = {
      ...teacherSettings,
      allowClassOverview: !teacherSettings.allowClassOverview
    };
    onSaveTeacherSettings(updated);
    setSyncFeedback({
      type: 'success',
      message: '설정이 로컬에 변경되었습니다. 스프레드시트에 반영하려면 상단의 [시트로 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleToggleAutoAnalysis = () => {
    const updated: TeacherSettingsConfig = {
      ...teacherSettings,
      allowAutoAnalysis: !teacherSettings.allowAutoAnalysis
    };
    onSaveTeacherSettings(updated);
    setSyncFeedback({
      type: 'success',
      message: '설정이 로컬에 변경되었습니다. 스프레드시트에 반영하려면 상단의 [시트로 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleToggleRequireGroupPassword = () => {
    const updated: TeacherSettingsConfig = {
      ...teacherSettings,
      requireGroupPassword: !teacherSettings.requireGroupPassword
    };
    onSaveTeacherSettings(updated);
    setSyncFeedback({
      type: 'success',
      message: '설정이 로컬에 변경되었습니다. 스프레드시트에 반영하려면 상단의 [시트로 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Bulk Generate Random Passwords for Current Selected Topic
  const handleBulkGenerateRandomPasswords = () => {
    const targetTopic = topics.find((t) => t.topicId === pwFilterTopic) || topics[0];
    if (!targetTopic) return;

    const updatedStore = generateBulkGroupPasswords(targetTopic, 'random');
    setPasswordsState({ ...updatedStore });

    setPasswordFeedback({
      type: 'success',
      message: `[${targetTopic.title}] 모든 모둠에 랜덤 4자리 비밀번호가 일괄 배정되었습니다. 스프레드시트에 반영하려면 [시트로 전체 내보내기]를 누르세요.`
    });
    setTimeout(() => setPasswordFeedback(null), 4000);
  };

  // Bulk Generate Sequential Passwords (e.g. 1101, 1102) for Current Selected Topic
  const handleBulkGenerateSequentialPasswords = () => {
    const targetTopic = topics.find((t) => t.topicId === pwFilterTopic) || topics[0];
    if (!targetTopic) return;

    const updatedStore = generateBulkGroupPasswords(targetTopic, 'sequential');
    setPasswordsState({ ...updatedStore });

    setPasswordFeedback({
      type: 'success',
      message: `[${targetTopic.title}] 모든 모둠에 규칙성 번호(예: 1101...)가 일괄 배정되었습니다. 스프레드시트에 반영하려면 [시트로 전체 내보내기]를 누르세요.`
    });
    setTimeout(() => setPasswordFeedback(null), 4000);
  };

  // Push All Passwords to Google Spreadsheet [환경설정_모둠비밀번호]
  const handlePushAllPasswordsToSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setPasswordFeedback({
        type: 'error',
        message: '⚠️ 구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭에 URL을 먼저 등록해주세요.'
      });
      setTimeout(() => setPasswordFeedback(null), 4000);
      return;
    }
    setIsSyncingPasswords(true);
    try {
      const res = await saveAllGroupPasswordsToGAS(passwordsState, gasConfig.webAppUrl);
      if (res.success) {
        setPasswordFeedback({
          type: 'success',
          message: '현재 모둠 비밀번호 목록 전체가 구글 스프레드시트 [환경설정_모둠비밀번호] 시트에 성공적으로 동기화되었습니다!'
        });
      } else {
        setPasswordFeedback({
          type: 'error',
          message: '스프레드시트에 비밀번호를 저장하지 못했습니다. 배포 권한을 확인하세요.'
        });
      }
    } catch {
      setPasswordFeedback({
        type: 'error',
        message: '스프레드시트 통신 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingPasswords(false);
      setTimeout(() => setPasswordFeedback(null), 4000);
    }
  };

  // Clear All Group Passwords
  const handleClearAllPasswords = () => {
    clearAllGroupPasswords();
    setPasswordsState({});
    setPasswordFeedback({
      type: 'success',
      message: '모든 모둠 비밀번호가 로컬에서 초기화되었습니다. 스프레드시트에 반영하려면 [시트로 전체 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setPasswordFeedback(null), 4000);
  };

  // Sync topics directly from Google Spreadsheet [환경설정_주제목록] tab
  const handleFetchTopicsFromSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setTopicSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭을 확인하세요.'
      });
      setTimeout(() => setTopicSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingTopics(true);
    try {
      const fetched = await fetchTopicsFromGAS(gasConfig.webAppUrl);
      if (fetched && fetched.length > 0) {
        onSaveTopics(fetched);
        setTopicSyncFeedback({
          type: 'success',
          message: `구글 스프레드시트 [환경설정_주제목록] 탭에서 총 ${fetched.length}개의 탐구 주제를 성공적으로 불러왔습니다!`
        });
      } else {
        setTopicSyncFeedback({
          type: 'error',
          message: '스프레드시트에서 주제 목록을 가져오지 못했습니다. [환경설정_주제목록] 시트 내용과 Web App 배포 상태를 확인하세요.'
        });
      }
    } catch {
      setTopicSyncFeedback({
        type: 'error',
        message: '스프레드시트와 통신 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingTopics(false);
      setTimeout(() => setTopicSyncFeedback(null), 4000);
    }
  };

  // Push current topics to Google Spreadsheet [환경설정_주제목록] tab
  const handlePushTopicsToSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setTopicSyncFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭을 먼저 설정하세요.'
      });
      setTimeout(() => setTopicSyncFeedback(null), 4000);
      return;
    }
    setIsSyncingTopics(true);
    try {
      const result = await saveTopicsToGAS(topics, gasConfig.webAppUrl);
      if (result.success) {
        setTopicSyncFeedback({
          type: 'success',
          message: `현재 웹의 탐구 주제 목록(${topics.length}개)이 구글 스프레드시트 [환경설정_주제목록] 탭에 성공적으로 동기화되었습니다!`
        });
      } else {
        setTopicSyncFeedback({
          type: 'error',
          message: '스프레드시트에 저장하지 못했습니다. Web App 배포 권한을 확인하세요.'
        });
      }
    } catch {
      setTopicSyncFeedback({
        type: 'error',
        message: '스프레드시트 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingTopics(false);
      setTimeout(() => setTopicSyncFeedback(null), 4000);
    }
  };

  // Sync group passwords from Google Spreadsheet [환경설정_모둠비밀번호] tab
  const handleFetchPasswordsFromSpreadsheet = async () => {
    if (!gasConfig.webAppUrl) {
      setPasswordFeedback({
        type: 'error',
        message: '구글 Apps Script 웹 앱 URL이 설정되지 않았습니다. [구글 시트 연동 설정] 탭을 먼저 설정하세요.'
      });
      setTimeout(() => setPasswordFeedback(null), 4000);
      return;
    }
    setIsSyncingPasswords(true);
    try {
      const fetched = await fetchGroupPasswordsFromGAS(gasConfig.webAppUrl);
      if (fetched) {
        setPasswordsState(fetched);
        setPasswordFeedback({
          type: 'success',
          message: `구글 스프레드시트 [환경설정_모둠비밀번호] 탭에서 총 ${Object.keys(fetched).length}개 모둠의 비밀번호를 성공적으로 동기화했습니다!`
        });
      } else {
        setPasswordFeedback({
          type: 'error',
          message: '스프레드시트에서 모둠 비밀번호를 가져오지 못했습니다. Web App 배포 상태를 확인하세요.'
        });
      }
    } catch {
      setPasswordFeedback({
        type: 'error',
        message: '스프레드시트와 통신 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSyncingPasswords(false);
      setTimeout(() => setPasswordFeedback(null), 4000);
    }
  };

  const handleResetGroupPw = (topicId: string, grade: string, classNum: string, groupName: string) => {
    resetGroupPassword(topicId, grade, classNum, groupName);
    setPasswordsState(getAllGroupPasswords());
    setPasswordFeedback({
      type: 'success',
      message: `${grade} ${classNum} ${groupName}의 비밀번호가 로컬에서 초기화되었습니다. 시트에 반영하려면 [시트로 전체 내보내기]를 누르세요.`
    });
    setTimeout(() => setPasswordFeedback(null), 4000);
  };

  const handleSaveGroupPw = (topicId: string, grade: string, classNum: string, groupName: string, newPw: string) => {
    if (!newPw || newPw.trim().length < 2) {
      setPasswordFeedback({
        type: 'error',
        message: '비밀번호는 최소 2자리 이상 입력해주세요.'
      });
      setTimeout(() => setPasswordFeedback(null), 3000);
      return;
    }
    setGroupPassword(topicId, grade, classNum, groupName, newPw.trim());
    setPasswordsState(getAllGroupPasswords());
    setEditingGroupPw(null);
    setPasswordFeedback({
      type: 'success',
      message: `${grade} ${classNum} ${groupName}의 비밀번호가 [${newPw.trim()}]로 설정되었습니다. 시트에 반영하려면 [시트로 전체 내보내기]를 누르세요.`
    });
    setTimeout(() => setPasswordFeedback(null), 4000);
  };

  const handleDeleteTopic = (topicId: string) => {
    if (topics.length <= 1) return;
    const updated = topics.filter((t) => t.topicId !== topicId);
    onSaveTopics(updated);
    setTopicSyncFeedback({
      type: 'success',
      message: '주제가 로컬에서 삭제되었습니다. 스프레드시트에 반영하려면 [시트로 내보내기] 버튼을 누르세요.'
    });
    setTimeout(() => setTopicSyncFeedback(null), 4000);
  };

  const handleStartAdd = () => {
    const nextNum = topics.length + 1;
    const newId = `EXP_${String(nextNum).padStart(2, '0')}`;
    const baseTopic = {
      topicId: newId,
      title: '새로운 과학 탐구 실험',
      grades: ['1학년', '2학년', '3학년'],
      classes: ['1반', '2반', '3반', '4반'],
      groups: ['A모둠', 'B모둠', 'C모둠', 'D모둠', 'E모둠', 'F모둠'],
      xVarName: '독립변인 X',
      xUnit: '단위',
      yVarName: '종속변인 Y',
      yUnit: '단위',
      defaultTrendline: 'linear' as TrendlineType,
      conceptGuide: '실험을 통해 발견할 수 있는 과학적 원리를 안내합니다.',
      slopeMeaningGuide: '그래프 기울기의 물리적 의미를 설명합니다.',
      active: true
    };
    const defaultQs = getDefaultReportQuestions(baseTopic);
    setEditingTopic({
      ...baseTopic,
      coreQuestions: defaultQs.map((d) => d.question),
      reportQuestions: defaultQs
    });
    setIsAddingTopic(true);
  };

  const handleSaveEditingTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;

    let updatedList: TopicConfig[];
    if (isAddingTopic) {
      updatedList = [...topics, editingTopic];
    } else {
      updatedList = topics.map((t) => (t.topicId === editingTopic.topicId ? editingTopic : t));
    }
    onSaveTopics(updatedList);
    setTopicSyncFeedback({
      type: 'success',
      message: `주제 [${editingTopic.title}]가 로컬에 저장되었습니다. 스프레드시트 [환경설정_주제목록] 시트에도 반영하려면 [시트로 내보내기] 버튼을 누르세요.`
    });
    setTimeout(() => setTopicSyncFeedback(null), 4000);
    setEditingTopic(null);
    setIsAddingTopic(false);
  };

  const handleGoToStudent = () => {
    if (onBackToStudent) {
      onBackToStudent();
    } else if (
      window.location.pathname.includes('teacher.html') ||
      window.location.search.includes('teacher') ||
      window.location.hash.includes('teacher')
    ) {
      window.location.href = window.location.pathname
        .replace('teacher.html', 'index.html')
        .replace('?page=teacher', '')
        .replace('#teacher', '');
    }
  };

  // 1. LOCKED VIEW: Password Authentication Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between font-sans text-slate-100">
        {/* Top Minimal Bar */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                교사용 관리 콘솔 (보안 잠금)
              </h1>
              <p className="text-xs text-slate-400">교사 인증이 필요합니다.</p>
            </div>
          </div>

          <button
            type="button"
            id="btn-lock-back-to-student"
            onClick={handleGoToStudent}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>학생 화면으로 돌아가기</span>
          </button>
        </header>

        {/* Center Lock Box */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">교사 비밀번호 입력</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                학생들의 무단 설정을 방지하기 위해 비밀번호로 보호되어 있습니다.<br />
                <span className="text-indigo-300 font-medium">초기 기본 비밀번호: 0000</span>
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>비밀번호</span>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showLoginPassword ? '숨기기' : '표시'}</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    id="input-teacher-password"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="비밀번호 입력 (기본: 0000)"
                    autoFocus
                    className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-wider"
                  />
                </div>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-submit-teacher-login"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>관리 콘솔 접속하기</span>
              </button>
            </form>

            {/* GAS Settings Refresh Helper for Lock Screen */}
            {gasConfig.webAppUrl && (
              <div className="pt-3 border-t border-slate-700/60 text-center">
                <button
                  type="button"
                  onClick={handleFetchSettingsFromSpreadsheet}
                  disabled={isSyncingSettings}
                  className="text-xs text-slate-400 hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSettings ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>스프레드시트 [환경설정]에서 최신 비밀번호 불러오기</span>
                </button>
                {syncFeedback && (
                  <p className={`mt-2 text-[11px] ${syncFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {syncFeedback.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-800">
          과학 탐구 데이터 도우미 · 교사 보안 접근 제어 시스템
        </footer>
      </div>
    );
  }

  // 2. UNLOCKED VIEW: Full Teacher Dashboard
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Left Navigation Sidebar (Desktop / Tablet) - Fixed / Sticky without scrolling page */}
      <aside className="w-full md:w-64 lg:w-72 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 shadow-xl md:sticky md:top-0 md:h-screen md:overflow-y-auto justify-between">
        {/* Top Brand Header */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="min-w-0 leading-tight">
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight">
                  과학 탐구 활동
                </h1>
                <h2 className="text-[11px] font-bold text-indigo-400">
                  보고서 작성 도우미
                </h2>
                <p className="text-[10px] text-slate-400 truncate mt-1">
                  {isGasConnected ? '🟢 스프레드시트 연동됨' : '🔴 GAS 연동 필요 (비활성)'}
                </p>
              </div>
            </div>
          </div>

          {/* Nav Menu Items (1. GAS, 2. Permissions, 3. Topics, Section: Exploration Results -> 4. All Groups, 5. Group Evaluation) */}
          <nav className="p-3 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              기본 설정 메뉴
            </div>

            {/* 1. GAS 연동 */}
            <button
              type="button"
              id="tab-gas"
              onClick={() => setActiveTab('gas')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'gas'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'gas' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-blue-400'}`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold">1. GAS 연동</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'gas' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  스프레드시트 Web App 설정
                </div>
              </div>
            </button>

            {/* 2. 기능제어/환경설정 */}
            <button
              type="button"
              id="tab-permissions"
              disabled={!isGasConnected}
              onClick={() => setActiveTab('permissions')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                !isGasConnected
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                  : activeTab === 'permissions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={!isGasConnected ? 'GAS URL 연동 후 활성화됩니다.' : ''}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'permissions' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-emerald-400'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold flex items-center justify-between">
                  <span>2. 기능제어 / 환경설정</span>
                  {!isGasConnected && <Lock className="w-3 h-3 text-slate-500" />}
                </div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'permissions' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  학생 기능 On/Off & 비밀번호
                </div>
              </div>
            </button>

            {/* 3. 탐구주제/모둠관리 */}
            <button
              type="button"
              id="tab-topics"
              disabled={!isGasConnected}
              onClick={() => setActiveTab('topics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                !isGasConnected
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                  : activeTab === 'topics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={!isGasConnected ? 'GAS URL 연동 후 활성화됩니다.' : ''}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'topics' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-amber-400'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold flex items-center justify-between">
                  <span>3. 탐구주제 / 모둠관리</span>
                  {!isGasConnected && <Lock className="w-3 h-3 text-slate-500" />}
                </div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'topics' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  주제 설정 & 모둠 비밀번호
                </div>
              </div>
            </button>

            {/* 4. 학생 배부 링크 & QR 생성 (NEW PAGE VIEW) */}
            <button
              type="button"
              id="tab-share"
              disabled={!isGasConnected}
              onClick={() => setActiveTab('share')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                !isGasConnected
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                  : activeTab === 'share'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={!isGasConnected ? 'GAS URL 연동 후 활성화됩니다.' : ''}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'share' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                <QrCode className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold flex items-center justify-between">
                  <span>4. 학생 배부 링크 & QR</span>
                  {!isGasConnected && <Lock className="w-3 h-3 text-slate-500" />}
                </div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'share' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  교실 대형QR·접속 링크 안내
                </div>
              </div>
            </button>

            {/* Section Divider & Grid Header for Exploration Results */}
            <div className="pt-3 pb-1 px-1">
              <div className="rounded-lg bg-indigo-950/70 border border-indigo-800/40 px-2.5 py-1.5 flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-extrabold text-indigo-200 uppercase tracking-wide">
                  탐구 결과 확인 메뉴
                </span>
              </div>
            </div>

            {/* 5. 전체 모둠 탐구 결과 확인 */}
            <button
              type="button"
              id="tab-all-groups"
              disabled={!isGasConnected}
              onClick={() => setActiveTab('all_groups')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                !isGasConnected
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                  : activeTab === 'all_groups'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={!isGasConnected ? 'GAS URL 연동 후 활성화됩니다.' : ''}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'all_groups' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-teal-400'}`}>
                <Table className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold flex items-center justify-between">
                  <span>5. 전체 모둠 탐구 결과 확인</span>
                  {!isGasConnected && <Lock className="w-3 h-3 text-slate-500" />}
                </div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'all_groups' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  학급 전체 데이터 테이블·비교
                </div>
              </div>
            </button>

            {/* 6. 모둠별 탐구 결과 확인 & 평가 */}
            <button
              type="button"
              id="tab-evaluations"
              disabled={!isGasConnected}
              onClick={() => setActiveTab('evaluations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                !isGasConnected
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                  : activeTab === 'evaluations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={!isGasConnected ? 'GAS URL 연동 후 활성화됩니다.' : ''}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'evaluations' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-cyan-400'}`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold flex items-center justify-between">
                  <span>6. 모둠별 탐구 결과 확인 & 평가</span>
                  {!isGasConnected && <Lock className="w-3 h-3 text-slate-500" />}
                </div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'evaluations' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  개별 모둠 측정·서술·5대루브릭
                </div>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Action Buttons */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/60">
          <button
            type="button"
            id="btn-sidebar-to-student"
            onClick={handleGoToStudent}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>학생 화면으로 이동</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-y-auto">
        {/* Top Header Bar (Fixed / Sticky Header with Page Sync Buttons) */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 z-30 shadow-xs gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              {activeTab === 'gas' && '1. GAS 연동'}
              {activeTab === 'permissions' && '2. 기능제어 / 환경설정'}
              {activeTab === 'topics' && '3. 탐구주제 / 모둠관리'}
              {activeTab === 'share' && '4. 학생 배부 링크 & QR'}
              {activeTab === 'all_groups' && '5. 전체 모둠 탐구 결과 확인'}
              {activeTab === 'evaluations' && '6. 모둠별 탐구 결과 확인 & 평가'}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">
              {activeTab === 'gas' && '구글 스프레드시트 Web App 설정 및 연동'}
              {activeTab === 'permissions' && '학생 기능 제어 및 교사 비밀번호 관리'}
              {activeTab === 'topics' && '과학 탐구 주제 편집 & 모둠 비밀번호 관리'}
              {activeTab === 'share' && '교실 송출용 대형 QR코드 및 학생 배부 링크 생성'}
              {activeTab === 'all_groups' && '학급 전체 모둠 측정 데이터 일람표 및 경향성 비교'}
              {activeTab === 'evaluations' && '개별 모둠 탐구 결과 확인, 5대 루브릭 채점 및 피드백'}
            </h2>
          </div>

          {/* Sticky Header Action Buttons (Contextual Sync/Save Buttons) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Tab 1: GAS - Master Sync Buttons */}
            {activeTab === 'gas' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFetchAllMasterFromSpreadsheet}
                  disabled={isSyncingMaster || !gasConfig.webAppUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  title="스프레드시트에서 모든 설정 및 데이터를 불러옵니다."
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${isSyncingMaster ? 'animate-bounce text-blue-600' : ''}`} />
                  <span>시트에서 전체 불러오기</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushAllMasterToSpreadsheet}
                  disabled={isSyncingMaster || !gasConfig.webAppUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  title="현재 웹의 모든 설정을 스프레드시트로 내보냅니다."
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>시트로 전체 내보내기</span>
                </button>
              </div>
            )}

            {/* Tab 2: Permissions - Settings Sync Buttons */}
            {activeTab === 'permissions' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFetchSettingsFromSpreadsheet}
                  disabled={isSyncingSettings || !gasConfig.webAppUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  title="스프레드시트 [환경설정] 탭의 최신 설정을 불러옵니다."
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSettings ? 'animate-spin text-blue-600' : ''}`} />
                  <span>시트에서 불러오기</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePushSettingsToSpreadsheet()}
                  disabled={isSyncingSettings || !gasConfig.webAppUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  title="현재 설정을 스프레드시트 [환경설정] 탭으로 내보냅니다."
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>시트로 내보내기</span>
                </button>
              </div>
            )}

            {/* Tab 3: Topics List / Passwords Sync Buttons */}
            {activeTab === 'topics' && (
              <div className="flex items-center gap-1.5">
                {topicsSubTab === 'topicsList' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleFetchTopicsFromSpreadsheet}
                      disabled={isSyncingTopics || !gasConfig.webAppUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      title="스프레드시트 [환경설정_주제목록] 탭에서 주제 목록을 불러옵니다."
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTopics ? 'animate-spin text-indigo-600' : ''}`} />
                      <span>주제 불러오기</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePushTopicsToSpreadsheet}
                      disabled={isSyncingTopics || !gasConfig.webAppUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      title="현재 주제 목록을 스프레드시트 [환경설정_주제목록] 탭으로 내보냅니다."
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>주제 내보내기</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleFetchPasswordsFromSpreadsheet}
                      disabled={isSyncingPasswords || !gasConfig.webAppUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      title="스프레드시트 [환경설정_모둠비밀번호] 탭에서 비밀번호를 불러옵니다."
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPasswords ? 'animate-spin text-amber-600' : ''}`} />
                      <span>비번 불러오기</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePushAllPasswordsToSpreadsheet}
                      disabled={isSyncingPasswords || !gasConfig.webAppUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      title="현재 비밀번호 목록을 스프레드시트 [환경설정_모둠비밀번호] 탭으로 내보냅니다."
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>비번 내보내기</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Tab 5 (All Groups) & Tab 6 (Evaluations) Data Reload */}
            {(activeTab === 'all_groups' || activeTab === 'evaluations') && onSyncFromGAS && (
              <button
                type="button"
                onClick={onSyncFromGAS}
                disabled={isSyncing || !gasConfig.webAppUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                title="스프레드시트에서 최신 학생 측정/평가 데이터를 새로고침합니다."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>데이터 새로고침</span>
              </button>
            )}
          </div>
        </header>

        {/* GAS Disconnected Banner Alert */}
        {!isGasConnected && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-800">구글 Apps Script(GAS) Web App 연동이 필요합니다.</p>
              <p className="text-amber-700">
                [1. GAS 연동] 탭에서 구글 스프레드시트 Web App URL을 입력하고 연동을 완료해야 나머지 관리 및 탐구 결과 확인 탭이 활성화됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6 flex-1">
        {/* TAB 1: PERMISSIONS & FEATURE TOGGLES & PASSWORD MANAGEMENT */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {/* Intro Header Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-900">
                      수업 모드 제어 & 스프레드시트 [환경설정] 연동
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    학생 화면 기능 On/Off 및 교사 비밀번호는 웹페이지와 구글 스프레드시트 <strong>[환경설정]</strong> 탭에서 관리할 수 있습니다. 상단 헤더의 [시트에서 불러오기] / [시트로 내보내기] 버튼을 통해 안전하게 수동 동기화됩니다.
                  </p>
                </div>
              </div>

              {syncFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {syncFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{syncFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Feature Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Feature 1: All Groups Data Toggle */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                        teacherSettings.allowClassOverview ? 'bg-indigo-600' : 'bg-slate-400'
                      }`}>
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          [전체 모둠 데이터 확인] 기능
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          teacherSettings.allowClassOverview
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {teacherSettings.allowClassOverview ? '🟢 학생에게 활성화됨' : '⚪ 학생 화면에서 숨김'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      id="toggle-class-overview"
                      onClick={handleToggleClassOverview}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        teacherSettings.allowClassOverview ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          teacherSettings.allowClassOverview ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    활성화 시 학생 화면 상단에 <strong>[전체 모둠 데이터 확인]</strong> 버튼이 표시되어 다른 모둠의 실시간 측정 데이터 및 학급 전체 오버레이 그래프를 볼 수 있습니다.
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    💡 <strong>비활성화 시:</strong> 각 모둠은 자신의 실험 데이터에만 집중하게 되며 타 모둠 데이터 열람 버튼이 완전히 숨겨집니다.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">시트 [환경설정] 키:</span>
                  <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    전체_모둠_데이터_확인_허용: {teacherSettings.allowClassOverview ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>

              {/* Feature 2: Automated Analysis Graph Toggle */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                        teacherSettings.allowAutoAnalysis ? 'bg-blue-600' : 'bg-slate-400'
                      }`}>
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          [컴퓨터 자동 분석 그래프] 기능
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          teacherSettings.allowAutoAnalysis
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {teacherSettings.allowAutoAnalysis ? '🟢 학생에게 활성화됨' : '⚪ 학생 화면에서 숨김'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      id="toggle-auto-analysis"
                      onClick={handleToggleAutoAnalysis}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        teacherSettings.allowAutoAnalysis ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          teacherSettings.allowAutoAnalysis ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    활성화 시 학생이 <strong>[🤖 컴퓨터 자동 분석 그래프]</strong> 탭을 클릭하여 컴퓨터가 계산한 최적 회귀선 및 과학적 해석을 확인할 수 있습니다.
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    💡 <strong>비활성화 시:</strong> 학생 화면에서 컴퓨터 분석 탭과 비교 버튼이 사라지며, 학생은 오직 <strong>모눈종이 직접 작도(점 찍기 및 선 긋기)</strong> 활동만 수행할 수 있습니다.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">시트 [환경설정] 키:</span>
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    컴퓨터_자동_분석_그래프_허용: {teacherSettings.allowAutoAnalysis ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>

              {/* Feature 3: Group Password Authentication Toggle */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 md:col-span-2">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                        teacherSettings.requireGroupPassword ? 'bg-amber-600' : 'bg-slate-400'
                      }`}>
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          [모둠별 비밀번호 인증] 기능
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          teacherSettings.requireGroupPassword
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {teacherSettings.requireGroupPassword ? '🔒 교사 배부 비밀번호 인증 필수' : '🔓 비밀번호 인증 없이 자유 입장 (OFF)'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      id="toggle-require-group-password"
                      onClick={handleToggleRequireGroupPassword}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        teacherSettings.requireGroupPassword ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          teacherSettings.requireGroupPassword ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>활성화(ON) 시:</strong> 학생이 모둠을 선택하고 입장할 때, 교사가 사전 배부한 <strong>모둠 비밀번호(또는 교사 마스터 비밀번호)</strong>를 입력해야만 접속 및 데이터 제출이 가능합니다. 타 모둠 사칭 및 중복 제출을 방지합니다.
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    💡 <strong>비활성화(OFF) 시:</strong> 비밀번호 입력 단계가 생략되어 학생들이 자유롭게 모둠을 선택하고 바로 실험실로 입장합니다.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">시트 [환경설정] 키:</span>
                  <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    모둠_비밀번호_인증_사용: {teacherSettings.requireGroupPassword ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Management Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">교사용 관리 비밀번호 변경</h3>
                    <p className="text-xs text-slate-500">
                      여기서 변경하거나 구글 스프레드시트 <strong>[환경설정]</strong> 탭의 <code>교사_비밀번호</code> 값을 직접 수정할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">현재 설정된 비밀번호</span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {showChangePw ? teacherSettings.teacherPassword || '0000' : '••••'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      현재 비밀번호
                    </label>
                    <input
                      type={showChangePw ? 'text' : 'password'}
                      value={currentPwInput}
                      onChange={(e) => setCurrentPwInput(e.target.value)}
                      placeholder="현재 비밀번호 (기본: 0000)"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      새 비밀번호
                    </label>
                    <input
                      type={showChangePw ? 'text' : 'password'}
                      value={newPwInput}
                      onChange={(e) => setNewPwInput(e.target.value)}
                      placeholder="새 비밀번호 입력 (4자리 이상)"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      새 비밀번호 확인
                    </label>
                    <input
                      type={showChangePw ? 'text' : 'password'}
                      value={confirmPwInput}
                      onChange={(e) => setConfirmPwInput(e.target.value)}
                      placeholder="새 비밀번호 재입력"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showChangePw}
                      onChange={(e) => setShowChangePw(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>비밀번호 문자 표시하기</span>
                  </label>

                  <button
                    type="submit"
                    id="btn-save-new-password"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>비밀번호 저장 & 스프레드시트 연동</span>
                  </button>
                </div>

                {pwChangeStatus && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    pwChangeStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {pwChangeStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{pwChangeStatus.message}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Visual Guide: Spreadsheet [환경설정] Tab Structure */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>구글 스프레드시트 [환경설정] 탭 구조 안내</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                스프레드시트에서 직접 값을 변경한 뒤 상단의 <strong>[시트에서 불러오기]</strong> 버튼을 누르거나 웹앱을 새로고침하면 즉시 반영됩니다.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left bg-white rounded-xl border border-slate-200 overflow-hidden font-mono">
                  <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">설정 항목 (Key)</th>
                      <th className="px-3 py-2">설정값 (Value)</th>
                      <th className="px-3 py-2 font-sans">설명 및 안내</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="px-3 py-2 font-bold text-indigo-700">교사_비밀번호</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{teacherSettings.teacherPassword || '0000'}</td>
                      <td className="px-3 py-2 font-sans text-slate-500">교사 관리 콘솔 진입 시 요구되는 비밀번호 (기본: 0000)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-indigo-700">전체_모둠_데이터_확인_허용</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{teacherSettings.allowClassOverview ? 'TRUE' : 'FALSE'}</td>
                      <td className="px-3 py-2 font-sans text-slate-500">학생 화면 상단 [전체 모둠 데이터 확인] 버튼 노출 여부</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-indigo-700">컴퓨터_자동_분석_그래프_허용</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{teacherSettings.allowAutoAnalysis ? 'TRUE' : 'FALSE'}</td>
                      <td className="px-3 py-2 font-sans text-slate-500">학생 화면 [🤖 컴퓨터 자동 분석 그래프] 탭 및 비교 힌트 노출 여부</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GAS CONFIGURATION */}
        {activeTab === 'gas' && (
          <div className="space-y-6">
            {/* URL Configuration Box */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>배포된 Google Apps Script (GAS) 웹 앱 URL</span>
                </label>
                <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-semibold border border-blue-200">
                  실시간 양방향 동기화
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    URL 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isSyncing}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                    <span>연결 테스트</span>
                  </button>
                </div>
              </div>

              {testStatus && (
                <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {testStatus}
                </p>
              )}

              {/* Quick Share to Students Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>학생 배부용 원클릭 링크 & 교실용 대형 QR코드</span>
                  </h4>
                  <p className="text-xs text-indigo-800">
                    학생 기기에 웹 앱 URL을 직접 입력할 필요 없이, 좌측 메뉴의 <strong>[4. 학생 배부 링크 & QR]</strong>에서 QR코드 또는 공유 링크를 복사하여 학생들에게 배부할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('share')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>4. 학생 배부 메뉴로 이동</span>
                </button>
              </div>

              {/* Master Manual Data Synchronization Panel */}
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">
                        수동 데이터 일괄 동기화 (Master Sync)
                      </h4>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        데이터 유실 방지 안전 모드
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      상단 고정 헤더의 <strong>[시트에서 전체 불러오기] / [시트로 전체 내보내기]</strong> 버튼을 통해 전체 설정을 안전하게 동기화할 수 있습니다.
                    </p>
                  </div>
                </div>

                {masterSyncFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      masterSyncFeedback.type === 'success'
                        ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700'
                        : 'bg-rose-950/80 text-rose-200 border border-rose-700'
                    }`}
                  >
                    {masterSyncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{masterSyncFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step-by-step Setup Guide */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🛠️ 구글 스프레드시트 3분 완성 설정 가이드</span>
              </h3>

              <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                <li>
                  새 구글 스프레드시트를 생성하고 상단 메뉴에서 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.
                </li>
                <li>
                  기존 기본 코드를 모두 삭제하고 아래의 <strong>[GAS 전체 코드 복사]</strong> 버튼을 눌러 그대로 붙여넣습니다.
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
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
                <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs">
                  <span className="font-mono text-slate-300 font-semibold">GoogleAppsScript.gs (Apps Script 전문)</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? '복사되었습니다!' : 'GAS 전체 코드 복사'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed text-blue-200 select-all">
                  {gasCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TOPICS & GROUPS MANAGEMENT */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            {/* Sub Tabs Navigation: 1. 탐구 주제 관리 / 2. 모둠별 비밀번호 관리 */}
            <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <button
                type="button"
                id="btn-subtab-topics-list"
                onClick={() => setTopicsSubTab('topicsList')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  topicsSubTab === 'topicsList'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>🧪 탐구 주제 관리 & 질문지 문항 설정 ({topics.length}개 주제)</span>
              </button>

              <button
                type="button"
                id="btn-subtab-passwords"
                onClick={() => setTopicsSubTab('passwords')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  topicsSubTab === 'passwords'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>🔒 모둠별 비밀번호 관리 & 인쇄 배부</span>
              </button>
            </div>

            {topicsSubTab === 'topicsList' && (
              <div className="space-y-6">
            {/* 1. Header & Direct Sync Action Bar */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">
                      탐구 주제 & 모둠 관리 (스프레드시트 [환경설정_주제목록] 연동)
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    탐구 주제, 모둠 목록, X·Y축 변인 및 단위, 탐구 질문을 설정합니다. 상단 고정 헤더의 <strong>[주제 불러오기] / [주제 내보내기]</strong> 버튼으로 안전하게 수동 동기화할 수 있습니다.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTopicGuide(!showTopicGuide)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                    title="연동 구조 및 열(Column) 상세 가이드 토글"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                    <span>{showTopicGuide ? '연동 설명 접기' : '연동 설명 보기'}</span>
                    {showTopicGuide ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </button>

                  {!editingTopic && (
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 주제 추가</span>
                    </button>
                  )}
                </div>
              </div>

              {topicSyncFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  topicSyncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {topicSyncFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{topicSyncFeedback.message}</span>
                </div>
              )}
            </div>

            {/* 2. Comprehensive Visual Integration Explanation & Specification Card */}
            {showTopicGuide && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                {/* Intro banner */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      구글 스프레드시트 [환경설정_주제목록] 연동 구조 & 사용 가이드
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    선생님께서 구글 스프레드시트의 <strong>[환경설정_주제목록]</strong> 시트(탭)를 직접 수정하거나 웹 화면에서 입력하면, 학생들의 주제 선택 화면 및 학년/반/모둠 메뉴에 즉시 반영됩니다.
                  </p>
                </div>

                {/* 3-Sheet Architecture Overview */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>스프레드시트 3개 시트 탭의 전체 역할</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <strong className="text-xs font-bold text-slate-800">1. [환경설정] 탭</strong>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        교사 비밀번호 및 학생 화면 권한(전체 모둠 열람, 컴퓨터 자동 분석 On/Off)을 관리합니다.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        <strong className="text-xs font-bold text-indigo-950">2. [환경설정_주제목록] 탭 ⭐️</strong>
                      </div>
                      <p className="text-xs text-indigo-900 leading-relaxed">
                        실험 주제명, 학년/반/모둠 목록, X·Y축 변인명과 단위, 기본 최적선 모델, 탐구 질문 등을 관리합니다.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <strong className="text-xs font-bold text-slate-800">3. [통합_실험데이터] 탭</strong>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        각 모둠 학생들이 제출한 측정값(X, Y), 이상치 여부, 결론 및 오차 분석 데이터가 실시간 기록됩니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Column Specification Table */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-indigo-600" />
                      <span>[환경설정_주제목록] 시트의 열(Column)별 상세 명세표</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">1개 행(Row) = 1개의 과학 탐구 실험</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap">열 (Column)</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">항목명</th>
                          <th className="py-2.5 px-3">작성 규칙 및 안내</th>
                          <th className="py-2.5 px-3">데이터 예시</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">A열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">주제ID (topicId)</td>
                          <td className="py-2 px-3 text-slate-600">실험을 구분하는 고유 코드 (중복 불가)</td>
                          <td className="py-2 px-3 font-mono text-slate-700 bg-slate-50"><code>EXP_01</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">B열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">탐구 주제명 (title)</td>
                          <td className="py-2 px-3 text-slate-600">학생 화면 드롭다운에 표시되는 실험 제목</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">용수철에 매단 추의 무게와 늘어난 길이</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">C열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">대상 학년 목록 (grades)</td>
                          <td className="py-2 px-3 text-slate-600">콤마(<code>,</code>)로 구분하여 여러 학년 등록</td>
                          <td className="py-2 px-3 text-slate-700"><code>1학년, 2학년, 3학년</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">D열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">대상 반 목록 (classes)</td>
                          <td className="py-2 px-3 text-slate-600">콤마(<code>,</code>)로 구분하여 학급 목록 등록</td>
                          <td className="py-2 px-3 text-slate-700"><code>1반, 2반, 3반, 4반</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50 bg-indigo-50/30">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">E열</td>
                          <td className="py-2 px-3 font-semibold text-indigo-950">모둠 목록 (groups)</td>
                          <td className="py-2 px-3 text-slate-600">
                            모둠 이름들을 콤마(<code>,</code>)로 구분. <code>A~F모둠</code> 또는 <code>1~6모둠</code> 등 자유 지정
                          </td>
                          <td className="py-2 px-3 text-indigo-900 font-medium">
                            <code>A모둠, B모둠, C모둠, D모둠</code> 또는 <code>1모둠, 2모둠, 3모둠</code>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">F열 / G열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">독립변인(X)명 / 단위</td>
                          <td className="py-2 px-3 text-slate-600">X축에 표시될 변인 이름과 물리 단위</td>
                          <td className="py-2 px-3 text-slate-700">F열: <code>추의 무게</code>, G열: <code>N</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">H열 / I열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">종속변인(Y)명 / 단위</td>
                          <td className="py-2 px-3 text-slate-600">Y축에 표시될 변인 이름과 물리 단위</td>
                          <td className="py-2 px-3 text-slate-700">H열: <code>늘어난 길이</code>, I열: <code>cm</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">J열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">기본 추세선 모델</td>
                          <td className="py-2 px-3 text-slate-600">
                            <code>proportional</code> (원점통과 비례), <code>linear</code> (일차직선), <code>inverse</code> (반비례), <code>quadratic</code> (2차곡선)
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700"><code>proportional</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">K열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">과학적 개념 가이드</td>
                          <td className="py-2 px-3 text-slate-600">학생 결론 작성창 및 분석에 제공되는 핵심 이론</td>
                          <td className="py-2 px-3 text-slate-700">늘어난 길이는 추의 무게에 비례 (훅의 법칙 F=kx)</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">L열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">기울기 의미 가이드</td>
                          <td className="py-2 px-3 text-slate-600">그래프 기울기의 과학적/물리적 해석 안내</td>
                          <td className="py-2 px-3 text-slate-700">기울기는 용수철 상수의 역수(1/k)를 의미함</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">M열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">활성화 여부 (active)</td>
                          <td className="py-2 px-3 text-slate-600"><code>Y</code> (학생 화면 노출) 또는 <code>N</code> (숨김)</td>
                          <td className="py-2 px-3 font-mono text-slate-700"><code>Y</code></td>
                        </tr>
                        <tr className="hover:bg-slate-50 bg-amber-50/20">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">N열</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">탐구 결론 서술 문항 (문항수 가변 커스텀)</td>
                          <td className="py-2 px-3 text-slate-600">
                            줄바꿈(<code>\n</code>)으로 구분하여 <code>[제목] 질문 || 예시힌트</code> 형태로 입력하거나 단순 질문을 입력합니다. (문항 수 자유 커스텀 지원)
                          </td>
                          <td className="py-2 px-3 text-slate-700 text-[11px] leading-tight">
                            <code>[자료해석] 추의 무게에 따른 길이 변화는? || 예: 비례 증가함\n[과학원리] 성립하는 물리 법칙은? || 예: 훅의 법칙</code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Two Ways to Update */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                      <h4 className="text-xs font-bold text-slate-900">구글 스프레드시트에서 직접 입력할 때</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      구글 드라이브에서 스프레드시트를 열고 <strong>[환경설정_주제목록]</strong> 탭에 새 행을 추가하거나 수정하세요. 수정 후 웹 화면에서 <strong>[시트에서 불러오기]</strong> 버튼을 누르면 즉시 최신 정보가 동기화됩니다.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                      <h4 className="text-xs font-bold text-slate-900">웹 관리 콘솔에서 입력할 때</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      아래의 <strong>[➕ 새 주제 추가]</strong> 또는 각 주제의 <strong>[✏️ 수정]</strong> 버튼을 눌러 입력 폼을 작성하세요. 저장 시 브라우저와 구글 스프레드시트에 자동으로 실시간 저장됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {editingTopic ? (
              /* Edit/Add Form */
              <form onSubmit={handleSaveEditingTopic} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAddingTopic ? '➕ 새 탐구 주제 추가' : `✏️ [${editingTopic.topicId}] 주제 수정`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    취소
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <label className="font-bold text-slate-700">주제 ID (고유 코드)</label>
                    <input
                      type="text"
                      required
                      disabled={!isAddingTopic}
                      value={editingTopic.topicId}
                      onChange={(e) => setEditingTopic({ ...editingTopic, topicId: e.target.value })}
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">탐구 주제명</label>
                    <input
                      type="text"
                      required
                      value={editingTopic.title}
                      onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
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
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white"
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
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>모둠 목록 (병렬 지정: 콤마 구분)</span>
                      <span className="text-xs font-normal text-blue-600">
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
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">독립변인(X)명 및 단위</label>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        required
                        value={editingTopic.xVarName}
                        onChange={(e) => setEditingTopic({ ...editingTopic, xVarName: e.target.value })}
                        placeholder="추의 무게"
                        className="flex-1 p-2.5 border border-slate-300 rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        required
                        value={editingTopic.xUnit}
                        onChange={(e) => setEditingTopic({ ...editingTopic, xUnit: e.target.value })}
                        placeholder="N"
                        className="w-24 p-2.5 border border-slate-300 rounded-xl bg-white text-center font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">종속변인(Y)명 및 단위</label>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        required
                        value={editingTopic.yVarName}
                        onChange={(e) => setEditingTopic({ ...editingTopic, yVarName: e.target.value })}
                        placeholder="늘어난 길이"
                        className="flex-1 p-2.5 border border-slate-300 rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        required
                        value={editingTopic.yUnit}
                        onChange={(e) => setEditingTopic({ ...editingTopic, yUnit: e.target.value })}
                        placeholder="cm"
                        className="w-24 p-2.5 border border-slate-300 rounded-xl bg-white text-center font-semibold"
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
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white"
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
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700">기울기/수식의 물리적 의미 설명</label>
                    <textarea
                      rows={2}
                      value={editingTopic.slopeMeaningGuide}
                      onChange={(e) => setEditingTopic({ ...editingTopic, slopeMeaningGuide: e.target.value })}
                      className="w-full mt-1.5 p-2.5 border border-slate-300 rounded-xl bg-white"
                      placeholder="그래프의 기울기는 용수철 상수의 역수를 의미합니다."
                    />
                  </div>

                  {/* Dynamic Customizable Report Questions Section */}
                  <div className="sm:col-span-2 space-y-3 pt-2 border-t border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>탐구 결론 서술 문항 설정 (문항 수 및 내용 커스텀)</span>
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          학생 보고서 작성창 및 인쇄 미리보기에 표시될 질문과 예시 힌트를 설정합니다. (스프레드시트 N열과 자동 동기화)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const defaultQs = getDefaultReportQuestions(editingTopic);
                            setEditingTopic({
                              ...editingTopic,
                              reportQuestions: defaultQs,
                              coreQuestions: defaultQs.map((q) => q.question)
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          기본 3문항 세트 적용
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentQs = getEffectiveReportQuestions(editingTopic);
                            const newIdx = currentQs.length + 1;
                            const newQ: ReportQuestionConfig = {
                              id: `q${newIdx}`,
                              title: `문항 ${newIdx}`,
                              question: '새로운 탐구 결론 질문을 입력하세요.',
                              placeholder: '예: 구체적인 답변 힌트를 입력하세요.'
                            };
                            const updated = [...currentQs, newQ];
                            setEditingTopic({
                              ...editingTopic,
                              reportQuestions: updated,
                              coreQuestions: updated.map((q) => q.question)
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>문항 추가</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Cards List */}
                    <div className="space-y-3">
                      {getEffectiveReportQuestions(editingTopic).map((q, idx) => {
                        const currentQs = getEffectiveReportQuestions(editingTopic);
                        return (
                          <div
                            key={q.id || idx}
                            className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 relative group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={q.title}
                                  onChange={(e) => {
                                    const updated = currentQs.map((item, i) =>
                                      i === idx ? { ...item, title: e.target.value } : item
                                    );
                                    setEditingTopic({
                                      ...editingTopic,
                                      reportQuestions: updated,
                                      coreQuestions: updated.map((item) => item.question)
                                    });
                                  }}
                                  placeholder="문항 제목 (예: 자료 해석)"
                                  className="text-xs font-bold px-2.5 py-1 border border-slate-300 rounded-lg bg-white w-48 focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              {currentQs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = currentQs.filter((_, i) => i !== idx);
                                    setEditingTopic({
                                      ...editingTopic,
                                      reportQuestions: updated,
                                      coreQuestions: updated.map((item) => item.question)
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="문항 삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600">질문 내용</label>
                              <textarea
                                rows={2}
                                value={q.question}
                                onChange={(e) => {
                                  const updated = currentQs.map((item, i) =>
                                    i === idx ? { ...item, question: e.target.value } : item
                                  );
                                  setEditingTopic({
                                    ...editingTopic,
                                    reportQuestions: updated,
                                    coreQuestions: updated.map((item) => item.question)
                                  });
                                }}
                                placeholder="학생에게 질문할 내용을 입력하세요."
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600">답변 힌트 (Placeholder)</label>
                              <input
                                type="text"
                                value={q.placeholder || ''}
                                onChange={(e) => {
                                  const updated = currentQs.map((item, i) =>
                                    i === idx ? { ...item, placeholder: e.target.value } : item
                                  );
                                  setEditingTopic({
                                    ...editingTopic,
                                    reportQuestions: updated,
                                    coreQuestions: updated.map((item) => item.question)
                                  });
                                }}
                                placeholder="예: 구체적인 예시 답변 힌트"
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    {isAddingTopic ? '주제 추가 완료' : '수정사항 저장'}
                  </button>
                </div>
              </form>
            ) : (
              /* Topic List */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>📋 현재 등록된 탐구 주제 목록</span>
                    <span className="text-xs font-normal text-slate-500">({topics.length}개)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topics.map((t) => (
                    <div
                      key={t.topicId}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {t.topicId}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            t.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {t.active !== false ? '활성' : '비활성'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">변인 관계:</span>
                            <strong className="text-slate-800 font-mono">
                              X: {t.xVarName}({t.xUnit}) ⟷ Y: {t.yVarName}({t.yUnit})
                            </strong>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">지정 모둠:</span>
                            <span className="text-indigo-700 font-semibold text-right">
                              {t.groups.join(', ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>대상 학년/반:</span>
                            <span>{t.grades.join(', ')} / {t.classes.join(', ')}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                            <span>권장 최적선:</span>
                            <span className="font-mono text-slate-700 font-medium">
                              {t.defaultTrendline === 'proportional' ? '원점통과 비례 (y=ax)' :
                               t.defaultTrendline === 'linear' ? '선형직선 (y=ax+b)' :
                               t.defaultTrendline === 'inverse' ? '반비례 (y=k/x)' :
                               t.defaultTrendline === 'quadratic' ? '2차곡선 (y=ax²+bx+c)' : t.defaultTrendline}
                            </span>
                          </div>
                        </div>

                        {t.coreQuestions && t.coreQuestions.length > 0 && (
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700 block mb-1">핵심 탐구 질문:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                              {t.coreQuestions.slice(0, 2).map((q, idx) => (
                                <li key={idx} className="truncate">{q}</li>
                              ))}
                              {t.coreQuestions.length > 2 && (
                                <li className="text-slate-400">외 {t.coreQuestions.length - 2}개 질문 더 있음</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setPwFilterTopic(t.topicId);
                            setActiveTab('passwords');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="이 주제의 모둠별 비밀번호 설정 및 인쇄"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>비밀번호 관리</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTopic(t);
                            setIsAddingTopic(false);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>수정</span>
                        </button>
                        {topics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(t.topicId)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Embedded Quick Group Passwords Section inside Topics Tab */}
                <div className="mt-8 pt-6 border-t border-slate-200 bg-white rounded-2xl p-5 sm:p-6 border shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>모둠별 비밀번호 설정 및 배부 관리</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            teacherSettings.requireGroupPassword
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {teacherSettings.requireGroupPassword ? '🟢 비밀번호 인증 ON' : '⚪ 비밀번호 인증 OFF'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          각 탐구 주제의 모둠별 비밀번호를 설정하거나 일괄 생성하여 인쇄물로 배부할 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrintModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-xs cursor-pointer"
                        title="모둠별 배부용 카드 또는 명렬표 형태로 인쇄"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ 비밀번호 출력 / 인쇄</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkGenerateRandomPasswords}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                        title="선택한 주제의 모든 모둠에 랜덤 4자리 번호 일괄 생성"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>랜덤 4자리 일괄 배정</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkGenerateSequentialPasswords}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                        title="학년/반/모둠 순서로 규칙성 있는 번호 일괄 배정 (예: 1101, 1102...)"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>규칙성 번호 배정 (1101...)</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Password Grid in Topics Tab */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="font-semibold text-slate-700">주제 선택:</label>
                      <select
                        value={pwFilterTopic}
                        onChange={(e) => setPwFilterTopic(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        {topics.map((t) => (
                          <option key={t.topicId} value={t.topicId}>
                            [{t.topicId}] {t.title}
                          </option>
                        ))}
                      </select>

                      <label className="font-semibold text-slate-700 ml-2">학년:</label>
                      <select
                        value={pwFilterGrade}
                        onChange={(e) => setPwFilterGrade(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="all">전체 학년</option>
                        {topics.find((t) => t.topicId === pwFilterTopic)?.grades.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>

                      <label className="font-semibold text-slate-700 ml-2">반:</label>
                      <select
                        value={pwFilterClass}
                        onChange={(e) => setPwFilterClass(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="all">전체 반</option>
                        {topics.find((t) => t.topicId === pwFilterTopic)?.classes.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTopicsSubTab('passwords')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      전체 모둠 비밀번호 관리 탭으로 이동 ➔
                    </button>
                  </div>

                  {/* Password Quick Table */}
                  {(() => {
                    const targetTopic = topics.find((t) => t.topicId === pwFilterTopic) || topics[0];
                    if (!targetTopic) return null;

                    const effectiveGrades = pwFilterGrade === 'all' ? targetTopic.grades : [pwFilterGrade];
                    const effectiveClasses = pwFilterClass === 'all' ? targetTopic.classes : [pwFilterClass];

                    const rows: Array<{
                      key: string;
                      grade: string;
                      classNum: string;
                      groupName: string;
                      password?: string;
                    }> = [];

                    effectiveGrades.forEach((g) => {
                      effectiveClasses.forEach((c) => {
                        targetTopic.groups.forEach((grp) => {
                          const key = getGroupPasswordKey(targetTopic.topicId, g, c, grp);
                          rows.push({
                            key,
                            grade: g,
                            classNum: c,
                            groupName: grp,
                            password: passwordsState[key]
                          });
                        });
                      });
                    });

                    return (
                      <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[11px] font-bold text-slate-600">
                          <div className="col-span-3">소속 (학년/반)</div>
                          <div className="col-span-3">모둠명</div>
                          <div className="col-span-4">배정된 비밀번호</div>
                          <div className="col-span-2 text-right">설정/수정</div>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs">
                          {rows.map((row) => (
                            <div key={row.key} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50">
                              <div className="col-span-3 text-slate-600 font-medium">
                                {row.grade} {row.classNum}
                              </div>
                              <div className="col-span-3 font-bold text-indigo-700">
                                {row.groupName}
                              </div>
                              <div className="col-span-4">
                                {row.password ? (
                                  <span className="inline-flex items-center gap-1.5 font-mono font-bold bg-slate-900 text-emerald-400 px-2.5 py-0.5 rounded-md border border-slate-700 text-xs shadow-2xs">
                                    <Lock className="w-3 h-3 text-emerald-400" />
                                    <span>{row.password}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] bg-slate-50 px-2 py-0.5 rounded-md border border-dashed border-slate-200">
                                    <Unlock className="w-3 h-3 text-slate-400" />
                                    <span>미배정</span>
                                  </span>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGroupPw({
                                      key: row.key,
                                      topicId: targetTopic.topicId,
                                      grade: row.grade,
                                      classNum: row.classNum,
                                      groupName: row.groupName,
                                      pw: row.password || ''
                                    });
                                  }}
                                  className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                                  title="비밀번호 직접 수정"
                                >
                                  수정
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3 SUBTAB 2: GROUP PASSWORDS MANAGEMENT */}
        {topicsSubTab === 'passwords' && (
              <div className="space-y-6">
                {/* Global ON/OFF Toggle Banner */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                    teacherSettings.requireGroupPassword ? 'bg-amber-600' : 'bg-slate-400'
                  }`}>
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        모둠별 비밀번호 인증 및 배부 관리
                      </h2>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        teacherSettings.requireGroupPassword
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {teacherSettings.requireGroupPassword ? '🟢 인증 기능 활성화됨 (ON)' : '⚪ 인증 기능 꺼짐 (OFF)'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      교사가 모둠별 비밀번호를 사전에 배정하고 인쇄물로 배부할 수 있습니다. (학생은 비밀번호를 설정할 필요가 없습니다)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-700">비밀번호 인증:</span>
                  <button
                    type="button"
                    id="toggle-passwords-tab-require"
                    onClick={handleToggleRequireGroupPassword}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      teacherSettings.requireGroupPassword ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        teacherSettings.requireGroupPassword ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-xs cursor-pointer"
                    title="모둠별 배부용 카드 또는 명렬표 형태로 인쇄"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ 모둠별 비밀번호 출력 / 인쇄</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkGenerateRandomPasswords}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                    title="선택한 주제의 모든 모둠에 랜덤 4자리 번호 배정"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>랜덤 4자리 일괄 생성</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkGenerateSequentialPasswords}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                    title="학년/반/모둠 순서로 규칙성 있는 번호 일괄 배정 (예: 1101, 1102...)"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>규칙성 번호 일괄 생성 (1101...)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllPasswords}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer"
                    title="모든 모둠 비밀번호 초기화"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>전체 초기화</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">탐구 주제 선택</label>
                  <select
                    value={pwFilterTopic}
                    onChange={(e) => setPwFilterTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium cursor-pointer"
                  >
                    {topics.map((t) => (
                      <option key={t.topicId} value={t.topicId}>
                        [{t.topicId}] {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">학년 필터</label>
                  <select
                    value={pwFilterGrade}
                    onChange={(e) => setPwFilterGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="all">전체 학년</option>
                    {topics.find((t) => t.topicId === pwFilterTopic)?.grades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">반 필터</label>
                  <select
                    value={pwFilterClass}
                    onChange={(e) => setPwFilterClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="all">전체 반</option>
                    {topics.find((t) => t.topicId === pwFilterTopic)?.classes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Passwords Table / Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    모둠 목록 및 비밀번호 배정 현황
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (총 {(() => {
                      const t = topics.find((item) => item.topicId === pwFilterTopic) || topics[0];
                      if (!t) return 0;
                      const gCount = pwFilterGrade === 'all' ? t.grades.length : 1;
                      const cCount = pwFilterClass === 'all' ? t.classes.length : 1;
                      return gCount * cCount * t.groups.length;
                    })()}개 모둠)
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  선택 주제: <strong>{topics.find((t) => t.topicId === pwFilterTopic)?.title}</strong>
                </span>
              </div>

              {(() => {
                const targetTopic = topics.find((t) => t.topicId === pwFilterTopic) || topics[0];
                if (!targetTopic) return null;

                const filteredGrades = pwFilterGrade === 'all' ? targetTopic.grades : [pwFilterGrade];
                const filteredClasses = pwFilterClass === 'all' ? targetTopic.classes : [pwFilterClass];

                // Generate combinations
                const rows: Array<{
                  key: string;
                  grade: string;
                  classNum: string;
                  groupName: string;
                  password?: string;
                }> = [];

                filteredGrades.forEach((g) => {
                  filteredClasses.forEach((c) => {
                    targetTopic.groups.forEach((grp) => {
                      const key = getGroupPasswordKey(targetTopic.topicId, g, c, grp);
                      const pw = passwordsState[key];
                      rows.push({
                        key,
                        grade: g,
                        classNum: c,
                        groupName: grp,
                        password: pw
                      });
                    });
                  });
                });

                if (rows.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      조건에 일치하는 모둠이 없습니다.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <div className="col-span-3">소속 (학년/반)</div>
                      <div className="col-span-2">모둠명</div>
                      <div className="col-span-4">배정된 비밀번호</div>
                      <div className="col-span-3 text-right">관리 작업</div>
                    </div>

                    {rows.map((row) => (
                      <div
                        key={row.key}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50/80 transition-colors text-xs"
                      >
                        <div className="col-span-3 font-semibold text-slate-800">
                          {row.grade} {row.classNum}
                        </div>
                        <div className="col-span-2 font-bold text-indigo-700">
                          {row.groupName}
                        </div>
                        <div className="col-span-4 flex items-center gap-2">
                          {row.password ? (
                            <span className="inline-flex items-center gap-1.5 font-mono font-bold bg-slate-900 text-emerald-400 px-3 py-1 rounded-lg border border-slate-700 text-xs shadow-2xs">
                              <Lock className="w-3 h-3 text-emerald-400" />
                              <span>{row.password}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-dashed border-slate-200">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              <span>미배정 (일괄 생성 버튼을 클릭하세요)</span>
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroupPw({
                                key: row.key,
                                topicId: targetTopic.topicId,
                                grade: row.grade,
                                classNum: row.classNum,
                                groupName: row.groupName,
                                pw: row.password || ''
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="비밀번호 직접 수정"
                          >
                            <span>수정</span>
                          </button>
                          {row.password && (
                            <button
                              type="button"
                              onClick={() => handleResetGroupPw(targetTopic.topicId, row.grade, row.classNum, row.groupName)}
                              className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="비밀번호 초기화"
                            >
                              <span>초기화</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    )}

        {/* TAB 4: STUDENT SHARE & QR LAYER */}
        {activeTab === 'share' && (
          <StudentShareLayer
            gasWebAppUrl={gasConfig.webAppUrl}
            topics={topics}
            initialTopicId={pwFilterTopic}
          />
        )}

        {/* TAB 5: ALL GROUPS OVERVIEW DASHBOARD */}
        {activeTab === 'all_groups' && (
          <AllGroupsOverviewDashboard
            topics={topics}
            allGroupsData={allGroupsData && allGroupsData.length > 0 ? allGroupsData : getFlattenedAllGroupsData()}
            gasWebAppUrl={gasConfig.webAppUrl}
            onRefreshData={onSyncFromGAS}
            isLoading={isSyncing}
          />
        )}

        {/* TAB 6: RESULTS EVALUATION & RUBRIC DASHBOARD */}
        {activeTab === 'evaluations' && (
          <ResultsEvaluationDashboard
            topics={topics}
            allGroupsData={allGroupsData && allGroupsData.length > 0 ? allGroupsData : getFlattenedAllGroupsData()}
            gasWebAppUrl={gasConfig.webAppUrl}
            onRefreshData={onSyncFromGAS}
            isLoading={isSyncing}
          />
        )}
      </div>

      {/* Global Edit Group Password Modal */}
        {editingGroupPw && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingGroupPw(null);
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>모둠 비밀번호 수동 설정</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingGroupPw(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                <strong>{editingGroupPw.grade} {editingGroupPw.classNum} {editingGroupPw.groupName}</strong>의 새 비밀번호를 입력해주세요.
              </p>

              <input
                type="text"
                value={editingGroupPw.pw}
                onChange={(e) => setEditingGroupPw({ ...editingGroupPw, pw: e.target.value })}
                placeholder="새 비밀번호 (4자리 권장)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={20}
                autoFocus
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroupPw(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveGroupPw(
                      editingGroupPw.topicId,
                      editingGroupPw.grade,
                      editingGroupPw.classNum,
                      editingGroupPw.groupName,
                      editingGroupPw.pw
                    );
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Group Password Print Modal */}
        <GroupPasswordPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          topics={topics}
          initialTopicId={pwFilterTopic}
          currentTopicId={pwFilterTopic}
          passwords={passwordsState}
        />

        {/* Global Classroom QR & Share Modal */}
        <ClassroomShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gasWebAppUrl={gasConfig.webAppUrl}
          topics={topics}
          currentTopicId={pwFilterTopic}
        />
      </main>
    </div>
  );
};
