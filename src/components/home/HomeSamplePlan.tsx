import Image from 'next/image';
import Link from 'next/link';
import type { SamplePlan } from '@/features/guides/samplePlan';

/** All dishes and materials remain visible in server HTML; no tabs or disclosure. */
export default function HomeSamplePlan({ plan }: { plan?: SamplePlan | null }) {
  if (!plan) return null;
  return (
    <section className="pm-wrap" aria-labelledby="home-sample-plan">
      <div className="pm-example">
        <div className="pm-section-head">
          <div>
            <p className="pm-eyebrow">一週餐單示範</p>
            <h2 id="home-sample-plan">一週晚餐，就咁安排。</h2>
            <p>先睇一份 {plan.servings} 人 {plan.days.length} 晚示範，再生成你自己嘅版本。</p>
          </div>
          <a href="#home-title" className="pm-text-action">我都想安排一份 →</a>
        </div>
        <div className="pm-example-layout">
          <div className="pm-panel">
            <div className="pm-panel-head"><h3>七晚食啲乜</h3><span className="pm-tag">{plan.servings} 人 · {plan.days.length} 晚</span></div>
            <ol className="pm-meal-list">
              {plan.days.map((day, index) => (
                <li className="pm-meal-row" key={day.day}>
                  <div className="pm-day" aria-label={day.day}><span aria-hidden="true">DAY</span><strong aria-hidden="true">{String(index + 1).padStart(2, '0')}</strong></div>
                  {day.dishes[0]?.image_url && <Image src={day.dishes[0].image_url} alt="" width={106} height={106} sizes="53px" className="pm-meal-photo" />}
                  <div className="pm-meal-titles">
                    {day.dishes.map((dish, dishIndex) => <Link key={dish.slug} href={`/recipes/${encodeURIComponent(dish.slug)}`} prefetch={false} className={dishIndex ? 'pm-meal-side' : 'pm-meal-main'}>{dishIndex > 0 && '配 '}{dish.name}</Link>)}
                  </div>
                  <span className="pm-meal-arrow" aria-hidden="true">↗</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pm-panel">
            <div className="pm-panel-head"><h3>一張清單，合埋買。</h3><span className="pm-tag">{plan.itemCount} 項材料</span></div>
            <p className="pm-shopping-note">已按 {plan.servings} 人份合併；家中已有嘅材料可自行略過。</p>
            <div className="pm-shopping-columns">
              {plan.sections.map(section => (
                <section className="pm-ingredient-group" key={section.key} aria-label={section.label}>
                  <h4>{section.label}</h4>
                  <ul>{section.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.quantityText}</strong></li>)}</ul>
                </section>
              ))}
            </div>
          </div>
        </div>
        <div className="pm-example-foot"><p>編輯挑選示範 · 所有原食譜均為 1 人份，清單已換算為 {plan.servings} 人份。白飯另計。</p><Link href="/meal-plan-example">睇兩人五晚示例與買餸安排 ↗</Link></div>
      </div>
    </section>
  );
}
