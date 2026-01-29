/*
  TurnstileDebugComponent is disabled/commented out.
  Original implementation preserved below for future re-enable.

  import { useRef, useEffect, useState } from 'react';
  import { useTurnstileDebug } from '@/hooks/useTurnstileDebug';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';
  import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Trash2 } from 'lucide-react';

  // ... (original content preserved here)
*/

import React from 'react';

const TurnstileDebugComponent: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="p-6 border rounded-lg bg-muted/10 text-center">
        <p className="font-semibold">Turnstile Debug Component (disabled)</p>
        <p className="text-sm text-muted-foreground">The Turnstile debug UI is currently commented out. Re-enable it in the codebase when needed.</p>
      </div>
    </div>
  );
};

export default TurnstileDebugComponent;
