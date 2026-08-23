import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Link,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TopicConfig } from '../types';
import { encodeDistributionUrl } from '../utils/distributionHelper';
import { printElement } from '../utils/printHelper';

interface ClassroomShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasWebAppUrl: string;
  topics?: TopicConfig[];
  currentTopicId?: string;
}

export const ClassroomShareModal: React.FC<ClassroomShareModalProps> = ({
  isOpen,
  onClose,
  gasWebAppUrl
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isQrMaximized, setIsQrMaximized] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Base web application origin URL
  const baseUrl = window.location.origin + window.location.pathname;

  // Single clean student share URL with GAS integration
  const studentShareUrl = React.useMemo(() => {
    return encodeDistributionUrl(baseUrl, {
      gasUrl: gasWebAppUrl ? gasWebAppUrl.trim() : '',
      mode: 'student'
    });
  }, [baseUrl, gasWebAppUrl]);

  // Generate QR Code image data
  useEffect(() => {
    if (!studentShareUrl) return;
    QRCode.toDataURL(studentShareUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [studentShareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentShareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrintQRSheet = () => {
    printElement('printable-qr-share-sheet', {
      title: '[학생배부용 QR안내문]_과학탐구실험실',
      pageOrientation: 'portrait'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>학생 배부용 원클릭 링크 & 대형 QR코드</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  자동 연동
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                학생 기기에서 URL을 입력할 필요 없이 QR 스캔이나 링크 클릭 한 번으로 선생님 구글 시트와 자동 연결됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!gasWebAppUrl ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-300">구글 시트(GAS) Web App URL이 아직 등록되지 않았습니다.</p>
                <p className="mt-1 text-slate-300">
                  선생님의 구글 시트 주소가 포함되지 않으면 학생들의 측정 데이터가 중앙 스프레드시트에 실시간 취합되지 않습니다.
                  왼쪽 메뉴의 <strong>[📊 GAS 연동]</strong> 탭에서 먼저 배포 URL을 입력해 주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">
                선생님 구글 시트 연동 주소가 학생 링크에 안전하게 포함되었습니다.
              </span>
            </div>
          )}

          {/* Large Screen QR View & Action Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Interactive Big QR Box */}
            <div className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl shadow-xl text-slate-900 border-4 border-indigo-500/30 text-center">
              <div className="text-xs font-bold text-indigo-600 mb-1">교실 빔프로젝터 / TV 화면 송출용</div>
              <h3 className="text-base font-extrabold text-slate-900 mb-3">
                과학 탐구 실험실 (학생용)
              </h3>
              
              {qrDataUrl ? (
                <div className="relative group cursor-pointer" onClick={() => setIsQrMaximized(true)}>
                  <img
                    src={qrDataUrl}
                    alt="학생 접속용 QR 코드"
                    className="w-52 h-52 sm:w-56 sm:h-56 object-contain rounded-xl border border-slate-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                    <Maximize2 className="w-5 h-5 mr-1" /> 크게 보기
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400">
                  QR 코드 생성 중...
                </div>
              )}

              <p className="text-xs text-slate-500 mt-3 font-medium">
                태블릿/스마트폰 기본 카메라로 비추면 바로 실행됩니다.
              </p>
            </div>

            {/* Right: Link Details & Distribution Actions */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-indigo-400" />
                  <span>학생 배부용 전용 접속 URL</span>
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={studentShareUrl}
                    className="w-full bg-transparent text-xs text-indigo-300 font-mono focus:outline-none select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="링크 복사"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? '복사됨!' : '복사'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQrMaximized(true)}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>교실 화면 전체에 QR 띄우기 (전체화면 모드)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintQRSheet}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    <span>A4 안내지 인쇄</span>
                  </button>

                  <a
                    href={studentShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>학생 화면 미리보기</span>
                  </a>
                </div>
              </div>

              {/* Instructions guide */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-indigo-300">💡 수업 활용 팁:</p>
                <p>• 구글 클래스룸, e학습터, 패들렛 등에 위 링크를 게시하면 학생들이 클릭 한 번으로 즉시 접속합니다.</p>
                <p>• 학생 기기 접속 시 구글 시트 연동 정보가 로컬에 안전하게 기억되므로, 다음 차시 수업에서도 재설정 없이 이용 가능합니다.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Fullscreen Big QR Modal Overlay (For classroom projector) */}
      {isQrMaximized && (
        <div className="fixed inset-0 z-60 bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => setIsQrMaximized(false)}
            className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Minimize2 className="w-5 h-5" />
            <span>닫기 (ESC)</span>
          </button>

          <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 text-slate-900 text-center shadow-2xl flex flex-col items-center space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-extrabold uppercase">
                Science Lab Quick Access
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                과학 탐구 실험실 (학생용)
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                태블릿/크롬북 카메라로 QR코드를 스캔하여 입장하세요.
              </p>
            </div>

            {qrDataUrl && (
              <div className="p-4 bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl">
                <img
                  src={qrDataUrl}
                  alt="대형 QR 코드"
                  className="w-72 h-72 sm:w-80 sm:h-80 object-contain mx-auto"
                />
              </div>
            )}

            <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 text-left">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                선생님 구글 시트 자동 연결 완료 상태
              </p>
              <p className="text-indigo-800 leading-relaxed font-mono truncate">
                접속 주소: {studentShareUrl}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable A4 sheet for QR sheet */}
      <div id="printable-qr-share-sheet" className="hidden">
        <div className="p-8 max-w-2xl mx-auto text-slate-900 bg-white font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold">과학 탐구 실험실 학생 접속 안내문</h1>
            <p className="text-sm text-slate-600 mt-1">
              스마트 기기 카메라로 아래 QR 코드를 스캔하세요.
            </p>
          </div>

          <div className="my-8 text-center flex flex-col items-center">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 border border-slate-300 p-2 rounded-xl mb-4" />
            )}
            <p className="text-sm font-bold text-slate-800">
              1. 태블릿/스마트폰 카메라로 위 QR코드를 스캔하세요.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              2. 자신의 탐구 주제, 학년/반/모둠을 선택하고 모둠 비밀번호를 입력하여 실험을 시작합니다.
            </p>
          </div>

          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 text-xs text-slate-700">
            <p className="font-bold mb-1">직접 URL 입력 시:</p>
            <p className="font-mono break-all">{studentShareUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
