import { useState } from "react";
import { Link } from "react-router";
import { ALL_RECIPES, Recipe } from "./Home";
import { X, Calendar as CalendarIcon, Sparkles, Filter, Trash2, Plus } from "lucide-react";

const DAYS = [
  { key: "mon", label: "星期一", short: "一", date: "3月3日" },
  { key: "tue", label: "星期二", short: "二", date: "3月4日" },
  { key: "wed", label: "星期三", short: "三", date: "3月5日" },
  { key: "thu", label: "星期四", short: "四", date: "3月6日" },
  { key: "fri", label: "星期五", short: "五", date: "3月7日" },
  { key: "sat", label: "星期六", short: "六", date: "3月8日" },
  { key: "sun", label: "星期日", short: "日", date: "3月9日" },
];

type MealPlan = {
  [key: string]: Recipe[];
};

type FilterOptions = {
  level: string[];
  time: string[];
};

const LEVELS = ["超易", "簡單", "中等"];
const TIME_RANGES = [
  { label: "10分鐘內", max: 10 },
  { label: "10-20分鐘", min: 10, max: 20 },
  { label: "20分鐘以上", min: 20 },
];

// ─── Recipe Card for Modal ─────────────────────────────────────────────────
function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 cursor-pointer"
      style={{ backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      <img src={recipe.img} alt={recipe.name} className="w-full h-32 object-cover" />
      <div className="p-3">
        <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#3A2010", marginBottom: "0.375rem" }}>
          {recipe.name}
        </h4>
        <div className="flex items-center justify-between">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: "#E5DCC8", color: "#3A2010" }}
          >
            {recipe.level}
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0A080" }}>⏱ {recipe.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Item in Day Card ───────────────────────────────────────────────
function RecipeItem({ recipe, onRemove }: { recipe: Recipe; onRemove: () => void }) {
  return (
    <div
      className="rounded-xl overflow-hidden group"
      style={{ backgroundColor: "#fff", border: "2px solid #E5DCC8" }}
    >
      <div className="relative">
        <img src={recipe.img} alt={recipe.name} className="w-full h-32 object-cover" />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          style={{ backgroundColor: "rgba(211,47,47,0.95)" }}
        >
          <Trash2 className="w-4 h-4" style={{ color: "#fff" }} />
        </button>
      </div>
      <div className="p-3">
        <Link to={`/recipe/${recipe.id}`}>
          <h4
            className="hover:underline mb-2"
            style={{ fontSize: "0.875rem", fontWeight: 800, color: "#3A2010" }}
          >
            {recipe.name}
          </h4>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: "#FFF8E7", fontSize: "0.75rem", fontWeight: 700, color: "#9B6035" }}
          >
            {recipe.level}
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0A080" }}>⏱ {recipe.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Day Card Component ────────────────────────────────────────────────────
function DayCard({
  day,
  recipes,
  onAddRecipe,
  onRemoveRecipe,
}: {
  day: typeof DAYS[number];
  recipes: Recipe[];
  onAddRecipe: () => void;
  onRemoveRecipe: (index: number) => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#fff", border: "3px solid #E5DCC8", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
    >
      {/* Day Header */}
      <div className="p-4 pb-3" style={{ backgroundColor: "#FFF8E7" }}>
        <div className="flex items-center justify-between mb-1">
          <h3 style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2A1A08" }}>
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">週{day.short}</span>
          </h3>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0A080" }}>{day.date}</span>
        </div>
        {recipes.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#9B6035" }}></div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9B6035" }}>
              {recipes.length} 個菜
            </span>
          </div>
        )}
      </div>

      {/* Recipe List */}
      <div className="p-3 space-y-2">
        {recipes.map((recipe, index) => (
          <RecipeItem key={`${recipe.id}-${index}`} recipe={recipe} onRemove={() => onRemoveRecipe(index)} />
        ))}

        {/* Add Button */}
        <button
          onClick={onAddRecipe}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl transition-all hover:bg-opacity-80 active:scale-95"
          style={{ backgroundColor: "rgba(155,96,53,0.1)", border: "2px dashed #E5DCC8" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#9B6035" }}
          >
            <Plus className="w-5 h-5" style={{ color: "#fff" }} />
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#9B6035" }}>
            {recipes.length === 0 ? "添加食譜" : "再加一個"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MealPlanner() {
  const initMealPlan = (): MealPlan => {
    const plan: MealPlan = {};
    DAYS.forEach((day) => {
      plan[day.key] = [];
    });
    return plan;
  };

  const [mealPlan, setMealPlan] = useState<MealPlan>(initMealPlan());
  const [showRecipeList, setShowRecipeList] = useState(false);
  const [targetDay, setTargetDay] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    level: [],
    time: [],
  });

  const handleAddRecipe = (day: string) => {
    setTargetDay(day);
    setShowRecipeList(true);
  };

  const handleRemoveRecipe = (day: string, index: number) => {
    setMealPlan((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const handleRecipeSelectFromList = (recipe: Recipe) => {
    if (targetDay) {
      setMealPlan((prev) => ({
        ...prev,
        [targetDay]: [...prev[targetDay], recipe],
      }));
      setShowRecipeList(false);
      setTargetDay(null);
    }
  };

  const handleGenerateRandom = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newPlan = initMealPlan();
      DAYS.forEach((day) => {
        // Each day gets 1-3 random recipes
        const numRecipes = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numRecipes; i++) {
          const randomRecipe = ALL_RECIPES[Math.floor(Math.random() * ALL_RECIPES.length)];
          newPlan[day.key].push(randomRecipe);
        }
      });
      setMealPlan(newPlan);
      setIsGenerating(false);
    }, 1000);
  };

  const handleClearAll = () => {
    setMealPlan(initMealPlan());
  };

  // Filter logic
  const toggleLevelFilter = (level: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      level: prev.level.includes(level) ? prev.level.filter((l) => l !== level) : [...prev.level, level],
    }));
  };

  const toggleTimeFilter = (timeLabel: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      time: prev.time.includes(timeLabel) ? prev.time.filter((t) => t !== timeLabel) : [...prev.time, timeLabel],
    }));
  };

  const clearFilters = () => {
    setFilterOptions({ level: [], time: [] });
  };

  const hasActiveFilters = filterOptions.level.length > 0 || filterOptions.time.length > 0;

  const filteredRecipes = ALL_RECIPES.filter((recipe) => {
    // Level filter
    if (filterOptions.level.length > 0 && !filterOptions.level.includes(recipe.level)) {
      return false;
    }

    // Time filter
    if (filterOptions.time.length > 0) {
      const timeMatch = filterOptions.time.some((timeLabel) => {
        const range = TIME_RANGES.find((r) => r.label === timeLabel);
        if (!range) return false;

        const recipeTime = parseInt(recipe.time);
        if (range.max !== undefined && range.min !== undefined) {
          return recipeTime >= range.min && recipeTime <= range.max;
        } else if (range.max !== undefined) {
          return recipeTime <= range.max;
        } else if (range.min !== undefined) {
          return recipeTime >= range.min;
        }
        return false;
      });
      if (!timeMatch) return false;
    }

    return true;
  });

  const totalRecipes = DAYS.reduce((count, day) => {
    return count + mealPlan[day.key].length;
  }, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F3E8" }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: "#F8F3E8", borderBottom: "2px solid #E5DCC8" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link to="/">
                <h1
                  className="hover:opacity-80 transition-opacity"
                  style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2A1A08" }}
                >
                  粵菜餐單規劃
                </h1>
              </Link>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#C0A080", marginTop: "0.25rem" }}>
                規劃你嘅一週美食
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                disabled={totalRecipes === 0}
                className="px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#fff",
                  border: "2px solid #E5DCC8",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#9B6035",
                }}
              >
                清空
              </button>
              <button
                onClick={handleGenerateRandom}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                style={{ backgroundColor: "#9B6035", color: "#fff", fontSize: "0.875rem", fontWeight: 700 }}
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "生成中..." : "隨機生成"}
              </button>
            </div>
          </div>

          {/* Stats */}
          {totalRecipes > 0 && (
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(155,96,53,0.1)" }}
              >
                <CalendarIcon className="w-4 h-4" style={{ color: "#9B6035" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#9B6035" }}>
                  已規劃 {totalRecipes} 個菜
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((day) => (
            <DayCard
              key={day.key}
              day={day}
              recipes={mealPlan[day.key]}
              onAddRecipe={() => handleAddRecipe(day.key)}
              onRemoveRecipe={(index) => handleRemoveRecipe(day.key, index)}
            />
          ))}
        </div>
      </div>

      {/* Recipe List Modal */}
      {showRecipeList && targetDay && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(42,26,8,0.6)" }}
          onClick={() => {
            setShowRecipeList(false);
            setTargetDay(null);
          }}
        >
          <div
            className="w-full max-w-4xl rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ backgroundColor: "#F8F3E8", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 p-6 pb-4 flex items-center justify-between"
              style={{ backgroundColor: "#C8D49A" }}
            >
              <div className="flex items-center gap-3">
                <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2A1A08" }}>選擇食譜</h3>
                <span
                  className="px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: "#9B6035",
                  }}
                >
                  {DAYS.find((d) => d.key === targetDay)?.label}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowRecipeList(false);
                  setTargetDay(null);
                }}
                className="p-2 rounded-full transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
              >
                <X className="w-5 h-5" style={{ color: "#3A2010" }} />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
              {/* Filter Section */}
              <div className="px-6 pt-2 pb-4">
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "2px solid #DDD0B0" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" style={{ color: "#9B6035" }} />
                      <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#3A2010" }}>篩選</span>
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-2 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: "#FFE5E5",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: "#D32F2F",
                        }}
                      >
                        清除
                      </button>
                    )}
                    <span className="ml-auto" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0A080" }}>
                      {filteredRecipes.length} 款
                    </span>
                  </div>

                  {/* Level Filter */}
                  <div className="mb-3">
                    <p className="mb-2" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3A2010" }}>
                      難度
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => toggleLevelFilter(level)}
                          className="px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: filterOptions.level.includes(level) ? "#9B6035" : "#fff",
                            color: filterOptions.level.includes(level) ? "#fff" : "#3A2010",
                            border: filterOptions.level.includes(level) ? "2px solid #9B6035" : "2px solid #DDD0B0",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Filter */}
                  <div>
                    <p className="mb-2" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3A2010" }}>
                      烹調時間
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TIME_RANGES.map((range) => (
                        <button
                          key={range.label}
                          onClick={() => toggleTimeFilter(range.label)}
                          className="px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: filterOptions.time.includes(range.label) ? "#F0A060" : "#fff",
                            color: filterOptions.time.includes(range.label) ? "#fff" : "#3A2010",
                            border: filterOptions.time.includes(range.label)
                              ? "2px solid #F0A060"
                              : "2px solid #DDD0B0",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipe Grid */}
              <div className="px-6 pb-6">
                {filteredRecipes.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} onClick={() => handleRecipeSelectFromList(recipe)} />
                    ))}
                  </div>
                ) : (
                  <div
                    className="text-center py-8 rounded-2xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "2px dashed #E5DCC8" }}
                  >
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: "#E5DCC8" }}
                    >
                      <Filter className="w-8 h-8" style={{ color: "#C0A080" }} />
                    </div>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: 900,
                        color: "#3A2010",
                        marginBottom: "0.5rem",
                      }}
                    >
                      搵唔到符合條件嘅食譜
                    </h4>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#C0A080",
                        marginBottom: "1rem",
                      }}
                    >
                      試下調整篩選條件
                    </p>
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: "#9B6035",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      清除所有篩選
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
