/**
 * Pure TypeScript SHA-256 megvalósítás (FIPS 180-4 szabvány)
 * Teljesen platformfüggetlen: hibátlanul fut böngészőben (Vite) és Node.js-ben (CLI / Express) is.
 * Nincs szüksége a Node.js 'crypto' modulra, így böngészőben nem okoz externalized hibát.
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number;
  let j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  // Kezdeti hash értékek: az első 8 prímszám négyzetgyökeinek tört részei
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80'; // 1 bit hozzáadása
  while ((ascii.length % 64) - 56) ascii += '\x00'; // Padding

  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  // Fő feldolgozási ciklus (512 bites blokkok)
  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : ((w[i - 16] + s0 + w[i - 7] + s1) | 0);

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

      const t1 = (hash[7] + sigma1 + ch + k[i] + w[i]) | 0;
      const t2 = (sigma0 + maj) | 0;

      hash = [(t1 + t2) | 0, hash[0], hash[1], hash[2], (hash[3] + t1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * UTF-8 szöveg enkódolása tiszta ASCII/bájt reprezentációra SHA-256 előtt
 */
export function sha256Utf8(str: string): string {
  let utf8 = '';
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8 += String.fromCharCode(charcode);
    } else if (charcode < 0x800) {
      utf8 += String.fromCharCode(0xc0 | (charcode >> 6));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8 += String.fromCharCode(0xe0 | (charcode >> 12));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 6) & 0x3f));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8 += String.fromCharCode(0xf0 | (charcode >> 18));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 12) & 0x3f));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 6) & 0x3f));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    }
  }
  return sha256(utf8);
}

/**
 * UTF-8 sztring konvertálása bájt tömbbé
 */
export function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      bytes.push(charcode);
    } else if (charcode < 0x800) {
      bytes.push(0xc0 | (charcode >> 6));
      bytes.push(0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      bytes.push(0xe0 | (charcode >> 12));
      bytes.push(0x80 | ((charcode >> 6) & 0x3f));
      bytes.push(0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (charcode >> 18));
      bytes.push(0x80 | ((charcode >> 12) & 0x3f));
      bytes.push(0x80 | ((charcode >> 6) & 0x3f));
      bytes.push(0x80 | (charcode & 0x3f));
    }
  }
  return bytes;
}

/**
 * Hexadecimális sztring konvertálása bájt tömbbé
 */
export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

/**
 * Pure TypeScript HMAC-SHA256 megvalósítás (FIPS 198-1 szabvány)
 * 100%-ban platformfüggetlen: hibátlanul fut böngészőben (Vite) és Node.js-ben is.
 */
export function hmacSha256Utf8(key: string, message: string): string {
  let keyBytes = toUtf8Bytes(key);
  if (keyBytes.length > 64) {
    const keyHashHex = sha256Utf8(key);
    keyBytes = hexToBytes(keyHashHex);
  }
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }

  const ipadBytes = keyBytes.map((b) => b ^ 0x36);
  const opadBytes = keyBytes.map((b) => b ^ 0x5c);

  const msgBytes = toUtf8Bytes(message);
  const innerInput = ipadBytes.map((b) => String.fromCharCode(b)).join('') + msgBytes.map((b) => String.fromCharCode(b)).join('');
  const innerHashHex = sha256(innerInput);

  const innerHashBytes = hexToBytes(innerHashHex);
  const outerInput = opadBytes.map((b) => String.fromCharCode(b)).join('') + innerHashBytes.map((b) => String.fromCharCode(b)).join('');
  return sha256(outerInput);
}

/**
 * Platformfüggetlen Constant-Time Sztring Összehasonlítás
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

