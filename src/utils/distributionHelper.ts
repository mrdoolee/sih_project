/**
 * Utilities for encoding/decoding GAS configuration and student distribution links.
 * Enables zero-setup distribution for students and multi-teacher independent setups.
 */

export interface DistributionParams {
  gasUrl: string;
  mode?: 'student' | 'teacher';
  topicId?: string;
  grade?: string;
  classNum?: string;
}

/**
 * Encodes a clean student distribution URL with gas and student mode.
 */
export function encodeDistributionUrl(
  baseUrl: string,
  params: DistributionParams
): string {
  try {
    const origin = window.location.origin;
    const url = new URL(baseUrl || origin, origin);
    url.search = '';

    // Always set mode=student for student distribution links
    url.searchParams.set('mode', 'student');

    if (params.gasUrl) {
      url.searchParams.set('gas', params.gasUrl.trim());
    }
    if (params.topicId) {
      url.searchParams.set('topic', params.topicId.trim());
    }
    if (params.grade) {
      url.searchParams.set('grade', params.grade.trim());
    }
    if (params.classNum) {
      url.searchParams.set('class', params.classNum.trim());
    }

    return url.toString();
  } catch {
    const base = (baseUrl || window.location.origin).split('?')[0].split('#')[0];
    const encGas = encodeURIComponent(params.gasUrl ? params.gasUrl.trim() : '');
    return `${base}?mode=student&gas=${encGas}`;
  }
}

/**
 * Extracts and parses any GAS URL and mode presets from the current browser location.
 */
export function parseDistributionParams(): {
  hasDistributionParams: boolean;
  isStudentMode: boolean;
  gasUrl: string | null;
  topicId: string | null;
  grade: string | null;
  classNum: string | null;
} {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let gasUrl = searchParams.get('gas') || searchParams.get('gasUrl') || searchParams.get('api');
    
    // Check if compressed code exists (?c=...)
    const compressedCode = searchParams.get('c');
    if (compressedCode && !gasUrl) {
      try {
        const decoded = decodeURIComponent(atob(compressedCode));
        if (decoded.startsWith('http')) {
          gasUrl = decoded;
        }
      } catch {
        // ignore
      }
    }

    const mode = searchParams.get('mode');
    const isStudentMode = mode === 'student' || Boolean(searchParams.get('gas') && mode !== 'teacher');

    const topicId = searchParams.get('topic') || searchParams.get('topicId');
    const grade = searchParams.get('grade');
    const classNum = searchParams.get('class') || searchParams.get('classNum');

    const hasDistributionParams = Boolean(gasUrl || topicId || grade || classNum || mode === 'student');

    return {
      hasDistributionParams,
      isStudentMode,
      gasUrl: gasUrl ? gasUrl.trim() : null,
      topicId: topicId ? topicId.trim() : null,
      grade: grade ? grade.trim() : null,
      classNum: classNum ? classNum.trim() : null
    };
  } catch {
    return {
      hasDistributionParams: false,
      isStudentMode: false,
      gasUrl: null,
      topicId: null,
      grade: null,
      classNum: null
    };
  }
}

