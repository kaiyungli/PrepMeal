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
  style?: React.CSSProperties;
}

const colors = {
  text: '#264653',
};

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
  style = {}
}: InputProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    ...style
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '6px',
          color: colors.text
        }}>
          {label} {required && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          style={{ ...inputStyle, resize: 'vertical' }}
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
          style={inputStyle}
        />
      )}
    </div>
  );
}
