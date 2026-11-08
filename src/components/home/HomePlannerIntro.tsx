import Image from 'next/image';
import type { SamplePlan } from '@/features/guides/samplePlan';

/** Native form submits directly to the existing generator, even before hydration. */
export default function HomePlannerIntro({ plan }: { plan?: SamplePlan | null }) {
  const dishes = plan?.days.flatMap(day => day.dishes) ?? [];
  const hero = dishes.find(dish => dish.slug === 'curry-chicken' && dish.image_url)
    ?? dishes.find(dish => dish.image_url);
  const categoryPriority: Record<string, number> = { meat: 0, vegetable: 1, tofu_egg: 2 };
  // Take one real main ingredient per category; aromatics belong in the full list.
  const ingredients = plan?.sections
    .filter(section => !['seasoning', 'pantry'].includes(section.key))
    .sort((a, b) => (categoryPriority[a.key] ?? 3) - (categoryPriority[b.key] ?? 3))
    .flatMap(section => section.items.filter(item => !/^(蒜頭|蒜蓉|蒜|薑|生薑|蔥|葱)$/.test(item.name)).slice(0, 1))
    .slice(0, 2) ?? [];

  return (
    <section className={`pm-wrap pm-hero ${hero ? '' : 'pm-hero-text-only'}`} aria-labelledby="home-title">
      <div>
        <p className="pm-eyebrow">為香港日常晚餐而設</p>
        <h1 id="home-title">今晚食乜，<br /><em>一週都諗好。</em></h1>
        <p className="pm-hero-copy"><strong>毋須登入，即可生成。</strong><br />揀人數同日數，換完菜，再跟合併清單買餸。</p>
        <form id="home-plan-form" tabIndex={-1} aria-label="一週餐單設定" aria-describedby="home-form-note" action="/generate" method="get" className="pm-starter">
          <input type="hidden" name="source" value="home" />
          <label className="pm-field"><span className="pm-field-label">幾多人食</span>
            <select name="servings" defaultValue="2" aria-label="用餐人數">
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} 人</option>)}
            </select>
          </label>
          <fieldset className="pm-field pm-days-field">
            <legend>安排幾日</legend>
            <div className="pm-segments">
              {[3, 5, 7].map(n => (
                <label key={n}>
                  <input type="radio" name="days" value={n} defaultChecked={n === 7} className="sr-only" />
                  <span>{n} 日</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="pm-primary">生成餐單 <span aria-hidden="true">→</span></button>
        </form>
        <div className="pm-starter-links">
          <p className="pm-form-note" id="home-form-note">生成後按所選人數計算材料。</p>
          <button type="submit" form="home-plan-form" name="intent" value="preferences" className="pm-textlink">加入口味偏好 →</button>
        </div>
      </div>
      {hero?.image_url && (
        <div className="pm-hero-photo">
          <Image src={hero.image_url} alt={hero.name} width={640} height={480} sizes="(max-width: 767px) calc(100vw - 42px), (max-width: 1200px) 44vw, 500px" priority className="pm-main-photo" />
          <span className="pm-image-label">有飯氣嘅家常晚餐</span>
          {ingredients.length > 0 && (
            <div className="pm-mini-list">
              <p className="pm-mini-head">示範清單節錄</p>
              <ul className="pm-mini-items">{ingredients.map(item => <li className="pm-mini-line" key={item.name}>
                <span className="pm-mini-name">{item.name}</span><strong>{item.quantityText}</strong>
              </li>)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
