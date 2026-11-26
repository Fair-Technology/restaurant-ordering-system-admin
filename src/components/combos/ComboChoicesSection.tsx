import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import type { MenuLanguage } from '../../services/api';
import { withTranslation } from '../../features/menu/translations';
import { newComboGroup, type ComboGroupForm } from '../../features/combos/combos';
import {
  MAX_GROUPS,
  choiceChips,
  reorderGroups,
  toggleDishIds,
  type CategoryDishes,
} from '../../features/combos/comboForm';
import { badgeClass } from '../layout/pageStyles';
import { editorFocusRing } from '../editor/EditorShell';
import { ComboDishPicker } from './ComboDishPicker';

const inputClass =
  'h-12 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-base text-ink placeholder-[#a39890] focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

function SortableChoice({
  id, draggable, handleLabel, children,
}: {
  id: string;
  draggable: boolean;
  handleLabel: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = draggable ? (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={handleLabel}
      className={`inline-flex h-11 w-8 flex-none cursor-grab touch-none items-center justify-center text-control hover:text-ink active:cursor-grabbing ${editorFocusRing}`}
    >
      <GripVertical size={18} aria-hidden="true" />
    </button>
  ) : null;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-[#e6d9c6] bg-white px-4 py-4 sm:px-[18px]"
    >
      {children(handle)}
    </li>
  );
}

/** The Choices section: one card per choice (1 to 5), reorderable, each with its dish chips and an "Add dishes" picker. */
export function ComboChoicesSection({
  groups,
  onChange,
  categories,
  translating,
  originalLanguage,
  langName,
  money,
}: {
  groups: ComboGroupForm[];
  onChange: (groups: ComboGroupForm[]) => void;
  categories: CategoryDishes[];
  translating: MenuLanguage | undefined;
  originalLanguage: MenuLanguage | undefined;
  langName: (l: MenuLanguage) => string;
  money: (cents: number) => string;
}) {
  const { t } = useTranslation();
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const setGroup = (key: string, patch: Partial<ComboGroupForm>) => onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(reorderGroups(groups, String(active.id), String(over.id)));
  };
  const picking = groups.find((g) => g.key === pickingKey);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-[21px] text-muted">{t('combos.choicesHelp', { max: MAX_GROUPS })}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={groups.map((g) => g.key)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-3.5">
            {groups.map((g, index) => {
              const chips = choiceChips(g.productIds, categories);
              const translated = translating ? g.nameTranslations[translating] ?? '' : '';
              const nameValue = translating ? translated : g.name;
              return (
                <SortableChoice key={g.key} id={g.key} draggable={groups.length > 1} handleLabel={t('combos.dragChoice')}>
                  {(handle) => (
                    <>
                      <div className="flex items-start gap-2">
                        {handle}
                        <span
                          aria-hidden="true"
                          className="mt-2 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand text-sm font-bold"
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            aria-label={t('combos.groupNameTranslated', { number: index + 1 })}
                            value={nameValue}
                            placeholder={translating ? g.name : t('combos.groupNamePlaceholder')}
                            maxLength={translating ? 60 : undefined}
                            onChange={(e) =>
                              translating
                                ? setGroup(g.key, { nameTranslations: withTranslation(g.nameTranslations, translating, e.target.value) })
                                : setGroup(g.key, { name: e.target.value })
                            }
                            className={`${inputClass} ${translating && g.name.trim() !== '' && translated.trim() === '' ? 'border-warn!' : ''}`}
                          />
                          {translating && g.name.trim() !== '' && translated.trim() === '' && (
                            <button
                              type="button"
                              onClick={() => setGroup(g.key, { nameTranslations: withTranslation(g.nameTranslations, translating, g.name) })}
                              className={`mt-1 min-h-11 text-[13px] font-semibold text-warn-accent underline ${editorFocusRing}`}
                            >
                              {t('dishForm.useGerman', { language: langName(originalLanguage ?? translating) })}
                            </button>
                          )}
                        </div>
                        <span className={`mt-3 flex-none ${g.productIds.length ? badgeClass.neutral : badgeClass.warn}`}>
                          {t('combos.dishCount', { count: g.productIds.length })}
                        </span>
                      </div>

                      <ul aria-label={t('combos.chipsLabel', { number: index + 1 })} className="flex flex-wrap gap-2">
                        {chips.map((c) => {
                          const label = c.kind === 'category' ? t('combos.allCurrent', { name: c.name }) : c.name;
                          return (
                            <li key={c.kind === 'category' ? `cat:${c.name}` : c.id} className="inline-flex items-center rounded-full bg-cream pl-3.5 text-sm font-semibold">
                              <span className="py-2">{label}</span>
                              <button
                                type="button"
                                aria-label={t('combos.removeDish', { name: label })}
                                onClick={() =>
                                  setGroup(g.key, { productIds: toggleDishIds(g.productIds, c.kind === 'category' ? c.ids : [c.id], false) })
                                }
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6b6058] hover:text-ink ${editorFocusRing}`}
                              >
                                <X size={14} strokeWidth={2.6} aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      <button
                        type="button"
                        onClick={() => setPickingKey(g.key)}
                        className={`inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border-[1.5px] border-dashed border-control px-5 text-sm font-semibold hover:bg-cream ${editorFocusRing}`}
                      >
                        <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                        {t('combos.addDishes')}
                      </button>

                      {groups.length > 1 && (
                        <div className="flex justify-end border-t border-line-soft pt-2">
                          <button
                            type="button"
                            onClick={() => onChange(groups.filter((x) => x.key !== g.key))}
                            className={`min-h-11 rounded-full px-3 text-[13px] font-semibold text-[#b42318] hover:bg-[#fdeceb] ${editorFocusRing}`}
                          >
                            {t('combos.removeGroup')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </SortableChoice>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {groups.length < MAX_GROUPS && (
        <button
          type="button"
          onClick={() => onChange([...groups, newComboGroup()])}
          className={`inline-flex h-12 items-center justify-center gap-2 self-start rounded-full border-[1.5px] border-control bg-white px-6 text-[15px] font-semibold hover:bg-cream ${editorFocusRing}`}
        >
          <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
          {t('combos.addGroup')}
        </button>
      )}

      {picking && (
        <ComboDishPicker
          choiceName={picking.name}
          categories={categories}
          initialIds={picking.productIds}
          money={money}
          onCancel={() => setPickingKey(null)}
          onDone={(ids) => {
            setGroup(picking.key, { productIds: ids });
            setPickingKey(null);
          }}
        />
      )}
    </div>
  );
}
