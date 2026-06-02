export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') {
      return message
    }
  }
  return String(error)
}
