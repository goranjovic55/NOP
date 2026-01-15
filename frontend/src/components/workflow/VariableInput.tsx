/**
 * VariableInput - Text input with variable picker and syntax highlighting
 * 
 * Features:
 * - {{ }} button to open variable picker
 * - Syntax highlighting for variable expressions
 * - Visual indicator when value contains variables
 * - Insert at cursor position
 */

import React, { useState, useRef, useCallback } from 'react';
import VariablePicker from './VariablePicker';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nodeId: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder,
  nodeId,
  className = '',
  multiline = false,
  rows = 3,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if value contains variable expressions
  const hasVariables = value?.includes('{{') && value?.includes('}}');

  // Open picker positioned near the button
  const openPicker = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + 4,
        left: Math.max(10, rect.left - 200), // Position to the left of button
      });
    }
    setShowPicker(true);
  }, []);

  // Insert variable at cursor position or append
  const handleVariableSelect = useCallback((variable: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange((value || '') + variable);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = value || '';
    
    const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end);
    onChange(newValue);

    // Restore focus and set cursor position after the inserted variable
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + variable.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // Render highlighted value for display
  const renderHighlightedValue = () => {
    if (!value) return null;
    
    const parts = value.split(/(\{\{[^}]+\}\})/g);
    return (
      <div className="absolute inset-0 pointer-events-none px-2 py-1.5 text-sm font-mono whitespace-pre-wrap overflow-hidden">
        {parts.map((part, idx) => {
          if (part.match(/^\{\{[^}]+\}\}$/)) {
            return (
              <span key={idx} className="text-cyber-purple bg-cyber-purple/20 rounded px-0.5">
                {part}
              </span>
            );
          }
          return <span key={idx} className="text-transparent">{part}</span>;
        })}
      </div>
    );
  };

  const inputClasses = `
    cyber-input w-full pr-10 font-mono text-sm
    ${hasVariables ? 'border-cyber-purple/50' : ''}
    ${className}
  `.trim();

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      {/* Highlight overlay for variables */}
      {hasVariables && !multiline && renderHighlightedValue()}
      
      {/* Actual input */}
      <InputComponent
        ref={inputRef as any}
        type={multiline ? undefined : 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        className={`${inputClasses} ${multiline ? 'resize-none' : ''}`}
        style={hasVariables && !multiline ? { 
          caretColor: 'white',
        } : undefined}
      />

      {/* Variable picker button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        className={`
          absolute right-1 ${multiline ? 'top-1' : 'top-1/2 -translate-y-1/2'}
          w-7 h-6 flex items-center justify-center
          text-xs font-mono rounded
          transition-all duration-200
          ${hasVariables 
            ? 'bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/50 hover:bg-cyber-purple/50' 
            : 'bg-cyber-gray/20 text-cyber-gray-light border border-cyber-gray/30 hover:bg-cyber-purple/20 hover:text-cyber-purple hover:border-cyber-purple/30'
          }
        `}
        title="Insert variable"
      >
        {'{ }'}
      </button>

      {/* Variable indicator badge */}
      {hasVariables && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyber-purple rounded-full flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">V</span>
        </div>
      )}

      {/* Variable Picker Modal */}
      {showPicker && (
        <VariablePicker
          nodeId={nodeId}
          onSelect={handleVariableSelect}
          onClose={() => setShowPicker(false)}
          position={pickerPosition}
        />
      )}
    </div>
  );
};

export default VariableInput;
