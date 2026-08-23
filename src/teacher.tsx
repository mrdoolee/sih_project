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
  fetchTeacherSettingsFromGAS
} from './utils/gasService';
import { GASConfig, TopicConfig, TeacherSettingsConfig } from './types';

const TeacherStandaloneApp: React.FC = () => {
  const [gasConfig, setGasConfig] = useState<GASConfig>(getStoredGASConfig());
  const [topics, setTopics] = useState<TopicConfig[]>(getStoredTopics());
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettingsConfig>(getStoredTeacherSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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
