/**
 * ExecutionOverlay - Displays workflow execution status and controls
 */

import React from 'react';
import { Play, Pause, Square, AlertTriangle, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { WorkflowExecution, ExecutionStatus, NodeExecutionStatus } from '../../types/workflow';

interface ExecutionOverlayProps {
  execution: WorkflowExecution | null;
  isExecuting: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const statusColors: Record<ExecutionStatus, string> = {
  pending: 'text-gray-400',
  running: 'text-cyber-blue',
  paused: 'text-yellow-400',
  completed: 'text-cyber-green',
  failed: 'text-red-500',
  cancelled: 'text-gray-500',
};

const statusIcons: Record<ExecutionStatus, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  running: <Loader2 className="w-5 h-5 animate-spin" />,
  paused: <Pause className="w-5 h-5" />,
  completed: <CheckCircle className="w-5 h-5" />,
  failed: <XCircle className="w-5 h-5" />,
  cancelled: <Square className="w-5 h-5" />,
};

const ExecutionOverlay: React.FC<ExecutionOverlayProps> = ({
  execution,
  isExecuting,
  onStart,
  onPause,
  onResume,
  onCancel,
  onClose,
}) => {
  if (!execution && !isExecuting) {
    return null;
  }

  const status = execution?.status || 'pending';
  const progress = execution?.progress || { completed: 0, total: 0, percentage: 0 };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-cyber-darker/95 backdrop-blur-sm border border-cyber-gray rounded-lg shadow-xl p-4 min-w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={statusColors[status]}>
              {statusIcons[status]}
            </span>
            <span className="text-white font-medium capitalize">{status}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress.completed} / {progress.total} nodes</span>
          </div>
          <div className="w-full h-2 bg-cyber-black rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status === 'failed' ? 'bg-red-500' :
                status === 'completed' ? 'bg-cyber-green' :
                'bg-cyber-purple'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Level Info */}
        {execution && (
          <div className="text-sm text-gray-400 mb-3">
            <span>Level: </span>
            <span className="text-white">{execution.currentLevel + 1}</span>
            <span> / {execution.totalLevels}</span>
          </div>
        )}

        {/* Errors */}
        {execution?.errors && execution.errors.length > 0 && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{execution.errors[0].message}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {!isExecuting && status !== 'running' && (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-cyber-purple hover:bg-cyber-purple/80 text-white rounded transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Run</span>
            </button>
          )}

          {status === 'running' && (
            <>
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={onResume}
                className="flex items-center gap-2 px-4 py-2 bg-cyber-green/20 hover:bg-cyber-green/30 text-cyber-green border border-cyber-green/50 rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </>
          )}

          {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-cyber-purple hover:bg-cyber-purple/80 text-white rounded transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Run Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionOverlay;
