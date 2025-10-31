export interface Correction {
  original: string;
  corrected: string;
  startIndex: number;
  endIndex: number;
}

export function mockGrammarCheck(text: string): {
  correctedText: string;
  corrections: Correction[];
} {
  const corrections: Correction[] = [];
  let correctedText = text;
  
  const replacements: Array<[RegExp, string]> = [
    [/\bi\b/g, 'I'],
    [/\bteh\b/g, 'the'],
    [/\brecieve\b/g, 'receive'],
    [/\boccured\b/g, 'occurred'],
    [/\bseperate\b/g, 'separate'],
    [/\bdefinately\b/g, 'definitely'],
    [/\bwierd\b/g, 'weird'],
    [/\baccommodate\b/g, 'accommodate'],
  ];

  replacements.forEach(([pattern, replacement]) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      corrections.push({
        original: match[0],
        corrected: replacement,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  });

  replacements.forEach(([pattern, replacement]) => {
    correctedText = correctedText.replace(pattern, replacement);
  });

  return { correctedText, corrections };
}