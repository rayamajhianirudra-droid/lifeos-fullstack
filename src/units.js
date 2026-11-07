// Display units. The account always stores imperial (lb, ft + in, inches, fl oz), so
// nothing on the server changes; metric users see and type kg and cm, converted here.

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export const isMetric = (units) => units === 'metric';

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export const lbToKg = (lb) => lb / LB_PER_KG;
export const kgToLb = (kg) => kg * LB_PER_KG;
export const inToCm = (inches) => inches * CM_PER_IN;
export const cmToIn = (cm) => cm / CM_PER_IN;

/** Weight in the user's units, 1 decimal. */
export const weightIn = (lbs, units) => (lbs == null || Number.isNaN(+lbs) ? null : round(isMetric(units) ? lbToKg(+lbs) : +lbs));
export const weightUnit = (units) => (isMetric(units) ? 'kg' : 'lbs');
export const fmtWeight = (lbs, units) => (lbs == null ? '—' : `${weightIn(lbs, units)} ${weightUnit(units)}`);

/** Height text: 178 cm or 5'10". */
export const fmtHeight = (ft, inch, units) =>
  (isMetric(units) ? `${Math.round(inToCm((ft || 0) * 12 + (inch || 0)))} cm` : `${ft || 0}'${inch || 0}"`);

/** Total inches -> the stored feet + inches (inches are whole numbers). */
export const ftInFromInches = (totalIn) => {
  const t = Math.round(totalIn);
  return { heightFeet: Math.floor(t / 12), heightInches: t % 12 };
};

export const lengthUnit = (units) => (isMetric(units) ? 'cm' : 'inches');
/** A tape measurement typed in the user's units, in inches for the server. */
export const toInches = (value, units) => (isMetric(units) ? cmToIn(value) : value);

/** Good first guess from the browser: imperial only where people use it (US, Liberia, Myanmar). */
export function defaultUnits(langs) {
  const list = langs || (typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []);
  const first = String(list[0] || 'en-US');
  const region = (first.split(/[-_]/)[1] || '').toUpperCase();
  if (!region) return first.toLowerCase().startsWith('en') ? 'imperial' : 'metric';
  return ['US', 'LR', 'MM'].includes(region) ? 'imperial' : 'metric';
}

/** Validation ranges in the user's units (server accepts 50-1000 lb). */
export const weightRangeText = (units) => (isMetric(units) ? 'between 23 and 453 kg' : 'between 50 and 1000 lbs');
