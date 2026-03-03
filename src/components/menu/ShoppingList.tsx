interface ShoppingListProps {
  items: { name: string; count: number }[];
  servings?: number;
}

export default function ShoppingList({ items, servings = 2 }: ShoppingListProps) {
  if (!items || items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        暫時冇食材
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#264653', marginBottom: '20px' }}>
        🛒 食材清單 ({servings}人份)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#faf8f5', borderRadius: '8px' }}>
            <span style={{ color: '#264653' }}>{item.name}</span>
            <span style={{ color: '#6b7280' }}>x{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
