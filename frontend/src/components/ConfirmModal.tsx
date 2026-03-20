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
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-bg-primary w-full max-w-md rounded-[32px] border border-border-light shadow-[0_0_80px_rgba(0,0,0,0.4)] p-8 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl ${danger ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'} flex-shrink-0`}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">{title}</h3>
              <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all ml-4 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border-light">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-tertiary rounded-xl transition-all border border-border-light"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-all active:scale-95 shadow-xl ${
              danger
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
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
