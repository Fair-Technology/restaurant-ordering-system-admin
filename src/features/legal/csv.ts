// Semicolon-separated with a BOM and CRLF so German-locale Excel opens it correctly.
const BOM = '﻿';

function cell(value: string): string {
  // A cell starting with = + - @ (or tab / CR) would run as a formula in a spreadsheet.
  let v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[;"\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCsv(header: string[], rows: string[][]): string {
  return BOM + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
