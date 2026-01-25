/**
 * Data validation utilities
 */

export const ValidationRules = {
  // Phone validation - 10+ digits
  phone: (value: string): boolean => {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(value.replace(/\D/g, ''));
  },

  // Email validation
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  // ID number validation - at least 6 characters
  idNumber: (value: string): boolean => {
    return value.length >= 6;
  },

  // Required field
  required: (value: string | null | undefined): boolean => {
    return Boolean(value && value.trim());
  },

  // Amount validation - positive numbers only
  amount: (value: number): boolean => {
    return value > 0 && Number.isFinite(value);
  },

  // URL validation
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Bank account validation (basic - numbers only)
  bankAccount: (value: string): boolean => {
    return /^\d{10,20}$/.test(value);
  },

  // IBAN validation (basic)
  iban: (value: string): boolean => {
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(value.replace(/\s/g, ''));
  },

  // Password strength
  passwordStrength: (value: string): { valid: boolean; score: number } => {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z\d]/.test(value)) score++;
    return { valid: score >= 3, score };
  },
};

export const ValidationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number (10-15 digits)',
  idNumber: 'Please enter a valid ID number',
  amount: 'Please enter a valid amount (must be greater than 0)',
  url: 'Please enter a valid URL',
  bankAccount: 'Please enter a valid bank account number',
  iban: 'Please enter a valid IBAN',
  passwordWeak: 'Password is too weak',
  passwordMismatch: "Passwords don't match",
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  pattern: 'Invalid format',
};

/**
 * Validate form data against rules
 */
export function validateFormData<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, (value: any) => boolean | { valid: boolean; [key: string]: any }>
): Record<keyof T, string> {
  const errors: Record<keyof T, string> = {} as any;

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field as keyof T];
    const result = rule(value);
    const isValid = typeof result === 'boolean' ? result : result.valid;

    if (!isValid) {
      errors[field as keyof T] = `Invalid ${field}`;
    }
  }

  return errors;
}
