import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CyberCard } from '../CyberUI';

interface VulnPieWidgetProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
  onClick?: () => void;
}

const VulnPieWidget: React.FC<VulnPieWidgetProps> = ({
  critical,
  high,
  medium,
  low,
  info,
  total,
  onClick
}) => {
  const data = [
    { name: 'Critical', value: critical, color: '#ff0040' },
    { name: 'High', value: high, color: '#fb923c' },
    { name: 'Medium', value: medium, color: '#facc15' },
    { name: 'Low', value: low, color: '#00d4ff' },
    { name: 'Info', value: info, color: '#4b5563' },
  ].filter(d => d.value > 0);

  // If no data, show placeholder
  if (data.length === 0) {
    data.push({ name: 'None', value: 1, color: '#2a2a2a' });
  }

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-mono text-cyber-gray-light uppercase tracking-wider">Vulnerabilities</h4>
        <span className="text-lg font-bold font-mono text-yellow-400">{total}</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Pie Chart */}
        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #ff0040',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex-1 space-y-1">
          {[
            { label: 'Critical', value: critical, color: '#ff0040' },
            { label: 'High', value: high, color: '#fb923c' },
            { label: 'Medium', value: medium, color: '#facc15' },
            { label: 'Low', value: low, color: '#00d4ff' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] font-mono text-cyber-gray-light">{item.label}</span>
              </div>
              <span 
                className="text-xs font-mono"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CyberCard>
  );
};

export default VulnPieWidget;
