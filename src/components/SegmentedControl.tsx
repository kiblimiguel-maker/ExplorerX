export type Segment<T extends string> = { value: T; label: string }

export default function SegmentedControl<T extends string>({ value, options, onChange, label }: { value: T; options: Segment<T>[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => <button type="button" key={option.value} className={value === option.value ? 'active' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  )
}
