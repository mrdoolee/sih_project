import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
  QrCode,
  Table,
  BarChart3,
  FlaskConical
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: FileSpreadsheet,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    title: '1. 시작 방법 - GAS 연동 (메뉴 1)',
    body:
      '새 구글 스프레드시트를 만들고 Apps Script Web App으로 배포한 뒤, 발급된 URL을 메뉴 1(GAS 연동)에 등록하면 학생 데이터가 시트에 자동 저장됩니다. 연동 전에도 브라우저 로컬 저장소만으로 앱을 사용할 수 있습니다.'
  },
  {
    icon: ShieldCheck,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    title: '2. 기능제어 & 환경설정 (메뉴 2)',
    body:
      '학생이 사용할 수 있는 기능(전체 모둠 결과 보기, 자동 분석 등)을 켜고 끌 수 있고, 교사용 관리 비밀번호를 이 화면에서 설정합니다. GAS 연동 후 활성화됩니다.'
  },
  {
    icon: Layers,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    title: '3. 탐구주제 & 모둠 관리 (메뉴 3)',
    body:
      '학년/반/모둠 구성과 탐구 주제를 설정하고, 모둠별 접속 비밀번호를 지정하거나 초기화합니다.'
  },
  {
    icon: QrCode,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    title: '4. 학생 배부 링크 & QR (메뉴 4)',
    body:
      '학생이 바로 접속할 수 있는 링크와 교실용 대형 QR코드를 생성해 배부합니다.'
  },
  {
    icon: Table,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    title: '5. 전체 모둠 탐구 결과 확인 (메뉴 5)',
    body:
      '같은 학년/반의 모든 모둠 데이터를 한 번에 표와 그래프로 비교합니다.'
  },
  {
    icon: BarChart3,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    title: '6. 모둠별 결과 확인 & 평가 (메뉴 6)',
    body:
      '모둠별 측정값과 서술형 답안을 확인하고, 5대 루브릭 기준으로 평가 점수를 입력·저장합니다.'
  },
  {
    icon: FlaskConical,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    title: '7. 학생 화면 사용법',
    body:
      '학생은 주제·학년·반·모둠을 선택하고 비밀번호로 입장한 뒤, 표에 측정값을 입력하면 오른쪽 그래프가 자동으로 그려집니다. 추세선을 선택하고 탐구 보고서(요약·원리·오차분석)를 작성한 뒤 "시트에 저장" 버튼으로 저장하거나 인쇄할 수 있습니다.'
  }
];

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="사용 가이드"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 text-slate-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 sm:px-7 py-5 flex items-start gap-3 z-10 rounded-t-3xl">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 mb-1">
              교사용 활용 가이드
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              과학 탐구 활동 보고서 작성 도우미 사용법
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              학생의 측정 데이터를 표와 그래프로 정리하고, 탐구 보고서 작성부터 교사 평가까지 한 곳에서 진행합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sections */}
        <div className="p-6 sm:p-7 space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className={`p-4 rounded-2xl border ${section.color}`}>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  {section.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{section.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
