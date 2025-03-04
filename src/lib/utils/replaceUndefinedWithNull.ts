export function replaceUndefinedWithNull(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      obj[key] = replaceUndefinedWithNull(obj[key]);
    }
  }

  return obj;
}
