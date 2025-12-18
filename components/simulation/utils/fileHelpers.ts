
export function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function fileToBlobUrl(file: File): string {
  return URL.createObjectURL(file);
}
