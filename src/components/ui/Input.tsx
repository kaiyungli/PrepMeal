interface InputProps {
  label?: string;
  placeholder?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'url' | 'email';
  required?: boolean;
  min?: number;
  max?: number;
  rows?: number;
  multiline?: boolean;
  className?: string;
}

export default function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  required = false,
  min,
  max,
  rows = 3,
  multiline = false,
  className = ''
}: InputProps) {
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block font-semibold mb-1.5 text-brown">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow"
          style={{ resize: 'vertical', ...inputStyle }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow"
          style={inputStyle}
        />
      )}
    </div>
  );
}
