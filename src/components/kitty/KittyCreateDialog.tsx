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
import { formatKes, KITTY_CATEGORY_META, type KittyCategoryKey } from '@/lib/kittyUtils';

interface Props {
  onCreated?: () => void;
}

const CATEGORIES: { value: KittyCategory; label: string }[] = [
  { value: 'emergency', label: KITTY_CATEGORY_META.emergency.label },
  { value: 'education', label: KITTY_CATEGORY_META.education.label },
  { value: 'welfare', label: KITTY_CATEGORY_META.welfare.label },
  { value: 'project', label: KITTY_CATEGORY_META.project.label },
  { value: 'other', label: KITTY_CATEGORY_META.other.label },
];

const TARGET_PRESETS = [10000, 25000, 50000, 100000];
const today = new Date().toISOString().slice(0, 10);

const KittyCreateDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<KittyCategory>('emergency');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('emergency');
    setTarget('');
    setDeadline('');
  };

  const submit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    const t = Number(target);
    if (!t || t <= 0) return toast.error('Target must be a positive amount');
    if (deadline && deadline < today) return toast.error('Deadline cannot be in the past');
    if (!user?.id) return toast.error('Not signed in');

    setSubmitting(true);
    const { error } = await supabase.from('kitties' as never).insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      target_amount: t,
      deadline: deadline || null,
      created_by: user.id,
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value && !submitting) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Kitty
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a Community Kitty</DialogTitle>
          <DialogDescription>
            Set the target, category and deadline members will see before contributing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kitty-title">Title</Label>
            <Input
              id="kitty-title"
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
                    <span className="inline-flex items-center gap-2">
                      {(() => {
                        const Icon = KITTY_CATEGORY_META[c.value as KittyCategoryKey].Icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="kitty-target">Target (KES)</Label>
              <Input
                id="kitty-target"
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kitty-deadline">Deadline</Label>
              <Input
                id="kitty-deadline"
                type="date"
                min={today}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TARGET_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTarget(String(preset))}
              >
                {formatKes(preset)}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="kitty-description">Description</Label>
            <Textarea
              id="kitty-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this kitty for?"
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-dashed bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Beneficiaries can be added later from the kitty page once the recipient is confirmed.
            </p>
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
