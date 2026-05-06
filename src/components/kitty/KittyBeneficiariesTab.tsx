import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, HeartHandshake, Phone, Loader2, Trash2, Target, Coins, Layers } from 'lucide-react';
import { toast } from 'sonner';
import type { KittyBeneficiaryRow, KittyRow } from '@/hooks/useKitties';

interface Props {
  kittyId: string;
  kitty?: KittyRow | null;
}

type GroupTotals = {
  rounds_count: number;
  total_contributed_all_rounds: number;
  total_disbursed_all_rounds: number;
  combined_balance: number;
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  partial: 'outline',
  paid: 'default',
};

const KittyBeneficiariesTab = ({ kittyId }: Props) => {
  const { user, hasRole } = useAuth();
  const [rows, setRows] = useState<KittyBeneficiaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [details, setDetails] = useState('');
  const [allocated, setAllocated] = useState('');

  const canManage = hasRole('admin');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kitty_beneficiaries' as never)
      .select('*')
      .eq('kitty_id', kittyId)
      .order('created_at', { ascending: false });
    setRows((data as unknown as KittyBeneficiaryRow[]) || []);
    setLoading(false);
  }, [kittyId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`kitty-ben-${kittyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitty_beneficiaries', filter: `kitty_id=eq.${kittyId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [kittyId, load]);

  const reset = () => {
    setName(''); setPhone(''); setRelationship(''); setDetails(''); setAllocated('');
  };

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (!user?.id) return toast.error('Not signed in');
    setSubmitting(true);
    const { error } = await supabase.from('kitty_beneficiaries' as never).insert({
      kitty_id: kittyId,
      name: name.trim(),
      phone: phone.trim() || null,
      relationship: relationship.trim() || null,
      details: details.trim() || null,
      allocated_amount: allocated ? Number(allocated) : 0,
      created_by: user.id,
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Beneficiary added');
    reset();
    setOpen(false);
  };

  const updateStatus = async (id: string, status: 'pending' | 'partial' | 'paid') => {
    const { error } = await supabase
      .from('kitty_beneficiaries' as never)
      .update({ status } as never)
      .eq('id', id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this beneficiary?')) return;
    const { error } = await supabase.from('kitty_beneficiaries' as never).delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Removed');
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-primary" />
          Beneficiaries ({rows.length})
        </CardTitle>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Beneficiary</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Wanjiku" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relationship</Label>
                    <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Member / Spouse" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Allocated amount (KES)</Label>
                  <Input type="number" value={allocated} onChange={(e) => setAllocated(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Situation / details</Label>
                  <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HeartHandshake className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No beneficiaries yet.</p>
            {canManage && <p className="text-xs mt-1">Add one once the recipient is identified.</p>}
          </div>
        ) : (
          rows.map((b) => (
            <div key={b.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{b.name}</p>
                  {b.relationship && <p className="text-xs text-muted-foreground">{b.relationship}</p>}
                </div>
                <Badge variant={STATUS_VARIANT[b.status]} className="capitalize shrink-0">{b.status}</Badge>
              </div>
              {b.phone && (
                <p className="text-sm inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <a href={`tel:${b.phone}`} className="text-primary hover:underline">{b.phone}</a>
                </p>
              )}
              {Number(b.allocated_amount) > 0 && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Allocated:</span>{' '}
                  <span className="font-semibold">KES {Number(b.allocated_amount).toLocaleString()}</span>
                </p>
              )}
              {b.details && <p className="text-sm whitespace-pre-line text-muted-foreground">{b.details}</p>}
              {canManage && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v as 'pending' | 'partial' | 'paid')}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasRole('admin') && (
                    <Button variant="ghost" size="sm" onClick={() => remove(b.id)} className="h-8 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default KittyBeneficiariesTab;
