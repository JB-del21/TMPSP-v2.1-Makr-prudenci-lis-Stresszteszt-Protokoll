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
