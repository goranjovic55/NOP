import React from 'react';
import { CyberCard } from '../CyberUI';

interface AlertSummaryWidgetProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
  onClick?: () => void;
}

const AlertSummaryWidget: React.FC<AlertSummaryWidgetProps> = ({
  critical,
  high,
  medium,
  low,
  info,
  total,
  onClick
}) => {
  const alerts = [
    { label: 'CRIT', count: critical, color: 'bg-cyber-red', textColor: 'text-cyber-red' },
    { label: 'HIGH', count: high, color: 'bg-orange-500', textColor: 'text-orange-500' },
    { label: 'MED', count: medium, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
    { label: 'LOW', count: low, color: 'bg-cyber-blue', textColor: 'text-cyber-blue' },
    { label: 'INFO', count: info, color: 'bg-cyber-gray', textColor: 'text-cyber-gray-light' },
  ];

  const maxCount = Math.max(...alerts.map(a => a.count), 1);

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-mono text-cyber-gray-light uppercase tracking-wider">Alerts</h4>
        <span className="text-lg font-bold font-mono text-cyber-red">{total}</span>
      </div>
      <div className="space-y-1">
        {alerts.map((alert) => (
          <div key={alert.label} className="flex items-center gap-2">
            <span className={`text-[10px] font-mono w-8 ${alert.textColor}`}>{alert.label}</span>
            <div className="flex-1 h-2 bg-cyber-dark rounded-sm overflow-hidden">
              <div 
                className={`h-full ${alert.color} transition-all duration-500`}
                style={{ width: `${(alert.count / maxCount) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-mono w-6 text-right ${alert.textColor}`}>{alert.count}</span>
          </div>
        ))}
      </div>
    </CyberCard>
  );
};

export default AlertSummaryWidget;
