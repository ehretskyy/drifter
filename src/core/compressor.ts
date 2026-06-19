// strips the conversational filler that creeps into AI rules files over time.
// nothing clever here, just literal phrase matching. someone will eventually
// ask for a "smarter" version of this with an LLM in the loop - resist that,
// the whole point of drifter is to be fast and free to run on every save.

const FLUFF_PHRASES = [
  'please make sure to',
  'it is very important that you',
  'i would like you to',
  'always remember to',
  'please be sure to',
  'make sure that you',
  'you should always',
  "don't forget to",
];

export interface CompressionResult {
  compressed: string;
  fluffRemoved: string[];
  tokensSaved: number;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function compressContent(content: string): CompressionResult {
  let compressed = content;
  const fluffRemoved: string[] = [];

  for (const phrase of FLUFF_PHRASES) {
    // none of the phrases above actually contain regex special chars, but
    // escaping anyway so this doesn't quietly break the day someone adds
    // "don't forget to (re)check X" or similar to the list
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');

    if (re.test(compressed)) {
      fluffRemoved.push(phrase);
      compressed = compressed.replace(re, '');
    }
  }

  // removing phrases mid-sentence leaves behind double spaces and, if a whole
  // line was fluff, blank lines - clean that up so the output doesn't look torn up
  compressed = compressed
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const originalWords = countWords(content);
  const compressedWords = countWords(compressed);

  // rough approximation, not tied to any real tokenizer for any real model -
  // good enough to show the trend on the dashboard, not meant to be gospel
  const tokensSaved = Math.round((originalWords - compressedWords) * 1.3);

  return { compressed, fluffRemoved, tokensSaved };
}
