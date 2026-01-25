import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Logger, AppErrorHandler } from '@/utils/errorHandler';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSuccess?: (message?: string) => void;
  onError?: (error: Error) => void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
  onSuccess,
  onError,
}: UseFormOptions<T>) {
  const { toast } = useToast();
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value,
      },
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error,
      },
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setState((prev) => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: isTouched,
      },
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!validate) return {};
    const errors = validate(state.values);
    setState((prev) => ({
      ...prev,
      errors,
    }));
    return errors;
  }, [validate, state.values]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fix the errors and try again',
          variant: 'destructive',
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
      }));

      try {
        await onSubmit(state.values);
        toast({
          title: 'Success',
          description: 'Operation completed successfully',
        });
        onSuccess?.();
      } catch (error) {
        Logger.error('Form submission error', error);
        const errorMessage = AppErrorHandler.getErrorMessage(error);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [validateForm, state.values, onSubmit, onSuccess, onError, toast]
  );

  const resetForm = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }, [initialValues]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleSubmit,
    validateForm,
    resetForm,
    getFieldError: (field: keyof T) => {
      if (!state.touched[field]) return undefined;
      return state.errors[field];
    },
  };
}
