export function mergeIngredients(list:any[]) {
  const map = new Map()
  for (const i of list) {
    const key = `${i.name}-${i.unit}`
    if (!map.has(key)) map.set(key,{...i})
    else map.get(key).quantity += i.quantity
  }
  return Array.from(map.values())
}