/**
 * ExecutionOverlay - Displays workflow execution status and controls
 * Cyberpunk themed popup with glowing effects
 */

import React, { useState } from 'react';
import { Play, Pause, Square, AlertTriangle, CheckCircle, XCircle, Loader2, Clock, ChevronDown } from 'lucide-react';
import { WorkflowExecution, ExecutionStatus } from '../../types/workflow';
import { CyberButton } from '../CyberUI';
import WorkflowExecutionTree from './WorkflowExecutionTree';

interface ExecutionOverlayProps {
  execution: WorkflowExecution | null;
  isExecuting: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
  onReset?: () => void;  // Reset execution display on nodes
}

const statusConfig: Record<ExecutionStatus, { color: string; glowColor: string; icon: React.ReactNode; label: string }> = {
  pending: { 
    color: 'text-cyber-gray-light', 
    glowColor: 'shadow-cyber-gray/30',
    icon: <Clock className="w-5 h-5" />,
    label: 'PENDING'
  },
  running: { 
    color: 'text-cyber-blue', 
    glowColor: 'shadow-cyber-blue/50',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    label: 'RUNNING'
  },
  paused: { 
    color: 'text-cyber-yellow', 
    glowColor: 'shadow-yellow-500/30',
    icon: <Pause className="w-5 h-5" />,
    label: 'PAUSED'
  },
  completed: { 
    color: 'text-cyber-green', 
    glowColor: 'shadow-cyber-green/50',
    icon: <CheckCircle className="w-5 h-5" />,
    label: 'COMPLETED'
  },
  failed: { 
    color: 'text-cyber-red', 
    glowColor: 'shadow-cyber-red/50',
    icon: <XCircle className="w-5 h-5" />,
    label: 'FAILED'
  },
  cancelled: { 
    color: 'text-cyber-gray', 
    glowColor: 'shadow-cyber-gray/30',
    icon: <Square className="w-5 h-5" />,
    label: 'CANCELLED'
  },
};

const ExecutionOverlay: React.FC<ExecutionOverlayProps> = ({
  execution,
  isExecuting,
  onStart,
  onPause,
  onResume,
  onCancel,
  onClose,
  onReset,
}) => {
  const [showExecutionTree, setShowExecutionTree] = useState(false);
  
  if (!execution && !isExecuting) {
    return null;
  }

  const status = execution?.status || 'pending';
  const config = statusConfig[status] || statusConfig.pending;
  const progress = execution?.progress || { completed: 0, total: 0, percentage: 0 };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      {/* Cyberpunk styled container */}
      <div className={`
        bg-cyber-black/95 backdrop-blur-md 
        border border-cyber-purple/60 
        rounded-lg 
        shadow-lg ${config.glowColor}
        p-4 min-w-[420px]
        font-mono
      `}>
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-cyber-purple rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-cyber-purple rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-cyber-purple rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-cyber-purple rounded-br-lg" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${config.color} flex items-center justify-center w-8 h-8 rounded bg-cyber-darker border border-current/30`}>
              {config.icon}
            </div>
            <div>
              <span className={`text-sm font-bold tracking-wider ${config.color}`}>
                {config.label}
              </span>
              {execution && (
                <div className="text-[10px] text-cyber-gray-light">
                  ID: {execution.id.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-cyber-gray hover:text-cyber-purple transition-colors p-1 hover:bg-cyber-purple/20 rounded"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-cyber-gray-light mb-2">
            <span className="uppercase tracking-wider">Progress</span>
            <span className="text-cyber-purple font-bold">
              {progress.completed} / {progress.total} <span className="text-cyber-gray-light font-normal">nodes</span>
            </span>
          </div>
          
          {/* Cyberpunk progress bar */}
          <div className="relative h-3 bg-cyber-black rounded border border-cyber-gray/50 overflow-hidden">
            {/* Grid pattern background */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(139, 92, 246, 0.3) 50%)',
              backgroundSize: '4px 100%'
            }} />
            
            {/* Progress fill */}
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                status === 'failed' ? 'bg-gradient-to-r from-cyber-red to-red-400' :
                status === 'completed' ? 'bg-gradient-to-r from-cyber-green to-emerald-400' :
                'bg-gradient-to-r from-cyber-purple to-cyber-blue'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
            
            {/* Scanline effect */}
            {status === 'running' && (
              <div 
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                style={{ 
                  left: `${progress.percentage - 5}%`,
                  animation: 'shimmer 1.5s infinite'
                }}
              />
            )}
          </div>
          
          {/* Percentage */}
          <div className="text-right mt-1">
            <span className={`text-lg font-bold ${config.color}`}>
              {Math.round(progress.percentage)}%
            </span>
          </div>
        </div>

        {/* Level Info */}
        {execution && (
          <div className="flex items-center gap-4 mb-4 p-2 bg-cyber-darker/80 rounded border border-cyber-gray/30">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-cyber-gray-light">Level</div>
              <div className="text-cyber-purple font-bold">
                {(execution.currentLevel ?? 0) + 1} <span className="text-cyber-gray-light font-normal">/ {execution.totalLevels ?? 1}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-cyber-gray/30" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-cyber-gray-light">Time</div>
              <div className="text-cyber-blue font-bold">
                {execution.startedAt 
                  ? `${Math.round((Date.now() - new Date(execution.startedAt).getTime()) / 1000)}s`
                  : '--'
                }
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {execution?.errors && execution.errors.length > 0 && (
          <div className="mb-4 p-3 bg-cyber-red/10 border border-cyber-red/40 rounded">
            <div className="flex items-start gap-2 text-cyber-red text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono">{execution.errors[0].message}</span>
            </div>
          </div>
        )}

        {/* Execution Tree Toggle */}
        {execution && (
          <div className="mb-4 border-t border-cyber-gray/30 pt-4">
            <button
              onClick={() => setShowExecutionTree(!showExecutionTree)}
              className="flex items-center justify-between w-full p-2 hover:bg-cyber-purple/10 rounded transition-colors"
            >
              <span className="text-xs uppercase tracking-wider text-cyber-purple font-bold">
                Execution Tree
              </span>
              <ChevronDown 
                className={`w-4 h-4 text-cyber-purple transition-transform ${showExecutionTree ? 'rotate-180' : ''}`} 
              />
            </button>
            
            {showExecutionTree && (
              <div className="mt-3 max-h-80 overflow-y-auto bg-cyber-darker/50 rounded border border-cyber-gray/30 p-3">
                <WorkflowExecutionTree execution={execution} />
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-cyber-gray/30">
          {!isExecuting && status !== 'running' && (
            <CyberButton variant="purple" size="sm" onClick={onStart}>
              <Play className="w-4 h-4 mr-1" />
              RUN
            </CyberButton>
          )}

          {status === 'running' && (
            <>
              <CyberButton variant="gray" size="sm" onClick={onPause}>
                <Pause className="w-4 h-4 mr-1" />
                PAUSE
              </CyberButton>
              <CyberButton variant="red" size="sm" onClick={onCancel}>
                <Square className="w-4 h-4 mr-1" />
                STOP
              </CyberButton>
            </>
          )}

          {status === 'paused' && (
            <>
              <CyberButton variant="green" size="sm" onClick={onResume}>
                <Play className="w-4 h-4 mr-1" />
                RESUME
              </CyberButton>
              <CyberButton variant="red" size="sm" onClick={onCancel}>
                <Square className="w-4 h-4 mr-1" />
                STOP
              </CyberButton>
            </>
          )}

          {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
            <>
              <CyberButton variant="purple" size="sm" onClick={onStart}>
                <Play className="w-4 h-4 mr-1" />
                RUN AGAIN
              </CyberButton>
              {onReset && (
                <CyberButton 
                  variant="gray" 
                  size="sm" 
                  onClick={() => {
                    onReset();
                    onClose();
                  }}
                >
                  CLEAR
                </CyberButton>
              )}
            </>
          )}
          
          <CyberButton variant="gray" size="sm" onClick={onClose}>
            CLOSE
          </CyberButton>
        </div>
      </div>
    </div>
  );
};

export default ExecutionOverlay;
