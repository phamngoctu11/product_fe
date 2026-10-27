import { formatOrderAttributes } from './order-display';

describe('formatOrderAttributes', () => {
  it('returns an empty string for missing or empty attributes', () => {
    expect(formatOrderAttributes(null)).toBe('');
    expect(formatOrderAttributes('{}')).toBe('');
    expect(formatOrderAttributes('[]')).toBe('');
  });

  it('formats JSON attributes with readable Vietnamese labels', () => {
    expect(formatOrderAttributes('{"size":"18 cm","color":"xanh lá","material":"gốm"}'))
      .toBe('Kích cỡ: 18 cm · Màu sắc: xanh lá · Chất liệu: gốm');
  });

  it('keeps useful plain text and array values readable', () => {
    expect(formatOrderAttributes('Size tùy chỉnh')).toBe('Size tùy chỉnh');
    expect(formatOrderAttributes(['đỏ', 'xanh'])).toBe('đỏ, xanh');
  });
});
