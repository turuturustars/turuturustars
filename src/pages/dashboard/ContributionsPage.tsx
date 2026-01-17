import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PayWithMpesa from '@/components/dashboard/PayWithMpesa';
import { supabase } from '@/integrations/supabase/client';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Plus, TrendingUp, Clock, CheckCircle2, Loader2, X } from 'lucide-react';

interface Contribution {
  id: string;
  amount: number;
  contribution_type: string;
  status: 'paid' | 'pending' | 'missed';
  due_date: string | null;
  paid_at: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  welfare_case_id: string | null;
}

const ContributionsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPendingViewOpen, setIsPendingViewOpen] = useState(false);
  
  const [newContribution, setNewContribution] = useState({
    amount: '',
    contribution_type: 'welfare',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    if (profile?.id) {
      fetchContributions();

      // Real-time subscription for new contributions
      const channel = supabase
        .channel('contributions_updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `member_id=eq.${profile.id}` }, () => {
          fetchContributions();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contributions', filter: `member_id=eq.${profile.id}` }, () => {
          fetchContributions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          member:member_id (full_name, id)
        `)
        .eq('member_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id || !newContribution.amount) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('contributions').insert({
        member_id: profile.id,
        amount: parseFloat(newContribution.amount),
        contribution_type: newContribution.contribution_type,
        reference_number: newContribution.reference_number || null,
        notes: newContribution.notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Contribution Recorded',
        description: 'Your contribution has been submitted for verification.',
      });

      setIsDialogOpen(false);
      setNewContribution({
        amount: '',
        contribution_type: 'welfare',
        reference_number: '',
        notes: '',
      });
      fetchContributions();
    } catch (error) {
      console.error('Error submitting contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit contribution. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      paid: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      missed: { color: 'bg-red-100 text-red-800', icon: <Clock className="w-3 h-3" /> },
    };
    const { color, icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const stats = {
    total: contributions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
    pending: contributions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    count: contributions.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">My Contributions</h2>
          <p className="text-muted-foreground">Track your welfare and project contributions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Record Contribution
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Contribution</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g., 500"
                  value={newContribution.amount}
                  onChange={(e) =>
                    setNewContribution({ ...newContribution, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Contribution Type</Label>
                <Select
                  value={newContribution.contribution_type}
                  onValueChange={(value) =>
                    setNewContribution({ ...newContribution, contribution_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registration">Registration Fee</SelectItem>
                    <SelectItem value="welfare">Welfare Contribution</SelectItem>
                    <SelectItem value="monthly">Monthly Dues</SelectItem>
                    <SelectItem value="project">Project Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference (Optional)</Label>
                <Input
                  id="reference"
                  placeholder="M-Pesa confirmation code"
                  value={newContribution.reference_number}
                  onChange={(e) =>
                    setNewContribution({ ...newContribution, reference_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any additional notes"
                  value={newContribution.notes}
                  onChange={(e) =>
                    setNewContribution({ ...newContribution, notes: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Contribution'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contributed</p>
                <p className="text-2xl font-bold text-green-600">
                  KES {stats.total.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsPendingViewOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-600">
                  KES {stats.pending.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-primary">{stats.count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contribution History</CardTitle>
          <CardDescription>All your contribution records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No contributions yet</h3>
              <p className="text-muted-foreground mt-1">
                Start by recording your first contribution
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell className="text-sm">
                        {new Date(contribution.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {contribution.contribution_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="font-medium">
                        KES {contribution.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {contribution.reference_number || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(contribution.status)}</TableCell>
                      <TableCell>
                        {contribution.status !== 'paid' ? (
                          <PayWithMpesa
                            contributionId={contribution.id}
                            defaultAmount={contribution.amount}
                            trigger={<Button size="sm" className="btn-outline">Pay with M-Pesa</Button>}
                          />
                        ) : (
                          <span className="text-sm text-green-600">Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payments Modal Dialog */}
      <Dialog open={isPendingViewOpen} onOpenChange={setIsPendingViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Pending Payments</DialogTitle>
              <button
                onClick={() => setIsPendingViewOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-800">Total Pending Amount</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    KES {stats.pending.toLocaleString()}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-500 opacity-30" />
              </div>
            </div>

            {/* Pending Contributions List */}
            {contributions.filter((c) => c.status === 'pending').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No Pending Payments!</p>
                <p className="text-muted-foreground mt-1">You are all caught up</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contributions
                  .filter((c) => c.status === 'pending')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((contribution) => (
                    <div
                      key={contribution.id}
                      className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">
                              {contribution.contribution_type.replace('_', ' ').toUpperCase()}
                            </p>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Pending
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(contribution.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-700">
                            KES {contribution.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {contribution.notes && (
                        <p className="text-xs text-muted-foreground mb-3 p-2 bg-white rounded border border-yellow-100">
                          {contribution.notes}
                        </p>
                      )}

                      {/* Pay Button */}
                      <div className="flex justify-end">
                        <PayWithMpesa
                          contributionId={contribution.id}
                          defaultAmount={contribution.amount}
                          trigger={
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pay Now
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPendingViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment handled by PayWithMpesa component */}
    </div>
  );
};

export default ContributionsPage;