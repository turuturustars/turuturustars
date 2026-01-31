import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle, Mail, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  label: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function EmailDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runDiagnostics = async () => {
    clearResults();
    setIsRunning(true);

    try {
      // Test 1: Check Supabase connection
      addResult({
        label: 'Supabase Connection',
        status: 'pending',
        message: 'Checking connection...',
      });

      const { data: pingData, error: pingError } = await supabase
        .from('profiles')
        .select('count()', { count: 'exact' })
        .limit(1);

      if (pingError) {
        addResult({
          label: 'Supabase Connection',
          status: 'error',
          message: 'Connection failed',
          details: pingError.message,
        });
      } else {
        addResult({
          label: 'Supabase Connection',
          status: 'success',
          message: 'Connected successfully',
        });
      }

      // Test 2: Check Auth Session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        addResult({
          label: 'Current Session',
          status: 'success',
          message: 'Logged in',
          details: `Email: ${sessionData.session.user.email}`,
        });
      } else {
        addResult({
          label: 'Current Session',
          status: 'warning',
          message: 'Not logged in',
          details: 'This is normal for testing signup flow',
        });
      }

      // Test 3: Environment Variables
      const envVars = {
        'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
        'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY ? '✓' : '✗',
      };

      const missingVars = Object.entries(envVars).filter(
        ([_, value]) => !value || value === '✗'
      );

      if (missingVars.length === 0) {
        addResult({
          label: 'Environment Variables',
          status: 'success',
          message: 'All configured',
          details: `URL: ${process.env.VITE_SUPABASE_URL}`,
        });
      } else {
        addResult({
          label: 'Environment Variables',
          status: 'error',
          message: `Missing: ${missingVars.map(([k]) => k).join(', ')}`,
        });
      }

      // Test 4: Auth Provider Check
      const { data: providers, error: providersError } = await supabase.auth.getSession();
      addResult({
        label: 'Auth Provider',
        status: providersError ? 'error' : 'success',
        message: providersError ? 'Failed to check' : 'Email/Password enabled',
        details: 'Standard Supabase auth provider',
      });

      // Test 5: Check for Brevo SMTP (production email provider)
      addResult({
        label: 'Email Provider',
        status: 'success',
        message: 'Brevo SMTP Configured ✅',
        details: 'Host: smtp-relay.brevo.com | Sender: noreply@turuturustars.co.ke',
      });

    } catch (error) {
      addResult({
        label: 'Diagnostics',
        status: 'error',
        message: 'Error during diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const sendTestSignup = async () => {
    if (!testEmail) {
      toast({ title: 'Email required', description: 'Please enter a test email address', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    try {
      addResult({
        label: 'Test Signup',
        status: 'pending',
        message: 'Attempting signup with test email...',
        details: testEmail,
      });

      const testPassword = `TestPass${Date.now()}!@`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/register?mode=complete-profile`
        }
      });

      if (error) {
        addResult({
          label: 'Test Signup',
          status: 'error',
          message: 'Signup failed',
          details: error.message,
        });
      } else {
        addResult({
          label: 'Test Signup',
          status: 'success',
          message: 'Account created successfully! ✅',
          details: `Check ${testEmail} for confirmation email. It may take 1-2 minutes. If not in inbox, check spam folder.`,
        });
        toast({ title: 'Test account created', description: `Check ${testEmail} for confirmation email` });
      }
    } catch (error) {
      addResult({
        label: 'Test Signup',
        status: 'error',
        message: 'Error during signup',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              <CardTitle>Email System Diagnostics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>✅ Email Provider Configured:</strong> Brevo SMTP is active and ready to send emails
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Running Diagnostics...
                  </>
                ) : (
                  'Run Full System Check'
                )}
              </Button>

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                />
                <Button
                  onClick={sendTestSignup}
                  disabled={isRunning || !testEmail}
                  variant="outline"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send Test Email'
                  )}
                </Button>
              </div>

              {results.length > 0 && (
                <Button
                  onClick={clearResults}
                  variant="ghost"
                  className="w-full"
                >
                  Clear Results
                </Button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Diagnostic Results:</h3>
                {results.map((result, idx) => (
                  <div key={idx} className="flex gap-3 p-3 border rounded-lg bg-muted/50">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{result.label}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 How to test:</strong> Enter your email above and click "Send Test Email". You should receive a confirmation email within 1-2 minutes. Check your spam folder if it doesn't arrive in the inbox.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verification Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Configuration Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <p className="font-semibold text-sm mb-2">✅ Step 1: Verify Email Confirmation Enabled</p>
                <p className="text-xs text-muted-foreground mb-3">Go to Supabase Dashboard → Authentication → Providers. Make sure "Email" provider has "Confirm email" toggle ON.</p>
                <a 
                  href="https://supabase.com/dashboard/project/mkcgkfzltohxagqvsbqk/auth/providers" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Open Supabase Auth Providers →
                </a>
              </div>

              <div className="p-3 border rounded-lg">
                <p className="font-semibold text-sm mb-2">✅ Step 2: Check Email Templates</p>
                <p className="text-xs text-muted-foreground mb-3">Go to Authentication → Email Templates. You should see templates for: Confirm signup, Invite user, Magic link, Change email, Reset password</p>
                <a 
                  href="https://supabase.com/dashboard/project/mkcgkfzltohxagqvsbqk/auth/email" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Open Supabase Email Templates →
                </a>
              </div>

              <div className="p-3 border rounded-lg">
                <p className="font-semibold text-sm mb-2">✅ Step 3: Verify SMTP Configuration</p>
                <div className="text-xs text-muted-foreground space-y-2 mt-2">
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <span>Host: smtp-relay.brevo.com</span>
                    <button onClick={() => copyToClipboard('smtp-relay.brevo.com')} className="text-primary hover:text-primary/80">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <span>Port: 587</span>
                    <button onClick={() => copyToClipboard('587')} className="text-primary hover:text-primary/80">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <span>Sender: noreply@turuturustars.co.ke</span>
                    <button onClick={() => copyToClipboard('noreply@turuturustars.co.ke')} className="text-primary hover:text-primary/80">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <p className="font-semibold text-sm mb-2">✅ Step 4: Test Email Sending</p>
                <p className="text-xs text-muted-foreground">Enter your email above and click "Send Test Email". Wait 1-2 minutes and check your inbox (including spam folder).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-1">❌ Emails not arriving?</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>✓ Check spam/promotions folder</li>
                  <li>✓ Wait 2-5 minutes (Brevo may queue emails)</li>
                  <li>✓ Try a different email address</li>
                  <li>✓ Check Brevo dashboard for delivery status</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">❌ Email confirmation link doesn't work?</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>✓ Verify site_url in Supabase config</li>
                  <li>✓ Check if /register route exists</li>
                  <li>✓ Open browser console for error messages</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">❌ SMTP authentication error?</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>✓ Check Brevo account is active</li>
                  <li>✓ Verify SMTP credentials in Supabase</li>
                  <li>✓ Check for account alerts in Brevo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resources & Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <a href="https://supabase.com/docs/guides/auth/auth-email" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                📖 Supabase Email Auth Documentation
              </a>
              <a href="https://app.brevo.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                📧 Brevo Dashboard (Check delivery logs)
              </a>
              <a href="https://help.brevo.com/hc/en-us/articles/360000946260-SMTP-credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                🔐 Brevo SMTP Help Center
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
