import Image from 'next/image'
import { RecipeDetailInArticleAd } from '@/components/ads/AdSlot';
import { METHOD_MAP, DIFFICULTY_MAP, SPEED_MAP } from '@/constants/taxonomy';
import { useState, useEffect, useCallback } from 'react'
import { formatQuantityForDisplay } from '@/lib/quantityFormatter';
import FavoriteButton from './FavoriteButton'

interface RecipeDetailContentProps {
  recipe: {
    id: string
    name: string
    image_url?: string
    description?: string
    cuisine?: string
    difficulty?: string
    speed?: string
    method?: string
    calories_per_serving?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    ingredients?: Array<{
      display_name?: string
      name?: string
      slug?: string
      quantity?: number | null
      unit?: { name?: string } | string | null
      shopping_category?: string
      source?: string
    }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  }
  isLoading?: boolean
  isFavorite?: boolean
  favoriteLoading?: boolean
  onFavoriteClick?: () => void | Promise<void>
}

// Skeleton component for loading sections
function SectionSkeleton({ height = 'h-4' }: { height?: string }) {
  return <div className={`${height} w-full bg-[#E5DCC8] animate-pulse rounded`} />
}


// Label helpers with safe fallback
const getDifficultyLabel = (v?: string | null) => v ? (DIFFICULTY_MAP[v] || '其他') : '';
const getSpeedLabel = (v?: string | null) => v ? (SPEED_MAP[v] || '其他') : '';
const getMethodLabel = (v?: string | null) => v ? (METHOD_MAP[v] || '其他') : '';
const getUnitLabel = (unit?: { code?: string; name?: string; display_name_zh?: string } | null) => {
  if (!unit) return '';
  return unit.display_name_zh || unit.name || '其他';
};

export default function RecipeDetailContent({ recipe, isLoading, isFavorite, favoriteLoading, onFavoriteClick }: RecipeDetailContentProps) {
  if (!recipe) return null

  // Defer heavy sections to reduce initial paint cost on iPad
  const [showHeavySections, setShowHeavySections] = useState(false);
  
  // Reset and defer heavy sections when recipe changes
  useEffect(() => {
    setShowHeavySections(false);
    const id = requestAnimationFrame(() => {
      setShowHeavySections(true);
    });
    return () => cancelAnimationFrame(id);
  }, [recipe?.id]);

  // Defensive guards for arrays
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F3E8' }}>
      {/* Hero Image */}
      <div className="relative h-[250px] md:h-[350px] lg:h-[400px] overflow-hidden">
        {/* Favorite Button - top right, offset from close button */}
        {onFavoriteClick && (
          <div className="absolute top-4 right-4 z-10">
            <FavoriteButton
              active={isFavorite}
              loading={favoriteLoading}
              onClick={onFavoriteClick}
            />
          </div>
        )}
        
        {recipe.image_url ? (
          <Image 
            src={recipe.image_url} 
            alt={recipe.name} 
            fill 
            className="object-cover"
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 80vw, 1200px" />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#C8D49A' }}>
            <span className="text-8xl">🍳</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-[1200px] mx-auto px-4 pb-8">
            {/* Tags */}
            <div className="flex items-center gap-3 mb-4">
              {recipe.difficulty && (
                <div className="rounded-lg px-4 py-2 shadow-lg" style={{ backgroundColor: '#C8D49A' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#3A2010' }}>
                    {getDifficultyLabel(recipe.difficulty)}
                  </span>
                </div>
              )}
              {recipe.speed && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <Clock className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {getSpeedLabel(recipe.speed)}
                  </span>
                </div>
              )}
              {recipe.method && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <ChefHat className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {getMethodLabel(recipe.method)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Title */}
            <h1 className="text-4xl font-black text-white mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {recipe.name}
            </h1>
            
            {/* Meta info */}
            <div className="flex items-center gap-4">
              {recipe.calories_per_serving && (
                <div className="rounded-lg px-4 py-2 flex items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Flame className="w-4 h-4 text-white" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>
                    {recipe.calories_per_serving} 卡
                  </span>
                </div>
              )}
              {/* Removed servings display - showing calories only */}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        
        {/* Description Card */}
        {recipe.description && (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-3" style={{ color: '#3A2010' }}>簡介</h3>
            <p className="leading-relaxed" style={{ color: '#AA7A50' }}>{recipe.description}</p>
          </div>
        )}

        {/* Ingredients Card - Deferred */}
        {showHeavySections ? (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>🥬 食材</h3>
            {isLoading ? (
            <div className="space-y-3">
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
            </div>
          ) : ingredients.length > 0 ? (
            <ul className="space-y-3">
              {ingredients.map((ing: any, i: number) => (
                <li key={i} className="flex justify-between py-2 border-b" style={{ borderColor: '#DDD0B0' }}>
                  <span style={{ color: '#3A2010' }}>{ing.display_name || ing.name || ing.slug}</span>
                  <span style={{ color: '#AA7A50' }}>{formatQuantityForDisplay(ing.quantity, ing.unit)} {getUnitLabel(ing.unit)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#AA7A50' }}>暫無食材資料</p>
          )}
        </div>
        ) : (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0', minHeight: '120px' }}>
            <div className="space-y-3">
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
            </div>
          </div>
        )}

        {/* Ad between ingredients and steps */}
        <RecipeDetailInArticleAd className="my-6" />

        {/* Steps Card - Deferred */}
        {showHeavySections ? (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>👨‍🍳 烹飪步驟</h3>
          {isLoading ? (
            <div className="space-y-4">
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
            </div>
          ) : steps.length > 0 ? (
            <ol className="space-y-4">
              {steps.map((step: any, i: number) => {
                const stepText = typeof step === 'string' ? step : (step?.text || '');
                const stepNo = step?.step_no ?? (i + 1);
                const stepTime = step?.time_seconds || 0;
                return (
                <li key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#9B6035', color: 'white' }}>
                    {stepNo}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="leading-relaxed" style={{ color: '#3A2010' }}>{stepText}</p>
                    {stepTime > 0 && (
                      <span className="text-xs mt-1 block" style={{ color: '#AA7A50' }}>
                        ⏱ {Math.floor(stepTime / 60)}分鐘
                      </span>
                    )}
                  </div>
                </li>
              );
              })}
            </ol>
          ) : (
            <p style={{ color: '#AA7A50' }}>暫無步驟資料</p>
          )}
        </div>
        ) : (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0', minHeight: '120px' }}>
            <div className="space-y-4">
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
            </div>
          </div>
        )}

        {/* Nutrition Card - Keep immediate for now (lightweight) */}
        <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: '#FFF9E6', borderColor: '#F0A060' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>📊 營養資料</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.calories_per_serving || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>卡路里</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.protein_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>蛋白質(g)</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.carbs_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>碳水(g)</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.fat_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>脂肪(g)</div>
            </div>
          </div>
        </div>

        {/* SEO Section: 烹飪貼士 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>💡 烹飪貼士</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generateCookingTips(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SEO Section: 配搭建議 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>🍽️ 配搭建議</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generatePairingSuggestions(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SEO Section: 保存方法 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>❄️ 保存方法</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generateStorageTips(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}


// Generate cooking tips based on recipe fields
function generateCookingTips(recipe: any): string[] {
  const tips: string[] = [];
  const method = recipe?.method || '';
  const difficulty = recipe?.difficulty || '';
  const totalTime = recipe?.total_time_minutes || 0;
  const dishType = recipe?.dish_type || '';
  
  // Time-based tip
  if (totalTime && totalTime <= 15) {
    tips.push('因為呢道菜比較快手，建議先將所有材料切好備用，先後次序諗清楚，先至開火，咁樣就唔洗炒緊既時候手忙腳亂。');
  } else if (totalTime && totalTime >= 45) {
    tips.push('因為呢道菜需要較長既時間準備，可以先将部分材料醃定或者切定，等正式開始煮既時候就順手好多。');
  }
  
  // Method-based tips
  if (method?.includes('炒') || dishType?.includes('小炒')) {
    tips.push('炒既時候記得要先將鑊燒紅，等油出煙先好落材料，咁樣先唔會黐鑊。');
    tips.push('大火快炒既時間唔好太長，保持蔬菜既爽脆口感最重要。');
  } else if (method?.includes('蒸')) {
    tips.push('蒸既時候水要滾先好放入材料，咁樣蒸汽先會均勻。');
    tips.push('蒸既時間要視乎材料既厚薄，适当調整。');
  } else if (method?.includes('焗') || method?.includes('爐')) {
    tips.push('焗既時候可以預先将焗爐預熱，等温度均勻。');
    tips.push('如果焗既野比較多，中間可以反轉一次，等受熱更均勻。');
  } else if (method?.includes('灼') || method?.includes('白灼')) {
    tips.push('灼既時候水要滾既時候落材料，灼完既時候立即過冷河，口感更爽。');
  } else {
    tips.push('煮既時候記得要先睇清楚所有材料，唔同既材料需要既時間都唔同，先後次序好重要。');
  }
  
  // Difficulty-based tip
  if (difficulty === 'easy' || difficulty === '簡單') {
    tips.push('呢道菜比較簡單，即使係廚房新手都可以整得好味，放膽試下啦！');
  }
  
  return tips.slice(0, 3);
}

// Generate pairing suggestions based on recipe fields
function generatePairingSuggestions(recipe: any): string[] {
  const suggestions: string[] = [];
  const dishType = recipe?.dish_type || '';
  const cuisine = recipe?.cuisine || '';
  const method = recipe?.method || '';
  const primaryProtein = recipe?.primary_protein || '';
  
  // Always add basic suggestion
  suggestions.push('配白飯或者粉麵就已經好好味，可以根據自己既口味調整份量。');
  
  // Dish type based
  if (dishType?.includes('湯') || dishType?.includes('羹')) {
    suggestions.push('配一個簡單既小菜或者炒青菜，咁樣就更均衡。');
  } else if (dishType?.includes('飯') || dishType?.includes('炒飯')) {
    suggestions.push('可以配一碗清湯，中和油膩既感覺。');
  } else if (dishType?.includes('麵') || dishType?.includes('粉')) {
    suggestions.push('配一款簡單既小食或者春卷，会更加豐富。');
  } else {
    suggestions.push('如果想晚餐更完整，可以配白飯、清湯或一款簡單蔬菜。');
  }
  
  // Cuisine based
  if (cuisine?.includes('日本') || cuisine?.includes('日式')) {
    suggestions.push('日式既野可以配麵豉湯或者漬物，咁樣就更有日本feel。');
  } else if (cuisine?.includes('上海') || cuisine?.includes('滬')) {
    suggestions.push('上海菜可以配小籠包或者蔥油餅，係另一種享受。');
  } else if (cuisine?.includes('廣東') || cuisine?.includes('粵')) {
    suggestions.push('廣東菜可以配一碗老火湯，係最傳統既配搭。');
  }
  
  // Method based
  if (method?.includes('煎') || method?.includes('炸')) {
    suggestions.push('煎炸既野配清茶或者檸檬水，可以解膩。');
  }
  
  return suggestions.slice(0, 3);
}

// Generate storage tips based on recipe fields
function generateStorageTips(recipe: any): string[] {
  const tips: string[] = [];
  const primaryProtein = recipe?.primary_protein || '';
  const dishType = recipe?.dish_type || '';
  const method = recipe?.method || '';
  
  // General tips
  tips.push('煮完既食物最好放涼後先放入雪櫃，唔好趁熱就放，等佢自然冷卻可以避免水汽過多。');
  tips.push('放入雪櫃既食物最好係1-2日內食完，確保新鮮同味道。');
  
  // Protein based
  if (primaryProtein?.includes('雞') || primaryProtein?.includes('禽')) {
    tips.push('雞肉類既食物雪過之後最好盡快食咗佢，雪超過2日既話建議翻熱多次既話要確保徹底熱透。');
  } else if (primaryProtein?.includes('魚') || primaryProtein?.includes('海鮮') || primaryProtein?.includes('蝦') || primaryProtein?.includes('蟹')) {
    tips.push('海鮮類既食物比較易變壞，最好今日整今日食，最多雪1日。');
    tips.push('如果聞到有異味就唔好再食，安全最重要。');
  } else if (primaryProtein?.includes('牛') || primaryProtein?.includes('豬')) {
    tips.push('肉類可以雪耐啲，通常2-3日都冇問題，但係翻熱既時候要熱透。');
  }
  
  // Dish type based
  if (dishType?.includes('湯') || dishType?.includes('羹')) {
    tips.push('湯類可以分开幾份雪，每次食一份就唔洗成日翻熱。');
    tips.push('雪既時候要留啲位，等佢膨脹既時候唔會爆盒。');
  }
  
  return tips.slice(0, 3);
}


// Icons as simple components
function Clock({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
}

function ChefHat({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
      <line x1="6" y1="17" x2="18" y2="17"></line>
    </svg>
  )
}

function Flame({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>
  )
}
