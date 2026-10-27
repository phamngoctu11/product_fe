const ATTRIBUTE_LABELS: Readonly<Record<string, string>> = {
  size: 'Kích cỡ',
  color: 'Màu sắc',
  material: 'Chất liệu',
  fit: 'Kiểu dáng',
  dimensions: 'Kích thước',
  weight: 'Trọng lượng',
  capacity: 'Dung tích',
  volume: 'Thể tích',
  type: 'Phân loại',
};

function displayAttributeName(key: string): string {
  const label = ATTRIBUTE_LABELS[key.toLowerCase()] || key.replace(/[_-]+/g, ' ');
  return label ? label.charAt(0).toLocaleUpperCase('vi-VN') + label.slice(1) : label;
}

/** Turns variant metadata into a short readable line and hides empty JSON. */
export function formatOrderAttributes(attributes: unknown): string {
  if (attributes === null || attributes === undefined) return '';
  let value: unknown = attributes;

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw || raw === '{}' || raw === '[]') return '';
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try { value = JSON.parse(raw); }
      catch { return raw; }
    } else {
      return raw;
    }
  }

  if (Array.isArray(value)) {
    return value.filter((part) => part !== null && part !== undefined && String(part).trim() !== '').join(', ');
  }
  if (!value || typeof value !== 'object') return String(value).trim();

  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== null && item !== undefined && String(item).trim() !== '')
    .map(([key, item]) => `${displayAttributeName(key)}: ${Array.isArray(item) ? item.join(', ') : String(item)}`)
    .join(' · ');
}
