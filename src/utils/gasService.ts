import {
  TopicConfig,
  GroupExperimentData,
  GASConfig,
  TeacherSettingsConfig,
  ReportQuestionConfig,
  GroupPasswordStore,
  getDefaultReportQuestions
} from '../types';
import { DEFAULT_TOPICS, SAMPLE_ALL_GROUPS_DATA } from '../data/defaultTopics';

const GAS_CONFIG_KEY = 'science_lab_gas_config';
const LOCAL_TOPICS_KEY = 'science_lab_topics';
const LOCAL_EXPERIMENT_DATA_KEY = 'science_lab_experiment_data';
const TEACHER_SETTINGS_KEY = 'science_lab_teacher_settings';
const GROUP_PASSWORDS_KEY = 'science_lab_group_passwords';

export const DEFAULT_TEACHER_SETTINGS: TeacherSettingsConfig = {
  teacherPassword: '0000',
  allowClassOverview: true,
  allowAutoAnalysis: true,
  requireGroupPassword: true
};

export function serializeReportQuestions(questions?: ReportQuestionConfig[]): string {
  if (!questions || questions.length === 0) return '';
  return questions
    .map((q) => {
      const title = q.title.trim();
      const question = q.question.trim();
      const placeholder = (q.placeholder || '').trim();
      if (placeholder) {
        return `[${title}] ${question} || ${placeholder}`;
      }
      return `[${title}] ${question}`;
    })
    .join('\n');
}

export function parseReportQuestionsString(
  rawStr: string,
  topic: Partial<TopicConfig>
): { coreQuestions: string[]; reportQuestions: ReportQuestionConfig[] } {
  if (!rawStr || !rawStr.trim()) {
    const defaults = getDefaultReportQuestions(topic);
    return {
      coreQuestions: defaults.map((d) => d.question),
      reportQuestions: defaults
    };
  }

  const trimmed = rawStr.trim();

  // 1. JSON string format
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const reportQuestions: ReportQuestionConfig[] = parsed.map((item, idx) => ({
          id: item.id || `q${idx + 1}`,
          title: item.title || `질문 ${idx + 1}`,
          question: item.question || String(item),
          placeholder: item.placeholder || undefined
        }));
        return {
          coreQuestions: reportQuestions.map((q) => q.question),
          reportQuestions
        };
      }
    } catch {
      // fallback to line parser
    }
  }

  // 2. Line by line format
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    const defaults = getDefaultReportQuestions(topic);
    return {
      coreQuestions: defaults.map((d) => d.question),
      reportQuestions: defaults
    };
  }

  const reportQuestions: ReportQuestionConfig[] = [];
  const coreQuestions: string[] = [];

  lines.forEach((line, idx) => {
    let title = '';
    let remainder = '';

    const bracketMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (bracketMatch) {
      title = bracketMatch[1].trim();
      remainder = bracketMatch[2].trim();
    } else {
      const colonMatch = line.match(/^(\d+[\.\)]\s*[^:\-]+)[:\-]\s*(.*)$/);
      if (colonMatch) {
        title = colonMatch[1].replace(/^\d+[\.\)]\s*/, '').trim();
        remainder = colonMatch[2].trim();
      } else {
        const cleanLine = line.replace(/^[-•*]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
        title = `문항 ${idx + 1}`;
        remainder = cleanLine;
      }
    }

    let question = remainder;
    let placeholder = '';

    if (remainder.includes('||')) {
      const parts = remainder.split('||');
      question = parts[0].trim();
      placeholder = parts.slice(1).join('||').trim();
    } else if (remainder.includes(' | ')) {
      const parts = remainder.split(' | ');
      if (parts.length >= 2 && parts[parts.length - 1].startsWith('예:')) {
        placeholder = parts[parts.length - 1].trim();
        question = parts.slice(0, -1).join(' | ').trim();
      }
    }

    if (!question) question = remainder || `질문 ${idx + 1}`;
    if (!title) title = `문항 ${idx + 1}`;

    reportQuestions.push({
      id: `q${idx + 1}`,
      title,
      question,
      placeholder: placeholder || undefined
    });
    coreQuestions.push(question);
  });

  return { coreQuestions, reportQuestions };
}

export function getStoredTeacherSettings(): TeacherSettingsConfig {
  const saved = localStorage.getItem(TEACHER_SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        teacherPassword: parsed.teacherPassword || DEFAULT_TEACHER_SETTINGS.teacherPassword,
        allowClassOverview: parsed.allowClassOverview !== undefined ? Boolean(parsed.allowClassOverview) : DEFAULT_TEACHER_SETTINGS.allowClassOverview,
        allowAutoAnalysis: parsed.allowAutoAnalysis !== undefined ? Boolean(parsed.allowAutoAnalysis) : DEFAULT_TEACHER_SETTINGS.allowAutoAnalysis,
        requireGroupPassword: parsed.requireGroupPassword !== undefined ? Boolean(parsed.requireGroupPassword) : DEFAULT_TEACHER_SETTINGS.requireGroupPassword
      };
    } catch {
      // ignore
    }
  }
  return DEFAULT_TEACHER_SETTINGS;
}

export function saveStoredTeacherSettings(config: TeacherSettingsConfig): void {
  localStorage.setItem(TEACHER_SETTINGS_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('science_lab_teacher_settings_updated', { detail: config }));
}

export function getStoredGASConfig(): GASConfig {
  const saved = localStorage.getItem(GAS_CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return {
    webAppUrl: '',
    autoSync: false
  };
}

export function saveStoredGASConfig(config: GASConfig): void {
  localStorage.setItem(GAS_CONFIG_KEY, JSON.stringify(config));
}

export function getStoredTopics(): TopicConfig[] {
  const saved = localStorage.getItem(LOCAL_TOPICS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_TOPICS;
}

export function saveStoredTopics(topics: TopicConfig[]): void {
  localStorage.setItem(LOCAL_TOPICS_KEY, JSON.stringify(topics));
}

export function getStoredAllGroupData(): Record<string, GroupExperimentData[]> {
  const saved = localStorage.getItem(LOCAL_EXPERIMENT_DATA_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...SAMPLE_ALL_GROUPS_DATA, ...parsed };
    } catch {
      // ignore
    }
  }
  return SAMPLE_ALL_GROUPS_DATA;
}

export function saveStoredAllGroupData(dataMap: Record<string, GroupExperimentData[]>): void {
  localStorage.setItem(LOCAL_EXPERIMENT_DATA_KEY, JSON.stringify(dataMap));
}

// Key helper for indexing
export function getGroupDataKey(topicId: string, grade: string, classNum: string): string {
  return `${topicId}-${grade}-${classNum}`;
}

export function getGroupPasswordKey(topicId: string, grade: string, classNum: string, groupName: string): string {
  return `${topicId}__${grade}__${classNum}__${groupName}`;
}

export function getStoredGroupPasswords(): GroupPasswordStore {
  const saved = localStorage.getItem(GROUP_PASSWORDS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return {};
}

export const getAllGroupPasswords = getStoredGroupPasswords;

export function saveStoredGroupPasswords(store: GroupPasswordStore): void {
  localStorage.setItem(GROUP_PASSWORDS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('science_lab_group_passwords_updated', { detail: store }));
}

export function getGroupPassword(topicId: string, grade: string, classNum: string, groupName: string): string | null {
  const store = getStoredGroupPasswords();
  const key = getGroupPasswordKey(topicId, grade, classNum, groupName);
  return store[key] || null;
}

export async function setGroupPassword(
  topicId: string,
  grade: string,
  classNum: string,
  groupName: string,
  password: string,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const store = getStoredGroupPasswords();
  const key = getGroupPasswordKey(topicId, grade, classNum, groupName);
  store[key] = password.trim();
  saveStoredGroupPasswords(store);

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveGroupPassword',
          payload: { topicId, grade, classNum, groupName, password: password.trim() }
        })
      });
    } catch (e) {
      console.warn('Failed to sync group password to GAS:', e);
    }
  }
  return { success: true, message: '모둠 비밀번호가 설정되었습니다.' };
}

export async function resetGroupPassword(
  topicId: string,
  grade: string,
  classNum: string,
  groupName: string,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const store = getStoredGroupPasswords();
  const key = getGroupPasswordKey(topicId, grade, classNum, groupName);
  delete store[key];
  saveStoredGroupPasswords(store);

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'resetGroupPassword',
          payload: { topicId, grade, classNum, groupName }
        })
      });
    } catch (e) {
      console.warn('Failed to reset group password in GAS:', e);
    }
  }
  return { success: true, message: '모둠 비밀번호가 초기화되었습니다.' };
}

export async function saveAllGroupPasswordsToGAS(
  passwords: GroupPasswordStore,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  saveStoredGroupPasswords(passwords);

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveAllGroupPasswords',
          payload: { passwords }
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { success: true, message: '모둠 비밀번호가 스프레드시트 [환경설정_모둠비밀번호] 시트에 성공적으로 동기화되었습니다.' };
    } catch (e) {
      console.warn('Failed to sync all group passwords to GAS:', e);
      return { success: true, message: '로컬 브라우저에 저장되었습니다 (구글 시트 전송 대기).' };
    }
  }
  return { success: true, message: '모둠 비밀번호가 브라우저에 저장되었습니다.' };
}

export function clearAllGroupPasswords(): void {
  saveStoredGroupPasswords({});
}

// Generate bulk passwords for a topic's groups
export function generateBulkGroupPasswords(
  topic: TopicConfig,
  mode: 'random' | 'sequential' = 'random'
): GroupPasswordStore {
  const store: GroupPasswordStore = getStoredGroupPasswords();
  let seqIndex = 1;

  topic.grades.forEach((g) => {
    // Extract numeric grade if present, e.g. "1학년" -> "1"
    const gradeNum = g.replace(/[^0-9]/g, '') || '1';

    topic.classes.forEach((c) => {
      // Extract numeric class, e.g. "1반" -> "1"
      const classNum = c.replace(/[^0-9]/g, '') || '1';

      topic.groups.forEach((grp, grpIdx) => {
        const key = getGroupPasswordKey(topic.topicId, g, c, grp);
        
        if (mode === 'random') {
          // Generate easy-to-read 4-digit numeric code (e.g., 2381, 7419)
          const random4 = Math.floor(1000 + Math.random() * 9000).toString();
          store[key] = random4;
        } else {
          // Sequential pattern: [Grade][Class][Group Index 2-digit] e.g., Grade 1, Class 2, Group 3 -> 1203
          const grpNum = String(grpIdx + 1).padStart(2, '0');
          const seqCode = `${gradeNum}${classNum}${grpNum}`;
          store[key] = seqCode;
          seqIndex++;
        }
      });
    });
  });

  saveStoredGroupPasswords(store);
  return store;
}

export async function fetchGroupPasswordsFromGAS(webAppUrl: string): Promise<GroupPasswordStore | null> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) return null;
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'getGroupPasswords');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status === 'success' && data.passwords) {
      const current = getStoredGroupPasswords();
      const merged = { ...current, ...data.passwords };
      saveStoredGroupPasswords(merged);
      return merged;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch group passwords from GAS:', err);
    return null;
  }
}

// Fetch teacher settings (password, toggles) from Google Spreadsheet [환경설정]
export async function fetchTeacherSettingsFromGAS(webAppUrl: string): Promise<TeacherSettingsConfig | null> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) return null;
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'getSettings');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status === 'success' && data.settings) {
      const current = getStoredTeacherSettings();
      const updated: TeacherSettingsConfig = {
        teacherPassword: data.settings.teacherPassword !== undefined ? String(data.settings.teacherPassword) : current.teacherPassword,
        allowClassOverview: data.settings.allowClassOverview !== undefined ? Boolean(data.settings.allowClassOverview) : current.allowClassOverview,
        allowAutoAnalysis: data.settings.allowAutoAnalysis !== undefined ? Boolean(data.settings.allowAutoAnalysis) : current.allowAutoAnalysis,
        requireGroupPassword: data.settings.requireGroupPassword !== undefined ? Boolean(data.settings.requireGroupPassword) : current.requireGroupPassword
      };
      saveStoredTeacherSettings(updated);
      return updated;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch settings from GAS:', err);
    return null;
  }
}

// Save teacher settings (password, toggles) to Google Spreadsheet [환경설정]
export async function saveTeacherSettingsToGAS(
  settings: TeacherSettingsConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  saveStoredTeacherSettings(settings);

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSettings',
          payload: settings
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { success: true, message: '구글 스프레드시트 [환경설정] 탭에 성공적으로 저장되었습니다.' };
    } catch (err: any) {
      console.warn('Failed to save settings to GAS:', err);
      return { success: true, message: '로컬 브라우저에 저장되었습니다 (구글 시트 전송 대기).' };
    }
  }

  return { success: true, message: '로컬 브라우저에 저장되었습니다.' };
}

// Save topics to Google Spreadsheet [환경설정_주제목록]
export async function saveTopicsToGAS(
  topics: TopicConfig[],
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  saveStoredTopics(topics);

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const payloadTopics = topics.map((t) => ({
        ...t,
        rawQuestions: serializeReportQuestions(t.reportQuestions) || (Array.isArray(t.coreQuestions) ? t.coreQuestions.join('\n') : '')
      }));

      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTopics',
          payload: { topics: payloadTopics }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { success: true, message: '구글 스프레드시트 [환경설정_주제목록] 탭에 성공적으로 저장되었습니다.' };
    } catch (err: any) {
      console.warn('Failed to save topics to GAS:', err);
      return { success: true, message: '로컬 브라우저에 저장되었습니다 (구글 시트 전송 대기).' };
    }
  }

  return { success: true, message: '로컬 브라우저에 저장되었습니다.' };
}

// Fetch topics from Google Spreadsheet via GAS Web App URL
export async function fetchTopicsFromGAS(webAppUrl: string): Promise<TopicConfig[] | null> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) return null;
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'getTopics');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status === 'success' && Array.isArray(data.topics) && data.topics.length > 0) {
      const mappedTopics: TopicConfig[] = data.topics.map((t: any) => {
        const rawQuestions = String(
          t.rawQuestions ||
          (Array.isArray(t.coreQuestions) ? t.coreQuestions.join('\n') : t.coreQuestions) ||
          ''
        );
        const { coreQuestions, reportQuestions } = parseReportQuestionsString(rawQuestions, t);
        return {
          ...t,
          coreQuestions,
          reportQuestions: (t.reportQuestions && Array.isArray(t.reportQuestions) && t.reportQuestions.length > 0)
            ? t.reportQuestions
            : reportQuestions
        };
      });
      saveStoredTopics(mappedTopics);
      return mappedTopics;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch topics from GAS:', err);
    return null;
  }
}

// Save specific group data to GAS and local storage
export async function saveGroupData(
  data: GroupExperimentData,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  // 1. Check & attach group password
  const currentPassword = data.groupPassword || getGroupPassword(data.topicId, data.grade, data.classNum, data.groupName);
  
  // 2. Update local storage
  const key = getGroupDataKey(data.topicId, data.grade, data.classNum);
  const allData = getStoredAllGroupData();
  const classList = allData[key] ? [...allData[key]] : [];
  
  const existingIdx = classList.findIndex((item) => item.groupName === data.groupName);
  const updatedData: GroupExperimentData = {
    ...data,
    groupPassword: currentPassword || undefined,
    lastSavedAt: new Date().toLocaleString('ko-KR')
  };

  if (existingIdx >= 0) {
    classList[existingIdx] = updatedData;
  } else {
    classList.push(updatedData);
  }
  allData[key] = classList;
  saveStoredAllGroupData(allData);

  // 3. If GAS Web App URL is provided, push to Google Sheets
  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain avoids CORS preflight issues with GAS
        body: JSON.stringify({
          action: 'saveGroupData',
          payload: updatedData
        })
      });

      if (!response.ok) {
        throw new Error(`GAS Server Error (${response.status})`);
      }
      return { success: true, message: '구글 스프레드시트 및 로컬 저장소에 성공적으로 동기화되었습니다.' };
    } catch (err: any) {
      console.warn('GAS Save failed, saved locally:', err);
      return {
        success: true,
        message: '로컬 브라우저에 안전하게 저장되었습니다 (구글 시트 전송 대기).'
      };
    }
  }

  return { success: true, message: '로컬 저장소에 안전하게 저장되었습니다.' };
}

// Fetch all groups data for current topic, grade, and class
export async function fetchAllGroupsData(
  topicId: string,
  grade: string,
  classNum: string,
  webAppUrl?: string
): Promise<GroupExperimentData[]> {
  const key = getGroupDataKey(topicId, grade, classNum);
  const localMap = getStoredAllGroupData();
  let list = localMap[key] || [];

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const url = new URL(webAppUrl);
      url.searchParams.set('action', 'getAllGroupData');
      url.searchParams.set('topicId', topicId);
      url.searchParams.set('grade', grade);
      url.searchParams.set('classNum', classNum);

      const response = await fetch(url.toString(), { method: 'GET' });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          list = result.data;
          localMap[key] = list;
          saveStoredAllGroupData(localMap);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch from GAS, using local data:', err);
    }
  }

  return list;
}

// Copyable GAS Template Code for the Teacher
export function getGASCodeTemplate(): string {
  return `/**
 * 과학 탐구 데이터 도우미 - Google Apps Script (GAS) 통합 스크립트
 * 
 * [설치 방법]
 * 1. 교사용 구글 스프레드시트를 생성합니다.
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 아래 코드를 그대로 붙여넣습니다.
 * 4. 상단 [배포] > [새 배포] > 유형: [웹 앱] 선택
 *    - 설명: 과학실험 데이터 서버
 *    - 다음 사용자로 실행: 나(내 계정)
 *    - 액세스 권한: 모든 사용자 (Anyone) -> 필수!
 * 5. [배포]를 누르고 발급된 '웹 앱 URL'을 복사하여 웹앱의 [교사 시트 연동 설정]에 붙여넣으세요!
 */

const SHEET_CONFIG_NAME = '환경설정';
const SHEET_SETTINGS_NAME = '환경설정_주제목록';
const SHEET_PASSWORDS_NAME = '환경설정_모둠비밀번호';
const SHEET_DATA_NAME = '통합_실험데이터';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getTopics';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 교사 환경설정 조회 (비밀번호, 권한 토글)
  if (action === 'getSettings') {
    ensureConfigSheet(ss);
    const sheet = ss.getSheetByName(SHEET_CONFIG_NAME);
    const values = sheet.getDataRange().getValues();
    const settings = {
      teacherPassword: '0000',
      allowClassOverview: true,
      allowAutoAnalysis: true,
      requireGroupPassword: true
    };
    
    for (let i = 1; i < values.length; i++) {
      const key = String(values[i][0]).trim();
      const val = values[i][1];
      if (key === '교사_비밀번호' || key === 'teacherPassword') {
        settings.teacherPassword = String(val);
      } else if (key === '전체_모둠_데이터_확인_허용' || key === 'allowClassOverview') {
        settings.allowClassOverview = String(val).toUpperCase() === 'TRUE' || val === true || val === 1 || String(val) === '1';
      } else if (key === '컴퓨터_자동_분석_그래프_허용' || key === 'allowAutoAnalysis') {
        settings.allowAutoAnalysis = String(val).toUpperCase() === 'TRUE' || val === true || val === 1 || String(val) === '1';
      } else if (key === '모둠_비밀번호_인증_사용' || key === 'requireGroupPassword') {
        settings.requireGroupPassword = String(val).toUpperCase() === 'TRUE' || val === true || val === 1 || String(val) === '1';
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      settings: settings
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 모둠별 비밀번호 목록 조회
  if (action === 'getGroupPasswords') {
    ensurePasswordsSheet(ss);
    const sheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
    const data = sheet.getDataRange().getValues();
    const passwords = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[3]) continue;
      const key = String(row[0]) + '__' + String(row[1]) + '__' + String(row[2]) + '__' + String(row[3]);
      passwords[key] = String(row[4] || '');
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      passwords: passwords
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. 탐구 주제 목록 조회
  if (action === 'getTopics') {
    ensureSettingsSheet(ss);
    const sheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
    const data = sheet.getDataRange().getValues();
    const topics = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      
      const rawQuestions = String(row[13] || '');
      const parsedQuestions = rawQuestions
        ? rawQuestions.split('\\n').map(q => q.trim().replace(/^[-•*]\\s*/, '')).filter(Boolean)
        : [];
      
      topics.push({
        topicId: String(row[0]),
        title: String(row[1]),
        grades: String(row[2]).split(',').map(s => s.trim()),
        classes: String(row[3]).split(',').map(s => s.trim()),
        groups: String(row[4]).split(',').map(s => s.trim()),
        xVarName: String(row[5]),
        xUnit: String(row[6]),
        yVarName: String(row[7]),
        yUnit: String(row[8]),
        defaultTrendline: String(row[9]) || 'linear',
        conceptGuide: String(row[10] || ''),
        slopeMeaningGuide: String(row[11] || ''),
        active: String(row[12]).toUpperCase() !== 'N',
        rawQuestions: rawQuestions,
        coreQuestions: parsedQuestions
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      topics: topics
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 4. 전체 모둠 실험 데이터 조회
  if (action === 'getAllGroupData') {
    ensureDataSheet(ss);
    const topicId = e.parameter.topicId;
    const grade = e.parameter.grade;
    const classNum = e.parameter.classNum;
    
    const sheet = ss.getSheetByName(SHEET_DATA_NAME);
    const data = sheet.getDataRange().getValues();
    const groupMap = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Row format: [Timestamp, TopicID, Grade, Class, Group, Order, X, Y, Outlier, Note, Summary, Principle, ErrorAnalysis, FullReport]
      if (row[1] == topicId && row[2] == grade && row[3] == classNum) {
        const groupName = String(row[4]);
        if (!groupMap[groupName]) {
          const answersMap = {};
          if (row[10]) answersMap['q1'] = String(row[10]);
          if (row[11]) answersMap['q2'] = String(row[11]);
          if (row[12]) answersMap['q3'] = String(row[12]);
          
          groupMap[groupName] = {
            topicId: topicId,
            grade: grade,
            classNum: classNum,
            groupName: groupName,
            points: [],
            conclusionNotes: {
              summary: String(row[10] || ''),
              principle: String(row[11] || ''),
              errorAnalysis: String(row[12] || ''),
              answers: answersMap
            },
            lastSavedAt: String(row[0])
          };
        }
        
        if (row[6] !== '' && row[7] !== '') {
          groupMap[groupName].points.push({
            id: String(row[5] || i),
            order: Number(row[5] || groupMap[groupName].points.length + 1),
            x: Number(row[6]),
            y: Number(row[7]),
            isOutlier: String(row[8]) === 'Y',
            note: String(row[9] || '')
          });
        }
      }
    }
    
    const resultList = Object.values(groupMap);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: resultList
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. 교사 환경설정 저장 (비밀번호, 권한 토글)
    if (action === 'saveSettings') {
      ensureConfigSheet(ss);
      const sheet = ss.getSheetByName(SHEET_CONFIG_NAME);
      const values = sheet.getDataRange().getValues();
      
      const updateOrAppend = (keyName, val, desc) => {
        let found = false;
        for (let i = 1; i < values.length; i++) {
          if (values[i][0] === keyName) {
            sheet.getRange(i + 1, 2).setValue(val);
            found = true;
            break;
          }
        }
        if (!found) {
          sheet.appendRow([keyName, val, desc]);
        }
      };

      if (payload.teacherPassword !== undefined) {
        updateOrAppend('교사_비밀번호', String(payload.teacherPassword), '교사용 관리 콘솔 접속 비밀번호');
      }
      if (payload.allowClassOverview !== undefined) {
        updateOrAppend('전체_모둠_데이터_확인_허용', payload.allowClassOverview ? 'TRUE' : 'FALSE', '학생 화면에서 학급 전체 모둠 데이터 확인 버튼 노출 여부');
      }
      if (payload.allowAutoAnalysis !== undefined) {
        updateOrAppend('컴퓨터_자동_분석_그래프_허용', payload.allowAutoAnalysis ? 'TRUE' : 'FALSE', '학생 화면에서 컴퓨터 자동 분석 탭 및 최적선 비교 노출 여부');
      }
      if (payload.requireGroupPassword !== undefined) {
        updateOrAppend('모둠_비밀번호_인증_사용', payload.requireGroupPassword ? 'TRUE' : 'FALSE', '학생 입장 시 교사가 배부한 모둠 비밀번호 필수 입력 여부');
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '환경설정이 스프레드시트에 저장되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 모둠 비밀번호 일괄 저장 (교사용 일괄 배정)
    if (action === 'saveAllGroupPasswords') {
      ensurePasswordsSheet(ss);
      const sheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
      const incoming = (payload && payload.passwords) || {};
      const timestamp = new Date();
      
      // 기존 2행 이하 지우고 새로 전체 쓰기
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
      }
      
      const rowsToAppend = [];
      for (const [key, pw] of Object.entries(incoming)) {
        if (!pw) continue;
        const parts = key.split('__');
        if (parts.length === 4) {
          rowsToAppend.push([parts[0], parts[1], parts[2], parts[3], String(pw), timestamp]);
        }
      }
      
      if (rowsToAppend.length > 0) {
        sheet.getRange(2, 1, rowsToAppend.length, 6).setValues(rowsToAppend);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '모둠 비밀번호 전체가 스프레드시트에 동기화되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. 모둠 비밀번호 단일 저장 / 등록
    if (action === 'saveGroupPassword') {
      ensurePasswordsSheet(ss);
      const sheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
      const data = sheet.getDataRange().getValues();
      const timestamp = new Date();
      let foundIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] == payload.topicId && row[1] == payload.grade && row[2] == payload.classNum && row[3] == payload.groupName) {
          foundIndex = i + 1;
          break;
        }
      }
      
      if (foundIndex > 0) {
        sheet.getRange(foundIndex, 5).setValue(String(payload.password));
        sheet.getRange(foundIndex, 6).setValue(timestamp);
      } else {
        sheet.appendRow([
          payload.topicId,
          payload.grade,
          payload.classNum,
          payload.groupName,
          String(payload.password),
          timestamp
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '모둠 비밀번호가 스프레드시트에 저장되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. 모둠 비밀번호 초기화 (교사용)
    if (action === 'resetGroupPassword') {
      ensurePasswordsSheet(ss);
      const sheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
      const data = sheet.getDataRange().getValues();
      
      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        if (row[0] == payload.topicId && row[1] == payload.grade && row[2] == payload.classNum && row[3] == payload.groupName) {
          sheet.deleteRow(i + 1);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '모둠 비밀번호가 초기화되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. 실험 데이터 저장 (문항 수 가변 대응 및 전체 통합 답변 자동 기록)
    if (action === 'saveGroupData') {
      ensureDataSheet(ss);
      ensurePasswordsSheet(ss);
      
      // 모둠 비밀번호가 전달되었으면 비밀번호 시트에도 자동 동기화
      if (payload.groupPassword) {
        const pwSheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
        const pwData = pwSheet.getDataRange().getValues();
        let pwFound = false;
        for (let i = 1; i < pwData.length; i++) {
          const row = pwData[i];
          if (row[0] == payload.topicId && row[1] == payload.grade && row[2] == payload.classNum && row[3] == payload.groupName) {
            pwSheet.getRange(i + 1, 5).setValue(String(payload.groupPassword));
            pwSheet.getRange(i + 1, 6).setValue(new Date());
            pwFound = true;
            break;
          }
        }
        if (!pwFound) {
          pwSheet.appendRow([
            payload.topicId,
            payload.grade,
            payload.classNum,
            payload.groupName,
            String(payload.groupPassword),
            new Date()
          ]);
        }
      }

      const sheet = ss.getSheetByName(SHEET_DATA_NAME);
      const timestamp = new Date();
      
      // 기존 모둠 데이터 삭제 후 최신 데이터로 저장
      const allRows = sheet.getDataRange().getValues();
      for (let i = allRows.length - 1; i >= 1; i--) {
        const r = allRows[i];
        if (r[1] == payload.topicId && r[2] == payload.grade && r[3] == payload.classNum && r[4] == payload.groupName) {
          sheet.deleteRow(i + 1);
        }
      }
      
      // 문항별 답변 추출 및 전체 통합 답변 문자열 구성
      const notes = payload.conclusionNotes || {};
      let q1 = notes.summary || (notes.answers && notes.answers['q1']) || '';
      let q2 = notes.principle || (notes.answers && notes.answers['q2']) || '';
      let q3 = notes.errorAnalysis || (notes.answers && notes.answers['q3']) || '';
      
      let fullReportFormatted = '';
      if (notes.answers && typeof notes.answers === 'object') {
        const entries = Object.entries(notes.answers);
        if (entries.length > 0) {
          fullReportFormatted = entries.map(([k, v], idx) => '[' + (idx + 1) + '번 답변] ' + v).join('\\n\\n');
        }
      }
      if (!fullReportFormatted) {
        fullReportFormatted = [
          q1 ? '[1. 자료해석] ' + q1 : '',
          q2 ? '[2. 과학원리] ' + q2 : '',
          q3 ? '[3. 오차분석] ' + q3 : ''
        ].filter(Boolean).join('\\n\\n');
      }

      // 점 데이터 기록
      if (payload.points && payload.points.length > 0) {
        payload.points.forEach((pt, idx) => {
          if (pt.x !== '' && pt.y !== '') {
            sheet.appendRow([
              timestamp,
              payload.topicId,
              payload.grade,
              payload.classNum,
              payload.groupName,
              pt.order || (idx + 1),
              pt.x,
              pt.y,
              pt.isOutlier ? 'Y' : 'N',
              pt.note || '',
              q1,
              q2,
              q3,
              fullReportFormatted
            ]);
          }
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '저장 완료'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. 탐구 주제 목록 저장 (전체 갱신, 가변 문항 완벽 지원)
    if (action === 'saveTopics') {
      ensureSettingsSheet(ss);
      const sheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
      const topics = (payload && payload.topics) || [];
      
      // 기존 2행 이하의 데이터 지우기
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 14).clearContent();
      }
      
      topics.forEach((t) => {
        const questionsStr = t.rawQuestions || (Array.isArray(t.coreQuestions) ? t.coreQuestions.join('\\n') : (t.coreQuestions || ''));
        sheet.appendRow([
          t.topicId || '',
          t.title || '',
          Array.isArray(t.grades) ? t.grades.join(', ') : (t.grades || ''),
          Array.isArray(t.classes) ? t.classes.join(', ') : (t.classes || ''),
          Array.isArray(t.groups) ? t.groups.join(', ') : (t.groups || ''),
          t.xVarName || '',
          t.xUnit || '',
          t.yVarName || '',
          t.yUnit || '',
          t.defaultTrendline || 'linear',
          t.conceptGuide || '',
          t.slopeMeaningGuide || '',
          t.active === false ? 'N' : 'Y',
          questionsStr
        ]);
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '탐구 주제 목록이 스프레드시트에 저장되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'invalid_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureConfigSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_CONFIG_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONFIG_NAME, 0); // insert at first tab
    sheet.appendRow(['설정 항목 (Key)', '설정값 (Value)', '설명 및 안내']);
    sheet.appendRow(['교사_비밀번호', '0000', '교사용 관리 콘솔 접속 비밀번호 (기본값: 0000)']);
    sheet.appendRow(['전체_모둠_데이터_확인_허용', 'TRUE', '학생 화면에서 학급 전체 모둠 데이터 확인 버튼 노출 여부 (TRUE/FALSE)']);
    sheet.appendRow(['컴퓨터_자동_분석_그래프_허용', 'TRUE', '학생 화면에서 컴퓨터 자동 분석 탭 및 최적선 비교 노출 여부 (TRUE/FALSE)']);
    sheet.appendRow(['모둠_비밀번호_인증_사용', 'TRUE', '학생 입장 시 교사가 배부한 모둠 비밀번호 필수 입력 여부 (TRUE/FALSE)']);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:C1").setBackground("#d9ead3").setFontWeight("bold");
    sheet.autoResizeColumns(1, 3);
  }
}

function ensurePasswordsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_PASSWORDS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PASSWORDS_NAME, 1);
    sheet.appendRow(['주제ID', '학년', '반', '모둠명', '모둠비밀번호', '최종설정일시']);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:F1").setBackground("#fff2cc").setFontWeight("bold");
    sheet.autoResizeColumns(1, 6);
  }
}

function ensureSettingsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SETTINGS_NAME);
    sheet.appendRow([
      '주제ID', '탐구 주제명', '대상 학년', '대상 반 목록', '모둠 목록 (병렬 지정)',
      '독립변인(X)명', 'X단위', '종속변인(Y)명', 'Y단위', '기본 추세선',
      '과학적 개념 가이드', '기울기 의미 가이드', '활성화', '탐구 결론 질문 및 서술 문항 ([제목] 질문 || 힌트)'
    ]);
    sheet.appendRow([
      'EXP_01', '용수철에 매단 추의 무게와 늘어난 길이 (훅의 법칙)',
      '1학년, 2학년, 3학년', '1반, 2반, 3반, 4반', 'A모둠, B모둠, C모둠, D모둠, E모둠, F모둠',
      '추의 무게', 'N', '늘어난 길이', 'cm', 'proportional',
      '늘어난 길이는 추의 무게에 정비례합니다 (훅의 법칙 F=kx)',
      '기울기는 용수철 상수의 역수(1/k)를 나타냅니다.', 'Y',
      '[자료 해석 (규칙성 요약)] 추의 무게가 변할 때 늘어난 길이는 어떻게 변했나요? || 예: 추의 무게가 2배, 3배로 증가함에 따라 늘어난 길이도 일정하게 증가하였다.\\n[과학적 개념 & 법칙 도출] 실험 결과와 그래프 기울기/수식으로부터 알 수 있는 원리는? || 예: 늘어난 길이는 추의 무게에 정비례하며 훅의 법칙을 만족한다.\\n[오차 분석 및 토의] 이론값과 차이가 생긴 원인이나 실험 시 주의할 점은? || 예: 눈금을 수평으로 읽지 않아 발생한 시차 오차가 있었다.'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:N1").setBackground("#e8f0fe").setFontWeight("bold");
  }
}

function ensureDataSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DATA_NAME);
    sheet.appendRow([
      '타임스탬프', '주제ID', '학년', '반', '모둠명', '측정차수',
      '독립변인(X)', '종속변인(Y)', '이상치여부', '측정메모',
      '문항1_답변(자료해석)', '문항2_답변(과학원리)', '문항3_답변(오차분석)', '전체_보고서_통합답변'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:N1").setBackground("#fce8e6").setFontWeight("bold");
  }
}
`;
}
