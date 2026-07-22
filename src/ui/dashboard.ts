// final report screen. box-drawing only, no emoji, no fancy tables -
// just picocolors + raw ASCII so it renders the same everywhere.
import pc from 'picocolors';

export interface DeadLink {
  path: string;
  line: number;
}

export interface DashboardData {
  filesChecked: string[];
  pathsVerified: number;
  deadLinks: DeadLink[];
  fluffRemoved: string[];
  tokensSaved: number;
}

const REPO_URL = 'github.com/ehretskyy/drifter';

// fixed width instead of reflowing against process.stdout.columns - the box
// drawing math gets annoying fast once you factor in ANSI codes AND dynamic
// width AND text wrapping. 64 cols fits basically every terminal anyone
// actually uses these days.
const WIDTH = 64;
const INNER_WIDTH = WIDTH - 4; // 2 border chars + 1 padding space on each side

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)) + '...';
}

function pad(text: string, width: number): string {
  const gap = Math.max(0, width - text.length);
  return text + ' '.repeat(gap);
}

// content must be plain text (no ANSI) going in - color gets applied AFTER
// padding, same trick as the loader, otherwise escape codes throw off the
// width math and the right-hand border drifts.
function row(content: string, colorFn: (s: string) => string = (s) => s): string {
  const line = pad(truncate(content, INNER_WIDTH), INNER_WIDTH);
  return `${pc.dim('\u2502')} ${colorFn(line)} ${pc.dim('\u2502')}`;
}

function divider(kind: 'top' | 'mid' | 'bottom'): string {
  const bar = '\u2500'.repeat(WIDTH - 2);
  if (kind === 'top') return pc.dim(`\u250c${bar}\u2510`);
  if (kind === 'bottom') return pc.dim(`\u2514${bar}\u2518`);
  return pc.dim(`\u251c${bar}\u2524`);
}

export function renderDashboard(data: DashboardData): void {
  const lines: string[] = [];

  lines.push(divider('top'));
  lines.push(row('SCAN RESULTS', pc.bold));
  lines.push(divider('mid'));
  lines.push(row(`files checked  : ${data.filesChecked.length}`));
  lines.push(row(`paths verified : ${data.pathsVerified}`));
  lines.push(divider('mid'));

  lines.push(row('DRIFT REPORT', pc.bold));
  if (data.deadLinks.length === 0) {
    lines.push(row('no broken references found', pc.green));
  } else {
    for (const dead of data.deadLinks) {
      lines.push(row(`line ${dead.line}: ${dead.path}`, pc.red));
    }
  }
  lines.push(divider('mid'));

  lines.push(row('OPTIMIZATION', pc.bold));
  lines.push(row(`fluff phrases removed : ${data.fluffRemoved.length}`, pc.green));
  lines.push(row(`tokens saved (approx) : ${data.tokensSaved}`, pc.green));
  lines.push(divider('bottom'));

  console.log(lines.join('\n'));
  console.log(pc.dim(`\nreport an issue at ${REPO_URL}\n`));
}
