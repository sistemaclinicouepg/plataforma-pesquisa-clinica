/**
 * Utilitário de formatação humanizada de User-Agent para conformidade LGPD e CEP/CONEP.
 * Converte strings técnicas confusas (ex: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/155.0.0.0")
 * em descrições claras e profissionais em português: "Google Chrome — Apple Mac (macOS)".
 */
export function formatUserAgent(ua: string | null | undefined): string {
  if (!ua || ua.trim() === '' || ua === 'Browser' || ua === 'Web Browser' || ua === 'Navegador Web') {
    return 'Navegador Web';
  }

  const raw = ua.trim();

  // 1. Identificar o Navegador
  let browser = 'Navegador Web';
  if (/Edg\//i.test(raw)) {
    const match = raw.match(/Edg\/([\d.]+)/i);
    browser = match ? `Microsoft Edge (v${match[1].split('.')[0]})` : 'Microsoft Edge';
  } else if (/OPR\/|Opera/i.test(raw)) {
    const match = raw.match(/OPR\/([\d.]+)/i);
    browser = match ? `Opera (v${match[1].split('.')[0]})` : 'Opera';
  } else if (/Chrome\/|CriOS\//i.test(raw) && !/Chromium\//i.test(raw)) {
    const match = raw.match(/(?:Chrome|CriOS)\/([\d.]+)/i);
    browser = match ? `Google Chrome (v${match[1].split('.')[0]})` : 'Google Chrome';
  } else if (/Firefox\/|FxiOS\//i.test(raw)) {
    const match = raw.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
    browser = match ? `Mozilla Firefox (v${match[1].split('.')[0]})` : 'Mozilla Firefox';
  } else if (/Safari\//i.test(raw) && !/Chrome|CriOS/i.test(raw)) {
    browser = 'Apple Safari';
  }

  // 2. Identificar o Sistema Operacional e Tipo de Dispositivo
  let device = 'Computador / Dispositivo';
  if (/iPhone/i.test(raw)) {
    device = 'iPhone (Apple iOS)';
  } else if (/iPad/i.test(raw)) {
    device = 'iPad (Apple iPadOS)';
  } else if (/Android/i.test(raw)) {
    device = /Mobile/i.test(raw) ? 'Smartphone Android' : 'Tablet Android';
  } else if (/Macintosh|Mac OS X/i.test(raw)) {
    device = 'Apple Mac (macOS)';
  } else if (/Windows NT/i.test(raw)) {
    if (/Windows NT 10.0/i.test(raw)) device = 'Computador PC (Windows 10/11)';
    else device = 'Computador PC (Windows)';
  } else if (/Linux/i.test(raw)) {
    device = 'Computador (Linux)';
  }

  return `${browser} — ${device}`;
}
