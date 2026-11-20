import type { TFunction } from 'i18next';

// Generic (non-personalised) actor labels the backend emits when no real name resolves.
const GENERIC_ACTOR_FALLBACKS: Record<string, string> = {
  owner: 'Owner',
  superadmin: 'Platform',
  system: 'System',
  staff: 'Deleted staff account',
};

const GENERIC_ACTOR_KEY: Record<string, string> = {
  owner: 'owner',
  superadmin: 'platform',
  system: 'system',
  staff: 'staffDeleted',
};

/** Translates the backend's generic English actor fallbacks; real names pass through unchanged. */
export function resolveActorDisplayLabel(label: string, actorType: string, t: TFunction): string {
  if (GENERIC_ACTOR_FALLBACKS[actorType] === label) {
    return t(`activity.actor.${GENERIC_ACTOR_KEY[actorType]}`);
  }
  return label;
}

/**
 * Action keys contain dots ("shop.update"), so a normal `t('activity.action.shop.update')` would
 * traverse nested objects and miss. keySeparator: false doesn't help either (it flattens the whole
 * path, including "activity.action"). Instead fetch the `activity.action` map and index it by the
 * raw action string. Unknown actions fall back to a humanised version of the key.
 */
export function resolveActionLabel(action: string, t: TFunction): string {
  const labels = t('activity.action', { returnObjects: true, defaultValue: {} }) as unknown;
  if (labels && typeof labels === 'object') {
    const label = (labels as Record<string, unknown>)[action];
    if (typeof label === 'string') return label;
  }
  return humaniseActionKey(action);
}

/** Turns an untranslated action key ("shop.nameChange.requested") into readable text ("Shop name change requested"). */
export function humaniseActionKey(action: string): string {
  const spaced = action
    .replace(/[._]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
