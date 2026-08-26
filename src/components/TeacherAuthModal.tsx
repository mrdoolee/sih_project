import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  X,
  ArrowRight,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { TeacherSettingsConfig } from '../types';
import { verifyTeacherPasswordOnGAS } from '../utils/gasService';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacherSettings: TeacherSettingsConfig;
  webAppUrl?: string;
  onPasswordVerified?: (password: string) => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teacherSettings,
  webAppUrl,
  onPasswordVerified
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setShowPassword(false);
      setErrorMsg(null);
      setIsShaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMasterPassword = (teacherSettings.teacherPassword || '0000').trim();

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const inputTrimmed = passwordInput.trim();
    if (!inputTrimmed) {
      setErrorMsg('교사용 관리 비밀번호를 입력해주세요.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (inputTrimmed === currentMasterPassword) {
      onSuccess();
      return;
    }

    // Local cache may be stale (new device/browser after a password change
    // elsewhere) - confirm against the spreadsheet before rejecting.
    if (webAppUrl) {
      setIsVerifying(true);
      const valid = await verifyTeacherPasswordOnGAS(inputTrimmed, webAppUrl);
      setIsVerifying(false);
      if (valid) {
        onPasswordVerified?.(inputTrimmed);
        onSuccess();
        return;
      }
    }

    setErrorMsg('비밀번호가 일치하지 않습니다. 메뉴 2(환경설정)에서 설정한 비밀번호를 입력하세요.');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-white relative transition-transform ${
          isShaking ? 'animate-bounce ring-2 ring-rose-500' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Teacher Access Verification</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">교사 관리 모드 진입</h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          학생의 임의 설정 수정을 방지하기 위해 <strong>교사용 관리 비밀번호</strong>를 입력해야 접근할 수 있습니다.
        </p>

        {/* Password Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                교사용 비밀번호
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                (초기 기본값: 0000)
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="비밀번호 입력"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer text-center"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isVerifying ? '확인 중...' : '인증 및 입장'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
