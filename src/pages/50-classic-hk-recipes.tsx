import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

// 50 Classic HK Recipes Data
const recipes = [
  { name: '青瓜炒蛋', slug: 'cucumber-scrambled-egg', category: '蛋類' },
  { name: '豆角炒蛋', slug: 'long-bean-scrambled-egg', category: '蛋類' },
  { name: '洋蔥炒蛋', slug: 'onion-scrambled-egg', category: '蛋類' },
  { name: '番茄炒蛋', slug: 'tomato-scrambled-egg', category: '蛋類' },
  { name: '粟米蛋花湯', slug: 'corn-egg-drop-soup', category: '湯類' },
  { name: '紫菜蛋花湯', slug: 'seaweed-egg-drop-soup', category: '湯類' },
  { name: '粟米肉粒', slug: 'corn-minced-pork', category: '肉類' },
  { name: '薯仔燜牛肉', slug: 'braised-potato-beef', category: '肉類' },
  { name: '洋蔥牛腩', slug: 'onion-beef-brisket', category: '肉類' },
  { name: '咖哩牛腩飯', slug: 'curry-beef-rice', category: '飯類' },
  { name: '鮮茄豬扒飯', slug: 'tomato-pork-rice', category: '飯類' },
  { name: '粟米魚柳飯', slug: 'corn-fish-rice', category: '飯類' },
  { name: '白汁海鮮飯', slug: 'creamy-seafood-rice', category: '飯類' },
  { name: '臘味煲仔飯', slug: 'cantonese-clay-pot-rice', category: '飯類' },
  { name: '鹵水雞翼', slug: 'braised-chicken-wings', category: '雞類' },
  { name: '蜜糖雞翼', slug: 'honey-chicken-wings', category: '雞類' },
  { name: '鹽焗雞翼', slug: 'salt-baked-chicken-wings', category: '雞類' },
  { name: '咖哩雞', slug: 'curry-chicken', category: '雞類' },
  { name: '蒸滑雞', slug: 'steamed-chicken', category: '雞類' },
  { name: '香菇蒸雞', slug: 'mushroom-steamed-chicken', category: '雞類' },
  { name: '清炒菜心', slug: 'stir-fried-choi-sum', category: '蔬菜' },
  { name: '蒜蓉炒菜心', slug: 'garlic-choi-sum', category: '蔬菜' },
  { name: '蠔油西蘭花', slug: 'oyster-sauce-broccoli', category: '蔬菜' },
  { name: '上湯娃娃菜', slug: 'baby-bok-choy-soup', category: '蔬菜' },
  { name: '清炒西蘭花', slug: 'stir-fried-broccoli', category: '蔬菜' },
  { name: '涼拌青瓜', slug: 'cold-cucumber-salad', category: '涼菜' },
  { name: '涼拌木耳', slug: 'wood-ear-salad', category: '涼菜' },
  { name: '青瓜涼拌粉絲', slug: 'cucumber-glass-noodle-salad', category: '涼菜' },
  { name: '蒜蓉蒸蝦', slug: 'garlic-steamed-shrimp', category: '海鮮' },
  { name: '清蒸石斑', slug: 'steamed-fish', category: '海鮮' },
  { name: '香煎三文魚', slug: 'pan-seared-salmon', category: '海鮮' },
  { name: '薑蔥炒蟹', slug: 'ginger-scallion-crab', category: '海鮮' },
  { name: '蝦米粉絲煲', slug: 'shrimp-vermicelli-pot', category: '海鮮' },
  { name: '豆腐蒸肉餅', slug: 'tofu-steamed-pork', category: '豆腐' },
  { name: '麻婆豆腐', slug: 'mapo-tofu', category: '豆腐' },
  { name: '魚香豆腐', slug: 'yu-xiang-tofu', category: '豆腐' },
  { name: '煎釀豆腐', slug: 'stuffed-tofu', category: '豆腐' },
  { name: '蛋餅', slug: 'taiwan-egg-pancake', category: '小食' },
  { name: '港式奶茶', slug: 'hong-kong-milk-tea', category: '飲品' },
  { name: '檸檬茶', slug: 'lemon-tea', category: '飲品' },
  { name: '楊枝甘露', slug: 'mango-pomelo-soup', category: '甜品' },
  { name: '芝士蛋糕', slug: 'cheesecake', category: '甜品' },
  { name: '紅豆沙', slug: 'red-bean-soup', category: '甜品' },
  { name: '楊州炒飯', slug: 'yangzhou-fried-rice', category: '炒飯' },
  { name: '蛋炒飯', slug: 'egg-fried-rice', category: '炒飯' },
  { name: '海鮮炒飯', slug: 'seafood-fried-rice', category: '炒飯' },
  { name: '乾炒牛河', slug: 'dry-fried-beef-hor-fun', category: '粉麵' },
  { name: '星洲米粉', slug: 'singapore-noodles', category: '粉麵' },
  { name: '雲吞麵', slug: 'wonton-noodles', category: '粉麵' },
  { name: '車仔麵', slug: 'street-food-noodles', category: '粉麵' },
];

export default function FiftyClassicHKRecipes() {
  // Group recipes by category
  const categories: Record<string, typeof recipes> = {};
  for (const r of recipes) {
    const cat = r.category as string;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(r);
  }

  // JSON-LD Article Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "今晚食咩？2026香港人必備50款家常食譜",
    "description": "精選50款香港家庭必備家常食谱，包括蛋类、肉类、鸡肉、海鲜、蔬菜、豆腐等简易做法，一站式解决今晚煮咩既烦恼。",
    "author": {
      "@type": "Organization",
      "name": "今晚食乜"
    },
    "datePublished": "2026-06-23",
    "dateModified": "2026-06-23"
  };

  return (
    <Layout>
      <SEO
        title="今晚食咩？2026香港人必備50款家常食譜 | 今晚食乜"
        description="精選50款香港家庭必備家常食譜，一站式解決今晚煮咩既煩惱。從簡易炒蛋到複雜既煲仔飯，全部都有。"
        canonical="https://eatwhathk.com/50-classic-hk-recipes"
      />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3A2010] mb-6 text-center">
          今晚食咩？2026香港人必備50款家常食譜
        </h1>
        
        <p className="text-lg text-[#5A4030] mb-8 text-center">
          香港家庭必備既50款家常食譜，一站式解決今晚煮咩既煩惱！
        </p>


        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解呢50款係香港家庭必備？</h2>
          
          <p className="text-[#5A4030] mb-4">
            香港人生活繁忙，每晚放工都要諗今晚煮咩，真係頭痕既問題。
            呢50款係經過多年既生活經驗，篩選咗出黎既家常食譜，
            佢哋既共通點係：材料唔難買、做法簡單、屋企人都鍾意食。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-6">點解要識呢50款？</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>慳時間</strong> - 最快15分鐘就有得食，唔洗諗太耐</li>
            <li><strong>材料易買</strong> - 街市同超市都買到，唔洗特登去 Japan Store</li>
            <li><strong>做法簡單</strong> - 新手都做到，唔洗大廚功架</li>
            <li><strong>家人鍾意</strong> - 試過都話好味，下次又想食</li>
            <li><strong>變化多</strong> - 可以自由配搭，今日食雞翼聽日食牛肉</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">50款食譜既分類</h2>
          
          <p className="text-[#5A4030] mb-4">
            我將50款分成幾大類，方便你唔同既需要：
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">蛋類 (5款)</h3>
          <p className="text-[#5A4030] mb-2">
            蛋係香港屋企最常備既材料之一，快速又有營養。
            青瓜炒蛋、豆角炒蛋、洋蔥炒蛋、番茄炒蛋，全部都係15分鐘內做到既快手小菜。
            蛋仲可以用黎整湯，例如粟米蛋花湯、紫菜蛋花湯，簡單又暖胃。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">肉類 (5款)</h3>
          <p className="text-[#5A4030] mb-2">
            牛肉同豬肉既做法變化最多。薯仔燜牛肉、洋蔥牛腩、咖哩牛腩飯，
            全部都係送飯一流既選擇。如果想快啲，粟米肉粒15分鐘就搞掂。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">雞類 (5款)</h3>
          <p className="text-[#5A4030] mb-2">
            雞翼係屋企最受歡迎既材料之一。鹵水雞翼、蜜糖雞翼、鹽焗雞翼，
            每一款都有唔同既風味。如果想健康啲，可以揀蒸滑雞或者香菇蒸雞。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">海鮮 (5款)</h3>
          <p className="text-[#5A4030] mb-2">
            海鮮對廣東人嚟講必不可少。蒜蓉蒸蝦、清蒸石斑、香煎三文魚，
            全部都係高蛋白、低脂肪既健康選擇。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">蔬菜 (5款)</h3>
          <p className="text-[#5A4030] mb-2">
            蔬菜每日都要食。菜心、西蘭花、娃娃菜，全部都係街市就到既材料。
            簡單炒幾炒就好好味，營養又均衡。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">豆腐 (4款)</h3>
          <p className="text-[#5A4030] mb-2">
            豆腐平靚正，係屋企必備既材料。豆腐蒸肉餅、麻婆豆腐、魚香豆腐、煎釀豆腐，
            每一款都係送飯一流既選擇。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">飯類 (6款)</h3>
          <p className="text-[#5A4030] mb-2">
            餸飯合一既選擇，最啱忙碌既香港人。咖哩牛腩飯、鮮茄豬扒飯、粟米魚柳飯，
            一個飯就已經解決哂今晚既晚餐。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">炒飯 (3款)</h3>
          <p className="text-[#5A4030] mb-2">
            楊州炒飯、蛋炒飯、海鮮炒飯，係茶餐廳必叫既項目。
            但係自己屋企整既時候，要注意火候同埋鑊氣。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">粉麵 (4款)</h3>
          <p className="text-[#5A4030] mb-2">
            乾炒牛河、星洲米粉、雲吞麵、車仔麵，全部都係香港既經典。
            今晚想食啲濕濕地既嘢，粉麵就啱哂。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">湯類 (2款)</h3>
          <p className="text-[#5A4030] mb-2">
            粟米蛋花湯、紫菜蛋花湯，簡單快手既例湯。
            食飯既時候配一碗湯，既舒服又暖胃。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">涼菜 (3款)</h3>
          <p className="text-[#5A4030] mb-2">
            夏天開胃既首選。涼拌青瓜、涼拌木耳、青瓜涼拌粉絲，
            全部都係15分鐘內做到既涼菜。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">小食 (1款)</h3>
          <p className="text-[#5A4030] mb-2">
            台式蛋餅，做茶點或者宵夜都啱。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">飲品 (2款)</h3>
          <p className="text-[#5A4030] mb-2">
            港式奶茶、檸檬茶，自己屋企整既時候要注意茶既濃度同埋奶既比例。
          </p>
          
          <h3 className="text-lg font-medium text-[#3A2010] mb-2 mt-4">甜品 (3款)</h3>
          <p className="text-[#5A4030] mb-2">
            楊枝甘露、芝士蛋糕、紅豆沙，屋企慶祝既時候就可以整，
            同屋企人一齊食甜品，開心既氣氛更加濃。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">如何用呢50款建立一週晚餐？</h2>
          
          <p className="text-[#5A4030] mb-4">
            如果你每晚都要諗煮咩，可以用呢個簡單既方法：
          </p>
          
          <ul className="list-decimal pl-5 space-y-3 text-[#5A4030]">
            <li><strong>星期一</strong> - 蛋類：青瓜炒蛋（快手）</li>
            <li><strong>星期二</strong> - 肉類：咖哩牛腩飯（有肉有飯）</li>
            <li><strong>星期三</strong> - 雞類：鹽焗雞翼（屋企人都鍾意）</li>
            <li><strong>星期四</strong> - 海鮮：清蒸石斑（健康）</li>
            <li><strong>星期五</strong> - 蔬菜：蒜蓉炒菜心（均衡）</li>
            <li><strong>星期六</strong> - 炒飯：楊州炒飯（一家人開心食）</li>
            <li><strong>星期日</strong> - 粉麵：乾炒牛河（轉下口味）</li>
          </ul>
          
          <p className="text-[#5A4030] mt-4">
            咁樣安排既話，一個星期既晚餐就有哂方向，
            唔洗每晚都用腦諗今晚���咩��
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">仲想搵更多食譜？</h2>
          
          <p className="text-[#5A4030] mb-4">
            如果呢50款唔夠你既話，今晚食乜既食譜庫仲有超過180款食譜，
            你可以：
          </p>
          
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>
              <a href="/recipes" className="text-[#9B6035] underline">
                按此瀏覽完整食譜庫
              </a>
              - 超過180款食譜任你揀
            </li>
            <li>
              <a href="/generate" className="text-[#9B6035] underline">
                AI餐單生成器
              </a>
              - 一click幫你安排成個星期
            </li>
            <li>
              <a href="/ingredient-pairing-guide" className="text-[#9B6035] underline">
                食材配搭指南
              </a>
              - 教你點樣配搭材料
            </li>
            <li>
              <a href="/healthy-dinner-guide" className="text-[#9B6035] underline">
                健康晚餐指南
              </a>
              - 如果你想食得健康啲
            </li>
          </ul>
        </section>


        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">目錄</h2>
          <ul className="space-y-2">
            {Object.keys(categories).map(cat => (
              <li key={cat}>
                <a href={`#${cat}`} className="text-[#9B6035] hover:underline">
                  {cat} ({categories[cat].length}款)
                </a>
              </li>
            ))}
          </ul>
        </div>

        {Object.entries(categories).map(([category, categoryRecipes]) => (
          <section key={category} id={category} className="mb-12">
            <h2 className="text-2xl font-semibold text-[#3A2010] mb-4 border-b-2 border-[#9B6035] pb-2">
              {category}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {categoryRecipes.map((r: any) => (
                <a
                  key={r.slug}
                  href={`/recipes/${r.slug}`}
                  className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="text-[#9B6035] font-medium">{r.name}</span>
                </a>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-white rounded-xl p-6 shadow-sm mt-12">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">常見問題</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#3A2010]">呢50款食譜夠唔夠一家人用？</h3>
              <p className="text-[#5A4030]">呢50款已經涵蓋哂香港家庭最常煮既菜式，一家四口完全夠用。</p>
            </div>
            
            <div>
              <h3 className="font-medium text-[#3A2010]">新手做得啱唔啱？</h3>
              <p className="text-[#5A4030]">大部分食譜都係簡易做法，新手都可以輕鬆上手。</p>
            </div>
            
            <div>
              <h3 className="font-medium text-[#3A2010]">要幾多時間準備？</h3>
              <p className="text-[#5A4030]">快既15分鐘就得，慢既都要唔過1個鐘，方便一家人既作息。</p>
            </div>
            
            <div>
              <h3 className="font-medium text-[#3A2010]">可以點樣用今晚食乜既搜尋功能？</h3>
              <p className="text-[#5A4030]">直接係搜尋欄輸入你想要既材料，例如「雞蛋」「牛肉」，就可以搵到更多相關食譜。</p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">總結</h2>
          <p className="text-[#5A4030]">
            如果你今晚真係唔知煮咩，直接係上面既50款揀一款。
            如果你想要更多選擇，可以試下<a href="/recipes" className="text-[#9B6035] underline">今晚食乜既食譜庫</a>，
            或者用我地既<a href="/generate" className="text-[#9B6035] underline">AI餐單生成器</a>，一click就幫你安排好成個星期既晚餐！
          </p>
        </section>
      </main>
    </Layout>
  );
}
