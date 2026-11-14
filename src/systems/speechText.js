// speechText.js — turns a written line into text a speech voice reads well.
// PURE: no DOM. "2×" would be read as "2 x", "H₂O" as "H O", "kg" as "k g" — so we spell
// those out. Used by ui/voltVoice.js; tested in tests/speechText.test.js.

const SUBSCRIPT = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4' };

export function toSpeech(text) {
  return String(text)
    .replace(/<[^>]+>/g, '') // HTML from the mini-game bubbles
    .replace(/→/g, ' ')
    .replace(/(\d)\s*×/g, '$1 times')
    .replace(/\b1\/6\b/g, 'one sixth')
    .replace(/([A-Z][a-z]?)([₀-₄])/g, (_, el, sub) => `${el} ${SUBSCRIPT[sub]} `) // H₂O → "H 2 O"
    .replace(/(\d)\s*kWh\b/g, '$1 kilowatt hours')
    .replace(/(\d)\s*kg\b/g, '$1 kilograms')
    .replace(/\bW A S D\b/g, 'W, A, S, D')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
