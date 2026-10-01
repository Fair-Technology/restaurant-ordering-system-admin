import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';

describe('toCsv', () => {
  it('escapes separators, quotes and newlines', () => {
    expect(toCsv(['a'], [['x;y'], ['say "hi"'], ['l1\nl2']])).toBe(
      '﻿a\r\n"x;y"\r\n"say ""hi"""\r\n"l1\nl2"\r\n',
    );
  });

  it('neutralises formula-like cells', () => {
    expect(toCsv(['a'], [['=SUM(A1)'], ['-5']])).toBe("﻿a\r\n'=SUM(A1)\r\n'-5\r\n");
  });

  it('starts with a BOM and uses CRLF', () => {
    expect(toCsv(['a', 'b'], [])).toBe('﻿a;b\r\n');
  });
});
