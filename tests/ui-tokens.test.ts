import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../tailwind.config.js';

/** WCAG 2.x contrast ratio of two #RRGGBB colors. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const c = config.theme.extend.colors as Record<string, any>;
const WHITE = '#FFFFFF';
const NEUTRAL_600 = '#525252'; // Tailwind default, used by the neutral Badge

test('Button fills give white text at least 4.5:1, in both rest and hover', () => {
  for (const fill of [c.primary.solid, c.primary['solid-hover'], c.danger.solid, c.danger['solid-hover']]) {
    assert.ok(contrast(WHITE, fill) >= 4.5, `${fill}: ${contrast(WHITE, fill).toFixed(2)}`);
  }
});

test('brand green and red are not usable as white-text fills (why the solid tokens exist)', () => {
  assert.ok(contrast(WHITE, c.primary.DEFAULT) < 4.5);
  assert.ok(contrast(WHITE, c.danger.DEFAULT) < 4.5);
});

test('every Badge tone has text at least 4.5:1 on its fill', () => {
  const pairs: [string, string, string][] = [
    ['neutral', NEUTRAL_600, c['surface-subtle']],
    ['info', c.info.dark, c.info.light],
    ['success', c.primary.dark, c.primary.light],
    ['warning', c.warning.dark, c.warning.light],
    ['danger', c.danger.dark, c.danger.light],
    ['reward', c.reward.dark, c.reward.light],
  ];
  for (const [tone, text, fill] of pairs) {
    assert.ok(contrast(text, fill) >= 4.5, `${tone}: ${contrast(text, fill).toFixed(2)}`);
  }
});
