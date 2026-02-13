import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { initiateSTKPush, queryTransactionStatus, generateQRCode, registerUrls, formatPhoneNumber } from '@/lib/mpesa';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Send,
  Settings,
  History,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface MpesaTransaction {
  id: string;
  transaction_type: string;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  mpesa_receipt_number: string | null;
  amount: number;
  phone_number: string;
  status: string;
  result_code: number | null;
  result_desc: string | null;
  created_at: string;
  updated_at: string;
  initiated_by: string;
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

const MpesaManagement = () => {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stkDialogOpen, setStkDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  
  // STK Push form
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState('');
  const [stkReference, setStkReference] = useState('');
  
  // QR Code form
  const [qrAmount, setQrAmount] = useState('');

  const canManageFinances = hasRole('admin') || hasRole('treasurer') || hasRole('chairperson');

  useEffect(() => {
    if (user && canManageFinances) {
      fetchTransactions();
      fetchAuditLogs();
    }
  }, [user, canManageFinances]);

  const fetchTransactions = async () => {
    // Use correct column names from database schema
    const { data, error } = await supabase
      .from('mpesa_transactions')
      .select('id, transaction_type, checkout_request_id, merchant_request_id, mpesa_receipt_number, amount, phone_number, status, result_code, result_desc, created_at, updated_at, initiated_by, member_id')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setTransactions(data as MpesaTransaction[]);
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

  const handleSTKPush = async () => {
    if (!stkPhone || !stkAmount) return;
    
    setIsProcessing(true);
    try {
      const formattedPhone = formatPhoneNumber(stkPhone);
      const result = await initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: parseInt(stkAmount),
        accountReference: stkReference || 'TuruturuStars',
        transactionDesc: 'CBO Contribution',
      });
      
      if (result.ResponseCode === '0') {
        toast({
          title: 'STK Push Sent',
          description: 'Check the phone for M-Pesa prompt',
        });
        setStkDialogOpen(false);
        resetStkForm();
        fetchTransactions();
      } else {
        throw new Error(result.ResponseDescription || 'STK Push failed');
      }
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

  const resetStkForm = () => {
    setStkPhone('');
    setStkAmount('');
    setStkReference('');
  };

  const handleGenerateQR = async () => {
    if (!qrAmount) return;
    
    setIsProcessing(true);
    try {
      const result = await generateQRCode({
        amount: parseInt(qrAmount),
        merchantName: 'Turuturu Stars CBO',
        refNumber: `QR-${Date.now()}`,
      });
      
      if (result.QRCode) {
        setQrCodeImage(result.QRCode);
        toast({
          title: 'QR Code Generated',
          description: 'Scan to make payment',
        });
      } else {
        throw new Error('Failed to generate QR code');
      }
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

  const handleCheckStatus = async (checkoutRequestId: string) => {
    try {
      const result = await queryTransactionStatus(checkoutRequestId);
      toast({
        title: 'Status Updated',
        description: result.ResultDesc || 'Transaction status checked',
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

  const handleRegisterUrls = async () => {
    setIsProcessing(true);
    try {
      await registerUrls();
      toast({
        title: 'URLs Registered',
        description: 'M-Pesa callback URLs have been registered',
      });
      fetchAuditLogs();
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
    // Map transaction statuses to standard statuses
    const statusMap: Record<string, string> = {
      completed: 'active',
      failed: 'dormant',
      pending: 'pending'
    };
    return <StatusBadge status={statusMap[txStatus] || txStatus} icon={iconMap[txStatus]} />;
  };

  // Calculate stats
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
              Only the Chairman, Treasurer, and Admin can access M-Pesa management.
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
        <h1 className="text-2xl font-serif font-bold text-foreground">M-Pesa Management</h1>
        <p className="text-muted-foreground">Process payments, verify transactions, and manage standing orders</p>
      </div>

      {/* Stats Overview */}
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={stkDialogOpen} onOpenChange={setStkDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Send STK Push
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send M-Pesa STK Push</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={stkPhone}
                  onChange={(e) => setStkPhone(e.target.value)}
                  placeholder="0712345678 or 0112345678"
                />
              </div>
              <div>
                <Label>Amount (KSh)</Label>
                <Input
                  type="number"
                  value={stkAmount}
                  onChange={(e) => setStkAmount(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label>Reference (Optional)</Label>
                <Input
                  value={stkReference}
                  onChange={(e) => setStkReference(e.target.value)}
                  placeholder="Welfare contribution"
                />
              </div>
              <Button 
                onClick={handleSTKPush} 
                disabled={!stkPhone || !stkAmount || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Send Payment Request
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              Generate QR Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate M-Pesa QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!qrCodeImage ? (
                <>
                  <div>
                    <Label>Amount (KSh)</Label>
                    <Input
                      type="number"
                      value={qrAmount}
                      onChange={(e) => setQrAmount(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <Button 
                    onClick={handleGenerateQR} 
                    disabled={!qrAmount || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate QR Code'
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <img 
                    src={`data:image/png;base64,${qrCodeImage}`} 
                    alt="M-Pesa QR Code" 
                    className="w-64 h-64"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Scan with M-Pesa app to pay KSh {qrAmount}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setQrCodeImage(null);
                      setQrAmount('');
                    }}
                  >
                    Generate New
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleRegisterUrls} disabled={isProcessing}>
          <Settings className="w-4 h-4 mr-2" />
          Register Callback URLs
        </Button>
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
                            <p className="text-xs text-muted-foreground">{tx.phone_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">KSh {Number(tx.amount).toLocaleString()}</p>
                            <div className="mt-1">{getStatusBadge(tx.status)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <Badge variant="outline">{tx.transaction_type}</Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Receipt</p>
                            <p className="font-mono truncate">{tx.mpesa_receipt_number || '-'}</p>
                          </div>
                        </div>

                        {tx.status === 'pending' && tx.checkout_request_id && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleCheckStatus(tx.checkout_request_id!)}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Receipt</TableHead>
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
                        <TableCell>
                          <Badge variant="outline">{tx.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>{tx.phone_number}</TableCell>
                        <TableCell className="font-medium">KSh {Number(tx.amount).toLocaleString()}</TableCell>
                        <TableCell>{tx.mpesa_receipt_number || '-'}</TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-right">
                          {tx.status === 'pending' && tx.checkout_request_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCheckStatus(tx.checkout_request_id!)}
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

export default MpesaManagement;
