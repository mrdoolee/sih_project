import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
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
  AlertCircle,
  Smartphone,
  Layers,
  HelpCircle
} from 'lucide-react';
import { TopicConfig } from '../types';
import { encodeDistributionUrl } from '../utils/distributionHelper';
import { printElement } from '../utils/printHelper';

interface StudentShareLayerProps {
  gasWebAppUrl: string;
  topics?: TopicConfig[];
  currentTopicId?: string;
  onNavigateToGasTab?: () => void;
}

export const StudentShareLayer: React.FC<StudentShareLayerProps> = ({
  gasWebAppUrl,
  topics = [],
  currentTopicId,
  onNavigateToGasTab
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isQrMaximized, setIsQrMaximized] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(currentTopicId || topics[0]?.topicId || '');

  // Base web application origin URL
  const baseUrl = window.location.origin + window.location.pathname;

  // Student share URL with GAS integration
  const studentShareUrl = React.useMemo(() => {
    return encodeDistributionUrl(baseUrl, {
      gasUrl: gasWebAppUrl ? gasWebAppUrl.trim() : '',
      mode: 'student'
    });
  }, [baseUrl, gasWebAppUrl]);

  // Generate QR Code image data
  useEffect(() => {
    if (!studentShareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(studentShareUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR code generation error:', err));
    return () => {
      cancelled = true;
    };
  }, [studentShareUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentShareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrintQRSheet = () => {
    printElement('printable-qr-share-sheet-page', {
      title: '[학생배부용 QR안내문]_과학탐구실험실',
      pageOrientation: 'portrait'
    });
  };

  const currentTopic = topics.find((t) => t.topicId === selectedTopicId) || topics[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intro Header Box */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                4. 학생 배부용 원클릭 링크 & 교실 송출용 QR코드
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              학생들이 복잡한 구글 시트 주소를 직접 입력할 필요 없이, QR코드 스캔이나 링크 클릭 한 번으로 선생님 스프레드시트와 자동 연동되어 바로 실험을 시작할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintQRSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ A4 배부용 안내문 인쇄</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQrMaximized(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>교실 빔프로젝터 송출 (전체화면)</span>
            </button>
          </div>
        </div>

        {/* GAS Connection Status Badge */}
        {!gasWebAppUrl ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 mt-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-800">구글 시트(GAS) Web App URL이 아직 연동되지 않았습니다.</p>
              <p className="text-amber-700 leading-relaxed">
                구글 시트 Web App 주소가 포함되지 않은 기본 링크로 배부하면 학생들의 측정 데이터가 선생님 스프레드시트로 전송되지 않습니다.
                {onNavigateToGasTab && (
                  <button
                    type="button"
                    onClick={onNavigateToGasTab}
                    className="ml-2 font-bold text-indigo-700 underline hover:text-indigo-900 cursor-pointer"
                  >
                    [1. GAS 연동] 탭에서 URL을 먼저 등록하세요 ➔
                  </button>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-emerald-800">
                선생님 구글 스프레드시트 연동 파라미터가 링크 및 QR코드에 정상 포함되어 있습니다.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-700">
              Auto-Connected
            </span>
          </div>
        )}
      </div>

      {/* Vertical stack: URL -> QR -> Classroom guide */}
      <div className="space-y-6">
        {/* 1. Direct URL Distribution Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-600" />
            <span>학생 배부용 전용 다이렉트 URL</span>
          </h4>

          <p className="text-xs text-slate-600">
            구글 클래스룸, e학습터, 카카오톡, 패들렛, 학교 홈페이지 등에 아래 링크를 게시하세요.
          </p>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={studentShareUrl}
              className="w-full bg-transparent text-xs text-indigo-200 font-mono focus:outline-none select-all px-2 truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="URL 클립보드에 복사"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? '복사 완료!' : 'URL 복사'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <a
              href={studentShareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>새 탭에서 학생 화면 미리보기</span>
            </a>
          </div>
        </div>

        {/* 2. Interactive Classroom QR Code */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>스마트폰 / 태블릿 카메라 스캔</span>
          </div>

          <h3 className="text-base font-extrabold text-slate-900">
            과학 탐구 실험실 (학생용) 입장 QR
          </h3>

          <div
            className="p-4 bg-slate-50 border-2 border-dashed border-indigo-200 rounded-3xl relative group cursor-pointer hover:border-indigo-400 transition-all shadow-inner"
            onClick={() => setIsQrMaximized(true)}
            title="클릭 시 교실 전체화면으로 크게 띄웁니다"
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="학생 접속용 QR 코드"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl mx-auto"
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-xs text-slate-400">
                QR 코드 생성 중...
              </div>
            )}
            <div className="absolute inset-0 bg-slate-900/60 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity p-4 text-center">
              <Maximize2 className="w-8 h-8 mb-2 text-indigo-300" />
              <span>클릭하여 교실 TV/프로젝터용<br />전체화면으로 확대</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium space-y-1">
            <p>• 스마트 기기 기본 카메라로 비추면 앱이 바로 열립니다.</p>
            <p>• 별도의 앱 설치나 로그인 계정이 필요하지 않습니다.</p>
          </div>
        </div>

        {/* 3. Classroom Flow Guide */}
        <div className="bg-white text-slate-700 rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>실제 수업 진행 가이드 (3단계)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-indigo-700">1단계: QR 비추기</div>
              <p className="text-slate-600 leading-relaxed">
                교실 빔프로젝터에 띄워진 QR코드를 모둠 태블릿 카메라로 스캔합니다.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-emerald-700">2단계: 모둠 선택 & 비번</div>
              <p className="text-slate-600 leading-relaxed">
                자신의 탐구 주제, 학년/반/모둠을 고르고 모둠 배부 비밀번호를 입력합니다.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-amber-700">3단계: 실시간 집계</div>
              <p className="text-slate-600 leading-relaxed">
                학생들이 측정한 데이터와 보고서가 선생님 스프레드시트에 자동 수합됩니다.
              </p>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-[11px] text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">Tip:</strong> 학생 기기에 처음 접속하면 해당 브라우저에 구글 시트 연동 정보가 로컬 저장되므로, 다음 차시 수업에서도 재설정 없이 즉시 이어갈 수 있습니다.
            </span>
          </div>
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
                태블릿/스마트폰 카메라로 QR코드를 스캔하여 입장하세요.
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

            <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900">
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
      <div id="printable-qr-share-sheet-page" className="hidden">
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
