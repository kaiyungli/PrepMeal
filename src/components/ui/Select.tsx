interface SelectProps {
  label?: string;
  options: { value: string; label?: string }[];
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

const colors = {
  text: '#264653',
};

export default function Select({ 
  label, 
  options, 
  value, 
  onChange,
  style = {}
}: SelectProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '6px',
          color: colors.text
        }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '14px',
          background: 'white',
          cursor: 'pointer',
          ...style
        }}
      >
        {(options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label || opt.value}
          </option>
        ))}
      </select>
    </div>
  );
}
