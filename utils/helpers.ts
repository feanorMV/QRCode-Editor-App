
export function isValidUrl(text: string): boolean {
  if (!text.toLowerCase().startsWith('http:') && !text.toLowerCase().startsWith('https://')) {
    return false;
  }
  try {
    new URL(text);
    return true;
  } catch (e) {
    return false;
  }
}
