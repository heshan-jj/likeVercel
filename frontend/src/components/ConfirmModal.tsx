import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false,
}) => {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-bg-secondary/95 backdrop-blur-xl w-full max-w-md rounded-[2rem] border border-border-light shadow-2xl shadow-black/10 p-8 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className={`p-3.5 rounded-2xl ${danger ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'} flex-shrink-0 shadow-inner`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h3>
              <p className="text-[13px] text-text-secondary mt-1.5 font-medium leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all ml-4 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border-light/60">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-tertiary/40 hover:bg-bg-tertiary rounded-xl transition-all border border-border-light shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-8 py-2.5 text-xs font-semibold text-white rounded-xl transition-all active:scale-95 shadow-lg ${
              danger
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
