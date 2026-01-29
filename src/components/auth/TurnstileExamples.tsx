/**
 * Example: How to Use Turnstile Hook in Other Components
 * 
 * This file demonstrates how to implement Cloudflare Turnstile
 * in any React component using the useTurnstile hook.
 */

/*
  Turnstile examples are disabled. Original examples preserved below for future reference.

  import { useEffect, useState } from 'react';
  import { useTurnstile } from '@/hooks/useTurnstile';
  import { Button } from '@/components/ui/button';
  import { Card } from '@/components/ui/card';
  import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';

  ... (original content)
*/

import React from 'react';
import { Card } from '@/components/ui/card';

/**
 * Example 1: Simple Form with Turnstile
 */
export const SimpleCaptchaForm = () => {
  return (
    <Card className="p-6 text-center">
      <h3 className="font-semibold">Turnstile Examples Disabled</h3>
      <p className="text-sm text-muted-foreground">Captcha examples are commented out and reserved for future use.</p>
    </Card>
  );
};

/**
 * Example 2: Turnstile in a Modal
 */
export const ModalWithCaptcha = ({ onClose }: { onClose: () => void }) => {
  return (
    <Card className="p-6 text-center">
      <h3 className="font-semibold">Turnstile Examples Disabled</h3>
      <p className="text-sm text-muted-foreground">Captcha examples are commented out and reserved for future use.</p>
    </Card>
  );
};

/**
 * Example 3: Dynamic Turnstile with Reset
 */
export const DynamicCaptcha = () => {
  return (
    <Card className="p-6 text-center">
      <h3 className="font-semibold">Turnstile Examples Disabled</h3>
      <p className="text-sm text-muted-foreground">Captcha examples are commented out and reserved for future use.</p>
    </Card>
  );
};

/**
 * Example 4: Multiple Captchas on Page
 * 
 * Note: Each instance needs its own container ID
 */
export const MultipleCaptchas = () => {
  return (
    <Card className="p-6 text-center">
      <h3 className="font-semibold">Turnstile Examples Disabled</h3>
      <p className="text-sm text-muted-foreground">Captcha examples are commented out and reserved for future use.</p>
    </Card>
  );
};

export default SimpleCaptchaForm;
