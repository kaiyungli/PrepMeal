import Link from 'next/link';

const GUIDES = [
  { href: '/30-minute-dinner-recipes', category: 'COOK', title: '放工後嘅快手菜', description: '由備料同煮法出發，揀適合今晚嘅晚餐。' },
  { href: '/hong-kong-market-shopping-guide', category: 'SHOP', title: '一週買餸點安排？', description: '分清耐放同鮮貨，買餸有個次序。' },
  { href: '/ingredient-pairing-guide', category: 'PLAN', title: '有材料，點配餸？', description: '由主要材料出發，搵合適嘅主菜同配菜。' },
];

export default function HomeGuides() {
  return (
    <section className="pm-wrap" aria-labelledby="home-guides">
      <div className="pm-guides">
        <h2 id="home-guides" className="pm-guide-title">由諗餸到買餸，都有啲小貼士。</h2>
        <div className="pm-guide-grid">{GUIDES.map(guide => <Link href={guide.href} key={guide.href} className="pm-guide"><span className="pm-category">{guide.category}</span><h3>{guide.title} <span aria-hidden="true">↗</span></h3><p>{guide.description}</p></Link>)}</div>
      </div>
    </section>
  );
}
