import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { KittyCategory } from '@/hooks/useKitties';

interface Props {
  onCreated?: () => void;
}

const CATEGORIES: { value: KittyCategory; label: string }[] = [
  { value: 'emergency', label: '🚨 Emergency' },
  { value: 'education', label: '🎓 Education' },
  { value: 'welfare', label: '🤝 Welfare' },
  { value: 'project', label: '🏗️ Project' },
  { value: 'other', label: '📦 Other' },
];

const KittyCreateDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<KittyCategory>('emergency');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [beneficiaryRelationship, setBeneficiaryRelationship] = useState('');
  const [beneficiaryDetails, setBeneficiaryDetails] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('emergency');
    setTarget('');
    setDeadline('');
    setBeneficiaryName('');
    setBeneficiaryPhone('');
    setBeneficiaryRelationship('');
    setBeneficiaryDetails('');
  };

  const submit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    const t = Number(target);
    if (!t || t <= 0) return toast.error('Target must be a positive amount');
    if (!user?.id) return toast.error('Not signed in');

    setSubmitting(true);
    if (!beneficiaryName.trim()) {
      setSubmitting(false);
      return toast.error('Beneficiary name is required for transparency');
    }
    const { error } = await supabase.from('kitties' as never).insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      target_amount: t,
      deadline: deadline || null,
      created_by: user.id,
      beneficiary_name: beneficiaryName.trim(),
      beneficiary_phone: beneficiaryPhone.trim() || null,
      beneficiary_relationship: beneficiaryRelationship.trim() || null,
      beneficiary_details: beneficiaryDetails.trim() || null,
    } as never);
    setSubmitting(false);

    if (error) {
      toast.error(error.message || 'Could not create kitty');
      return;
    }
    toast.success('Kitty created');
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Kitty
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Community Kitty</DialogTitle>
          <DialogDescription>
            Set up a fund members can contribute to via M-Pesa or their wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Emergency Response Fund"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as KittyCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target (KES)</Label>
              <Input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this kitty for?"
              rows={3}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div>
              <p className="text-sm font-semibold">Beneficiary (transparency)</p>
              <p className="text-xs text-muted-foreground">
                Members will see who this fund is for before contributing.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Beneficiary name *</Label>
              <Input
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="e.g. Jane Wanjiku Mwangi"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={beneficiaryPhone}
                  onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={beneficiaryRelationship}
                  onChange={(e) => setBeneficiaryRelationship(e.target.value)}
                  placeholder="Member / Spouse / Child"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Situation / details</Label>
              <Textarea
                value={beneficiaryDetails}
                onChange={(e) => setBeneficiaryDetails(e.target.value)}
                placeholder="Brief background so members understand the need"
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Kitty'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KittyCreateDialog;
