// Format sisa waktu countdown lockout (pure, tanpa React) agar mudah diuji.
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}
