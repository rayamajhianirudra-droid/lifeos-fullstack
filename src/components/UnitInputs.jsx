import { useState } from 'react';

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Number input that shows a converted value (e.g. kg) but reports the stored value
 * (e.g. lb). While typing, the user's own text is kept so the field never jumps.
 */
export function ConvertedNumberInput({ value, toDisplay, fromDisplay, decimals = 1, onValue, ...inputProps }) {
  const [draft, setDraft] = useState(null);
  const shown = value === '' || value == null || !Number.isFinite(+value) ? '' : String(round(toDisplay(+value), decimals));
  return (
    <input type="number" inputMode="decimal" {...inputProps}
      value={draft ?? shown}
      onFocus={() => setDraft(shown)}
      onBlur={() => setDraft(null)}
      onChange={e => {
        setDraft(e.target.value);
        const n = parseFloat(e.target.value);
        onValue(Number.isFinite(n) ? fromDisplay(n) : 0);
      }} />
  );
}

/** Two-button switch: "kg · cm" / "lb · ft". */
export function UnitsToggle({ units, onChange, id }) {
  return (
    <div className="units-toggle" role="radiogroup" aria-labelledby={id}>
      {[{ v: 'metric', l: 'kg · cm' }, { v: 'imperial', l: 'lb · ft' }].map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={units === o.v}
          className={`units-option ${units === o.v ? 'is-active' : ''}`} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
