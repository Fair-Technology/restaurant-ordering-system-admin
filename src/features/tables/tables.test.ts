import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { parseTableNumbers, qrPngDataUrl, tableUrl } from './tableLinks';
import { buildTableCardsPdf, pdfSafe } from './tableCards';

describe('table QR cards', () => {
  it('builds the table link', () => {
    expect(tableUrl('https://x.example/', 'mapasta', 'Terrasse 3')).toBe(
      'https://x.example/shops/mapasta?t=Terrasse%203',
    );
  });

  it('reads a list of table numbers', () => {
    expect(parseTableNumbers(' 1, 2 ,Terrasse  3,, Bar 1 Links hinten, 2')).toEqual({
      valid: ['1', '2', 'Terrasse 3'],
      invalid: ['Bar 1 Links hinten'],
      tooMany: false,
    });
    const many = parseTableNumbers(Array.from({ length: 101 }, (_, i) => String(i + 1)).join(','));
    expect(many.valid.length).toBe(100);
    expect(many.tooMany).toBe(true);
  });

  it('makes a PNG QR code', async () => {
    expect(await qrPngDataUrl('https://x.example/shops/mapasta?t=7')).toMatch(/^data:image\/png;base64,/);
  });

  it('one A6 page per card', async () => {
    const b64 = await buildTableCardsPdf({
      shopName: 'Ma Pasta',
      language: 'de',
      cards: [
        { label: '7', url: 'https://x.example/shops/mapasta?t=7' },
        { label: 'B1', url: 'https://x.example/shops/mapasta?t=B1' },
      ],
    });
    const doc = await PDFDocument.load(b64);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(297.64);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(419.53);
  });

  it('characters the PDF font cannot draw become question marks', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold);
    expect(pdfSafe('Pizza 🍕 Haus', font)).toBe('Pizza ? Haus');
    expect(pdfSafe('Außen-12 – 5 €', font)).toBe('Außen-12 – 5 €');
  });
});
