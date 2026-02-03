import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MIN_PASSWORD_LENGTH = 8;

const ResetPassword = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const establishSession = async () => {
      try {
        const hash = globalThis.location?.hash?.replace('#', '') || '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError('This reset link is invalid or has expired. Please request a new one.');
          } else {
            setSessionReady(true);
          }
        } else {
          setError('Missing reset token. Please request a new password reset link.');
        }
      } catch (err) {
        setError('We could not verify your reset link. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    establishSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        toast({ title: 'Reset failed', description: updateError.message, variant: 'destructive' });
        return;
      }

      setUpdateSuccess(true);
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setError(msg);
      toast({ title: 'Reset failed', description: msg, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/50 to-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        {isLoading ? (
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        ) : updateSuccess ? (
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-2xl font-semibold">Password updated</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed successfully. You can now sign in.
            </p>
            <Button asChild className="w-full">
              <a href="/auth">Go to Login</a>
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Create a new password for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sessionReady && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {sessionReady && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter a new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              )}

              {!sessionReady && (
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  <a className="text-primary hover:underline" href="/auth?mode=forgot">
                    Request a new reset link
                  </a>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
