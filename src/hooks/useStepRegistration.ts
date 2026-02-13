import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeKenyanPhone } from '@/utils/kenyanPhone';

export interface RegistrationFormData {
  fullName: string;
  idNumber: string;
  phone: string;
  location: string;
  otherLocation: string;
  occupation: string;
  employmentStatus: string;
  interests: string[];
  educationLevel: string;
  additionalNotes: string;
  isStudent: boolean;
}

interface SaveProgressOptions {
  userId: string;
  stepCompleted: string;
  data: Partial<RegistrationFormData>;
}

interface ValidationError {
  field: string;
  message: string;
}

export const useStepRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const saveProgress = useCallback(async (options: SaveProgressOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const normalizedPhone = options.data.phone ? normalizeKenyanPhone(options.data.phone) : null;
      if (options.data.phone && !normalizedPhone) {
        setError('Invalid phone number. Use 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.');
        return false;
      }

      const profileData = {
        id: options.userId,
        full_name: options.data.fullName || undefined,
        id_number: options.data.idNumber || undefined,
        phone: normalizedPhone || undefined,
        location: options.data.location === 'Other' ? options.data.otherLocation : options.data.location,
        occupation: options.data.occupation || undefined,
        employment_status: options.data.employmentStatus || undefined,
        interests: options.data.interests && options.data.interests.length > 0 ? options.data.interests : undefined,
        education_level: options.data.educationLevel || undefined,
        additional_notes: options.data.additionalNotes || undefined,
        is_student: options.data.isStudent || false,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(profileData).forEach(key => {
        if (profileData[key as keyof typeof profileData] === undefined) {
          delete profileData[key as keyof typeof profileData];
        }
      });

      // Use retryUpsert to handle transient failures and DB trigger race conditions
      const { data, error: upsertError } = await (await import('@/utils/supabaseRetry')).retryUpsert(
        'profiles',
        profileData,
        { onConflict: 'id' },
        3,
        300
      );

      if (upsertError) throw upsertError;

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save progress';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePhone = useCallback((phone: string): boolean => {
    return normalizeKenyanPhone(phone) !== null;
  }, []);

  const validateIdNumber = useCallback((idNumber: string): boolean => {
    return idNumber.trim().length >= 6 && idNumber.trim().length <= 8;
  }, []);

  const validateStep = useCallback((stepId: string, data: Partial<RegistrationFormData>): boolean => {
    const errors: ValidationError[] = [];

    switch (stepId) {
      case 'personal-info':
        if (!data.fullName?.trim()) {
          errors.push({ field: 'fullName', message: 'Full name is required' });
        }
        if (!data.phone?.trim()) {
          errors.push({ field: 'phone', message: 'Phone number is required' });
        } else if (!validatePhone(data.phone)) {
          errors.push({ field: 'phone', message: 'Invalid phone number format' });
        }
        if (!data.idNumber?.trim()) {
          errors.push({ field: 'idNumber', message: 'ID number is required' });
        } else if (!validateIdNumber(data.idNumber)) {
          errors.push({ field: 'idNumber', message: 'Invalid ID number' });
        }
        break;

      case 'location':
        if (!data.location) {
          errors.push({ field: 'location', message: 'Please select a location' });
        }
        if (data.location === 'Other' && !data.otherLocation?.trim()) {
          errors.push({ field: 'otherLocation', message: 'Please specify your location' });
        }
        break;

      case 'occupation':
        // Optional validation
        break;

      case 'interests':
        // Optional validation
        break;

      case 'education':
        // Optional validation
        break;

      case 'additional-info':
        // Optional validation
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [validatePhone, validateIdNumber]);

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
    setError(null);
  }, []);

  const getErrorForField = useCallback((fieldName: string): string | null => {
    const error = validationErrors.find(e => e.field === fieldName);
    return error?.message || null;
  }, [validationErrors]);

  return {
    isLoading,
    error,
    validationErrors,
    saveProgress,
    validateStep,
    clearErrors,
    getErrorForField,
    validateEmail,
    validatePhone,
    validateIdNumber,
  };
};
