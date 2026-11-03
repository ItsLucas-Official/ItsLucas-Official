import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { directory, loadConfig, themeFor, renderReadme } from './theme.mjs';

const config = loadConfig();
const choose = value => themeFor(new Date(`${value}T00:00:00Z`), config);

test('events override campaigns and seasons, with the configured event window', () => {
  assert.equal(choose('2026-10-24'), 'pink-october');
  assert.equal(choose('2026-10-25'), 'halloween');
  assert.equal(choose('2026-10-31'), 'halloween');
  assert.equal(choose('2026-11-01'), 'movember');
  assert.equal(choose('2026-12-26'), 'new-year');
  assert.equal(choose('2027-01-01'), 'new-year');
  assert.equal(choose('2027-01-02'), 'epiphany');
});

test('Easter follows its actual date each year', () => {
  assert.equal(choose('2026-04-05'), 'easter');
  assert.equal(choose('2027-03-28'), 'easter');
  assert.equal(choose('2026-03-28'), 'spring');
});

test('seasons cover year boundaries and leap days', () => {
  for (const [day, expected] of Object.entries({
    '2028-02-29': 'winter', '2026-03-01': 'spring', '2026-06-01': 'summer',
    '2026-09-01': 'autumn', '2026-12-01': 'winter',
  })) assert.equal(choose(day), expected);
});

test('all declared themes have their source assets and workflow choices', () => {
  const workflow = readFileSync(join(directory, '../workflows/seasonal-theme.yml'), 'utf8');
  for (const [theme, info] of Object.entries(config.themes)) {
    assert.ok(workflow.includes(`- ${theme}\n`), theme);
    for (const kind of ['banner', 'logo']) {
      assert.ok(existsSync(join(directory, 'assets', `${kind}s`, info[kind])), `${theme}: ${kind}`);
    }
  }
});

test('every image changes palette while all README text and layout are preserved', () => {
  const original = readFileSync(join(directory, '../../README.md'), 'utf8');
  const changed = renderReadme(original, { color: '123ABC', background: 'ABC123', iconTheme: 'light' });
  assert.equal(changed.replace(/src="[^"]+"/g, 'src=""'), original.replace(/src="[^"]+"/g, 'src=""'));
  assert.ok(changed.includes('color=123ABC'));
  assert.ok(changed.includes('logoColor=white'));
  assert.ok(changed.includes('logoColor=123ABC'));
  assert.ok(changed.includes('labelColor=ABC123'));
  assert.ok(changed.includes('Java-ABC123?'));
  assert.ok(changed.includes('theme=light'));
  assert.equal(
    renderReadme(changed, config.themes.halloween),
    renderReadme(original, config.themes.halloween),
  );
});

test('theme transitions work regardless of the theme currently in the README', () => {
  const readme = readFileSync(join(directory, '../../README.md'), 'utf8');
  for (const [sourceName, source] of Object.entries(config.themes)) {
    const original = renderReadme(readme, source);
    const changed = renderReadme(original, { color: '123ABC', background: 'ABC123', iconTheme: 'light' });
    assert.equal(renderReadme(changed, source), original, `${sourceName}: restore source palette`);
    for (const [targetName, target] of Object.entries(config.themes)) {
      const expected = renderReadme(readme, target);
      const actual = renderReadme(original, target);
      assert.equal(actual, expected, `${sourceName} -> ${targetName}`);
      assert.equal(renderReadme(actual, target), actual, `${targetName}: repeated application`);
    }
  }
});
