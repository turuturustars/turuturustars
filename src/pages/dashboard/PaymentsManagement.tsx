import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getPesapalTransactionStatus, registerPesapalIpn } from '@/lib/pesapal';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Settings,
  History,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

interface PesapalTransaction {
  id: string;
  order_tracking_id: string | null;
  merchant_reference: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  confirmation_code: string | null;
  created_at: string;
  updated_at: string;
  member_id: string | null;
}

interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  performed_by_name: string | null;
  performed_by_role: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const PaymentsManagement = () => {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<PesapalTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ipnDialogOpen, setIpnDialogOpen] = useState(false);

  const canManageFinances = hasRole('admin') || hasRole('treasurer') || hasRole('chairperson');

  useEffect(() => {
    if (user && canManageFinances) {
      fetchTransactions();
      fetchAuditLogs();
    }
  }, [user, canManageFinances]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('pesapal_transactions')
      .select('id, order_tracking_id, merchant_reference, amount, currency, status, payment_method, confirmation_code, created_at, updated_at, member_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setTransactions(data as PesapalTransaction[]);
    }
    setIsLoading(false);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action_type, action_description, performed_by_name, performed_by_role, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setAuditLogs(data.map(log => ({
        ...log,
        metadata: log.metadata as Record<string, unknown> | null
      })));
    }
  };

  const handleCheckStatus = async (orderTrackingId: string) => {
    try {
      const result = await getPesapalTransactionStatus(orderTrackingId);
      toast({
        title: 'Status Updated',
        description: result.payment_status_description || 'Transaction status checked',
      });
      fetchTransactions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleRegisterIpn = async () => {
    setIsProcessing(true);
    try {
      const ipnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pesapal-ipn`;
      const result = await registerPesapalIpn(ipnUrl, 'POST');
      toast({
        title: 'IPN Registered',
        description: `Pesapal IPN registered. ID: ${result?.ipn_id ?? 'N/A'}`,
      });
      fetchAuditLogs();
      setIpnDialogOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (txStatus: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      completed: <CheckCircle className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />
    };
    const statusMap: Record<string, string> = {
      completed: 'active',
      failed: 'dormant',
      pending: 'pending'
    };
    return <StatusBadge status={statusMap[txStatus] || txStatus} icon={iconMap[txStatus]} />;
  };

  const totalCompleted = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPending = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const successRate = transactions.length > 0
    ? Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100)
    : 0;

  if (!canManageFinances) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Access Restricted</h3>
            <p className="text-muted-foreground text-center mt-2">
              Only the Chairman, Treasurer, and Admin can access payments management.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Payments Management</h1>
        <p className="text-muted-foreground">Monitor Pesapal transactions and callbacks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">KSh {totalCompleted.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">KSh {totalPending.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Dialog open={ipnDialogOpen} onOpenChange={setIpnDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Register IPN URL
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Pesapal IPN</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This registers the callback URL used by Pesapal to notify us of payment updates.
              </p>
              <Button onClick={handleRegisterIpn} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Register IPN
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <DollarSign className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-4 lg:p-0">
              <div className="space-y-3 lg:hidden">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions found
                  </p>
                ) : (
                  transactions.map((tx) => (
                    <Card key={tx.id} className="border border-border/60">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">{tx.merchant_reference}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">KSh {Number(tx.amount).toLocaleString()}</p>
                            <div className="mt-1">{getStatusBadge(tx.status)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Method</p>
                            <Badge variant="outline">{tx.payment_method || 'Pesapal'}</Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reference</p>
                            <p className="font-mono truncate">{tx.confirmation_code || '-'}</p>
                          </div>
                        </div>

                        {tx.status === 'pending' && tx.order_tracking_id && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleCheckStatus(tx.order_tracking_id!)}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Check Status
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Confirmation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), 'MMM d, HH:mm')}</TableCell>
                          <TableCell className="font-mono text-sm">{tx.merchant_reference}</TableCell>
                          <TableCell className="font-medium">KSh {Number(tx.amount).toLocaleString()}</TableCell>
                          <TableCell>{tx.payment_method || 'Pesapal'}</TableCell>
                          <TableCell>{tx.confirmation_code || '-'}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell className="text-right">
                            {tx.status === 'pending' && tx.order_tracking_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCheckStatus(tx.order_tracking_id!)}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-4 lg:p-0">
              <div className="space-y-3 lg:hidden">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <Card key={log.id} className="border border-border/60">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.performed_by_name || '-'}</p>
                          </div>
                          <Badge variant="outline">{log.action_type}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.action_description}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{format(new Date(log.created_at), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.action_description}</TableCell>
                          <TableCell>{log.performed_by_name || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsManagement;
