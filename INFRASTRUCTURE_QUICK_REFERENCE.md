# Critical Infrastructure - Quick Reference

## TL;DR - Where to Use Each Utility

### Error Handling (`src/lib/errorHandling.ts`)
```typescript
import { handleAsync, getErrorMessage, isNetworkError } from '@/lib/errorHandling';

// Use in API calls
const { data, error } = await handleAsync(() => fetchData());
if (error) toast.error(getErrorMessage(error));

// Use in retry logic
const result = await retryAsync(() => saveData(), 3);

// Use in Error Boundary
const ErrorBoundary = () => <SectionErrorBoundary fallback={<ErrorUI />}>;
```

### Pagination (`src/lib/pagination.ts`)
```typescript
import { usePagination, Pagination } from '@/lib/pagination';

// In component
const { currentPage, pageSize, totalPages, goToPage } = usePagination({
  totalItems: total,
});

// In JSX
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
/>
```

**Apply to:** MembersPage, AnnouncementsPage, ContributionsPage, WelfarePage, ReportsPage

### Shared Components (`src/components/dashboard/SharedComponents.tsx`)
```typescript
import {
  StatusBadge,
  StatCard,
  EmptyState,
  PriorityBadge,
  ListSkeleton,
} from '@/components/dashboard/SharedComponents';

// Status badge
<StatusBadge status="active" />  // Shows: "Active" in green

// Stat card
<StatCard label="Members" value={250} color="blue" />

// Empty state
<EmptyState title="No data" description="When data arrives..." />
```

### Validation (`src/lib/validation.ts`)
```typescript
import { validateForm, memberRegistrationSchema } from '@/lib/validation';

// In form submission
const result = await validateForm(formData, memberRegistrationSchema);
if (result.valid) {
  // Save data
} else {
  // Display errors[fieldName]
}

// Individual field validation
validateEmail("test@example.com");
validatePhone("0712345678");
validateAmount("500", { min: 100, max: 5000 });
```

**Apply to:** All forms (ProfileUpdateForm, ContributionForm, etc.)

### Database (`src/lib/database.ts`)
```typescript
import {
  fetchMembers,
  fetchContributionsWithMembers,
  insertWithAudit,
  countRecords,
} from '@/lib/database';

// Fetch with proper columns
const members = await fetchMembers({
  status: 'active',
  limit: 20,
  offset: 0,
});

// Fetch with JOINs (prevents N+1)
const contributions = await fetchContributionsWithMembers();

// Insert with audit logging
await insertWithAudit(
  'members',
  newMemberData,
  userId,
  'MEMBER_CREATED'
);

// Count for pagination
const total = await countRecords('members', { status: 'active' });
```

**Replace all:** Manual Supabase queries with these functions

### Accessibility (`src/lib/accessibility.ts`)
```typescript
import { createFieldAriaProps, focusManagement } from '@/lib/accessibility';

// On form field
<input
  {...createFieldAriaProps({
    fieldName: 'email',
    required: true,
    error: errorMessage,
  })}
/>

// Focus management
focusManagement.trapFocus(event, modalElement);
focusManagement.announce('Saved successfully!');
```

**Apply to:** Forms, Modals, Dialogs, Complex components

### Real-time Subscriptions (`src/lib/realtimeSubscriptions.ts`)
```typescript
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';

// Stable subscription (doesn't re-create)
const { isConnected, error } = useRealtimeSubscription({
  table: 'announcements',
  onChange: (payload) => updateState(payload),
});

// Connection quality
const quality = useConnectionQuality(); // '4g' | '3g' | '2g'
```

**Apply to:** Pages needing real-time updates (Announcements, Notifications, Payments)

### Performance (`src/lib/performance.ts`)
```typescript
import {
  useRenderTime,
  useApiPerformance,
  memoize,
  debounce,
} from '@/lib/performance';

// Track render time
useRenderTime('ExpensiveComponent');

// Track API calls
const { startTracking, endTracking } = useApiPerformance('/api/data');

// Memoize expensive calculations
const sorted = useMemo(
  () => memoize((items) => items.sort())(data),
  [data]
);

// Debounce search
const handleSearch = debounce((query) => search(query), 300);
```

**Apply to:** Dashboard pages, Forms, Lists, API integrations

---

## Common Patterns

### Page with Pagination and Error Handling

```typescript
export const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { currentPage, pageSize, goToPage } = usePagination({
    totalItems: total,
    initialPageSize: 20,
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { data, error } = await handleAsync(async () => {
        const offset = (currentPage - 1) * pageSize;
        const [members, count] = await Promise.all([
          fetchMembers({ limit: pageSize, offset }),
          countRecords('members'),
        ]);
        return { members, count };
      });

      if (error) {
        toast.error(getErrorMessage(error));
      } else {
        setMembers(data.members);
        setTotal(data.count);
      }
      setIsLoading(false);
    };

    loadData();
  }, [currentPage, pageSize]);

  if (isLoading) return <ListSkeleton count={pageSize} />;
  if (members.length === 0)
    return <EmptyState title="No members found" />;

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-semibold">{member.firstName} {member.lastName}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <StatusBadge status={member.status} />
          </div>
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / pageSize)}
        onPageChange={goToPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </>
  );
};
```

### Form with Validation

```typescript
import { validateForm, profileUpdateSchema } from '@/lib/validation';

export const ProfileForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await validateForm(formData, profileUpdateSchema);

    if (result.valid) {
      const { data, error } = await handleAsync(() =>
        updateProfile(result.data)
      );
      if (error) {
        toast.error(getErrorMessage(error));
      } else {
        toast.success('Profile updated!');
      }
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        {...createFieldAriaProps({
          fieldName: 'email',
          required: true,
          error: errors.email,
        })}
      />
      {errors.email && (
        <p role="alert" className="text-red-500">{errors.email}</p>
      )}
      <button type="submit">Save</button>
    </form>
  );
};
```

### Real-time Component

```typescript
export const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const { isConnected } = useRealtimeSubscription({
    table: 'announcements',
    event: 'INSERT',
    onChange: (payload) => {
      setAnnouncements((prev) => [payload.new, ...prev]);
    },
  });

  return (
    <>
      {!isConnected && (
        <div role="alert" className="bg-yellow-50 p-2">
          Offline - changes will sync when reconnected
        </div>
      )}
      <AnnouncementList announcements={announcements} />
    </>
  );
};
```

---

## Integration Checklist

- [ ] **Error Handling**
  - [ ] Add to API calls in MembersPage
  - [ ] Add to API calls in AnnouncementsPage
  - [ ] Add to API calls in ContributionsPage
  - [ ] Add to form submissions

- [ ] **Pagination**
  - [ ] MembersPage (>100 members)
  - [ ] AnnouncementsPage (>50 items)
  - [ ] ContributionsPage (>100 items)
  - [ ] WelfarePage (>50 items)

- [ ] **Shared Components**
  - [ ] Replace StatusBadge logic in 5 places
  - [ ] Replace stat card code in dashboards
  - [ ] Add EmptyState to list pages
  - [ ] Add ListSkeleton to loading states

- [ ] **Validation**
  - [ ] ProfileUpdateForm
  - [ ] MemberRegistrationForm
  - [ ] ContributionForm
  - [ ] WelfareForm
  - [ ] AnnouncementForm

- [ ] **Database**
  - [ ] Replace all SELECT * queries
  - [ ] Add audit logging to mutations
  - [ ] Replace N+1 queries with JOINs

- [ ] **Accessibility**
  - [ ] Add ARIA to all form inputs
  - [ ] Add focus management to modals
  - [ ] Add keyboard navigation to dropdowns
  - [ ] Add screen reader announcements

- [ ] **Real-time**
  - [ ] AnnouncementsPage - new announcements
  - [ ] NotificationsPage - new notifications
  - [ ] PaymentDashboard - payment updates
  - [ ] DashboardHome - contribution updates

- [ ] **Performance**
  - [ ] Add useRenderTime to Dashboard pages
  - [ ] Debounce search inputs
  - [ ] Throttle scroll handlers
  - [ ] Add Web Vitals monitoring

---

## Support

For detailed documentation, see: `CRITICAL_INFRASTRUCTURE_GUIDE.md`

Each utility file has comprehensive comments and type definitions.

Example API and advanced usage available in the full guide.
