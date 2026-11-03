import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const configPath = join(directory, 'themes.json');
export const loadConfig = () => JSON.parse(readFileSync(configPath, 'utf8'));

export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1,
    (h + l - 7 * m + 114) % 31 + 1));
}

function inRange(day, from, to) {
  const md = day.toISOString().slice(5, 10);
  return from <= to ? from <= md && md <= to : md >= from || md <= to;
}

export function themeFor(day, config) {
  const settings = config.settings;
  for (const group of settings.priority) {
    const matches = (config[group] ?? []).filter(item => {
      if (group !== 'events') return inRange(day, item.from, item.to);
      return [-1, 0, 1].some(offset => {
        const year = day.getUTCFullYear() + offset;
        const when = item.easter !== undefined
          ? new Date(easter(year).getTime() + item.easter * 86400000)
          : new Date(`${year}-${item.date}T00:00:00Z`);
        const delta = (day - when) / 86400000;
        return delta >= -(item.daysBefore ?? settings.eventDaysBefore)
          && delta <= (item.daysAfter ?? settings.eventDaysAfter);
      });
    }).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    if (matches.length) return matches[0].theme;
  }
  return settings.defaultTheme;
}

export function renderReadme(text, info) {
  // Work on image URLs only: profile text, links and layout stay editable in README.md.
  return text.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (_, before, url, after) => {
    if (url.startsWith('https://readme-typing-svg.demolab.com')) {
      url = url.replace(/([?&]color=)[0-9a-f]{6}\b/gi, `$1${info.color}`);
    }
    if (url.startsWith('https://img.shields.io/')) {
      url = url.replace(/([?&](?:color|logoColor)=)[0-9a-f]{6}\b/gi, `$1${info.color}`)
        .replace(/([?&]labelColor=)[0-9a-f]{6}\b/gi, `$1${info.background}`);
      if (url.includes('/badge/')) {
        url = url.replace(/-[0-9a-f]{6}(?=\?)/i, `-${info.background}`);
      }
    }
    if (url.startsWith('https://skillicons.dev/')) {
      url = url.replace(/([?&]theme=)(?:dark|light)\b/g, `$1${info.iconTheme}`);
    }
    return before + url + after;
  });
}

export function applyTheme(theme, config) {
  const info = config.themes[theme];
  if (!info) throw new Error(`Unknown theme: ${theme}`);
  if (!/^[0-9a-f]{6}$/i.test(info.color) || !/^[0-9a-f]{6}$/i.test(info.background)) {
    throw new Error(`Invalid color: ${theme}`);
  }
  // Read both sources before writing anything, so missing assets fail cleanly.
  const assets = ['banner', 'logo'].map(kind => {
    const name = info[kind];
    if (basename(name) !== name || !name.endsWith('.svg')) throw new Error(`Invalid file: ${name}`);
    return [kind, readFileSync(join(directory, 'assets', `${kind}s`, name))];
  });
  const readmePath = join(root, 'README.md');
  const readme = renderReadme(readFileSync(readmePath, 'utf8'), info);
  for (const [kind, data] of assets) writeFileSync(join(directory, 'assets', `${kind}.svg`), data);
  writeFileSync(readmePath, readme);
  console.log(`Applied theme: ${theme} (${info.label})`);
}

export function main(args = process.argv.slice(2)) {
  const config = loadConfig();
  let requested, date;
  for (let index = 0; index < args.length; index += 2) {
    if (!['--theme', '--date'].includes(args[index]) || !args[index + 1]) {
      throw new Error('Usage: node .github/profile/theme.mjs [--theme auto|name] [--date YYYY-MM-DD]');
    }
    if (args[index] === '--theme') requested = args[index + 1];
    else date = args[index + 1];
  }
  date ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  const day = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(+day) || day.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid date: ${date}`);
  }
  const mode = requested ?? config.settings.theme ?? 'auto';
  applyTheme(mode === 'auto' ? themeFor(day, config) : mode, config);
  if (requested !== undefined) {
    config.settings.theme = requested;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
