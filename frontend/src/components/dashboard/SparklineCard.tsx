import React from 'react';
import { CyberCard } from '../CyberUI';

interface SparklineCardProps {
  title: string;
  value1: number;
  value2: number;
  label1?: string;
  label2?: string;
  icon: string;
  color1: string;
  color2: string;
  glowColor: string;
  sparklineData?: number[];
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  onClick?: () => void;
}

const SparklineCard: React.FC<SparklineCardProps> = ({
  title,
  value1,
  value2,
  label1,
  label2,
  icon,
  color1,
  color2,
  glowColor,
  sparklineData = [],
  trend = 'stable',
  changePercent = 0,
  onClick
}) => {
  // Generate SVG sparkline path
  const generateSparklinePath = (data: number[]): string => {
    if (data.length === 0) return '';
    const max = Math.max(...data, 1);
    const height = 20;
    const width = 60;
    const step = width / (data.length - 1 || 1);
    
    return data.map((val, i) => {
      const x = i * step;
      const y = height - (val / max) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? 'text-cyber-green' : trend === 'down' ? 'text-cyber-red' : 'text-cyber-gray-light';

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-cyber-gray-light text-[10px] font-mono uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold font-mono ${color1}`}>{value1}</span>
            <span className="text-cyber-gray-light mx-0.5">/</span>
            <span className={`text-lg font-bold font-mono ${color2}`}>{value2}</span>
          </div>
          {/* Sparkline + Trend */}
          <div className="flex items-center gap-2 mt-1">
            {sparklineData.length > 1 && (
              <svg width="60" height="20" className="overflow-visible">
                <path
                  d={generateSparklinePath(sparklineData)}
                  fill="none"
                  stroke={trend === 'up' ? '#00ff88' : trend === 'down' ? '#ff0040' : '#666666'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {changePercent !== 0 && (
              <span className={`text-[10px] font-mono ${trendColor}`}>
                {trendIcon} {Math.abs(changePercent)}%
              </span>
            )}
          </div>
        </div>
        <div className={`w-8 h-8 border flex items-center justify-center ${glowColor}`}>
          <span className="text-sm">{icon}</span>
        </div>
      </div>
    </CyberCard>
  );
};

export default SparklineCard;
