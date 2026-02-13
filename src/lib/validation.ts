/**
 * Comprehensive validation utilities for forms and inputs
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas for Common Data Types
// ============================================================================

export const phoneSchema = z
  .string()
  .regex(/^(?:\+?254|0)[17]\d{8}$/, 'Invalid phone number format')
  .transform((val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return `+254${digits.slice(1)}`;
    }
    return `+${digits}`;
  });

export const emailSchema = z
  .string()
  .email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const amountSchema = z
  .string()
  .or(z.number())
  .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
  .refine((val) => val > 0, 'Amount must be greater than 0')
  .refine((val) => !isNaN(val), 'Amount must be a valid number');

export const idCardSchema = z
  .string()
  .regex(/^\d{1,8}$/, 'ID must be between 1 and 8 digits');

export const mpesaPhoneSchema = z
  .string()
  .regex(/^(254|\+254|0)[17]\d{8}$/, 'Invalid M-Pesa phone number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => typeof val === 'string' ? new Date(val) : val)
  .refine((date) => !isNaN(date.getTime()), 'Invalid date');

// ============================================================================
// Form Schemas
// ============================================================================

export const memberRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  idNumber: idCardSchema,
  dateOfBirth: dateSchema.refine(
    (date) => new Date().getFullYear() - date.getFullYear() >= 18,
    'Must be at least 18 years old'
  ),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  occupation: z.string().min(2, 'Please enter your occupation'),
  profilePhoto: z.instanceof(File).optional(),
  role: z.enum(['member', 'secretary', 'treasurer', 'chairperson']),
});

export const contributionSchema = z.object({
  amount: amountSchema,
  description: z.string().min(5, 'Description must be at least 5 characters'),
  paymentMethod: z.enum(['mpesa', 'cash', 'bank_transfer']),
  reference: z.string().min(3, 'Reference must be at least 3 characters'),
  date: dateSchema,
  notes: z.string().optional(),
});

export const welfareSchema = z.object({
  type: z.enum(['death', 'illness', 'accident', 'other']),
  memberId: z.string().min(1, 'Please select a member'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amount: amountSchema.optional(),
  status: z.enum(['active', 'resolved', 'closed']).optional(),
  supportDetails: z.string().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must not exceed 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  targetAudience: z.array(z.string()).min(1, 'Select at least one target audience'),
  attachments: z.array(z.instanceof(File)).optional(),
  scheduledFor: dateSchema.optional(),
});

export const meetingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: dateSchema.refine(
    (date) => date > new Date(),
    'Meeting date must be in the future'
  ),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  location: z.string().min(5, 'Location must be at least 5 characters'),
  attendees: z.array(z.string()).min(1, 'Select at least one attendee'),
  agenda: z.string().min(10, 'Agenda must be at least 10 characters'),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const profileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().optional(),
  profilePhoto: z.instanceof(File).optional(),
}).refine((data) => Object.values(data).some(Boolean), {
  message: 'At least one field must be updated',
});

// ============================================================================
// Validation Functions
// ============================================================================

export async function validateEmail(email: string): Promise<boolean> {
  try {
    await emailSchema.parseAsync(email);
    return true;
  } catch {
    return false;
  }
}

export async function validatePhone(phone: string): Promise<boolean> {
  try {
    await phoneSchema.parseAsync(phone);
    return true;
  } catch {
    return false;
  }
}

export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score++;
  else feedback.push('12+ characters for better security');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push('Include special characters');

  return {
    score,
    feedback,
    isStrong: score >= 5,
  };
}

export function validateAmount(amount: string | number, options?: {
  min?: number;
  max?: number;
  step?: number;
}): { valid: boolean; error?: string } {
  try {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) return { valid: false, error: 'Must be a valid number' };
    if (num <= 0) return { valid: false, error: 'Amount must be greater than 0' };
    if (options?.min && num < options.min) {
      return { valid: false, error: `Minimum amount is ${options.min}` };
    }
    if (options?.max && num > options.max) {
      return { valid: false, error: `Maximum amount is ${options.max}` };
    }
    if (options?.step && (num % options.step) !== 0) {
      return { valid: false, error: `Amount must be in multiples of ${options.step}` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid amount' };
  }
}

export function validateIdNumber(idNumber: string): { valid: boolean; error?: string } {
  try {
    idCardSchema.parse(idNumber);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'ID must be 1-8 digits' };
  }
}

export function validateDate(date: string | Date, options?: {
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
  allowPast?: boolean;
}): { valid: boolean; error?: string } {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (options?.minDate && dateObj < options.minDate) {
      return { valid: false, error: `Date cannot be before ${options.minDate.toLocaleDateString()}` };
    }

    if (options?.maxDate && dateObj > options.maxDate) {
      return { valid: false, error: `Date cannot be after ${options.maxDate.toLocaleDateString()}` };
    }

    if (options?.allowFuture === false && dateObj > now) {
      return { valid: false, error: 'Date cannot be in the future' };
    }

    if (options?.allowPast === false && dateObj < now) {
      return { valid: false, error: 'Date cannot be in the past' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid date' };
  }
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    urlSchema.parse(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function validateRequiredField(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function validateFieldLength(
  value: string,
  min?: number,
  max?: number
): { valid: boolean; error?: string } {
  if (min && value.length < min) {
    return { valid: false, error: `Must be at least ${min} characters` };
  }
  if (max && value.length > max) {
    return { valid: false, error: `Must not exceed ${max} characters` };
  }
  return { valid: true };
}

export function validateStringPattern(
  value: string,
  pattern: RegExp,
  message: string
): { valid: boolean; error?: string } {
  if (!pattern.test(value)) {
    return { valid: false, error: message };
  }
  return { valid: true };
}

// ============================================================================
// Cross-field Validation
// ============================================================================

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true };
}

export function validateDateRange(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string } {
  if (endDate <= startDate) {
    return { valid: false, error: 'End date must be after start date' };
  }
  return { valid: true };
}

export function validateUniqueValues(
  values: string[],
  fieldName?: string
): { valid: boolean; error?: string } {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    return { valid: false, error: `Duplicate values found${fieldName ? ` in ${fieldName}` : ''}` };
  }
  return { valid: true };
}

// ============================================================================
// Batch Validation
// ============================================================================

export async function validateForm<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { form: 'Validation failed' } };
  }
}

export function getFieldError(
  errors: Record<string, string>,
  fieldName: string
): string | undefined {
  return errors[fieldName] || errors[fieldName.replace(/\./g, '_')];
}
