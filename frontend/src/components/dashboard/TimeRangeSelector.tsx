import React from 'react';

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  const options = [
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
  ];

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-mono text-cyber-gray-light mr-2">Time:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 text-[10px] font-mono uppercase border transition-colors ${
            value === opt.value
              ? 'border-cyber-blue text-cyber-blue bg-cyber-blue/10'
              : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;
