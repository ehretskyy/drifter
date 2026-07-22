// the boot sequence. purely cosmetic, but first impressions matter and this
// is the whole "immersive" bit the spec asked for. keep it dumb and fast.
import pc from 'picocolors';

const BAR_WIDTH = 40;
const ANIMATION_MS = 1500;
const MIN_TERMINAL_WIDTH = 50;

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_SCREEN = '\x1b[2J\x1b[0f';

const LOADING_TEXT = 'drifter: analyzing local context...';

let cursorHidden = false;

function hideCursor(): void {
  process.stdout.write(HIDE_CURSOR);
  cursorHidden = true;
}

function showCursor(): void {
  if (!cursorHidden) return;
  process.stdout.write(SHOW_CURSOR);
  cursorHidden = false;
}

// if the user ctrl-c's mid-animation we still need to give their terminal the
// cursor back, otherwise they're left with an invisible caret until they
// close the tab. bit that everyone forgets until a user complains about it.
process.on('SIGINT', () => {
  showCursor();
  process.exit(130);
});

function clearScreen(): void {
  // deliberately not using console.clear() - it just scrolls the buffer in
  // some terminals (looking at you, older Windows consoles) instead of
  // actually wiping the screen, which looks janky for an "immersive" loader.
  process.stdout.write(CLEAR_SCREEN);
}

// centers based on the RAW (uncolored) text length, then the caller wraps
// the returned string in a color fn. if you color first, the ANSI escape
// bytes count toward .length and the centering math goes sideways.
function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const totalPad = width - text.length;
  const left = Math.floor(totalPad / 2);
  return ' '.repeat(left) + text;
}

function renderBar(filled: number): string {
  const clamped = Math.max(0, Math.min(BAR_WIDTH, filled));
  const empty = BAR_WIDTH - clamped;
  return `[${'\u2588'.repeat(clamped)}${'\u2591'.repeat(empty)}]`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLoader(): Promise<void> {
  const columns = process.stdout.columns || 80;

  // terminal too small for the fancy loader, fallback to standard out so we
  // don't break their layout (also covers piped/non-tty output, e.g. CI logs)
  if (columns < MIN_TERMINAL_WIDTH || !process.stdout.isTTY) {
    console.log(LOADING_TEXT);
    return;
  }

  hideCursor();

  try {
    const stepMs = ANIMATION_MS / BAR_WIDTH;

    for (let filled = 0; filled <= BAR_WIDTH; filled++) {
      clearScreen();

      const barLine = renderBar(filled);
      const percent = Math.round((filled / BAR_WIDTH) * 100);
      const barText = `${barLine} ${percent}%`;

      process.stdout.write('\n\n');
      process.stdout.write(pc.bold(center(LOADING_TEXT, columns)) + '\n\n');
      process.stdout.write(pc.cyan(center(barText, columns)) + '\n');

      // don't sleep on the last frame, nothing left to animate toward
      if (filled < BAR_WIDTH) {
        await sleep(stepMs);
      }
    }
  } finally {
    // always restore state, even if something above throws
    showCursor();
    clearScreen();
  }
}
