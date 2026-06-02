export function keyboardEventToKeyName(event: KeyboardEvent): string {
  const code = event.code
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3).toUpperCase()
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code
  }
  if (code.startsWith('Numpad')) {
    return code
  }
  if (code.startsWith('Arrow')) {
    return code
  }
  if (code.startsWith('Shift') || code.startsWith('Control') || code.startsWith('Alt')) {
    return code
  }
  if (code === 'MetaLeft' || code === 'MetaRight') {
    return code
  }
  if (code.startsWith('F') && Number.isInteger(Number(code.slice(1)))) {
    return code
  }
  if (code.length > 0) {
    return code
  }
  return event.key.length === 1 ? event.key.toUpperCase() : event.key
}
