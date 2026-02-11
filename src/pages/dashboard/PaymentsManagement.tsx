import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import CboMpesaWorkspace from '@/components/payment/CboMpesaWorkspace';
import { AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';

const PaymentsManagement = () => {
  const { hasRole } = useAuth();
  const canManageMpesa = hasRole('admin') || hasRole('treasurer');

  if (!canManageMpesa) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium">Access Restricted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                M-Pesa management is available to Admin and Treasurer roles only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-foreground">M-Pesa Management</h1>
        <p className="text-muted-foreground">Receive and reconcile CBO payments using M-Pesa STK and till verification.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-600" />
              STK Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Member enters phone + amount and receives instant M-Pesa prompt.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Callback Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Payments are confirmed from callback data before final completion.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Approval Control</CardTitle>
            <CardDescription>
              <Badge variant="outline" className="font-normal">Treasurer/Admin</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Till receipts can be approved or rejected with decision notes.</p>
          </CardContent>
        </Card>
      </div>

      <CboMpesaWorkspace />
    </div>
  );
};

export default PaymentsManagement;
