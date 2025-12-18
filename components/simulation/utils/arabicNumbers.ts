
const arabicDigits = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];

export function toArabicNumbers(input: string | number): string {
  const s = String(input);
  return s.replace(/\d/g, (d) => arabicDigits[Number(d)] ?? d);
}

// optional: format with Arabic commas
export function formatArabicNumber(n: number): string {
  const s = n.toLocaleString("en-US");
  return toArabicNumbers(s).replace(/,/g, "٬");
}
