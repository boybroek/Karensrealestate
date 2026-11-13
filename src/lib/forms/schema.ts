/**
 * Form definitions shared by the browser (instant feedback) and the server
 * (authoritative validation). Option values are language-independent keys;
 * their labels live in the i18n dictionaries.
 *
 * Keep this file free of Node or DOM APIs.
 */

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'tel' | 'date' | 'amount' | 'int' | 'postcode'
  | 'choice' | 'multi' | 'consent';

export interface FieldRule {
  type: FieldType;
  required?: boolean;
  /** Max characters (text-like) — always enforced. */
  max?: number;
  min?: number;
  /** Numeric range for `amount` and `int`. */
  range?: [number, number];
  options?: readonly string[];
  /** Field only exists when another field has the given value. */
  when?: { field: string; is: string };
}

export type FormSchema = Record<string, FieldRule>;

const name: FieldRule = { type: 'text', required: true, min: 2, max: 100 };
const email: FieldRule = { type: 'email', required: true, max: 254 };
const phone: FieldRule = { type: 'tel', max: 25 };
const lang: FieldRule = { type: 'choice', required: true, options: ['nl', 'en'] };
const consent: FieldRule = { type: 'consent', required: true };
const shortText: FieldRule = { type: 'text', max: 120 };
const money: FieldRule = { type: 'amount', range: [0, 1_000_000] };
const fourPlus = ['1', '2', '3', '4plus'] as const;

export const OPTIONS = {
  profile: ['student', 'working'],
  guarantor: ['yes', 'no', 'unknown'],
  contract: ['permanent', 'temporary', 'self_employed', 'relocation'],
  abroad: ['no', 'yes'],
  bedrooms: fourPlus,
  occupants: fourPlus,
  interior: ['unfurnished', 'upholstered', 'furnished', 'no_preference'],
  wishType: ['house', 'apartment', 'no_preference'],
  extras: ['balcony_garden', 'pets', 'parking', 'lift', 'energy_ab'],
  letType: ['apartment', 'family_house', 'ground_floor', 'studio'],
  furnishing: ['unfurnished', 'upholstered', 'furnished'],
  topic: ['find', 'let', 'manage', 'other'],
} as const;

const student = { field: 'profile', is: 'student' };
const working = { field: 'profile', is: 'working' };

export const FORMS = {
  /** Search request (aanhuur) — multi-step. */
  zoekopdracht: {
    lang,
    profile: { type: 'choice', required: true, options: OPTIONS.profile },
    institution: { ...shortText, when: student },
    study: { ...shortText, when: student },
    guarantor: { type: 'choice', options: OPTIONS.guarantor, when: student },
    guarantorIncome: { ...money, when: student },
    ownIncome: { ...money, when: student },
    employer: { ...shortText, when: working },
    jobTitle: { ...shortText, when: working },
    contract: { type: 'choice', options: OPTIONS.contract, when: working },
    income: { ...money, when: working },
    abroad: { type: 'choice', options: OPTIONS.abroad, when: working },
    bedrooms: { type: 'choice', options: OPTIONS.bedrooms },
    occupants: { type: 'choice', options: OPTIONS.occupants },
    interior: { type: 'choice', options: OPTIONS.interior },
    propertyType: { type: 'choice', options: OPTIONS.wishType },
    extras: { type: 'multi', options: OPTIONS.extras },
    maxRent: money,
    startDate: { type: 'date' },
    neighbourhoods: { type: 'text', max: 200 },
    name, email, phone,
    note: { type: 'textarea', max: 2000 },
    consent,
  },
  /** Landlord registration (verhuur). */
  verhuur: {
    lang,
    address: { type: 'text', required: true, min: 3, max: 120 },
    postcode: { type: 'postcode', required: true },
    area: { type: 'int', range: [5, 5000] },
    bedrooms: { type: 'choice', options: OPTIONS.bedrooms },
    propertyType: { type: 'choice', options: OPTIONS.letType },
    furnishing: { type: 'choice', options: OPTIONS.furnishing },
    availableFrom: { type: 'date' },
    rent: money,
    name, email,
    phone: { ...phone, required: true },
    message: { type: 'textarea', max: 2000 },
    consent,
  },
  contact: {
    lang,
    name, email, phone,
    topic: { type: 'choice', required: true, options: OPTIONS.topic },
    message: { type: 'textarea', required: true, min: 5, max: 2000 },
  },
} as const satisfies Record<string, FormSchema>;

export type FormId = keyof typeof FORMS;
export const isFormId = (v: string): v is FormId => Object.prototype.hasOwnProperty.call(FORMS, v);

export type ErrorCode =
  | 'required' | 'too_short' | 'too_long' | 'email' | 'phone' | 'postcode' | 'date'
  | 'date_past' | 'date_far' | 'amount' | 'number' | 'choice' | 'consent';
