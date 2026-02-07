import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPesapalTransactionStatus } from '@/lib/pesapal';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const PesapalCallback = () => {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'completed' | 'pending' | 'failed'>('loading');
  const [message, setMessage] = useState('Checking payment status...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderTrackingId =
      params.get('OrderTrackingId') ||
      params.get('orderTrackingId') ||
      params.get('OrderTrackingID');

    if (!orderTrackingId) {
      setStatus('failed');
      setMessage('Missing order tracking ID. If you were charged, contact support.');
      return;
    }

    const fetchStatus = async () => {
      try {
        const data = await getPesapalTransactionStatus(orderTrackingId);
        const description = (data?.payment_status_description || '').toLowerCase();
        if (description.includes('completed')) {
          setStatus('completed');
          setMessage('Payment completed successfully.');
        } else if (description.includes('failed')) {
          setStatus('failed');
          setMessage('Payment failed or was cancelled.');
        } else {
          setStatus('pending');
          setMessage('Payment is pending confirmation.');
        }
      } catch (error) {
        setStatus('failed');
        setMessage('Could not confirm payment status. Please try again later.');
      }
    };

    fetchStatus();
  }, [location.search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Pesapal payment confirmation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              {status === 'loading' && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
              {status === 'completed' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
              {(status === 'pending' || status === 'failed') && (
                <AlertCircle className="w-6 h-6 text-amber-600" />
              )}
              <p className="text-base font-medium">{message}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/">Return Home</Link>
              </Button>
              <Button asChild>
                <Link to="/dashboard/finance/contributions">View Contributions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PesapalCallback;
