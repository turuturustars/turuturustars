/**
 * Authentication Diagnostic Tests
 * 
 * Add this file to check for common auth issues:
 * 1. Copy this file to src/pages/AuthDiagnostics.tsx
 * 2. Add route: <Route path="/auth-diagnostics" element={<AuthDiagnostics />} />
 * 3. Visit http://localhost:5173/auth-diagnostics
 * 4. Run each test and note any failures
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function AuthDiagnostics() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (name: string, status: TestResult['status'], message: string, details?: string) => {
    setResults((prev) => {
      const existing = prev.findIndex((r) => r.name === name);
      const newResult = { name, status, message, details };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      }
      return [...prev, newResult];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Environment Variables
    updateResult('env-vars', 'pending', 'Checking environment variables...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && supabaseKey) {
      updateResult('env-vars', 'success', 'Environment variables loaded', `URL: ${supabaseUrl}`);
    } else {
      updateResult('env-vars', 'error', 'Missing environment variables', `URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseKey ? 'OK' : 'MISSING'}`);
    }

    // Test 2: Supabase Connection
    updateResult('supabase-conn', 'pending', 'Testing Supabase connection...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        updateResult('supabase-conn', 'error', 'Failed to get session', error.message);
      } else {
        updateResult('supabase-conn', 'success', 'Supabase connection OK', data.session ? 'Authenticated' : 'Not authenticated');
      }
    } catch (err) {
      updateResult('supabase-conn', 'error', 'Connection error', String(err));
    }

    // Test 3: Auth State
    updateResult('auth-state', 'pending', 'Checking auth state...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateResult('auth-state', 'success', 'User authenticated', `ID: ${user.id}, Email: ${user.email}`);
      } else {
        updateResult('auth-state', 'warning', 'No user authenticated', 'This is normal if not logged in');
      }
    } catch (err) {
      updateResult('auth-state', 'error', 'Error checking user', String(err));
    }

    // Test 4: Profiles Table Access
    updateResult('profiles-table', 'pending', 'Checking profiles table access...');
    try {
      const { data, error, status } = await supabase.from('profiles').select('*').limit(1);
      if (error && error.code === 'PGRST103') {
        updateResult('profiles-table', 'error', 'Access denied to profiles table', 'RLS policy issue');
      } else if (error) {
        updateResult('profiles-table', 'error', 'Error accessing profiles table', error.message);
      } else {
        updateResult('profiles-table', 'success', 'Profiles table accessible', `Found ${data?.length || 0} records`);
      }
    } catch (err) {
      updateResult('profiles-table', 'error', 'Error querying profiles', String(err));
    }

    // Test 5: Session Persistence
    updateResult('session-persist', 'pending', 'Checking session persistence...');
    try {
      const stored = localStorage.getItem('sb-mkcgkfzltohxagqvsbqk-auth-token');
      if (stored) {
        updateResult('session-persist', 'success', 'Session stored in localStorage', 'Persistence enabled');
      } else {
        updateResult('session-persist', 'warning', 'No session in localStorage', 'Normal if not authenticated');
      }
    } catch (err) {
      updateResult('session-persist', 'error', 'localStorage error', String(err));
    }

    // Test 6: Current Profile (if authenticated)
    updateResult('current-profile', 'pending', 'Checking current user profile...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        updateResult('current-profile', 'warning', 'Not authenticated', 'Log in to test profile access');
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          updateResult('current-profile', 'warning', 'Profile not found', 'User needs to complete registration');
        } else if (error) {
          updateResult('current-profile', 'error', 'Error fetching profile', error.message);
        } else if (data) {
          const missing = [];
          if (!data.full_name) missing.push('full_name');
          if (!data.phone) missing.push('phone');
          if (!data.id_number) missing.push('id_number');
          
          if (missing.length > 0) {
            updateResult('current-profile', 'warning', 'Profile incomplete', `Missing: ${missing.join(', ')}`);
          } else {
            updateResult('current-profile', 'success', 'Profile complete', `Name: ${data.full_name}`);
          }
        }
      }
    } catch (err) {
      updateResult('current-profile', 'error', 'Error checking profile', String(err));
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Diagnostics</CardTitle>
            <CardDescription>
              Run these tests to identify auth configuration and runtime issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTests} disabled={isRunning} className="w-full">
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>

            <div className="space-y-3 mt-6">
              {results.map((result) => (
                <div key={result.name} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {result.status === 'pending' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                      {result.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {result.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                      {result.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{result.name}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                      {result.details && <div className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">{result.details}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {results.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Click "Run All Tests" to start diagnostics
              </div>
            )}

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <strong>Next Steps:</strong>
              <ul className="list-disc list-inside mt-2 text-blue-900 space-y-1">
                <li>Note any errors from the tests above</li>
                <li>Check the AUTH_TROUBLESHOOTING.md file for solutions</li>
                <li>Verify Supabase Dashboard settings</li>
                <li>Check browser console for JavaScript errors</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
