import React from 'react';
import { CyberCard } from '../CyberUI';

interface HealthScoreWidgetProps {
  score: number;
  components: { hosts: number; vulns: number; agents: number };
  trend: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

const HealthScoreWidget: React.FC<HealthScoreWidgetProps> = ({ score, components, trend, onClick }) => {
  // Score color based on value
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-cyber-green';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-cyber-red';
  };

  // SVG arc for radial gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? 'text-cyber-green' : trend === 'down' ? 'text-cyber-red' : 'text-cyber-gray-light';

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-3"
    >
      <div className="flex items-center gap-4">
        {/* Radial Gauge */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
            />
            {/* Score arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={score >= 80 ? '#00ff88' : score >= 60 ? '#facc15' : score >= 40 ? '#fb923c' : '#ff0040'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          {/* Center score */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold font-mono ${getScoreColor(score)}`}>{score}</span>
            <span className="text-[10px] text-cyber-gray-light font-mono">HEALTH</span>
          </div>
        </div>

        {/* Component breakdown */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyber-gray-light font-mono">Hosts</span>
            <span className={`text-xs font-mono ${getScoreColor(components.hosts)}`}>{components.hosts}%</span>
          </div>
          <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-green transition-all duration-500"
              style={{ width: `${components.hosts}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-cyber-gray-light font-mono">Security</span>
            <span className={`text-xs font-mono ${getScoreColor(components.vulns)}`}>{components.vulns}%</span>
          </div>
          <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-purple transition-all duration-500"
              style={{ width: `${components.vulns}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-cyber-gray-light font-mono">Agents</span>
            <span className={`text-xs font-mono ${getScoreColor(components.agents)}`}>{components.agents}%</span>
          </div>
          <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-blue transition-all duration-500"
              style={{ width: `${components.agents}%` }}
            />
          </div>
          
          <div className="flex items-center justify-end mt-1">
            <span className={`text-xs font-mono ${trendColor}`}>{trendIcon} Trend</span>
          </div>
        </div>
      </div>
    </CyberCard>
  );
};

export default HealthScoreWidget;
