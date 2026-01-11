/**
 * Remove specified fields from an object
 * Commonly used to remove sensitive data like password
 */
export const unGetData = <T extends Record<string, any>>({
  fields,
  object
}: {
  fields: string[]
  object: T
}): Omit<T, typeof fields[number]> => {
  const result = { ...object }
  for (const field of fields) {
    delete result[field]
  }
  return result
}

/**
 * Pick only specified fields from an object
 */
export const getOnlyData = <T extends Record<string, any>>({
  fields,
  object
}: {
  fields: (keyof T)[]
  object: T
}): Partial<T> => {
  const result: Partial<T> = {}
  for (const field of fields) {
    if (object[field] !== undefined) {
      result[field] = object[field]
    }
  }
  return result
}

/**
 * Generate a sequential code with prefix and padded id
 * Example: generateCode('NV', 5) => 'NV005'
 *          generateCode('KH', 42, 4) => 'KH0042'
 */
export const generateCode = (prefix: string, id: number, padding: number = 3): string => {
  return `${prefix}${String(id).padStart(padding, '0')}`
}

/**
 * Parse pagination parameters with defaults
 */
export const parsePagination = (page?: number, limit?: number) => {
  const parsedPage = Math.max(1, page || 1)
  const parsedLimit = Math.min(100, Math.max(1, limit || 20))
  const skip = (parsedPage - 1) * parsedLimit
  return { page: parsedPage, limit: parsedLimit, skip }
}
