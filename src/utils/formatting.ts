// Map error (cents) to brick angle
export function getAngleFromError(error: number): number {
  return error * 1.5;
}

// Map error (cents) to brick color
export function getColorFromError(error: number): string {
  const maxError = 50;
  const normalizedError = Math.max(-maxError, Math.min(maxError, error)) / maxError; // -1 to 1

  if (normalizedError > 0) {
    // sharp: interpolate from green to red
    const t = normalizedError; // 0 to 1
    const r = Math.round(34 + (239 - 34) * t);   // #22 to #ef
    const g = Math.round(229 - (229 - 68) * t);  // #e5 to #44
    const b = Math.round(95 - (95 - 68) * t);    // #5f to #44
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // flat: interpolate from green to blue
    const t = Math.abs(normalizedError); // 0 to 1
    const r = Math.round(34 - (34 - 42) * t);    // #22 to #2a
    const g = Math.round(229 - (229 - 122) * t); // #e5 to #7a
    const b = Math.round(95 + (255 - 95) * t);   // #5f to #fb
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Friendly display for note names (use sharp/flat symbols)
export function formatNoteDisplay(note: string): string {
  return note.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭');
}

// Friendly display for scale names (use sharp/flat symbols)
export function formatScaleName(name: string): string {
  return name.replace(/([A-G])b\b/g, '$1♭').replace(/#/g, '♯');
}

// Detect iPhone not in standalone mode (PWA installed to home screen)
export function isIPhoneNotStandalone(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipod/.test(userAgent);
  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIPhone && !isStandalone;
}
