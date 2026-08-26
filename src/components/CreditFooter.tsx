import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Pin, Camera } from 'lucide-react';

interface CreditFooterProps {
  variant?: 'light' | 'dark';
  /** Keep the whole credit line on one row (student-facing pages). */
  singleLine?: boolean;
}

export const CreditFooter: React.FC<CreditFooterProps> = ({ variant = 'light', singleLine = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  // Lock body scroll while modal open; always restore on close/unmount so we
  // never leave the page permanently unscrollable if this unmounts mid-open.
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const isDark = variant === 'dark';

  return (
    <>
      <footer
        className={`no-print py-4 text-center text-[11px] ${
          isDark ? 'text-slate-500' : 'bg-white border-t border-slate-200 text-slate-400'
        }`}
      >
        <p>
          © 2026 Designed &amp; Developed by{' '}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`underline underline-offset-2 font-semibold cursor-pointer transition-colors ${
              isDark ? 'text-slate-400 hover:text-indigo-300' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            두리쌤
          </button>
          {singleLine && '. All rights reserved.'}
        </p>
        {!singleLine && <p>All rights reserved.</p>}
      </footer>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="제작 정보 및 이용 조건"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 text-slate-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="닫기"
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-7 space-y-5">
              {/* Card 1: Credit & Terms */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  제작: 두리쌤
                </h3>
                <div>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Pin className="w-3.5 h-3.5 text-indigo-500" />
                    이용 조건
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                    <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
                    <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
                    <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
                    <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
                  </ul>
                </div>
              </div>

              {/* Card 2: Contact */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  문의
                </p>
                <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                  <li>
                    Instagram:{' '}
                    <a
                      href="https://www.instagram.com/trdoolee"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                    >
                      trdoolee
                    </a>
                  </li>
                  <li>
                    Blog:{' '}
                    <a
                      href="https://blog.naver.com/trdoolee"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                    >
                      blog.naver.com/trdoolee
                    </a>
                  </li>
                </ul>
                <p className="text-[11px] text-slate-400 italic pt-1">
                  간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
