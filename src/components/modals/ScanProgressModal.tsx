import React, { useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ScanProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalFiles?: number | null;
  processedFiles: number;
  currentFileName?: string;
  logs: string[];
  isScanning: boolean;
}

export const ScanProgressModal: React.FC<ScanProgressModalProps> = ({
  isOpen,
  onClose,
  totalFiles,
  processedFiles,
  currentFileName,
  logs,
  isScanning
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const progressPercentage = totalFiles && totalFiles > 0 
    ? Math.min(100, Math.round((processedFiles / totalFiles) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={!isScanning ? onClose : undefined}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-surface rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/30">
          <h2 className="text-xl font-bold flex items-center gap-3">
            {isScanning ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                Scanning Library...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Scan Complete
              </>
            )}
          </h2>
          {!isScanning && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-text/70">
              <span>Progress</span>
              <span>{processedFiles} {totalFiles ? `/ ${totalFiles}` : 'files'}</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${totalFiles ? progressPercentage : 0}%` }}
              />
            </div>
            {currentFileName && (
              <p className="text-xs text-text/50 truncate font-mono">
                {currentFileName}
              </p>
            )}
          </div>

          {/* Logs Area */}
          <div className="bg-black/40 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs space-y-1 border border-white/5">
            {logs.length === 0 && (
              <div className="text-text/30 italic">Waiting for logs...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`break-all ${log.startsWith('ERROR') ? 'text-red-400' : 'text-text/80'}`}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-background/30 flex justify-end">
          <Button 
            onClick={onClose} 
            disabled={isScanning}
            variant={isScanning ? "secondary" : "primary"}
          >
            {isScanning ? "Scanning..." : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
};
