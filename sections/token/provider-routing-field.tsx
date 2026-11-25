'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis
} from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  X
} from 'lucide-react';
import { useText } from '@/components/locale-text';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  deselectProvider,
  isProviderRoutingEmpty,
  reorderProviders,
  selectProvider,
  setOnlySelected,
  toggleIgnoredProvider,
  unavailableModels,
  unknownProviders,
  usableSources
} from '@/lib/provider-routing';
import type { TokenProviderRouting, TokenSource } from '@/lib/types/token';

// How many unavailable models to list before summarising the rest.
const MODEL_PREVIEW = 12;

interface Option {
  name: string;
  label: string;
  detail: string;
}

function SortableProvider({
  name,
  index,
  label,
  detail,
  unavailable,
  onRemove
}: {
  name: string;
  index: number;
  label: string;
  detail: string;
  unavailable: boolean;
  onRemove: () => void;
}) {
  const tr = useText();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: name });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background px-2 py-2',
        isDragging && 'relative z-10 shadow-md'
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        aria-label={tr('Reorder {name}', { name: label })}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      {unavailable && (
        <Badge variant="outline" className="shrink-0 font-normal">
          {tr('Unavailable')}
        </Badge>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onRemove}
        aria-label={tr('Remove {name}', { name: label })}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

function ProviderPicker({
  label,
  options,
  selected,
  onSelect,
  disabled
}: {
  label: string;
  options: Option[];
  /** Names shown with a check mark. Picking one of them again deselects it. */
  selected?: string[];
  onSelect: (name: string) => void;
  disabled?: boolean;
}) {
  const tr = useText();
  const [open, setOpen] = useState(false);
  const multiple = selected !== undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={tr('Search providers')} />
          <CommandList>
            <CommandEmpty>{tr('No providers found.')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = multiple && selected.indexOf(option.name) >= 0;
                return (
                  <CommandItem
                    key={option.name}
                    value={`${option.label} ${option.name}`}
                    onSelect={() => {
                      onSelect(option.name);
                      if (!multiple) setOpen(false);
                    }}
                  >
                    {multiple && (
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                          checked
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{option.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {option.detail}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Provider routing of an API key: the providers to use and their order, whether
 * to stay inside that selection, and the providers to never use.
 */
export function ProviderRoutingField({
  value,
  onChange,
  sources,
  loadFailed
}: {
  value: TokenProviderRouting;
  onChange: (value: TokenProviderRouting) => void;
  sources: TokenSource[];
  /** The provider list could not be loaded; availability is unknown. */
  loadFailed: boolean;
}) {
  const tr = useText();
  // Keys that already have routing open with it visible.
  const [open, setOpen] = useState(() => !isProviderRoutingEmpty(value));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byName = useMemo(() => {
    const map: Record<string, TokenSource> = {};
    sources.forEach((source) => {
      map[source.name] = source;
    });
    return map;
  }, [sources]);

  const labelOf = (name: string) => byName[name]?.display_name || name;
  const detailOf = (name: string) => {
    const source = byName[name];
    if (source) {
      return source.models.length === 1
        ? tr('1 model')
        : tr('{count} models', { count: source.models.length });
    }
    return loadFailed ? name : tr('Not available on your account right now');
  };
  const optionOf = (name: string): Option => ({
    name,
    label: labelOf(name),
    detail: detailOf(name)
  });

  // A provider is either selected, ignored, or neither.
  const selectable = sources
    .filter(
      (source) =>
        value.order.indexOf(source.name) < 0 &&
        value.ignore.indexOf(source.name) < 0
    )
    .map((source) => optionOf(source.name));
  // Ignored names stay in the list so they can be unticked even if the provider is gone.
  const ignorable = value.ignore
    .filter((name) => !byName[name])
    .concat(
      sources
        .map((source) => source.name)
        .filter((name) => value.order.indexOf(name) < 0)
    )
    .map(optionOf);

  const missingProviders = loadFailed ? [] : unknownProviders(sources, value);
  const missingModels = loadFailed ? [] : unavailableModels(sources, value);
  const nothingUsable =
    !loadFailed &&
    !isProviderRoutingEmpty(value) &&
    usableSources(sources, value).length === 0;

  const summary = (() => {
    if (isProviderRoutingEmpty(value)) {
      return tr('All available providers, default order');
    }
    const parts: string[] = [];
    if (value.order.length > 0) {
      parts.push(value.order.map(labelOf).join(' → '));
    }
    if (value.only) parts.push(tr('only selected'));
    if (value.ignore.length > 0) {
      parts.push(
        tr('ignoring {names}', { names: value.ignore.map(labelOf).join(', ') })
      );
    }
    return parts.join(' · ');
  })();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = value.order.indexOf(String(active.id));
    const to = value.order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(reorderProviders(value, arrayMove(value.order, from, to)));
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium">{tr('Provider routing')}</div>
            <div className="truncate text-sm text-muted-foreground">
              {summary}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 border-t px-4 py-4">
        <p className="text-sm text-muted-foreground">
          {tr(
            'Optional. Choose which upstream providers this key uses and in what order.'
          )}
        </p>
        {loadFailed && (
          <p className="text-sm text-muted-foreground">
            {tr('Unable to load providers.')}
          </p>
        )}

        <div className="space-y-2">
          <Label>{tr('Provider selection')}</Label>
          <p className="text-sm text-muted-foreground">
            {tr(
              'Requests try the selected providers from top to bottom. Drag to reorder.'
            )}
          </p>
          {value.order.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {tr(
                'No provider selected. All available providers are used in the default order.'
              )}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={value.order}
                strategy={verticalListSortingStrategy}
              >
                <ol className="space-y-2">
                  {value.order.map((name, index) => (
                    <SortableProvider
                      key={name}
                      name={name}
                      index={index}
                      label={labelOf(name)}
                      detail={detailOf(name)}
                      unavailable={!loadFailed && !byName[name]}
                      onRemove={() => onChange(deselectProvider(value, name))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
          <ProviderPicker
            label={tr('Add provider')}
            options={selectable}
            onSelect={(name) => onChange(selectProvider(value, name))}
            disabled={selectable.length === 0}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="provider-routing-only">
              {tr('Only selected providers')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {value.order.length === 0
                ? tr('Select at least one provider to turn this on.')
                : tr(
                    'When off, the other providers are used after the selected ones. When on, requests never leave the selection.'
                  )}
            </p>
          </div>
          <Switch
            id="provider-routing-only"
            checked={value.only}
            disabled={value.order.length === 0}
            onCheckedChange={(checked) =>
              onChange(setOnlySelected(value, checked))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>{tr('Ignore providers')}</Label>
          <p className="text-sm text-muted-foreground">
            {tr('This key never uses these providers, including for retries.')}
          </p>
          {value.ignore.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.ignore.map((name) => (
                <Badge
                  key={name}
                  variant="secondary"
                  className="gap-1 pr-1 font-normal"
                >
                  {labelOf(name)}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onChange(toggleIgnoredProvider(value, name))}
                    aria-label={tr('Remove {name}', { name: labelOf(name) })}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <ProviderPicker
            label={tr('Ignore providers')}
            options={ignorable}
            selected={value.ignore}
            onSelect={(name) => onChange(toggleIgnoredProvider(value, name))}
            disabled={ignorable.length === 0}
          />
        </div>

        {nothingUsable && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {tr(
                'No provider is left for this key. Requests will fail until you change the routing.'
              )}
            </AlertDescription>
          </Alert>
        )}
        {!nothingUsable && missingModels.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="space-y-1">
              <div>
                {missingModels.length === 1
                  ? tr('1 model is not available with this routing')
                  : tr('{count} models are not available with this routing', {
                      count: missingModels.length
                    })}
              </div>
              <div className="break-words text-xs text-muted-foreground">
                {missingModels.slice(0, MODEL_PREVIEW).join(', ')}
                {missingModels.length > MODEL_PREVIEW &&
                  ` ${tr('and {count} more', {
                    count: missingModels.length - MODEL_PREVIEW
                  })}`}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {missingProviders.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {tr(
              'Some providers in this routing are not available on your account right now. They are skipped until they come back.'
            )}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
