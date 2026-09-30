export interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  /** Unique per rendered instance - becomes the native radio group's `name`. */
  name: string;
  /** Visually-hidden <legend> naming the group for assistive tech; the
   * visible caption above the control (if any) is the caller's own label. */
  legend: string;
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Generic single-choice segmented control: one continuous bordered row,
 * exactly one option selected at a time. A pure presentation primitive - it
 * knows nothing about what it is being used for (days, budget, meal
 * composition, ...); callers own the value/options/onChange semantics.
 *
 * Built on native <fieldset>/<legend>/<input type="radio"> rather than a
 * hand-rolled role="radio"/aria-checked/roving-tabindex implementation, so
 * grouping, labelling and keyboard interaction rely entirely on the
 * browser's native radio-group semantics - no custom keyboard handlers are
 * added here. That native behavior (Tab into the group once,
 * ArrowLeft/ArrowRight to move selection) is a browser guarantee for
 * <input type="radio">, but it is still subject to manual keyboard QA in an
 * actual browser before being relied on, same as any other native control.
 * The radio inputs are visually hidden (not display:none) so they stay
 * focusable and in the tab order; the visible
 * segment styling lives on their <label>.
 */
export default function SegmentedControl({
  name,
  legend,
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}: SegmentedControlProps) {
  return (
    <fieldset className={`m-0 border-0 p-0 ${className}`} disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex w-full rounded-md border border-[#DDD0B0] overflow-hidden">
        {options.map((option, index) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex-1 text-center px-3 py-1.5 text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-[#9B6035] ${
                disabled ? 'cursor-default opacity-50' : 'cursor-pointer'
              } ${
                checked ? 'bg-[#9B6035] text-white' : 'bg-white text-[#3A2010] hover:bg-[#F4EDDD]'
              } ${index > 0 ? 'border-l border-[#DDD0B0]' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
