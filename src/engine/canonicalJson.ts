/**
 * TMPSP v2.1 RFC 8785 JSON Kánonikus Szerializációs Motor (JCS)
 * Szigorú, szabványos determinisztikus JSON kódolás kriptográfiai SHA-256 lenyomatképzéshez.
 * 
 * RFC 8785 Követelmények:
 * 1. Bemenet kizárólag érvényes JSON típus lehet (nem engedélyezett: undefined, function, symbol, bigint).
 * 2. Tilos nem-JSON értékek csendes kihagyása vagy null-ra cserélése: szigorú TypeError kivétel.
 * 3. Objektumkulcsok szigorú UTF-16 kódrendezése (lexicographical comparison of 16-bit code units).
 * 4. Számok: ECMAScript Number::toString szabvány, -0 normalizálása 0-ra, NaN és Infinity tiltott.
 * 5. Szövegek: magányos/páratlan UTF-16 surrogate kódpontok (U+D800 - U+DFFF) szigorú elutasítása.
 * 6. Zéró felesleges whitespace a tokenek között.
 */

export class CanonicalJsonError extends TypeError {
  constructor(message: string) {
    super(`RFC 8785 JCS Hiba: ${message}`);
    this.name = 'CanonicalJsonError';
  }
}

/**
 * Szöveges érték ellenőrzése és RFC 8785 szerinti determinisztikus formázása
 */
export function canonicalizeString(str: string): string {
  // 1. Magányos / páratlan UTF-16 surrogate vizsgálata
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // Magas surrogate: a következő karakternek kötelezően alacsony surrogate-nek kell lennie
      if (i + 1 >= str.length) {
        throw new CanonicalJsonError(`Csonka magas UTF-16 surrogate a string végén (pozíció: ${i}).`);
      }
      const nextCode = str.charCodeAt(i + 1);
      if (nextCode < 0xdc00 || nextCode > 0xdfff) {
        throw new CanonicalJsonError(`Páratlan magas UTF-16 surrogate a(z) ${i}. pozíción (nem követi alacsony surrogate).`);
      }
      i++; // Páros surrogate érvényes, a párt átugorjuk
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Alacsony surrogate magas pár nélkül
      throw new CanonicalJsonError(`Magányos alacsony UTF-16 surrogate a(z) ${i}. pozíción.`);
    }
  }

  // 2. RFC 8785 escape szabályok:
  // Csak a megkövetelt vezérlőkarakterek (\", \\, \b, \f, \n, \r, \t, és \u0000-\u001f) kerülnek escape-elésre.
  // Minden más karakter (magyar ékezetek, Unicode szimbólumok, perjelek) nyers UTF-8 marad.
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = str.charCodeAt(i);
    switch (ch) {
      case '"':
        result += '\\"';
        break;
      case '\\':
        result += '\\\\';
        break;
      case '\b':
        result += '\\b';
        break;
      case '\f':
        result += '\\f';
        break;
      case '\n':
        result += '\\n';
        break;
      case '\r':
        result += '\\r';
        break;
      case '\t':
        result += '\\t';
        break;
      default:
        if (code < 0x20) {
          // Kisbetűs hexadecimális vezérlőkarakter kódolás: \u00XX
          result += '\\u00' + (code < 0x10 ? '0' : '') + code.toString(16);
        } else {
          result += ch;
        }
        break;
    }
  }
  result += '"';
  return result;
}

/**
 * Számok kanonizálása ECMAScript Number::toString szerint
 */
export function canonicalizeNumber(num: number): string {
  if (!Number.isFinite(num)) {
    throw new CanonicalJsonError(`Érvénytelen lebegőpontos szám: ${num} (NaN és Infinity nem engedélyezett).`);
  }
  // -0 normalizálása 0-ra
  if (Object.is(num, -0)) {
    return '0';
  }
  return num.toString();
}

/**
 * RFC 8785 szerinti teljes determinisztikus szerializáció
 */
export function canonicalJsonStringify(value: unknown): string {
  // Szigorú típusellenőrzés: nem-JSON típusok azonnali elutasítása
  if (value === undefined) {
    throw new CanonicalJsonError("Az 'undefined' érték nem érvényes JSON adat.");
  }
  if (typeof value === 'function') {
    throw new CanonicalJsonError("Függvény típus nem érvényes JSON adat.");
  }
  if (typeof value === 'symbol') {
    throw new CanonicalJsonError("Symbol típus nem érvényes JSON adat.");
  }
  if (typeof value === 'bigint') {
    throw new CanonicalJsonError("BigInt típus nem szerializálható standard JSON-be.");
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return canonicalizeNumber(value);
  }

  if (typeof value === 'string') {
    return canonicalizeString(value);
  }

  if (Array.isArray(value)) {
    const elements: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const elem = value[i];
      if (elem === undefined || typeof elem === 'function' || typeof elem === 'symbol') {
        throw new CanonicalJsonError(
          `A tömb ${i}. eleme nem érvényes JSON típus (${typeof elem}). RFC 8785 tiltja a csendes null-konverziót.`
        );
      }
      elements.push(canonicalJsonStringify(elem));
    }
    return `[${elements.join(',')}]`;
  }

  if (typeof value === 'object') {
    // Szigorú nem-JSON objektum-típusok szűrése (CAN-001)
    if (
      value instanceof Date ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof RegExp ||
      value instanceof Error
    ) {
      throw new CanonicalJsonError(
        `A(z) '${value.constructor?.name}' nem érvényes JSON objektum típus. RFC 8785 csak egyszerű JSON objektumokat engedélyez.`
      );
    }

    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new CanonicalJsonError('Szimbólum kulcsos tulajdonságok nem engedélyezettek az RFC 8785 kánonikus JSON-ben.');
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      throw new CanonicalJsonError(
        `Nem egyszerű JSON objektum (prototípus: ${proto?.constructor?.name ?? 'egyedi'}). Csak nyers JSON objektumok szerializálhatók.`
      );
    }

    const obj = value as Record<string, unknown>;

    // Kulcsok kinyerése és szigorú UTF-16 kódrendezése (RFC 8785 Section 3.2.3)
    const rawKeys = Object.keys(obj);
    const sortedKeys = rawKeys.sort((a, b) => {
      return a < b ? -1 : a > b ? 1 : 0;
    });

    const pairs: string[] = [];
    for (const key of sortedKeys) {
      const val = obj[key];
      if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
        throw new CanonicalJsonError(
          `A(z) '${key}' kulcs értéke nem érvényes JSON típus (${typeof val}). RFC 8785 tiltja a csendes mezőelhagyást.`
        );
      }

      const serializedKey = canonicalizeString(key);
      const serializedVal = canonicalJsonStringify(val);
      pairs.push(`${serializedKey}:${serializedVal}`);
    }

    return `{${pairs.join(',')}}`;
  }

  throw new CanonicalJsonError(`Ismeretlen és nem támogatott adattípus: ${typeof value}`);
}
