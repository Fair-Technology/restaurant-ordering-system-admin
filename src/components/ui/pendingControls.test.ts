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
 * `<MyButton` / `<MySwitch` / `<PillSwitch` (the nearest JSX tag opener before the prop decides which element owns it,
 * so `<PendingButton isPending=...>` is counted once, not twice).
 */
function countIn(file: string): number {
  const source = stripComments(read(file));
  const elements = (source.match(/<_?PendingButton\b/g) ?? []).length;
  let props = 0;
  for (const match of source.matchAll(/\bisPending=/g)) {
    const openers = [...source.slice(0, match.index).matchAll(/<([A-Z]\w*)/g)];
    const owner = openers[openers.length - 1]?.[1];
    if (owner === 'MyButton' || owner === 'MySwitch' || owner === 'PillSwitch') props += 1;
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
  { file: 'src/components/combos/ComboRow.tsx', control: 'delete combo (confirm bar)', min: 1 },
  { file: 'src/components/layout/AccountSettingsModal.tsx', control: 'language chips, sign out', min: 2 },
  { file: 'src/components/layout/AutoPausedBanner.tsx', control: 'resume orders', min: 1 },
  { file: 'src/components/layout/Sidebar.tsx', control: 'taking-orders switch', min: 1 },
  { file: 'src/components/menu/AvailabilitySwitch.tsx', control: 'availability switch (dish and combo rows)', min: 1 },
  { file: 'src/components/menu/DishEditor.tsx', control: 'delete dish', min: 1 },
  { file: 'src/components/menu/DishForm.tsx', control: 'save dish, create category inline, save as draft, add to menu', min: 4 },
  { file: 'src/components/menu/OptionGroupDialog.tsx', control: 'save group', min: 1 },
  { file: 'src/components/menu/ScheduleOfferModal.tsx', control: 'save schedule', min: 1 },
  { file: 'src/components/orders/OrderDetail.tsx', control: 'accept, reject, next step, document download', min: 5 },
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
  { file: 'src/pages/DashboardPage.tsx', control: 'refresh (two layouts)', min: 2 },
  { file: 'src/pages/LegalPage.tsx', control: 'accept DPA, save impressum, save legal, export, erase customer', min: 5 },
  { file: 'src/pages/OptionGroupsPage.tsx', control: 'delete group, option switch, retry', min: 3 },
  { file: 'src/pages/ReportsPage.tsx', control: 'retry report (the CSV download only formats the loaded report: instant)', min: 1 },
  { file: 'src/pages/ShopSettingsPage.tsx', control: 'name change, details, address, logo, banner, cover, colours, languages, hours', min: 11 },
  { file: 'src/pages/ShopsPage.tsx', control: 'create shop, shop online switch', min: 2 },
  { file: 'src/pages/StaffLoginPage.tsx', control: 'staff sign in', min: 1 },
  { file: 'src/pages/StaffPage.tsx', control: 'add staff, (de)activate, delete, save password', min: 4 },
  { file: 'src/pages/SubscriptionPage.tsx', control: 'plan CTAs, keep plan, update card, pay now, resume', min: 6 },
  { file: 'src/pages/TablesPage.tsx', control: 'download all cards, per-table PNG and PDF', min: 3 },
];

// Controls that only format data already in memory or change local state: no spinner, ever.
const INSTANT_FILES: Array<{ file: string; control: string }> = [
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

// ── Automatic guard ───────────────────────────────────────────────────────────────────────────
// The lists above only know the files someone remembered. This part walks all of src/ so a NEW
// file that fires an API call from a click cannot ship without a pending state.

const srcDir = path.join(root, 'src');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const sourceFiles = walk(srcDir)
  .map((full) => path.relative(root, full).split(path.sep).join('/'))
  .filter((file) => !/\.test\.tsx?$/.test(file) && file !== 'src/services/api.ts')
  .sort();

/** What makes a file fire a request that a person waits on. */
const API_CALL_SIGNALS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'mutation trigger (useXxxMutation())', pattern: /\buse\w+Mutation\(/ },
  { name: 'lazy query trigger (useLazyXxxQuery())', pattern: /\buseLazy\w+Query\(/ },
  { name: '.unwrap() call', pattern: /\.unwrap\(\)/ },
];

/** What shows the staffer the request is running. */
const PENDING_SIGNALS = [/\bisPending=/, /\.isLoading\b/, /\.isFetching\b/, /<PendingButton\b/, /<MySpinner\b/];
// Destructured `{ isLoading }` / `{ isFetching }` from a hook result is the common form in this codebase.
const DESTRUCTURED_PENDING = /\{[^{}]*\b(?:isLoading|isFetching)\b[^{}]*\}\s*\]?\s*=\s*use\w+/;

function apiCallsIn(source: string): string[] {
  return API_CALL_SIGNALS.filter(({ pattern }) => pattern.test(source)).map(({ name }) => name);
}

function hasPendingWiring(source: string): boolean {
  return PENDING_SIGNALS.some((pattern) => pattern.test(source)) || DESTRUCTURED_PENDING.test(source);
}

/**
 * Files that call the API but are deliberately spinner-free. Every entry needs a reason; an entry
 * that no longer calls the API (or has since been wired) fails the stale check below.
 */
const API_EXEMPT_FILES: Array<{ file: string; reason: string }> = [
  { file: 'src/features/auth/AccountLanguageSync.tsx', reason: 'not a click: saves the browser-chosen language once after sign-in' },
  { file: 'src/components/shop/StripeOnboardingModal.tsx', reason: 'Stripe Connect draws its own loading UI while it fetches the client secret' },
  { file: 'src/features/orders/useOrderActions.ts', reason: 'hook: exposes isWorking(orderId); OrdersPage and OrderDetail feed it to PendingButton' },
  { file: 'src/features/menu/useSetAvailable.ts', reason: 'hook: exposes isPending(id); ProductsPage feeds it to AvailabilitySwitch' },
  { file: 'src/features/menu/useUploadProductImage.ts', reason: 'hook: DishEditor shows its isUploading state on the save button' },
];

describe('every file that calls the API has a pending state (automatic scan)', () => {
  it('scans the real source tree', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
    expect(sourceFiles).not.toContain('src/services/api.ts');
  });

  it('flags a file with an API call and no pending wiring', () => {
    expect(apiCallsIn('const [go] = useFooMutation();')).toEqual(['mutation trigger (useXxxMutation())']);
    expect(hasPendingWiring('const [go] = useFooMutation();')).toBe(false);
    expect(hasPendingWiring('const [go, { isLoading }] = useFooMutation();')).toBe(true);
    expect(hasPendingWiring('<MyButton isPending={x} />')).toBe(true);
    expect(hasPendingWiring(stripComments('// <PendingButton'))).toBe(false);
  });

  it('every API-calling file shows pending or is exempt with a reason', () => {
    const exempt = new Set(API_EXEMPT_FILES.map((entry) => entry.file));
    const offenders = sourceFiles.flatMap((file) => {
      const source = stripComments(read(file));
      const calls = apiCallsIn(source);
      if (calls.length === 0 || hasPendingWiring(source) || exempt.has(file)) return [];
      return [
        `${file}: has ${calls.join(' + ')} but no pending wiring (isPending=, .isLoading, .isFetching, <PendingButton, <MySpinner). ` +
          'Wrap the control in PendingButton/isPending, or add the file to API_EXEMPT_FILES with a reason.',
      ];
    });
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('keeps the exemption list honest', () => {
    for (const { file, reason } of API_EXEMPT_FILES) {
      expect(reason.length, `${file}: exemption needs a reason`).toBeGreaterThan(10);
      expect(sourceFiles, `${file}: exempt file no longer exists, remove the entry`).toContain(file);
      const source = stripComments(read(file));
      expect(apiCallsIn(source).length, `${file}: no longer calls the API, remove the exemption`).toBeGreaterThan(0);
      expect(hasPendingWiring(source), `${file}: now has pending wiring, remove the exemption`).toBe(false);
    }
  });
});
