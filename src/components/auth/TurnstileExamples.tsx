/**
 * Example: How to Use Turnstile Hook in Other Components
 * 
 * This file demonstrates how to implement Cloudflare Turnstile
 * in any React component using the useTurnstile hook.
 */

import { useEffect, useState } from 'react';
import { useTurnstile } from '@/hooks/useTurnstile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';

/**
 * Example 1: Simple Form with Turnstile
 */
export const SimpleCaptchaForm = () => {
  const { token, error, isLoading, renderCaptcha } = useTurnstile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Render captcha when component mounts
    renderCaptcha('simple-captcha-container').catch(console.error);
  }, [renderCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert('Please complete the captcha');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send token to your backend for verification
      const response = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        alert('Form submitted successfully!');
      } else {
        alert('Captcha verification failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div id="simple-captcha-container" />
      {error && (
        <div className="flex gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={!token || isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};

/**
 * Example 2: Turnstile in a Modal
 */
export const ModalWithCaptcha = ({ onClose }: { onClose: () => void }) => {
  const { token, error, renderCaptcha, remove } = useTurnstile();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    renderCaptcha('modal-captcha').catch(console.error);

    // Cleanup when modal closes
    return () => {
      remove();
    };
  }, [renderCaptcha, remove]);

  const handleSubmit = async () => {
    if (!token) {
      alert('Please verify you are not a robot');
      return;
    }

    setSubmitted(true);
    // Process submission
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold text-lg">Verify Your Identity</h2>

      <div id="modal-captcha" />

      {error && (
        <div className="flex gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {token && (
        <div className="flex gap-2 text-green-600 text-sm bg-green-50 p-3 rounded">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Verification complete
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!token || submitted}
        className="w-full"
      >
        {submitted ? 'Submitting...' : 'Continue'}
      </Button>
    </Card>
  );
};

/**
 * Example 3: Dynamic Turnstile with Reset
 */
export const DynamicCaptcha = () => {
  const { token, renderCaptcha, reset, isLoading } = useTurnstile();

  useEffect(() => {
    renderCaptcha('dynamic-captcha').catch(console.error);
  }, [renderCaptcha]);

  const handleReset = () => {
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4" />
        Security verification required
      </div>

      <div id="dynamic-captcha" />

      {token && (
        <Button variant="outline" onClick={handleReset} className="w-full">
          Reset Verification
        </Button>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading security check...</p>
      )}
    </div>
  );
};

/**
 * Example 4: Multiple Captchas on Page
 * 
 * Note: Each instance needs its own container ID
 */
export const MultipleCaptchas = () => {
  const captcha1 = useTurnstile();
  const captcha2 = useTurnstile();

  useEffect(() => {
    captcha1.renderCaptcha('captcha-1').catch(console.error);
    captcha2.renderCaptcha('captcha-2').catch(console.error);
  }, []);

  const handleSubmitBoth = async () => {
    if (!captcha1.token || !captcha2.token) {
      alert('Please complete both verifications');
      return;
    }

    // Submit both tokens
    console.log('Token 1:', captcha1.token);
    console.log('Token 2:', captcha2.token);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold">Verification 1</h3>
        <div id="captcha-1" />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Verification 2</h3>
        <div id="captcha-2" />
      </div>

      <Button
        onClick={handleSubmitBoth}
        disabled={!captcha1.token || !captcha2.token}
        className="w-full"
      >
        Submit All
      </Button>
    </div>
  );
};

export default SimpleCaptchaForm;
