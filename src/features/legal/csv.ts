// Semicolon-separated with a BOM and CRLF so German-locale Excel opens it correctly.
const BOM = '﻿';

// A phone number is never a formula; plain numbers (possibly negative) are let through only when asked.
const PHONE = /^\+[\d\s()/-]+$/;
const NUMBER = /^-?\d+(,\d+)?$/;

function cell(value: string, plainNumbers: boolean): string {
  // A cell starting with = + - @ (or tab / CR) would run as a formula in a spreadsheet.
  const safe = PHONE.test(value) || (plainNumbers && NUMBER.test(value));
  let v = !safe && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[;"\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCsv(header: string[], rows: string[][], options?: { plainNumbers?: boolean }): string {
  const plainNumbers = options?.plainNumbers ?? false;
  return BOM + [header, ...rows].map((r) => r.map((c) => cell(c, plainNumbers)).join(';')).join('\r\n') + '\r\n';
}
