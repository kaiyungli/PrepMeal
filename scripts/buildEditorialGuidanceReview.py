"""Compile reviewed per-recipe copy and a guarded, reversible data patch."""
import hashlib
import json
from pathlib import Path

ROOT = Path('docs/qa/editorial-guidance-20261113')
original = json.loads((ROOT / 'recipe-snapshot.json').read_text())
approved = json.loads((ROOT / 'approved-ten.json').read_text())
references = json.loads((ROOT / 'references.json').read_text())
copy = {r['id']: r for p in sorted(ROOT.glob('batch-*.json')) for r in json.loads(p.read_text())}
assert len(original) == len(copy) == 303
target = json.loads(json.dumps(original, ensure_ascii=False))
by_name = {r['name']: r for r in target}
by_slug = {r['slug']: r for r in target}
water_id = '4d32e561-50ac-4bb4-be6e-43c12a72e397'

def step(name, number, text):
    row = by_name[name]
    found = [s for s in row['steps'] if s['step_no'] == number]
    assert len(found) == 1, (name, number)
    found[0]['text'] = text

def water(name, amount, note, optional=False):
    row = by_name[name]
    existing = [i for i in row['ingredients'] if i['id'] == water_id]
    if existing:
        assert len(existing) == 1
        assert existing[0]['quantity'] == amount
        existing[0]['note'] = note
    else:
        row['ingredients'].append(dict(id=water_id, name='水', quantity=amount, unit='ml', note=note, optional=optional))

for item in approved:
    row = by_slug[item['slug']]
    assert len(row['steps']) == len(item['steps'])
    row['description'] = item['description']
    for s, text in zip(row['steps'], item['steps']):
        s['text'] = text
    copy[row['id']]['cooking_tips'] = item['tips']
    copy[row['id']]['pairing_suggestions'] = [item['pairing']]
    copy[row['id']]['refs'] = item['refs']

for name, amount in [('日式親子丼', 30), ('蜜糖雞翼', 30), ('照燒雞扒', 15)]:
    water(name, amount, '起始煮食用水；鍋具蒸發較多時按需要少量補水，不增加油或醬料')

step('奄列', 5, '用鑊鏟將蛋對摺，繼續用小火煎至中心蛋液完全凝固，才關火稍靜置。')
step('奄列', 6, '確認中心沒有流動生蛋液後，用乾淨鑊鏟滑到碟上。')
step('京都骨', 1, '排骨檢查並去除可見骨碎，用廚紙抹乾，加生抽拌勻冷藏醃10分鐘，再薄沾材料表的生粉。')
step('生炒骨', 1, '排骨檢查並去除可見骨碎，用廚紙抹乾，再薄沾材料表的生粉；不以流水沖洗生肉。')
step('薯仔炆雞翼', 1, '雞中翼完全解凍後用廚紙抹乾，不用流水沖洗；薯仔去皮切件，蒜頭切蓉。處理生雞後清潔雙手及器具。')
step('節瓜瘦肉湯', 1, '節瓜去皮切件，豬肉切成相若薄片，薑切片；處理生肉與已洗蔬菜的器具分開，避免流水沖洗生肉造成水花污染。')
step('牛肉炒洋蔥', 1, '牛肉切薄片，拌入生抽1茶匙及材料表的一部分黑胡椒，冷藏醃10分鐘；本版不加入生粉。')
step('牛肉炒洋蔥', 2, '洋蔥切絲，材料表的食油及餘下生抽、蠔油備用；本版不加入蒜頭。')
step('牛肉炒洋蔥', 3, '鑊中加入材料表的食油，中火炒洋蔥約2分鐘至半透明。')
step('牛肉炒洋蔥', 5, '加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；火太猛先調低，不另加未列出的醃料。')
step('牛肉炒洋蔥', 6, '繼續翻炒至牛肉完全熟透，中心達75°C並維持至少30秒後盛起；時間按肉片厚度調整。')
step('豬肉炒椰菜', 1, '豬肉切薄片，加入材料表生抽的一半拌勻，放雪櫃醃10分鐘；本版不加入生粉。')
step('豬肉炒椰菜', 5, '加入餘下生抽及材料表的蠔油拌勻，調整火力避免燒焦，不再加入另一份調味料。')
step('豬肉炒椰菜', 6, '炒至椰菜熟軟而仍有口感，並確認豬肉中心達75°C並維持至少30秒後上碟。')
step('泰式青木瓜沙律', 3, '豆角洗淨後用沸水徹底煮熟，再用可飲用冷水降溫、瀝乾切段；不可用未煮熟豆角拌沙律。車厘茄洗淨切半。')
by_name['泰式青木瓜沙律']['method'] = 'boiled'
step('豉椒炒蜆', 5, '加入生抽、糖及材料表的水，加蓋煮至湯汁重新沸騰，再保持滾煮至少5分鐘，確認蜆肉熟透；留意鍋內水量，避免燒乾。')
step('豉椒炒蜆', 6, '蜆肉徹底煮熟後才上碟，不能一見開殼便停火；煮後仍不開殼的蜆棄掉。')
step('法式白酒煮青口', 2, '有蓋鍋放入青口、乾蔥、約4克牛油及白酒，加蓋煮至重新沸騰，保持滾煮至少5分鐘並確認青口熟透；煮後不開殼者丟棄。')
step('餐蛋公仔麵', 4, '打入雞蛋，轉中火煮至蛋白及蛋黃完全凝固、午餐肉熱透；原來一兩分鐘只作參考，未熟便繼續煮。')
step('西多士配炒蛋', 4, '放入方包，兩面各先煎約2分鐘至金黃，再按厚度續煎至麵包表面及中心沾附的蛋液均熟透，盛起。')
step('西多士配炒蛋', 6, '用小火慢慢推炒餘下蛋液，煮至完全凝固、沒有流動生蛋液後盛起。')
step('豆腐蛋餅', 6, '小心翻面再煎約2至3分鐘，按厚度延長至中心蛋液全熟；食物中心達75°C並維持至少30秒後上碟。')
step('吞拿魚豆腐蛋餅', 6, '每面先煎約2至3分鐘，按厚度續煎至中心蛋糊完全熟透；中心達75°C並維持至少30秒，不能只看兩面金黃。')
step('肉碎蒸蛋', 5, '蛋面凝固後檢查中心及底部肉碎，未熟須繼續蒸，不單靠蛋面狀態決定關火。')
step('肉碎蒸蛋', 6, '以食物溫度計確認最厚肉蛋交界處中心達75°C並維持至少30秒，蛋液完全凝固、肉碎熟透後才取出。')
for name, cover_no in [('蝦仁豆腐蒸蛋', 4), ('西蘭花蝦仁蒸蛋', 5)]:
    if cover_no == 4:
        step(name, cover_no, '放上蝦仁，以耐熱碟蓋住蒸碗；如使用其他包覆材料，必須標示適合蒸煮，並按產品指示使用。')
    else:
        step(name, cover_no, '以耐熱碟蓋碗，水滾後中小火蒸約10至12分鐘；其他包覆材料必須標示適合蒸煮，並按產品指示使用。')
    step(name, 6, '檢查最厚中心蛋液、蝦及配料均熟透；中心達75°C並維持至少30秒，未熟便繼續蒸，不能只看蛋面凝固。')
for name in ['粟米蛋花湯', '紫菜蛋花湯']:
    step(name, 6, '繼續煮至蛋花完全凝固、湯滾燙，再灑蔥花並關火盛起；不保留流動生蛋液。')
step('韓式泡菜炒飯', 6, '繼續炒至蛋液完全凝固、飯中心達75°C並維持至少30秒，整份熱透後即食，不只看飯粒乾爽。')
step('蛋炒飯', 6, '炒至蛋液完全凝固、飯粒散開，並確認全份飯中心達75°C並維持至少30秒後即食。')
step('雜菜蛋炒飯', 6, '炒至雞蛋完全凝固、甘筍及其他菜熟透、飯中心達75°C並維持至少30秒後即食。')
step('蒜香牛油蝦意粉', 6, '蝦回鍋後繼續翻拌煮至中心全熟、整份意粉熱透，再按材料表總量試味，不把前段蝦轉色當成已熟。')
for name, number in [('蒜片牛肉粒', 6), ('蒜香牛肉粒', 6), ('黑椒牛柳粒配薯蓉', 6)]:
    step(name, number, '確認最厚牛肉粒中心達75°C並維持至少30秒，按大小調整時間後上碟；不能只用每面數十秒或外皮焦香判斷已熟。')
step('粟米斑塊', 1, '先從全份120毫升水中取15毫升冷水，拌勻1茶匙生粉留用；魚柳抹乾，拌入材料表的鹽和白胡椒。')
step('粟米斑塊', 2, '平底鑊加入全份食油，中火把魚柳煎至熟透，確認最厚中心達75°C並維持至少30秒後盛起，不只看外面金黃。')
step('粟米斑塊', 3, '小鍋加入粟米粒及餘下105毫升水，中火煮約3分鐘至粟米熱透。')
step('粟米斑塊', 5, '把預留生粉水再攪勻，慢慢倒入粟米蛋花汁並攪勻，煮滾至薄芡，確認蛋液完全凝固。')
step('粟米肉碎', 1, '從全份120毫升水中先預留15毫升冷水拌勻1茶匙生粉。肉碎拌入一半生抽與糖，蒜頭切蓉。')
step('粟米肉碎', 4, '加入粟米、餘下生抽、蠔油及餘下105毫升水，拌勻後煮滾。')
step('粟米肉碎', 6, '生粉水再攪勻後慢慢加入，煮滾至薄芡並確認肉碎熟透、全鍋中心達75°C並維持至少30秒後上碟。')
step('蠔油西蘭花', 2, '煲滾汆水用清水，放入西蘭花汆約1至2分鐘並按莖厚延長至熟；不另加未列的鹽或額外油。')
step('蠔油西蘭花', 4, '小鍋加入材料表全份蠔油、清水15毫升及全份食油，小火拌勻。')
step('麻婆豆腐', 1, '從全份75毫升煮食水中先取15毫升冷水拌勻1茶匙生粉；豆腐切約2厘米方塊，蒜頭切蓉。')
step('麻婆豆腐', 2, '另煲汆水用清水，不另加鹽，將豆腐汆約1分鐘後瀝乾；汆水倒去，不算入75毫升煮食水。')
step('麻婆豆腐', 4, '加入豆瓣醬1湯匙及材料表的糖半茶匙，炒勻出香，避免燒焦。')
step('麻婆豆腐', 5, '加入豆腐、餘下60毫升水及材料表的生抽1茶匙，輕推拌勻，不大力翻碎。')
step('麻婆豆腐', 6, '煮約4至5分鐘至豆腐熱透、肉碎全熟；不再為試味另加超出材料表的生抽。')
step('麻婆豆腐', 7, '預留生粉水再攪勻後慢慢加入，煮滾至薄芡，確認全鍋中心達75°C並維持至少30秒後上碟。')
water('麻婆豆腐', 75, '煮食用水總量；15毫升開生粉水，60毫升煮豆腐，不含倒走的汆水')
for name, amount, optional in [('番茄滑蛋豆腐煲',30,False),('茄汁煮魚柳',30,False),('清炒西芹百合',15,True),('滑蛋牛肉',15,False),('番茄豆腐',30,True),('泰式雞絲炒米粉',15,True),('雞絲炒米粉',15,True),('鮮茄豬扒飯',15,True)]:
    water(name,amount,'步驟已使用的煮食水；按材料表總量分配，不另計浸洗或倒走的汆水',optional)
step('滑蛋牛肉',1,'牛肉片拌生抽約1茶匙、材料表的生粉及全份15毫升水中的5毫升，放雪櫃醃10分鐘。')
step('滑蛋牛肉',2,'洋蔥切絲，雞蛋打散，蛋液拌入餘下10毫升水，不另加鹽。')
for name, number in [('泰式雞絲炒米粉',5),('雞絲炒米粉',5),('番茄豆腐',4),('鮮茄豬扒飯',4)]:
    text = next(s['text'] for s in by_name[name]['steps'] if s['step_no']==number)
    text = text.replace('少量清水','材料表最多15毫升選配清水').replace('少量水','材料表最多15毫升選配水')
    if name=='番茄豆腐': text=text.replace('逐少加入清水','逐少加入材料表最多30毫升選配清水')
    step(name,number,text)

veg_names=['清炒菜心','蒜蓉西蘭花','清炒椰菜','蒜蓉生菜','清炒芥蘭']
soup_names=['菠菜豆腐湯','海帶豆腐湯']
plant_mains=['薑蔥豉油蒸豆腐（簡易版）','孜然香辣烤豆腐','豆腐雞蛋白菜卷','蒸水蛋']
meat_mains=['照燒雞扒','肉碎豆腐','豉汁蒸排骨']
staples={'白飯','白米','意粉','公仔麵','年糕','河粉','米粉','烏冬','炒麵','乾蕎麥麵','乾綠豆粉絲','乾番薯粉絲','墨西哥小麥薄餅','意大利燴飯米','薯仔','方包','鮮中式濕炒麵'}

def choose(names,row):
    candidates=[by_name[n] for n in names if n != row['name']]
    current_names={i['name'] for i in row['ingredients']}
    candidates.sort(key=lambda c:(len(current_names & {i['name'] for i in c['ingredients'] if i['name'] not in {'水','鹽','蒜頭','食油'}}), hashlib.sha256((row['id']+c['id']).encode()).hexdigest()))
    return candidates[0]['name']

def pairing(row):
    veg=choose(veg_names,row)
    starch=[i['name'] for i in row['ingredients'] if not i['optional'] and i['name'] in staples]
    if row['is_complete_meal'] or row['meal_role']=='complete_meal':
        return f'本餐已包含主食，可配「{veg}」；飯麵不必重複加一份。'
    if starch:
        return f'這道菜已有{starch[0]}，可配「{veg}」；其他主食按整餐份量安排。'
    if row['meal_role']=='veg_side':
        main=choose(plant_mains,row)
        return f'可配「{main}」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。'
    if row['meal_role']=='soup':
        main=choose(plant_mains if 'vegetarian' in (row['diet'] or []) else meat_mains,row)
        return f'可配「{main}」與「{veg}」，再按需要配主食；本頁的湯不是另外的飯量。'
    soup=choose(soup_names,row)
    return f'可配「{veg}」及白飯；如要加湯，可選「{soup}」，各道份量分開計。'

def dumps(value): return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def fingerprint(row):
    ingredients=[dict(id=str(i['id']),name=i['name'],quantity=i['quantity'],unit=i['unit'],note=i['note'],optional=i['optional']) for i in row['ingredients']]
    ingredients.sort(key=dumps)
    canonical=dict(id=row['id'],name=row['name'],method=row['method'],base_servings=row['base_servings'],meal_role=row['meal_role'],is_complete_meal=row['is_complete_meal'],primary_protein=row['primary_protein'],diet=sorted(row['diet']) if row['diet'] is not None else None,ingredients=ingredients,steps=[s['text'] for s in sorted(row['steps'],key=lambda s:s['step_no'])])
    return hashlib.sha256(dumps(canonical).encode()).hexdigest()

payload=[]
for before,after in zip(original,target):
    entry=copy[after['id']]
    refs=entry.get('refs',[])
    if not refs and any(any(key in t for key in ['75°C','巴士德','生蛋液','長放室溫','冷藏','開殼']) for t in entry['cooking_tips']): refs=['F1']
    if after['name'] in ['泰式青木瓜沙律','乾煸四季豆','芝麻醬拌四季豆（現成醬版）','豆角炒蛋','豆角炒肉碎']: refs=list(dict.fromkeys(refs+['F3']))
    guidance=dict(version=1,reviewed_on='2026-11-13',review_method='desk_review_not_test_cooked',source_fingerprint=fingerprint(after),cooking_tips=entry['cooking_tips'],pairing_suggestions=entry.get('pairing_suggestions',[pairing(after)]),references=[dict(title=references[k][0],url=references[k][1]) for k in refs])
    assert len(guidance['cooking_tips'])==2 and len(guidance['pairing_suggestions'])==1
    assert all(0<len(t)<=500 for t in guidance['cooking_tips']+guidance['pairing_suggestions'])
    payload.append(dict(expected=before,target=after,guidance=guidance))

(ROOT/'targets.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
hash_file=ROOT/'database-preconditions.json'
hashes=json.loads(hash_file.read_text()) if hash_file.exists() else {}
compact=[]
for p in payload:
    before,after=p['expected'],p['target']
    b_ingredients={i['id']:i for i in before['ingredients']}
    compact.append(dict(id=before['id'],slug=before['slug'],name=before['name'],expected_hash=hashes.get(before['id']),guidance=p['guidance'],
      recipe_updates={k:after[k] for k in ['description','method'] if before[k]!=after[k]},
      changed_steps=[dict(step_no=a['step_no'],old=b['text'],text=a['text']) for a,b in zip(after['steps'],before['steps']) if a['text']!=b['text']],
      ingredient_changes=[dict(old=b_ingredients.get(i['id']),new=i) for i in after['ingredients'] if b_ingredients.get(i['id'])!=i]))
(ROOT/'payload.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(recipes=len(payload),tips=sum(len(p['guidance']['cooking_tips']) for p in payload),changed_steps=sum(a['text']!=b['text'] for p in payload for a,b in zip(p['expected']['steps'],p['target']['steps'])),changed_recipes=sum(p['expected']['steps']!=p['target']['steps'] for p in payload),new_water_rows=sum(len(p['target']['ingredients'])-len(p['expected']['ingredients']) for p in payload)),ensure_ascii=False))
