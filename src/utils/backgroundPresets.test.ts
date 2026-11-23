import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BACKGROUND_COLOR,
  isDarkBackground,
  normalizeHexColor,
} from './backgroundPresets';

test('normalizeHexColor validates 3-digit and 6-digit hex strings', () => {
  assert.equal(normalizeHexColor('#ABC'), '#aabbcc');
  assert.equal(normalizeHexColor('  #0F172A '), '#0f172a');
  assert.equal(normalizeHexColor('not-a-color'), DEFAULT_BACKGROUND_COLOR);
});

test('isDarkBackground accurately classifies light vs dark workspace colors', () => {
  assert.equal(isDarkBackground('#f8fafc'), false);
  assert.equal(isDarkBackground('#ecfdf5'), false);
  assert.equal(isDarkBackground('#faf7f2'), false);
  assert.equal(isDarkBackground('#0f172a'), true);
  assert.equal(isDarkBackground('#1e293b'), true);
  assert.equal(isDarkBackground('#000'), true);
});
