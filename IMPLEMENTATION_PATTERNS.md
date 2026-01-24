# Implementation Guide - Apply to Remaining Pages

This guide shows how to apply the new utilities and components to other dashboard pages.

## Pattern 1: Apply Pagination to List Pages

### Before (ContributionsPage, ApprovalsPage, etc.):
```tsx
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  filterItems();
}, [items, filters]);

const filterItems = () => {
  // filtering logic
  setFilteredItems(filtered);
};
```

### After:
```tsx
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';

const [items, setItems] = useState([]);
const [searchTerm, setSearchTerm] = useState('');
const pagination = usePagination(15);
const debouncedSearch = useDebounce(searchTerm, 300);

const filteredItems = useMemo(() => {
  let filtered = items;
  if (debouncedSearch) {
    filtered = items.filter(item => 
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }
  return filtered;
}, [items, debouncedSearch]);

useEffect(() => {
  pagination.updateTotal(filteredItems.length);
}, [filteredItems.length]);

const paginatedItems = useMemo(() => {
  const offset = pagination.getOffset();
  return filteredItems.slice(offset, offset + pagination.pageSize);
}, [filteredItems, pagination]);
```

## Pattern 2: Add Confirmation for Destructive Actions

### Before:
```tsx
const handleDelete = async (id: string) => {
  if (!window.confirm('Are you sure?')) return;
  // delete logic
};
```

### After:
```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog';

const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });

const handleDeleteClick = (id: string) => {
  setDeleteConfirm({ open: true, id });
};

const handleConfirmDelete = async () => {
  if (!deleteConfirm.id) return;
  try {
    await deleteItem(deleteConfirm.id);
    toast({ title: 'Success', description: 'Deleted successfully' });
  } catch (err) {
    toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
  } finally {
    setDeleteConfirm({ open: false });
  }
};

// In JSX:
<ConfirmDialog
  open={deleteConfirm.open}
  title="Delete Item?"
  description="This action cannot be undone."
  action="Delete"
  actionVariant="destructive"
  onConfirm={handleConfirmDelete}
  onCancel={() => setDeleteConfirm({ open: false })}
/>
```

## Pattern 3: Replace Status Badge Logic

### Before:
```tsx
const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  return <Badge className={variants[status]}>{status}</Badge>;
};

// Usage:
{getStatusBadge(member.status)}
```

### After:
```tsx
import { StatusBadge } from '@/components/StatusBadge';

// Usage:
<StatusBadge status={member.status} />
```

## Pattern 4: Improve Error Handling

### Before:
```tsx
const fetchData = async () => {
  try {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    toast({
      title: 'Error',
      description: 'Failed to load data',
      variant: 'destructive',
    });
  }
};
```

### After:
```tsx
import { Logger, AppErrorHandler } from '@/utils/errorHandler';

const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setError(null);
    const { data, error: fetchError } = await supabase.from('table').select();
    if (fetchError) throw fetchError;
    setData(data);
  } catch (err) {
    Logger.error('Failed to fetch data', err);
    const message = AppErrorHandler.getErrorMessage(err);
    setError(message);
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  }
};

// In JSX:
{error && (
  <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
    {error}
    <Button size="sm" onClick={fetchData} className="ml-2">
      Retry
    </Button>
  </div>
)}
```

## Pattern 5: Add Empty State

### Before:
```tsx
{filteredItems.length === 0 && (
  <p className="text-center text-muted-foreground py-8">
    No items found
  </p>
)}
```

### After:
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Plus } from 'lucide-react';

{filteredItems.length === 0 && (
  <EmptyState
    icon={<SearchX className="w-12 h-12 text-muted-foreground" />}
    title="No items found"
    description="Try adjusting your search or filters"
    action={
      canCreate && (
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      )
    }
  />
)}
```

## Pattern 6: Use useForm Hook for Form Pages

### Before:
```tsx
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrors({});
  setIsSubmitting(true);
  try {
    await submitForm(formData);
    setFormData({ name: '', email: '' });
  } catch (error) {
    // error handling
  } finally {
    setIsSubmitting(false);
  }
};
```

### After:
```tsx
import { useForm } from '@/hooks/useForm';
import { ValidationRules, ValidationMessages } from '@/utils/validation';

const form = useForm({
  initialValues: { name: '', email: '' },
  validate: (values) => {
    const errors: any = {};
    if (!ValidationRules.required(values.name)) errors.name = ValidationMessages.required;
    if (!ValidationRules.email(values.email)) errors.email = ValidationMessages.email;
    return errors;
  },
  onSubmit: async (values) => {
    await submitForm(values);
  },
});

// In JSX:
<form onSubmit={form.handleSubmit}>
  <Input
    value={form.values.name}
    onChange={(e) => form.setFieldValue('name', e.target.value)}
    onBlur={() => form.setFieldTouched('name')}
  />
  {form.getFieldError('name') && (
    <span className="text-destructive text-sm">{form.getFieldError('name')}</span>
  )}
  <Button type="submit" disabled={form.isSubmitting}>
    {form.isSubmitting ? 'Submitting...' : 'Submit'}
  </Button>
</form>
```

## Pattern 7: Real-time Subscriptions (Safe)

### Before:
```tsx
useEffect(() => {
  const channel = supabase
    .channel('table_updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'my_table' }, () => {
      fetchData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []); // ⚠️ Can create duplicate subscriptions if deps are wrong
```

### After:
```tsx
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

useRealtimeSubscription(
  'my_table',
  () => fetchData(),
  { event: '*' }
);

// Or multiple subscriptions:
useRealtimeSubscriptions([
  {
    table: 'contributions',
    callback: () => fetchContributions(),
    options: { event: 'INSERT' },
  },
  {
    table: 'announcements',
    callback: () => fetchAnnouncements(),
    options: { event: '*' },
  },
]);
```

## Pattern 8: Add Export Functionality

### Before: No export support

### After:
```tsx
import { exportToCSV, exportToJSON } from '@/utils/export';

const handleExport = (format: 'csv' | 'json') => {
  const dataToExport = filteredItems.map(item => ({
    Name: item.full_name,
    Email: item.email,
    Status: item.status,
  }));

  if (format === 'csv') {
    exportToCSV(dataToExport, ['Name', 'Email', 'Status'], {
      filename: `items_${new Date().toISOString().split('T')[0]}.csv`,
    });
  } else {
    exportToJSON(dataToExport, `items_${new Date().toISOString().split('T')[0]}.json`);
  }

  toast({ title: 'Success', description: `Exported as ${format.toUpperCase()}` });
};

// In JSX:
<Button onClick={() => handleExport('csv')}>
  <Download className="w-4 h-4 mr-2" />
  Export CSV
</Button>
```

## Checklist for Each Page Update

- [ ] Add pagination hook if list > 20 items
- [ ] Add debounced search
- [ ] Replace custom badge logic with `StatusBadge`
- [ ] Add `EmptyState` component
- [ ] Add error state and retry button
- [ ] Add confirmation dialogs for delete actions
- [ ] Replace custom error handling with `AppErrorHandler`
- [ ] Add loading state indicators
- [ ] Use `useRealtimeSubscription` instead of inline subscriptions
- [ ] Add export functionality for data tables
- [ ] Test on mobile and desktop
- [ ] Verify accessibility

---

**Created:** January 24, 2026
**For:** Consistent implementation of improvements across all dashboard pages
