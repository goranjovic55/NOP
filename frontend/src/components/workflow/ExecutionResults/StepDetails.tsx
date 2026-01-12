/**
 * StepDetails - Detailed view of a selected execution step
 * 
 * Shows:
 * - Full step information
 * - Execution logs
 * - Input/output data
 * - Error details with stack trace
 * - Network operation results
 * - Assertion results
 */

import React, { useState } from 'react';
import {
  ExecutionNode,
  LogEntry,
  STATUS_ICONS,
  EXECUTION_STATUS_COLORS,
  BLOCK_CATEGORY_COLORS,
} from '../../types/executionResults';

interface StepDetailsProps {
  node: ExecutionNode;
  onClose: () => void;
}

export const StepDetails: React.FC<StepDetailsProps> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'data'>('overview');

  const statusIcon = STATUS_ICONS[node.status];
  const statusColor = EXECUTION_STATUS_COLORS[node.status];
  const categoryColor = BLOCK_CATEGORY_COLORS[node.blockCategory];

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  };

  // Format timestamp
  const formatTime = (iso?: string): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: statusColor }} className="text-xl">
            {statusIcon}
          </span>
          <h3 className="font-bold text-white">{node.blockName}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-gray-800 flex items-center gap-4 text-sm">
        <span
          className="px-2 py-1 rounded text-xs font-bold"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}`,
          }}
        >
          {node.status.toUpperCase()}
        </span>
        <span
          className="px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: `${categoryColor}20`,
            color: categoryColor,
          }}
        >
          {formatBlockType(node.blockType)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['overview', 'logs', 'data'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <OverviewTab node={node} formatDuration={formatDuration} formatTime={formatTime} />
        )}
        {activeTab === 'logs' && (
          <LogsTab logs={node.result?.logs || []} />
        )}
        {activeTab === 'data' && (
          <DataTab node={node} />
        )}
      </div>
    </div>
  );
};

// Overview Tab
interface OverviewTabProps {
  node: ExecutionNode;
  formatDuration: (ms?: number) => string;
  formatTime: (iso?: string) => string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ node, formatDuration, formatTime }) => {
  const { result } = node;

  return (
    <div className="space-y-6">
      {/* Dual State Display */}
      <Section title="Execution State">
        <div className="grid grid-cols-2 gap-4">
          {/* Execution State */}
          <div className="p-3 rounded border border-gray-600 bg-gray-800/50">
            <div className="text-xs text-gray-400 uppercase mb-1">Block Execution</div>
            <div className={`text-lg font-bold ${
              node.executionState === 'completed' ? 'text-green-400' :
              node.executionState === 'failed' ? 'text-red-400' :
              node.executionState === 'running' ? 'text-cyan-400' : 'text-gray-400'
            }`}>
              {node.executionState === 'completed' ? '✓ COMPLETED' :
               node.executionState === 'failed' ? '✗ FAILED' :
               node.executionState === 'running' ? '● RUNNING' : '○ PENDING'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Did the block execute its operation?
            </div>
          </div>
          
          {/* Interpretation Result */}
          <div className="p-3 rounded border border-gray-600 bg-gray-800/50">
            <div className="text-xs text-gray-400 uppercase mb-1">Result Interpretation</div>
            <div className={`text-lg font-bold ${
              node.interpretedResult === 'passed' ? 'text-green-400' :
              node.interpretedResult === 'failed' ? 'text-red-400' :
              node.interpretedResult === 'warning' ? 'text-yellow-400' :
              node.interpretedResult === 'requires_review' ? 'text-orange-400' :
              node.interpretedResult === 'not_applicable' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {node.interpretedResult === 'passed' ? '✓ PASSED' :
               node.interpretedResult === 'failed' ? '✗ FAILED' :
               node.interpretedResult === 'warning' ? '⚠ WARNING' :
               node.interpretedResult === 'requires_review' ? '? REVIEW NEEDED' :
               node.interpretedResult === 'not_applicable' ? '— N/A' : '○ PENDING'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pass/fail verdict based on output
            </div>
          </div>
        </div>
      </Section>

      {/* Interpretation Details */}
      {result?.interpretation && (
        <Section 
          title="Interpretation Details" 
          className={result.interpretation.passed ? 'border-green-500/50' : 'border-red-500/50'}
        >
          <div className={`text-base font-semibold ${
            result.interpretation.passed ? 'text-green-400' : 'text-red-400'
          }`}>
            {result.interpretation.reason}
          </div>
          {result.interpretation.matchedCondition && (
            <div className="mt-2 text-sm">
              <span className="text-gray-400">Matched Condition:</span>
              <span className="ml-2 text-cyan-400 font-mono">{result.interpretation.matchedCondition}</span>
            </div>
          )}
          {result.interpretation.extractedValue !== undefined && (
            <div className="mt-2 text-sm">
              <span className="text-gray-400">Extracted Value:</span>
              <pre className="mt-1 text-white bg-gray-800 p-2 rounded overflow-auto text-xs">
                {JSON.stringify(result.interpretation.extractedValue, null, 2)}
              </pre>
            </div>
          )}
        </Section>
      )}

      {/* Pass Condition */}
      {node.passCondition && (
        <Section title="Pass Condition">
          <div className="text-sm">
            <span className="text-gray-400">Type:</span>
            <span className="ml-2 text-cyan-400 font-mono">{node.passCondition.type}</span>
          </div>
          {node.passCondition.value && (
            <div className="text-sm mt-1">
              <span className="text-gray-400">Value:</span>
              <span className="ml-2 text-white font-mono">{String(node.passCondition.value)}</span>
            </div>
          )}
        </Section>
      )}

      {/* Raw Output (for command blocks) */}
      {result?.rawOutput && (
        <Section title="Raw Output">
          <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap">
            {result.rawOutput}
          </pre>
        </Section>
      )}

      {/* Command Result */}
      {result?.commandResult && (
        <Section title="Command Result">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Exit Code" value={result.commandResult.exitCode} 
              highlight={result.commandResult.exitCode !== 0} />
            <InfoRow label="Execution Time" value={`${result.commandResult.executionTimeMs}ms`} />
          </div>
          {result.commandResult.stderr && (
            <div className="mt-2">
              <span className="text-xs text-red-400 uppercase">STDERR:</span>
              <pre className="mt-1 text-xs text-red-300 bg-gray-800 p-2 rounded overflow-auto">
                {result.commandResult.stderr}
              </pre>
            </div>
          )}
        </Section>
      )}

      {/* Timing Information */}
      <Section title="Timing">
        <InfoRow label="Started" value={formatTime(node.startedAt)} />
        <InfoRow label="Completed" value={formatTime(node.completedAt)} />
        <InfoRow label="Duration" value={formatDuration(node.duration)} />
      </Section>

      {/* Error Information */}
      {result?.executionError && (
        <Section title="Error" className="border-red-500/50 bg-red-900/10">
          <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">
            {result.executionError}
          </div>
          {result.errorCode && (
            <div className="mt-2 text-xs text-red-300">
              Error Code: {result.errorCode}
            </div>
          )}
        </Section>
      )}

      {/* Assertion Result */}
      {result?.assertionResult && (
        <Section 
          title="Assertion Result" 
          className={result.assertionResult.passed ? 'border-green-500/50' : 'border-red-500/50'}
        >
          <div
            className={`text-lg font-bold ${
              result.assertionResult.passed ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {result.assertionResult.passed ? '✓ PASSED' : '✗ FAILED'}
          </div>
          <div className="mt-2 text-gray-300">{result.assertionResult.message}</div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Expected:</span>
              <pre className="mt-1 text-cyan-400 bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(result.assertionResult.expected, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-gray-400">Actual:</span>
              <pre className="mt-1 text-white bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(result.assertionResult.actual, null, 2)}
              </pre>
            </div>
          </div>
        </Section>
      )}

      {/* Network Results */}
      {result?.networkResult && (
        <Section title="Network Results">
          <div className="grid grid-cols-2 gap-2">
            {result.networkResult.hostsScanned !== undefined && (
              <InfoRow label="Hosts Scanned" value={result.networkResult.hostsScanned} />
            )}
            {result.networkResult.hostsFound !== undefined && (
              <InfoRow label="Hosts Found" value={result.networkResult.hostsFound} />
            )}
            {result.networkResult.portsScanned !== undefined && (
              <InfoRow label="Ports Scanned" value={result.networkResult.portsScanned} />
            )}
            {result.networkResult.portsOpen !== undefined && (
              <InfoRow label="Open Ports" value={result.networkResult.portsOpen} />
            )}
            {result.networkResult.servicesDetected !== undefined && (
              <InfoRow label="Services" value={result.networkResult.servicesDetected} />
            )}
            {result.networkResult.vulnerabilitiesFound !== undefined && (
              <InfoRow 
                label="Vulnerabilities" 
                value={result.networkResult.vulnerabilitiesFound}
                highlight={result.networkResult.vulnerabilitiesFound > 0}
              />
            )}
            {result.networkResult.latencyMs !== undefined && (
              <InfoRow label="Latency" value={`${result.networkResult.latencyMs}ms`} />
            )}
            {result.networkResult.packetsLost !== undefined && (
              <InfoRow label="Packet Loss" value={`${result.networkResult.packetsLost}%`} />
            )}
          </div>
        </Section>
      )}

      {/* Metrics */}
      {result?.metrics && Object.keys(result.metrics).length > 0 && (
        <Section title="Metrics">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(result.metrics).map(([key, value]) => (
              <InfoRow key={key} label={formatLabel(key)} value={value} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// Logs Tab
interface LogsTabProps {
  logs: LogEntry[];
}

const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No logs available for this step
      </div>
    );
  }

  const levelColors = {
    debug: 'text-gray-500',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className="font-mono text-sm space-y-1">
      {logs.map((log, index) => (
        <div key={index} className="flex gap-2">
          <span className="text-gray-500 w-20 flex-shrink-0">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <span className={`w-14 flex-shrink-0 uppercase ${levelColors[log.level]}`}>
            [{log.level}]
          </span>
          <span className="text-gray-200 whitespace-pre-wrap">{log.message}</span>
        </div>
      ))}
    </div>
  );
};

// Data Tab
interface DataTabProps {
  node: ExecutionNode;
}

const DataTab: React.FC<DataTabProps> = ({ node }) => {
  const { result } = node;

  return (
    <div className="space-y-6">
      {/* Output */}
      {result?.output !== undefined && (
        <Section title="Output">
          <pre className="text-sm text-cyan-400 bg-gray-800 p-3 rounded overflow-auto max-h-60">
            {typeof result.output === 'object'
              ? JSON.stringify(result.output, null, 2)
              : String(result.output)}
          </pre>
        </Section>
      )}

      {/* Full Node Data */}
      <Section title="Node Data">
        <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-auto max-h-96">
          {JSON.stringify(node, null, 2)}
        </pre>
      </Section>
    </div>
  );
};

// Shared Components
interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, className = '' }) => (
  <div className={`border border-gray-700 rounded-lg overflow-hidden ${className}`}>
    <div className="px-3 py-2 bg-gray-800 text-sm font-semibold text-gray-300 uppercase">
      {title}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

interface InfoRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, highlight }) => (
  <div className="flex justify-between py-1">
    <span className="text-gray-400">{label}:</span>
    <span className={highlight ? 'text-red-400 font-bold' : 'text-white'}>{value}</span>
  </div>
);

// Helpers
const formatBlockType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatLabel = (label: string): string => {
  return label
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default StepDetails;
