import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(file: string): string {
  return fs.readFileSync(path.resolve(root, file), 'utf-8');
}

/** Block comments and line comments (not the `//` in a URL) removed, so a commented-out control cannot pass. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/**
 * Pending-wrapped controls in a file: `<PendingButton` elements plus `isPending=` props handed to
 * `<MyButton` / `<MySwitch` (the nearest JSX tag opener before the prop decides which element owns it,
 * so `<PendingButton isPending=...>` is counted once, not twice).
 */
function countIn(file: string): number {
  const source = stripComments(read(file));
  const elements = (source.match(/<_?PendingButton\b/g) ?? []).length;
  let props = 0;
  for (const match of source.matchAll(/\bisPending=/g)) {
    const openers = [...source.slice(0, match.index).matchAll(/<([A-Z]\w*)/g)];
    const owner = openers[openers.length - 1]?.[1];
    if (owner === 'MyButton' || owner === 'MySwitch') props += 1;
  }
  return elements + props;
}

describe('pending wrapper contract', () => {
  const parts = (source: string, needles: string[]) =>
    needles.forEach((needle) => expect(source, `missing: ${needle}`).toContain(needle));

  it('PendingButton keeps every part of the pending contract', () => {
    const source = stripComments(read('src/components/ui/PendingButton.tsx'));
    parts(source, [
      'aria-busy=',
      'data-pending=',
      'cursor-progress',
      'opacity-50',
      'disabled={disabled || isPending}',
      'data-pending-spinner',
      'animate-spin',
      'spinner = true',
      'spinnerDelayMs = 120',
      'spinner?: boolean',
      'spinnerDelayMs?: number',
    ]);
  });

  it.each(['src/components/ui/MyButton.tsx', 'src/components/ui/MySwitch.tsx'])(
    '%s still takes isPending and renders the shared PendingButton',
    (file) => {
      const source = stripComments(read(file));
      expect(source).toMatch(/isPending\??:\s*boolean/);
      expect(source).toContain("import { PendingButton } from './PendingButton'");
      expect(source).toMatch(/if \(isPending\)/);
      expect(source).toContain('<PendingButton');
    },
  );

  it('MySwitch draws its own spinner glyph because its knob must not move', () => {
    const source = stripComments(read('src/components/ui/MySwitch.tsx'));
    parts(source, ['spinner={false}', 'data-pending-spinner', 'animate-spin']);
  });
});

// One entry per file with an awaiting control; `min` = pending-wrapped controls it must contain.
const ASYNC_CONTROLS: Array<{ file: string; control: string; min: number }> = [
  { file: 'src/components/categories/CategoryEditor.tsx', control: 'apply tax class, save, delete category', min: 3 },
  { file: 'src/components/combos/ComboEditor.tsx', control: 'save combo (create and edit forms)', min: 2 },
  { file: 'src/components/layout/AutoPausedBanner.tsx', control: 'resume orders', min: 1 },
  { file: 'src/components/layout/TopNav.tsx', control: 'taking-orders switch', min: 1 },
  { file: 'src/components/menu/DishEditor.tsx', control: 'save dish, delete dish', min: 2 },
  { file: 'src/components/menu/ScheduleOfferModal.tsx', control: 'save schedule', min: 1 },
  { file: 'src/components/orders/OrderHistoryList.tsx', control: 'document download', min: 1 },
  { file: 'src/components/orders/ReceiptsArchiveButton.tsx', control: 'receipts archive download', min: 1 },
  { file: 'src/components/orders/RefundPanel.tsx', control: 'confirm refund', min: 1 },
  { file: 'src/components/promotions/DiscountCodesCard.tsx', control: 'create code, activate/deactivate code', min: 2 },
  { file: 'src/components/promotions/LoyaltyCard.tsx', control: 'save loyalty', min: 1 },
  { file: 'src/components/shop/AutoAcceptCard.tsx', control: 'save auto-accept', min: 1 },
  { file: 'src/components/shop/DeleteShopCard.tsx', control: 'delete shop', min: 1 },
  { file: 'src/components/shop/DeliveryCard.tsx', control: 'save delivery', min: 1 },
  { file: 'src/components/shop/DineInCard.tsx', control: 'save dine-in', min: 1 },
  { file: 'src/components/shop/GoLiveModal.tsx', control: 'confirm go live', min: 1 },
  { file: 'src/components/shop/KitchenTimingCard.tsx', control: 'save kitchen timing', min: 1 },
  { file: 'src/components/shop/OrderAlertsCard.tsx', control: 'save order alerts', min: 1 },
  { file: 'src/components/shop/PauseOrdersDialog.tsx', control: 'confirm pause', min: 1 },
  { file: 'src/components/shop/PaymentsCard.tsx', control: 'confirm disconnect Stripe', min: 1 },
  { file: 'src/components/shop/ScheduledOrdersCard.tsx', control: 'save scheduled orders', min: 1 },
  { file: 'src/components/shop/ShopStatusCard.tsx', control: 'online switch, paused switch, save paused message', min: 3 },
  { file: 'src/components/ui/ImageCropDialog.tsx', control: 'save crop', min: 1 },
  { file: 'src/pages/CategoriesPage.tsx', control: 'create category, category active switch', min: 2 },
  { file: 'src/pages/CombosPage.tsx', control: 'combo active toggle, delete combo', min: 2 },
  { file: 'src/pages/DashboardPage.tsx', control: 'refresh (two layouts)', min: 2 },
  { file: 'src/pages/LegalPage.tsx', control: 'accept DPA, save impressum, save legal, export, erase customer', min: 5 },
  { file: 'src/pages/OptionGroupsPage.tsx', control: 'save group, delete group, option switch, retry', min: 4 },
  { file: 'src/pages/ProductWizardSteps.tsx', control: 'create category inline', min: 1 },
  { file: 'src/pages/ProductsPage.tsx', control: 'create product, product available switch', min: 2 },
  { file: 'src/pages/ShopSettingsPage.tsx', control: 'name change, details, address, logo, banner, cover, colours, languages, hours', min: 11 },
  { file: 'src/pages/ShopsPage.tsx', control: 'create shop, shop online switch', min: 2 },
  { file: 'src/pages/StaffLoginPage.tsx', control: 'staff sign in', min: 1 },
  { file: 'src/pages/StaffPage.tsx', control: 'add staff, (de)activate, delete, save password', min: 4 },
  { file: 'src/pages/SubscriptionPage.tsx', control: 'plan CTAs, keep plan, update card, pay now, resume', min: 6 },
  { file: 'src/pages/TablesPage.tsx', control: 'download all cards, per-table PNG and PDF', min: 3 },
];

// Controls that only format data already in memory or change local state: no spinner, ever.
const INSTANT_FILES: Array<{ file: string; control: string }> = [
  { file: 'src/pages/ReportsPage.tsx', control: 'CSV download formats the loaded report' },
  { file: 'src/components/layout/AccountSettingsModal.tsx', control: 'language chips, close, sign out (redirect)' },
  { file: 'src/components/ui/CategoryPicker.tsx', control: 'picker' },
  { file: 'src/components/ui/IconPicker.tsx', control: 'picker' },
  { file: 'src/components/shop/StripeOnboardingModal.tsx', control: 'close (Stripe draws its own UI)' },
];

// Exact anchors that must survive in the source (comments stripped).
const ANCHORS: Array<{ file: string; anchor: string }> = [
  { file: 'src/components/shop/DeleteShopCard.tsx', anchor: '<PendingButton' },
  { file: 'src/components/shop/AutoAcceptCard.tsx', anchor: 'isPending={isLoading}' },
  { file: 'src/components/orders/ReceiptsArchiveButton.tsx', anchor: 'isPending={isFetching}' },
  { file: 'src/pages/TablesPage.tsx', anchor: "isPending={building === 'all'}" },
];

describe('async controls show a pending state', () => {
  it('keeps the registry sorted by path', () => {
    const files = ASYNC_CONTROLS.map((entry) => entry.file);
    expect(files).toEqual([...files].sort());
  });

  it.each(ASYNC_CONTROLS)('$file', ({ file, control, min }) => {
    const count = countIn(file);
    expect(count, `${file}: expected at least ${min} pending-wrapped controls (${control})`).toBeGreaterThanOrEqual(min);
  });

  it.each(ANCHORS)('$file keeps $anchor', ({ file, anchor }) => {
    expect(stripComments(read(file)), `${file}: missing ${anchor}`).toContain(anchor);
  });

  it('the counter ignores comments and double-counting', () => {
    expect(stripComments('// <PendingButton\n{/* <PendingButton */}<b/>')).not.toContain('PendingButton');
    expect(stripComments("const u = 'https://x.y';")).toContain('https://x.y');
  });
});

describe('instant controls stay unwrapped', () => {
  it.each(INSTANT_FILES)('$file ($control)', ({ file, control }) => {
    expect(countIn(file), `${file}: must have 0 pending-wrapped controls, it does not await (${control})`).toBe(0);
  });
});
