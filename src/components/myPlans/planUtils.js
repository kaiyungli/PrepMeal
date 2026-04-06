/**
 * Format date for display - handles YYYY-MM-DD safely without timezone shift
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  // Safe for YYYY-MM-DD - avoid timezone shift
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, parseInt(m) - 1, d).toLocaleDateString('zh-HK');
  }
  return new Date(dateStr).toLocaleDateString('zh-HK');
}
