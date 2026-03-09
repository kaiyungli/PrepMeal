import { useParams, Link, useNavigate } from "react-router";
import { ALL_RECIPES } from "./Home";
import { ChevronLeft, Clock, ChefHat, Users, Flame } from "lucide-react";

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipe = ALL_RECIPES.find((r) => r.id === Number(id));

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F3E8" }}>
        <div className="text-center">
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#9B6035", marginBottom: "1rem" }}>
            😕 食譜搵唔到
          </h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg"
            style={{ backgroundColor: "#9B6035", fontWeight: 700 }}
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  // Mock recipe details data
  const recipeDetails = {
    description: "經典粵菜，味道鮮美，製作簡單，適合家庭日常烹飪。",
    servings: 2,
    calories: 350,
    ingredients: [
      { item: "主材料", qty: "300g", category: "main" },
      { item: "調味料A", qty: "2湯匙", category: "seasoning" },
      { item: "調味料B", qty: "1茶匙", category: "seasoning" },
      { item: "蔥花", qty: "適量", category: "garnish" },
      { item: "薑片", qty: "3片", category: "garnish" },
    ],
    steps: [
      "準備所有食材，清洗乾淨，切好備用。",
      "熱鍋下油，爆香薑片同蔥白。",
      "加入主材料，大火快炒至半熟。",
      "加入調味料，繼續翻炒均勻。",
      "最後加入蔥花，炒勻即可上碟。",
    ],
    tips: [
      "火候要控制好，唔好炒得太老",
      "調味料可以根據個人口味調整",
      "配白飯食最好味",
    ],
  };

  // Get 3 related recipes (exclude current)
  const relatedRecipes = ALL_RECIPES.filter((r) => r.id !== recipe.id).slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F3E8" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2" style={{ backgroundColor: "#F8F3E8", borderColor: "#DDD0B0" }}>
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 transition-colors"
            style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#AA7A50" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#9B6035")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#AA7A50")}
          >
            <ChevronLeft className="w-5 h-5" />
            返回
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍜</span>
            <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#9B6035" }}>
              今晚食乜
            </span>
          </Link>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative h-[400px] overflow-hidden">
        <img
          src={recipe.img}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-[1200px] mx-auto px-4 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="rounded-lg px-4 py-2 shadow-lg"
                style={{ backgroundColor: "#C8D49A" }}
              >
                <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#3A2010" }}>
                  {recipe.level}
                </span>
              </div>
              <div
                className="rounded-lg px-4 py-2 shadow-lg"
                style={{ backgroundColor: "#F0A060" }}
              >
                <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#fff" }}>
                  ⏱ {recipe.time}
                </span>
              </div>
            </div>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 900,
                color: "#fff",
                textShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              {recipe.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 py-12">
        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Description Card */}
            <div
              className="rounded-2xl p-6 border-2"
              style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}
            >
              <p
                style={{
                  fontSize: "1.0625rem",
                  lineHeight: 1.8,
                  color: "#4A3018",
                  fontWeight: 500,
                }}
              >
                {recipeDetails.description}
              </p>
              <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t" style={{ borderColor: "#DDD0B0" }}>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: "#9B6035" }} />
                  <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#3A2010" }}>
                    {recipeDetails.servings} 人份
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: "#9B6035" }} />
                  <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#3A2010" }}>
                    {recipe.time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5" style={{ color: "#9B6035" }} />
                  <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#3A2010" }}>
                    {recipeDetails.calories} 卡路里
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5" style={{ color: "#9B6035" }} />
                  <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#3A2010" }}>
                    難度: {recipe.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div
              className="rounded-2xl p-6 border-2"
              style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}
            >
              <h2
                className="flex items-center gap-2 mb-6"
                style={{ fontSize: "1.5rem", fontWeight: 900, color: "#3A2010" }}
              >
                <span>🥘</span> 材料清單
              </h2>
              <div className="space-y-3">
                {recipeDetails.ingredients.map((ingredient, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-xl border-2"
                    style={{ backgroundColor: "#FEFCF8", borderColor: "#DDD0B0" }}
                  >
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#3A2010" }}>
                      {ingredient.item}
                    </span>
                    <span
                      className="px-3 py-1 rounded-lg"
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 800,
                        backgroundColor: "#F0A060",
                        color: "#fff",
                      }}
                    >
                      {ingredient.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div
              className="rounded-2xl p-6 border-2"
              style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}
            >
              <h2
                className="flex items-center gap-2 mb-6"
                style={{ fontSize: "1.5rem", fontWeight: 900, color: "#3A2010" }}
              >
                <span>👨‍🍳</span> 烹飪步驟
              </h2>
              <div className="space-y-4">
                {recipeDetails.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#9B6035", color: "#fff", fontWeight: 800 }}
                    >
                      {idx + 1}
                    </div>
                    <p
                      className="flex-1 pt-2"
                      style={{
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        color: "#4A3018",
                        fontWeight: 500,
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div
              className="rounded-2xl p-6 border-2"
              style={{ backgroundColor: "#FFF9E6", borderColor: "#F0A060" }}
            >
              <h2
                className="flex items-center gap-2 mb-4"
                style={{ fontSize: "1.25rem", fontWeight: 900, color: "#9B6035" }}
              >
                <span>💡</span> 小貼士
              </h2>
              <ul className="space-y-2">
                {recipeDetails.tips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2"
                    style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "#4A3018", fontWeight: 500 }}
                  >
                    <span style={{ color: "#F0A060", fontWeight: 800 }}>•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Action Card */}
              <div
                className="rounded-2xl p-6 border-2"
                style={{ backgroundColor: "#C8D49A", borderColor: "#9B6035" }}
              >
                <h3
                  className="mb-4"
                  style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2A1A08" }}
                >
                  準備好未？
                </h3>
                <button
                  className="w-full text-white py-3 rounded-lg mb-3 transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#9B6035", fontWeight: 800, fontSize: "1rem" }}
                >
                  加入本週餐單
                </button>
                <button
                  className="w-full py-3 rounded-lg border-2 transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "#fff",
                    borderColor: "#9B6035",
                    color: "#9B6035",
                    fontWeight: 800,
                    fontSize: "1rem",
                  }}
                >
                  加入購物清單
                </button>
              </div>

              {/* Related Recipes */}
              <div
                className="rounded-2xl p-6 border-2"
                style={{ backgroundColor: "#fff", borderColor: "#DDD0B0" }}
              >
                <h3
                  className="mb-4"
                  style={{ fontSize: "1.125rem", fontWeight: 900, color: "#3A2010" }}
                >
                  相關食譜
                </h3>
                <div className="space-y-4">
                  {relatedRecipes.map((relatedRecipe) => (
                    <Link
                      key={relatedRecipe.id}
                      to={`/recipe/${relatedRecipe.id}`}
                      className="block group"
                    >
                      <div className="flex gap-3 p-3 rounded-xl border-2 transition-all" style={{ borderColor: "#DDD0B0" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#9B6035";
                          e.currentTarget.style.backgroundColor = "#FEFCF8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#DDD0B0";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        <img
                          src={relatedRecipe.img}
                          alt={relatedRecipe.name}
                          className="w-20 h-20 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4
                            className="mb-1"
                            style={{
                              fontSize: "0.9375rem",
                              fontWeight: 800,
                              color: "#3A2010",
                            }}
                          >
                            {relatedRecipe.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: "#C8D49A",
                                fontSize: "0.6875rem",
                                fontWeight: 800,
                                color: "#3A2010",
                              }}
                            >
                              {relatedRecipe.level}
                            </span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0A080" }}>
                              ⏱ {relatedRecipe.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t-4 mt-20" style={{ backgroundColor: "#2A1A08", borderColor: "#9B6035" }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-2xl">🍜</span>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#F0A060" }}>
                今晚食乜
              </span>
            </Link>
            <p className="text-stone-400" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              © 2026 今晚食乜. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
