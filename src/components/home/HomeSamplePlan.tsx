import Image from 'next/image';
import Link from 'next/link';
import type { SamplePlan } from '@/features/guides/samplePlan';
import { sampleDishName } from '@/features/home/samplePresentation';

type Sections = SamplePlan['sections'];

function IngredientSections({ sections }: { sections: Sections }) {
  return <div className="pm-shopping-columns">
    {sections.map(section => (
      <section className="pm-ingredient-group" key={section.key} aria-label={section.label}>
        <h4>{section.label}</h4>
        <ul>{section.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.quantityText}</strong></li>)}</ul>
      </section>
    ))}
  </div>;
}

/** Native disclosure keeps every material and quantity in server HTML. */
export default function HomeSamplePlan({ plan }: { plan?: SamplePlan | null }) {
  if (!plan) return null;
  const main = plan.sections.filter(section => !['seasoning', 'pantry'].includes(section.key));
  const extra = plan.sections.filter(section => ['seasoning', 'pantry'].includes(section.key));
  const countItems = (sections: Sections) => sections.reduce((count, section) => count + section.items.length, 0);
  const totalCount = countItems(plan.sections);
  const mainCount = countItems(main);
  const extraCount = countItems(extra);

  return (
    <section className="pm-wrap" aria-labelledby="home-sample-plan">
      <div className="pm-example">
        <div className="pm-section-head">
          <div>
            <p className="pm-eyebrow">一週餐單示範</p>
            <h2 id="home-sample-plan">一週晚餐，就咁安排。</h2>
            <p className="pm-fixed-example">{plan.servings}人・{plan.days.length}晚示範</p>
            <p>上方設定只套用你的餐單。</p>
          </div>
        </div>
        <div className="pm-example-layout">
          <div className="pm-panel">
            <div className="pm-panel-head"><h3>七晚食啲乜</h3><span className="pm-tag">{plan.days.length} 晚餐單</span></div>
            <ol className="pm-meal-list">
              {plan.days.map((day, index) => {
                const [mainDish, ...sides] = day.dishes;
                return <li className="pm-meal-row" key={day.day}>
                  <div className="pm-day" aria-label={day.day}><span aria-hidden="true">DAY</span><strong aria-hidden="true">{String(index + 1).padStart(2, '0')}</strong></div>
                  <div className="pm-meal-content">
                    {mainDish && <Link href={`/recipes/${encodeURIComponent(mainDish.slug)}`} prefetch={false} className="pm-meal-main" title={mainDish.name}>
                      {mainDish.image_url && <Image src={mainDish.image_url} alt="" width={176} height={176} sizes="88px" className="pm-meal-photo" />}
                      <span className="pm-meal-name">{sampleDishName(mainDish)}</span>
                      <span className="pm-meal-arrow" aria-hidden="true">↗</span>
                    </Link>}
                    {sides.map(dish => <Link key={dish.slug} href={`/recipes/${encodeURIComponent(dish.slug)}`} prefetch={false} className="pm-meal-side" title={dish.name}>配 {sampleDishName(dish)}</Link>)}
                  </div>
                </li>;
              })}
            </ol>
          </div>
          <div className="pm-panel">
            <div className="pm-panel-head"><h3>一張清單，合埋買。</h3><span className="pm-tag">{totalCount} 項材料</span></div>
            <p className="pm-shopping-note">主要食材 {mainCount} 項</p>
            <IngredientSections sections={main} />
            {extraCount > 0 && <details className="pm-extra-ingredients">
              <summary>
                <span className="pm-summary-closed">查看全部 {totalCount} 項材料</span>
                <span className="pm-summary-open">收起調味料及儲備材料</span>
                <span className="pm-summary-note">調味料及儲備共 {extraCount} 項，家中已有可略過。</span>
              </summary>
              <IngredientSections sections={extra} />
            </details>}
          </div>
        </div>
        <div className="pm-example-foot"><p>原食譜以 1 人份為基準；清單已換算為 {plan.servings} 人份，白飯另計。</p><Link href="/meal-plan-example">睇兩人五晚示例與買餸安排 ↗</Link></div>
        <div className="pm-example-action">
          <a href="#home-plan-form" className="pm-primary">設定我的餐單 <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </section>
  );
}
