import React from 'react';
import {
  AlertTriangle,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Trash2,
  Save,
  X,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success' | 'indigo';
export type ConfirmIconType = 'upload' | 'download' | 'alert' | 'trash' | 'save' | 'refresh' | 'check';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  subWarning?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  subWarning,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'indigo',
  icon = 'alert',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case 'upload':
        return <UploadCloud className="w-6 h-6 text-indigo-600" />;
      case 'download':
        return <DownloadCloud className="w-6 h-6 text-emerald-600" />;
      case 'refresh':
        return <RefreshCw className="w-6 h-6 text-blue-600" />;
      case 'trash':
        return <Trash2 className="w-6 h-6 text-rose-600" />;
      case 'save':
        return <Save className="w-6 h-6 text-indigo-600" />;
      case 'check':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'alert':
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-50 border-rose-200 text-rose-600';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'primary':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'indigo':
      default:
        return 'bg-indigo-50 border-indigo-200 text-indigo-600';
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
      case 'indigo':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${getIconBg()}`}
          >
            {renderIcon()}
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Sub Warning Box if provided */}
        {subWarning && (
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{subWarning}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
