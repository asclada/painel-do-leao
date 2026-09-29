// Contraste de cor (WCAG) para as siglas dos clubes: a cor do clube fica no fundo e o texto
// usa a cor curada só quando ela é legível (>= 4,5:1); senão, branco ou azul-noite.
function luminance(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const LIGHT = "#ffffff";
const DARK = "#081230";

export function readableText(bg: string, preferred?: string) {
  if (preferred && contrast(bg, preferred) >= 4.5) return preferred;
  return contrast(bg, LIGHT) >= contrast(bg, DARK) ? LIGHT : DARK;
}
