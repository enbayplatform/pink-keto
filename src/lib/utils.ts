/**
 * Generates a random string with custom characters.
 * @param {number} length - The desired length of the random string.
 * @param {string} [chars="abcdefghijklmnopqrstuvwxyz0123456789"] - The string of characters to choose from.
 * @returns {string} - The generated random string.
 */
const randomName = (length: number, chars = "abcdefghijklmnopqrstuvwxyz0123456789") => {
    let result = '';
    const charsLength = chars.length;
    for (let i = 0; i < length; i++) {
      // Note: Math.random() is not cryptographically secure.
      // For truly secure random strings, especially for sensitive data,
      // consider using the Web Crypto API (crypto.getRandomValues) in browsers
      // or the 'crypto' module in Node.js.
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
  };

export default randomName;