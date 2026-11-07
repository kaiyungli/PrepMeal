const STEPS = [
  { number: '01', title: '揀人數，生成餐單', description: '安排 3、5 或 7 日晚餐，詳細條件喺生成頁再揀。' },
  { number: '02', title: '啱食就留，想換就換', description: '鎖定想保留嘅餸，再逐道替換其他菜式。' },
  { number: '03', title: '睇清單，去買餸', description: '按用餐人數合併材料；登入後可保存餐單同勾選已買材料。' },
];

export default function HomeHowItWorks() {
  return (
    <section className="pm-wrap" aria-labelledby="home-how-it-works">
      <div className="pm-process">
        <h2 id="home-how-it-works" className="sr-only">如何使用今晚食乜</h2>
        <ol className="pm-steps">
          {STEPS.map(step => <li className="pm-step" key={step.number}><span className="pm-step-num" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
        </ol>
      </div>
    </section>
  );
}
