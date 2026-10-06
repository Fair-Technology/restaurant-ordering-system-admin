import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { qrPngDataUrl } from './tableLinks';

export interface TableCard {
  label: string;
  url: string;
}

export const A6: [number, number] = [297.64, 419.53];

export const CARD_COPY: Record<'de' | 'en', { tableCaption: string; tableFooter: string }> = {
  de: { tableCaption: 'Tisch', tableFooter: 'Scannen und bestellen' },
  en: { tableCaption: 'Table', tableFooter: 'Scan to order' },
};

/** Replaces characters the PDF font cannot draw with "?". */
export function pdfSafe(text: string, font: PDFFont): string {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return '?';
      }
    })
    .join('');
}

/** One A6 page per card; returned as base64 for downloadBase64File. */
export async function buildTableCardsPdf(input: {
  shopName: string;
  language: 'de' | 'en';
  cards: TableCard[];
}): Promise<string> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const copy = CARD_COPY[input.language];
  const [W] = A6;
  const centre = (page: PDFPage, text: string, size: number, y: number, font: PDFFont) => {
    const safe = pdfSafe(text, font);
    page.drawText(safe, { x: (W - font.widthOfTextAtSize(safe, size)) / 2, y, size, font, color: rgb(0, 0, 0) });
  };
  for (const card of input.cards) {
    const page = doc.addPage(A6);
    const png = await doc.embedPng(await qrPngDataUrl(card.url));
    centre(page, input.shopName, 12, 385, regular);
    centre(page, copy.tableCaption, 12, 355, regular);
    centre(page, card.label, 28, 320, bold);
    page.drawImage(png, { x: (W - 200) / 2, y: 95, width: 200, height: 200 });
    centre(page, copy.tableFooter, 11, 70, regular);
  }
  return doc.saveAsBase64();
}
