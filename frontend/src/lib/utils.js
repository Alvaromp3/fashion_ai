/**
 * Merge class names (cn) - compatible with shadcn-style usage
 * @param  {...(string|undefined|false)[]} args
 * @returns {string}
 */
export function cn(...args) {
  return args
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
