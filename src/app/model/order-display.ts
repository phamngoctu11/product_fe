import type { OrderItem } from './order.model';
import type { ProductTypeField } from './custom-request.model';

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

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw.startsWith('{')) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasValues(value: unknown): boolean {
  const record = parseRecord(value);
  return !!record && Object.keys(record).length > 0;
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (Array.isArray(value)) {
    return value.map(formatDisplayValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const formatted = formatDisplayValue(entry);
        return formatted ? `${displayAttributeName(key)}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }
  return String(value).trim();
}

/** Returns human-readable lines for catalog attributes or custom-order snapshots. */
export function getOrderItemDetailLines(item: OrderItem): string[] {
  const snapshot = parseRecord(item.specSnapshot) || parseRecord(item.attributes);
  const snapshotType = parseRecord(snapshot?.['productType']);
  const isCustom = item.sourceType === 'CUSTOM'
    || !!item.productTypeFields?.length
    || hasValues(item.fieldValues)
    || !!snapshotType
    || hasValues(snapshot?.['fieldValues']);

  if (!isCustom) {
    const attributes = formatOrderAttributes(item.attributes);
    return attributes ? [attributes] : [];
  }

  const lines: string[] = [];
  const productTypeName = item.productTypeName
    || (typeof snapshotType?.['name'] === 'string' ? snapshotType['name'] : '');
  if (productTypeName.trim()) {
    lines.push(`Loại sản phẩm: ${productTypeName.trim()}`);
  }

  const fields = item.productTypeFields?.length
    ? item.productTypeFields
    : Array.isArray(snapshot?.['productTypeFields'])
      ? snapshot['productTypeFields'] as ProductTypeField[]
      : [];
  const values = parseRecord(item.fieldValues) || parseRecord(snapshot?.['fieldValues']) || {};
  const usedCodes = new Set<string>();

  for (const field of [...fields].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))) {
    const value = values[field.code];
    const formatted = formatDisplayValue(value);
    if (!formatted) continue;
    usedCodes.add(field.code);
    const unit = field.unit?.trim();
    lines.push(`${field.label || displayAttributeName(field.code)}: ${formatted}${unit ? ` ${unit}` : ''}`);
  }

  for (const [code, value] of Object.entries(values)) {
    if (usedCodes.has(code)) continue;
    const formatted = formatDisplayValue(value);
    if (formatted) lines.push(`${displayAttributeName(code)}: ${formatted}`);
  }

  const description = item.description
    || (typeof snapshot?.['description'] === 'string' ? snapshot['description'] : '');
  if (description.trim()) {
    lines.push(`Mô tả: ${description.trim()}`);
  }

  // Older custom orders may keep a plain-text specification in attributes.
  if (lines.length === 0 && typeof item.attributes === 'string') {
    const rawAttributes = item.attributes.trim();
    if (rawAttributes && !parseRecord(rawAttributes)) lines.push(rawAttributes);
  }

  return [...new Set(lines)];
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
    return value.map(formatDisplayValue).filter(Boolean).join(', ');
  }
  if (!value || typeof value !== 'object') return String(value).trim();

  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => {
      const formatted = formatDisplayValue(item);
      return formatted ? `${displayAttributeName(key)}: ${formatted}` : '';
    })
    .filter(Boolean)
    .join(' · ');
}
