import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
// BG:        #F8F3E8  warm ivory cream
// SAGE:      #C8D49A  sage / olive green
// PRIMARY:   #9B6035  lighter chocolate brown
// ACCENT:    #F0A060  lighter warm orange
// FOOTER:    #2A1A08  deep dark brown

// ─── All recipe images ────────────────────────────────────────────────────────
const IMGS = {
  mapoTofu:      "https://images.unsplash.com/photo-1769065647078-f067eb768035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXBvJTIwdG9mdSUyMGNoaW5lc2UlMjBkaXNofGVufDF8fHx8MTc3MjUyNDU0OXww&ixlib=rb-4.1.0&q=80&w=800",
  tomatoEgg:     "https://images.unsplash.com/photo-1751199681810-37a8bd170c0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b21hdG8lMjBlZ2clMjBzdGlyJTIwZnJ5JTIwY2hpbmVzZXxlbnwxfHx8fDE3NzI2MDE0NDl8MA&ixlib=rb-4.1.0&q=80&w=800",
  currychicken:  "https://images.unsplash.com/photo-1762398948309-efc21c1f3764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwY3VycnklMjByaWNlJTIwYm93bHxlbnwxfHx8fDE3NzI1NDI5MjF8MA&ixlib=rb-4.1.0&q=80&w=800",
  steamedFish:   "https://images.unsplash.com/photo-1545667303-24dec1a85992?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVhbWVkJTIwZmlzaCUyMGNoaW5lc2UlMjBjYW50b25lc2UlMjBkaXNofGVufDF8fHx8MTc3MjY0MDU0OHww&ixlib=rb-4.1.0&q=80&w=800",
  braisedPork:   "https://images.unsplash.com/photo-1750595111734-1bf25aefb13f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmFpc2VkJTIwcG9yayUyMGJlbGx5JTIwaG9uZyUyMGtvbmd8ZW58MXx8fHwxNzcyNjQwNTQ4fDA&ixlib=rb-4.1.0&q=80&w=800",
  wonton:        "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b250b24lMjBub29kbGUlMjBzb3VwJTIwYm93bHxlbnwxfHx8fDE3NzI2NDA1NDl8MA&ixlib=rb-4.1.0&q=80&w=800",
  stirFry:       "https://images.unsplash.com/photo-1764850685848-2a70be195304?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGlyJTIwZnJ5JTIwY2hpbmVzZSUyMHZlZ2V0YWJsZXMlMjBicm9jY29saSUyMGJlZWZ8ZW58MXx8fHwxNzcyNjQwNTQ5fDA&ixlib=rb-4.1.0&q=80&w=800",
  friedRice:     "https://images.unsplash.com/photo-1634992186330-283b9da965a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllZCUyMHJpY2UlMjBlZ2clMjBjaGluZXNlJTIwd29rfGVufDF8fHx8MTc3MjY0MDU1MHww&ixlib=rb-4.1.0&q=80&w=800",
  steamedEgg:    "https://images.unsplash.com/photo-1653509929636-db060201d938?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVhbWVkJTIwZWdnJTIwY3VzdGFyZCUyMGNoaW5lc2UlMjB0b2Z1fGVufDF8fHx8MTc3MjY0MDU1MXww&ixlib=rb-4.1.0&q=80&w=800",
  congee:        "https://images.unsplash.com/photo-1623476663364-12de7c8b8b8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25nZWUlMjByaWNlJTIwcG9ycmlkZ2UlMjB0b3BwaW5nc3xlbnwxfHx8fDE3NzI2NDA1NTF8MA&ixlib=rb-4.1.0&q=80&w=800",
  sweetSour:     "https://images.unsplash.com/photo-1597577652129-7ffad9d37ad4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzd2VldCUyMHNvdXIlMjBwb3JrJTIwY2hpbmVzZSUyMGNyaXNweXxlbnwxfHx8fDE3NzI2NDA1NTF8MA&ixlib=rb-4.1.0&q=80&w=800",
};

// ─── Master Recipe List (loops to simulate large DB) ─────────────────────────
export type Recipe = { id: number; name: string; time: string; level: string; img: string };

const MASTER_RECIPES: Omit<Recipe, "id">[] = [
  { name: "麻婆豆腐",   time: "15 分鐘", level: "簡單", img: IMGS.mapoTofu },
  { name: "番茄炒蛋",   time: "10 分鐘", level: "超易", img: IMGS.tomatoEgg },
  { name: "咖哩雞",     time: "20 分鐘", level: "中等", img: IMGS.currychicken },
  { name: "清蒸魚",     time: "15 分鐘", level: "簡單", img: IMGS.steamedFish },
  { name: "梅菜扣肉",   time: "25 分鐘", level: "中等", img: IMGS.braisedPork },
  { name: "雲吞麵",     time: "12 分鐘", level: "超易", img: IMGS.wonton },
  { name: "西蘭花炒牛", time: "15 分鐘", level: "簡單", img: IMGS.stirFry },
  { name: "揚州炒飯",   time: "12 分鐘", level: "超易", img: IMGS.friedRice },
  { name: "蒸水蛋",     time: "10 分鐘", level: "超易", img: IMGS.steamedEgg },
  { name: "皮蛋瘦肉粥", time: "20 分鐘", level: "簡單", img: IMGS.congee },
  { name: "咕嚕肉",     time: "25 分鐘", level: "中等", img: IMGS.sweetSour },
  { name: "蒜蓉炒菜心", time: "8 分鐘",  level: "超易", img: IMGS.stirFry },
  { name: "豉汁蒸排骨", time: "20 分鐘", level: "簡單", img: IMGS.braisedPork },
  { name: "薑蔥炒蟹",   time: "18 分鐘", level: "中等", img: IMGS.steamedFish },
  { name: "鹽焗雞",     time: "30 分鐘", level: "中等", img: IMGS.currychicken },
  { name: "炸醬麵",     time: "15 分鐘", level: "簡單", img: IMGS.wonton },
  { name: "冬瓜排骨湯", time: "25 分鐘", level: "簡單", img: IMGS.congee },
  { name: "沙茶牛肉",   time: "15 分鐘", level: "簡單", img: IMGS.tomatoEgg },
  { name: "乾炒牛河",   time: "12 分鐘", level: "中等", img: IMGS.stirFry },
  { name: "紅燒豆腐",   time: "12 分鐘", level: "超易", img: IMGS.mapoTofu },
  { name: "蠔油生菜",   time: "5 分鐘",  level: "超易", img: IMGS.stirFry },
  { name: "糖醋排骨",   time: "25 分鐘", level: "中等", img: IMGS.sweetSour },
  { name: "粟米肉粒",   time: "15 分鐘", level: "簡單", img: IMGS.friedRice },
  { name: "蒸豬肉餅",   time: "18 分鐘", level: "超易", img: IMGS.steamedEgg },
];

// Assign stable IDs
export const ALL_RECIPES: Recipe[] = MASTER_RECIPES.map((r, i) => ({ ...r, id: i + 1 }));

const PAGE_SIZE = 6;

// ─── Data ────────────────────────────────────────────────────────────────────
const shoppingItems = [
  { name: "雞蛋",   qty: "x6" },
  { name: "西蘭花", qty: "x1" },
  { name: "牛肉",   qty: "300g" },
  { name: "番茄",   qty: "x4" },
];

const planItems = [
  { day: "Mon", dish: "番茄炒蛋",   done: true },
  { day: "Tue", dish: "咖哩雞",     done: true },
  { day: "Wed", dish: "西蘭花牛肉", done: false },
  { day: "Thu", dish: "照燒雞扒",   done: false },
  { day: "Fri", dish: "黑椒牛柳",   done: false },
];

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { label: "首頁", path: "/" },
    { label: "生成餐單", path: "/planner" },
    { label: "食譜", path: "#recipes" },
    { label: "價格", path: "#" },
    { label: "登入", path: "#" }
  ];

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: "#F8F3E8" }}>
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍜</span>
          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#9B6035" }}>今晚食乜</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.path.startsWith("#") ? (
              <a
                key={link.label}
                href={link.path}
                className="transition-colors"
                style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#AA7A50" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#9B6035")}
                onMouseLeave={e => (e.currentTarget.style.color = "#AA7A50")}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.path}
                className="transition-colors"
                style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#AA7A50" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#9B6035")}
                onMouseLeave={e => (e.currentTarget.style.color = "#AA7A50")}
              >
                {link.label}
              </Link>
            )
          ))}
          <button
            className="text-white px-5 py-2 rounded-lg shadow-md"
            style={{ backgroundColor: "#9B6035", fontSize: "0.9375rem", fontWeight: 700 }}
          >
            開始規劃
          </button>
        </nav>
        <button className="md:hidden p-2" style={{ color: "#9B6035" }} onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t px-4 pb-4" style={{ backgroundColor: "#F8F3E8", borderColor: "#DDD0B0" }}>
          {navLinks.map((link) => (
            link.path.startsWith("#") ? (
              <a key={link.label} href={link.path} className="block py-3 border-b" style={{ fontWeight: 600, color: "#AA7A50", borderColor: "#DDD0B0" }}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={link.path} className="block py-3 border-b" style={{ fontWeight: 600, color: "#AA7A50", borderColor: "#DDD0B0" }}>
                {link.label}
              </Link>
            )
          ))}
          <button className="mt-4 w-full text-white py-3 rounded-lg" style={{ backgroundColor: "#9B6035", fontWeight: 700 }}>
            開始規劃
          </button>
        </div>
      )}
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-12 pb-20 overflow-hidden relative" style={{ backgroundColor: "#F8F3E8" }}>
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none opacity-60" style={{ backgroundColor: "#C8D49A" }} />
      <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full pointer-events-none opacity-40" style={{ backgroundColor: "#E8C87A" }} />
      <div className="max-w-[1200px] mx-auto px-4 relative z-10">
        <div className="grid grid-cols-12 gap-8 items-center mb-10">
          <div className="col-span-12 md:col-span-6">
            <h1
              style={{
                fontSize: "clamp(4rem, 10vw, 9rem)",
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "#3A2010",
                marginBottom: "2rem",
              }}
            >
              今晚
              <br />
              食乜
            </h1>
            <button
              className="px-12 py-4 rounded-full transition-all shadow-2xl hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#9B6035", color: "#FFFFFF", fontWeight: 800, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              生成食譜
            </button>
          </div>
          <div className="col-span-12 md:col-span-6 flex justify-center md:justify-end">
            <HeroCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HeroCard ────────────────────────────────────────────────────────────────
function HeroCard() {
  return (
    <div
      className="relative w-full rounded-2xl p-6 border-2"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#DDD0B0", boxShadow: "0 20px 60px rgba(155,96,53,0.14)", maxWidth: "520px" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C0A080" }}>本週計劃</p>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#9B6035" }}>WEEKLY PLAN</h3>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: "#9B6035" }}>
          <span style={{ fontSize: "1rem" }}>🍜</span>
        </div>
      </div>
      <div className="flex gap-4">
        {/* 本週餐單 */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#9B6035", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>📅 本週餐單</p>
          <div className="space-y-2">
            {planItems.map((item) => (
              <div
                key={item.day}
                className="flex items-center gap-2 p-2 rounded-xl border"
                style={item.done
                  ? { backgroundColor: "rgba(200,212,154,0.30)", borderColor: "rgba(155,96,53,0.22)" }
                  : { backgroundColor: "#faf7f0", borderColor: "#DDD0B0" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: item.done ? "#9B6035" : "#DDD0B0", fontSize: "0.65rem", fontWeight: 800, color: item.done ? "#fff" : "#AA8060" }}
                >
                  {item.day}
                </div>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: item.done ? "#2A1A08" : "#AA8060", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.dish}
                </span>
                {item.done && <span style={{ fontSize: "0.875rem", color: "#9B6035", flexShrink: 0 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: "#DDD0B0" }} />
        {/* 購物清單 */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#9B6035", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>🛒 購物清單</p>
          <div className="space-y-2">
            {shoppingItems.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl px-3 py-2 border"
                style={{ backgroundColor: "rgba(240,160,96,0.12)", borderColor: "rgba(240,160,96,0.38)" }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#7A5A38" }}>{item.name}</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#F0A060" }}>{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="absolute -top-4 -right-4 text-white rounded-xl px-4 py-2 shadow-lg border-2 border-white rotate-6"
        style={{ backgroundColor: "#F0A060" }}
      >
        <p style={{ fontSize: "0.75rem", fontWeight: 800 }}>✓ 已生成</p>
      </div>
    </div>
  );
}

// ─── Recipe Card ─────────────────────────────────────────────────────────────
function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group overflow-hidden rounded-2xl border-2 transition-all h-full flex flex-col block"
      style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "#9B6035";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 20px 40px rgba(155,96,53,0.16)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "#DDD0B0";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "";
      }}
    >
      <div className="relative overflow-hidden h-48 shrink-0">
        <img src={recipe.img} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 right-3 rounded-lg px-3 py-1 shadow-lg" style={{ backgroundColor: "#C8D49A" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#3A2010" }}>{recipe.level}</span>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#3A2010", marginBottom: "0.75rem" }}>{recipe.name}</h3>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#C0A080" }}>⏱ {recipe.time}</span>
          <span className="text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#9B6035", fontSize: "0.8125rem", fontWeight: 700 }}>
            查看 →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 animate-pulse" style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}>
      <div className="h-48" style={{ backgroundColor: "#E8E0D0" }} />
      <div className="p-6 space-y-3">
        <div className="h-5 rounded-lg w-3/4" style={{ backgroundColor: "#E8E0D0" }} />
        <div className="h-4 rounded-lg w-1/2" style={{ backgroundColor: "#EDE8DF" }} />
      </div>
    </div>
  );
}

// ─── Recipe Library with Infinite Scroll ─────────────────────────────────────
function RecipeLibrary() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filters = ["全部", "超易", "簡單", "中等", "15分鐘內", "20分鐘內"];

  const filteredRecipes = ALL_RECIPES.filter((recipe) => {
    if (activeFilter === "全部") return true;
    if (["超易", "簡單", "中等"].includes(activeFilter)) return recipe.level === activeFilter;
    if (activeFilter === "15分鐘內") return parseInt(recipe.time) <= 15;
    if (activeFilter === "20分鐘內") return parseInt(recipe.time) <= 20;
    return true;
  });

  const visibleRecipes = filteredRecipes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRecipes.length;

  // Reset when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter]);

  // Intersection Observer: load more when sentinel enters viewport
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    // Simulate async fetch delay
    setTimeout(() => {
      setVisibleCount(prev => prev + PAGE_SIZE);
      setLoading(false);
    }, 600);
  }, [loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <section id="recipes" className="py-24" style={{ backgroundColor: "#F8F3E8" }}>
      <div className="max-w-[1200px] mx-auto px-4">

        {/* Circular Badges — clean row */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-20">
          {[
            { icon: "🍲", label: "慳時間" },
            { icon: "🥢", label: "易煮" },
            { icon: "⭐", label: "CHEF'S PICK" },
            { icon: "🥗", label: "健康" },
            { icon: "🌱", label: "素食選擇" },
          ].map((badge, idx) => (
            <div
              key={idx}
              className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-2"
              style={{ backgroundColor: "#F0A060", borderColor: "#E08840" }}
            >
              <span className="text-3xl mb-1">{badge.icon}</span>
              <p className="text-center px-2" style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>
                {badge.label}
              </p>
            </div>
          ))}
        </div>

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-4">
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#F0A060", marginBottom: "0.75rem" }}>
              ⭐ 食譜庫
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 900, color: "#3A2010" }}>
              食譜
            </h2>
          </div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#C0A080" }}>
            顯示 {visibleRecipes.length} / {filteredRecipes.length} 款食譜
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="px-5 py-2 rounded-lg border-2 transition-all"
              style={
                activeFilter === filter
                  ? { backgroundColor: "#9B6035", color: "#fff", borderColor: "#9B6035" }
                  : { backgroundColor: "#fff", color: "#AA7A50", borderColor: "#DDD0B0" }
              }
              onMouseEnter={e => { if (activeFilter !== filter) e.currentTarget.style.borderColor = "#9B6035"; }}
              onMouseLeave={e => { if (activeFilter !== filter) e.currentTarget.style.borderColor = "#DDD0B0"; }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{filter}</span>
            </button>
          ))}
        </div>

        {/* Recipe Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#C0A080" }}>😕 暫時冇符合條件嘅食譜</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-x-6 gap-y-8">
              {visibleRecipes.map((recipe) => (
                <div key={recipe.id} className="col-span-12 sm:col-span-6 md:col-span-4">
                  <RecipeCard recipe={recipe} />
                </div>
              ))}

              {/* Skeleton placeholders while loading */}
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={`sk-${i}`} className="col-span-12 sm:col-span-6 md:col-span-4">
                  <SkeletonCard />
                </div>
              ))}
            </div>

            {/* Sentinel: invisible trigger element */}
            <div ref={sentinelRef} className="h-4 mt-8" />

            {/* End-of-list message */}
            {!hasMore && !loading && (
              <div className="text-center mt-10 py-8 border-t-2" style={{ borderColor: "#DDD0B0" }}>
                <p style={{ fontSize: "1rem", fontWeight: 700, color: "#C0A080" }}>
                  🎉 已顯示全部 {filteredRecipes.length} 款食譜！
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 overflow-hidden relative" style={{ backgroundColor: "#C8D49A" }}>
      <div className="absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30" style={{ backgroundColor: "#9B6035" }} />
      <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: "#E8C87A" }} />
      <div className="max-w-[1200px] mx-auto px-4 relative z-10">
        <div className="grid grid-cols-12">
          <div className="col-span-12 md:col-span-8 md:col-start-3 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 mb-6"
              style={{ backgroundColor: "#F0A060", color: "#fff", fontWeight: 800, fontSize: "0.875rem" }}
            >
              <span>🔥</span><span>限時免費</span>
            </div>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, lineHeight: 1.2, color: "#2A1A08", marginBottom: "1.5rem" }}>
              今晚開始<br />唔使再煩惱晚餐
            </h2>
            <p className="mx-auto mb-10" style={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "480px", fontWeight: 500, color: "#4A3018" }}>
              加入超過 2,400 位香港用戶，一齊享受輕鬆規劃飲食嘅生活。
            </p>
            <button
              className="text-white px-10 py-4 rounded-lg transition-all active:scale-95 hover:scale-105"
              style={{ backgroundColor: "#9B6035", fontWeight: 800, fontSize: "1.125rem", boxShadow: "0 20px 40px rgba(155,96,53,0.32)" }}
            >
              立即免費試用 →
            </button>
            <p className="mt-6" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#4A3018" }}>
              ✓ 無需信用卡 ✓ 即開即用 ✓ 隨時取消
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const links = [
    { label: "關於我哋", href: "#" },
    { label: "聯絡我哋", href: "#" },
    { label: "隱私政策", href: "#" },
    { label: "使用條款", href: "#" },
  ];

  return (
    <footer className="py-12 border-t-4" style={{ backgroundColor: "#2A1A08", borderColor: "#9B6035" }}>
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-12 gap-x-6 mb-8">
          <div className="col-span-12 md:col-span-4 mb-8 md:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍜</span>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F0A060" }}>今晚食乜</span>
            </div>
            <p className="text-stone-400" style={{ fontSize: "0.9375rem", lineHeight: 1.7, maxWidth: "280px", fontWeight: 500 }}>
              幫你輕鬆規劃每週晚餐，令生活更有條理。
            </p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-stone-400 transition-colors"
                  style={{ fontSize: "0.9375rem", fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F0A060")}
                  onMouseLeave={e => (e.currentTarget.style.color = "")}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: "#4A2A10" }}>
          <p className="text-stone-500" style={{ fontSize: "0.875rem", fontWeight: 600 }}>© 2026 今晚食乜. All rights reserved.</p>
          <p className="text-stone-500" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Made with ❤️ in Hong Kong</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Home Page ───────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F3E8" }}>
      <Header />
      <main>
        <Hero />
        <RecipeLibrary />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}