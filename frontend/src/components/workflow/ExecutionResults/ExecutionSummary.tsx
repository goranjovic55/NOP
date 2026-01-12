/**
 * ExecutionSummary - Summary dashboard for execution results
 * 
 * Displays at-a-glance metrics:
 * - Pass/fail/skip counts
 * - Success rate
 * - Duration
 * - Failed steps quick list
 * - Key metrics from the execution
 */

import React from 'react';
import {
  ExecutionResult,
  ExecutionMetrics,
  ExecutionError,
  EXECUTION_STATUS_COLORS,
} from '../../types/executionResults';

interface ExecutionSummaryProps {
  execution: ExecutionResult;
}

export const ExecutionSummary: React.FC<ExecutionSummaryProps> = ({ execution }) => {
  const { metrics, errors, startedAt, completedAt, duration, agentName } = execution;

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Format timestamp
  const formatTime = (iso?: string): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString();
  };

  return (
    <div className="border-b border-gray-700 bg-gray-800/50">
      {/* Main Metrics Row */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Passed */}
        <MetricCard
          label="PASSED"
          value={metrics.passedSteps}
          color={EXECUTION_STATUS_COLORS.passed}
        />
        
        {/* Failed */}
        <MetricCard
          label="FAILED"
          value={metrics.failedSteps}
          color={EXECUTION_STATUS_COLORS.failed}
          highlight={metrics.failedSteps > 0}
        />
        
        {/* Skipped */}
        <MetricCard
          label="SKIPPED"
          value={metrics.skippedSteps}
          color={EXECUTION_STATUS_COLORS.skipped}
        />
        
        {/* Warnings */}
        {metrics.warningSteps > 0 && (
          <MetricCard
            label="WARNINGS"
            value={metrics.warningSteps}
            color={EXECUTION_STATUS_COLORS.warning}
          />
        )}
        
        {/* Success Rate */}
        <MetricCard
          label="SUCCESS"
          value={`${Math.round(metrics.successRate)}%`}
          color={metrics.successRate >= 80 ? EXECUTION_STATUS_COLORS.passed : 
                 metrics.successRate >= 50 ? EXECUTION_STATUS_COLORS.warning : 
                 EXECUTION_STATUS_COLORS.failed}
        />
        
        {/* Divider */}
        <div className="w-px h-10 bg-gray-600 mx-2" />
        
        {/* Duration */}
        <div className="text-sm">
          <span className="text-gray-400">Duration:</span>
          <span className="ml-2 text-white font-mono">{formatDuration(duration)}</span>
        </div>
        
        {/* Started */}
        <div className="text-sm">
          <span className="text-gray-400">Started:</span>
          <span className="ml-2 text-white font-mono">{formatTime(startedAt)}</span>
        </div>
        
        {/* Agent */}
        {agentName && (
          <div className="text-sm">
            <span className="text-gray-400">Agent:</span>
            <span className="ml-2 text-cyan-400">{agentName}</span>
          </div>
        )}
      </div>

      {/* Failed Steps Quick List */}
      {errors && errors.length > 0 && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800">
          <div className="text-sm text-red-400 font-semibold mb-2">
            FAILED STEPS ({errors.length})
          </div>
          <div className="space-y-1 max-h-24 overflow-auto">
            {errors.slice(0, 5).map((error, idx) => (
              <FailedStepItem key={idx} error={error} />
            ))}
            {errors.length > 5 && (
              <div className="text-xs text-red-400 opacity-70">
                +{errors.length - 5} more failed steps
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Metrics */}
      {metrics.customMetrics && Object.keys(metrics.customMetrics).length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700 flex flex-wrap gap-4">
          <span className="text-sm text-gray-400 font-semibold">KEY METRICS:</span>
          {Object.entries(metrics.customMetrics).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-gray-400">{formatMetricName(key)}:</span>
              <span className="ml-1 text-white font-mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Metric Card Sub-component
interface MetricCardProps {
  label: string;
  value: string | number;
  color: string;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, highlight }) => (
  <div
    className={`px-3 py-2 rounded border ${
      highlight
        ? 'bg-red-900/30 border-red-500 animate-pulse'
        : 'bg-gray-800 border-gray-600'
    }`}
  >
    <div
      className="text-2xl font-bold font-mono"
      style={{ color }}
    >
      {value}
    </div>
    <div className="text-xs text-gray-400 uppercase">{label}</div>
  </div>
);

// Failed Step Item Sub-component
interface FailedStepItemProps {
  error: ExecutionError;
}

const FailedStepItem: React.FC<FailedStepItemProps> = ({ error }) => (
  <div className="text-sm flex items-start gap-2">
    <span className="text-red-400">✗</span>
    <span className="text-gray-300">
      {error.iterationIndex !== undefined && (
        <span className="text-gray-500">[Iteration {error.iterationIndex + 1}] </span>
      )}
      <span className="text-white">{error.nodeName}</span>
      <span className="text-gray-500"> - </span>
      <span className="text-red-300">{truncateError(error.error)}</span>
    </span>
  </div>
);

// Helper: Truncate error message
const truncateError = (error: string, maxLength = 60): string => {
  if (error.length <= maxLength) return error;
  return error.substring(0, maxLength - 3) + '...';
};

// Helper: Format metric name
const formatMetricName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default ExecutionSummary;
