import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface WeeklyMenuProps {
  menu: { day: string; recipe: any }[];
  onRegenerateDay?: (index: number) => void;
}

export default function WeeklyMenu({ menu, onRegenerateDay }: WeeklyMenuProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
      {menu.map((item, index) => (
        <div key={index} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ height: '120px', background: item.recipe?.image_url ? `url(${item.recipe.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!item.recipe?.image_url && <span style={{ fontSize: '40px' }}>🍳</span>}
          </div>
          <div style={{ padding: '16px' }}>
            <span style={{ background: '#264653', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>{item.day}</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#264653', margin: '12px 0 8px' }}>{item.recipe?.name || '未設定'}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              {item.recipe?.cooking_time}分鐘 · {item.recipe?.difficulty} · {item.recipe?.calories} kcal
            </p>
            {onRegenerateDay && (
              <Button size="sm" variant="secondary" onClick={() => onRegenerateDay(index)} style={{ marginTop: '12px', width: '100%' }}>
                🔄 轉另一款
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
