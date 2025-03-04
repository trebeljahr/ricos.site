export function deleteUndefinedValues(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] === undefined) delete obj[key];
      else obj[key] = deleteUndefinedValues(obj[key]);
    }
  }

  return obj;
}
