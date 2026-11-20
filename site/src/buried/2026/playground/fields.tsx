import type { ReactNode } from 'react'
import type { BuriedEvent, BuriedFaction } from '../cards'

/**
 * Plain controlled inputs for the card playground. A blank number or optional
 * text becomes `undefined`, not '' or NaN, so the "parser would drop this" badge
 * means what it says.
 */

export interface FormProps<C> {
  value: C
  onChange: (next: C) => void
}

/** Shallow-merge a patch into a value. Partial lets a required field go `undefined`, which is the point. */
export const patcher =
  <T,>(value: T, onChange: (next: T) => void) =>
  (patch: Partial<T>) =>
    onChange({ ...value, ...patch })

const INPUT = 'w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground'

export function Label({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  optional = false,
  type = 'text',
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  optional?: boolean
  type?: 'text' | 'date'
}) {
  return (
    <Label label={optional ? `${label} (optional)` : label}>
      <input
        type={type}
        className={INPUT}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' && optional ? undefined : e.target.value)}
      />
    </Label>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  optional = false,
  step = 1,
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  optional?: boolean
  step?: number
}) {
  return (
    <Label label={optional ? `${label} (optional)` : label}>
      <input
        type="number"
        step={step}
        className={INPUT}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' || Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)}
      />
    </Label>
  )
}

/** The factions as they are in the database; enough to try every colour. */
export const FACTIONS: BuriedFaction[] = [
  { code: 'ARCANISTS', name: 'Arcanists', hexCode: '#0089c8' },
  { code: 'BAYOU', name: 'Bayou', hexCode: '#996431' },
  { code: 'EXPLORER', name: "Explorer's Society", hexCode: '#009797' },
  { code: 'GUILD', name: 'Guild', hexCode: '#cf1e24' },
  { code: 'NEVERBORN', name: 'Neverborn', hexCode: '#8558a5' },
  { code: 'OUTCASTS', name: 'Outcasts', hexCode: '#cdae1c' },
  { code: 'RESSERS', name: 'Resurrectionists', hexCode: '#469a44' },
  { code: 'THUNDERS', name: 'Ten Thunders', hexCode: '#ee6626' },
]

export function FactionField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string
  value: BuriedFaction | undefined
  onChange: (v: BuriedFaction | undefined) => void
  optional?: boolean
}) {
  return (
    <Label label={optional ? `${label} (optional)` : label}>
      <span className="flex gap-2">
        <select
          className={INPUT}
          value={value?.code ?? ''}
          onChange={(e) => onChange(FACTIONS.find((f) => f.code === e.target.value))}
        >
          {optional && <option value="">None</option>}
          {FACTIONS.map((f) => (
            <option key={f.code} value={f.code}>
              {f.name}
            </option>
          ))}
        </select>
        {value && (
          <input
            type="color"
            aria-label={`${label} colour`}
            className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-surface"
            value={value.hexCode}
            onChange={(e) => onChange({ ...value, hexCode: e.target.value })}
          />
        )}
      </span>
    </Label>
  )
}

export function EventFields({ value, onChange }: FormProps<BuriedEvent>) {
  const set = patcher(value, onChange)
  return (
    <>
      <TextField label="Event name" value={value.name} onChange={(name) => set({ name })} />
      <TextField label="Date" type="date" value={value.date} onChange={(date) => set({ date })} />
      <NumberField label="Event id" value={value.id} onChange={(id) => set({ id })} />
      <NumberField label="Players" value={value.players} onChange={(players) => set({ players })} />
      <NumberField label="Place" optional value={value.place} onChange={(place) => set({ place })} />
    </>
  )
}

/** An editable list of rows, each with its own fields and a remove button. */
export function ListField<T>({
  label,
  items,
  onChange,
  blank,
  children,
}: {
  label: string
  items: T[]
  onChange: (next: T[]) => void
  /** The row added by "Add". */
  blank: () => NoInfer<T>
  children: (item: T, onItemChange: (next: T) => void) => ReactNode
}) {
  return (
    <fieldset className="col-span-full flex flex-col gap-2 rounded border border-border p-2">
      <legend className="px-1 text-xs font-semibold text-muted-foreground">
        {label} ({items.length})
      </legend>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 border-b border-border pb-2 last:border-b-0">
          {children(item, (next) => onChange(items.map((it, j) => (j === i ? next : it))))}
          <button
            type="button"
            className="col-span-full justify-self-end text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="self-start rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        onClick={() => onChange([...items, blank()])}
      >
        Add
      </button>
    </fieldset>
  )
}
