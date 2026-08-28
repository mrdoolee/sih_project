import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  getStoredGASConfig,
  saveStoredGASConfig,
  getStoredTopics,
  saveStoredTopics,
  getStoredTeacherSettings,
  saveStoredTeacherSettings,
  fetchTopicsFromGAS,
  fetchTeacherSettingsFromGAS,
  fetchAllGroupsData,
  getFlattenedAllGroupsData
} from './utils/gasService';
import { GASConfig, TopicConfig, TeacherSettingsConfig, GroupExperimentData } from './types';

// See main.tsx for why this is needed - avoids the iOS Safari "first tap only
// triggers :hover" quirk on hover-styled buttons for teachers on tablet/phone.
document.addEventListener('touchstart', () => {}, { passive: true });

const TeacherStandaloneApp: React.FC = () => {
  const [gasConfig, setGasConfig] = useState<GASConfig>(getStoredGASConfig());
  const [topics, setTopics] = useState<TopicConfig[]>(getStoredTopics());
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettingsConfig>(getStoredTeacherSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [allGroupsData, setAllGroupsData] = useState<GroupExperimentData[]>(() => getFlattenedAllGroupsData());
  const [isRefreshingGroups, setIsRefreshingGroups] = useState<boolean>(false);

  useEffect(() => {
    // Listen for storage events in case settings are changed in another tab
    const handleStorage = () => {
      setGasConfig(getStoredGASConfig());
      setTopics(getStoredTopics());
      setTeacherSettings(getStoredTeacherSettings());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSaveGAS = (config: GASConfig) => {
    saveStoredGASConfig(config);
    setGasConfig(config);
  };

  const handleSaveTopics = (newTopics: TopicConfig[]) => {
    saveStoredTopics(newTopics);
    setTopics(newTopics);
  };

  const handleSaveTeacherSettings = (settings: TeacherSettingsConfig) => {
    saveStoredTeacherSettings(settings);
    setTeacherSettings(settings);
  };

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
      return success;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Pulls fresh measurement/report data for one topic/grade/class combo from
  // the teacher's spreadsheet. Tabs 5/6 (전체 모둠 결과, 모둠별 평가) otherwise
  // only ever see whatever was last cached in this browser's localStorage,
  // since nothing here fetched from GAS for them before.
  const handleRefreshGroupData = async (topicId: string, grade: string, classNum: string) => {
    if (!gasConfig.webAppUrl) return;
    setIsRefreshingGroups(true);
    try {
      await fetchAllGroupsData(topicId, grade, classNum, gasConfig.webAppUrl);
      setAllGroupsData(getFlattenedAllGroupsData());
    } finally {
      setIsRefreshingGroups(false);
    }
  };

  return (
    <TeacherDashboard
      gasConfig={gasConfig}
      onSaveGASConfig={handleSaveGAS}
      topics={topics}
      onSaveTopics={handleSaveTopics}
      teacherSettings={teacherSettings}
      onSaveTeacherSettings={handleSaveTeacherSettings}
      onSyncFromGAS={handleSyncFromGAS}
      isSyncing={isSyncing}
      allGroupsData={allGroupsData}
      onRefreshGroupData={handleRefreshGroupData}
      isRefreshingGroups={isRefreshingGroups}
      onBackToStudent={() => {
        window.location.href = './index.html';
      }}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TeacherStandaloneApp />
  </React.StrictMode>
);
