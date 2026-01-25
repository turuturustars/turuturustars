/**
 * Phase 7: Page Integration Migration Guide
 * How to update existing dashboard pages with accessibility components
 * 
 * File: PHASE7_PAGE_INTEGRATION_GUIDE.md
 */

# Phase 7: Accessibility Integration Guide

## Overview

This guide shows how to update existing dashboard pages to use the new accessible components while maintaining all current functionality.

## Step-by-Step Migration Process

### Step 1: Import Accessible Components

Replace imports from generic UI components with accessible alternatives:

```typescript
// BEFORE
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';

// AFTER
import {
  AccessibleButton,
  AccessibleDialog,
  AccessibleSelect,
  AccessibleFormField,
  AccessibleTable,
  useStatus,
} from '@/components/accessible';
```

### Step 2: Replace Buttons

Convert existing buttons to AccessibleButton with proper ARIA labels:

```typescript
// BEFORE
<Button onClick={handleDelete} size="sm">
  <Trash2 size={18} />
</Button>

// AFTER
<AccessibleButton
  onClick={handleDelete}
  ariaLabel="Delete item"
  variant="destructive"
  size="sm"
>
  <Trash2 size={18} />
</AccessibleButton>
```

### Step 3: Replace Form Fields

Update form fields to use AccessibleFormField with integrated labels:

```typescript
// BEFORE
<label htmlFor="email">Email Address</label>
<input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
{errors.email && <p className="text-red-500">{errors.email}</p>}

// AFTER
<AccessibleFormField
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Step 4: Replace Selects

Convert Select components to AccessibleSelect:

```typescript
// BEFORE
<Select value={status} onValueChange={setStatus}>
  <SelectTrigger>
    <SelectValue placeholder="Select status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="inactive">Inactive</SelectItem>
  </SelectContent>
</Select>

// AFTER
<AccessibleSelect
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]}
  value={status}
  onChange={setStatus}
  required
/>
```

### Step 5: Replace Tables

Convert table components to AccessibleTable:

```typescript
// BEFORE
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {data.map(row => (
      <tr key={row.id}>
        <td>{row.name}</td>
        <td>{row.email}</td>
        <td>{row.status}</td>
      </tr>
    ))}
  </tbody>
</table>

// AFTER
<AccessibleTable
  caption="User list with actions"
  columns={[
    { id: 'name', header: 'Name', sortable: true },
    { id: 'email', header: 'Email' },
    { id: 'status', header: 'Status' },
  ]}
  data={data}
  isSortable={true}
  sortedBy={sortedBy}
  sortDirection={sortDirection}
  onSort={handleSort}
  renderRowActions={(row) => (
    <AccessibleButton
      ariaLabel={`Actions for ${row.name}`}
      size="sm"
    >
      ⋮
    </AccessibleButton>
  )}
/>
```

### Step 6: Replace Dialogs

Update Dialog components to AccessibleDialog:

```typescript
// BEFORE
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Item</DialogTitle>
    </DialogHeader>
    {/* form content */}
  </DialogContent>
</Dialog>

// AFTER
<AccessibleDialog
  title="Create Item"
  description="Fill in the form to create a new item"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="md"
>
  {/* form content */}
</AccessibleDialog>
```

### Step 7: Add Toast/Status Messages

Replace toast notifications with AccessibleStatus:

```typescript
// BEFORE
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

const handleSave = async () => {
  try {
    await saveData();
    toast({ title: 'Success', description: 'Data saved' });
  } catch (error) {
    toast({ title: 'Error', description: 'Failed to save' });
  }
};

// AFTER
import { AccessibleStatus, useStatus } from '@/components/accessible';

const { status, showSuccess, showError } = useStatus();

const handleSave = async () => {
  try {
    await saveData();
    showSuccess('Data saved successfully', 3000);
  } catch (error) {
    showError('Failed to save data', 5000);
  }
};

// In JSX
<AccessibleStatus
  message={status.message}
  type={status.type}
  isVisible={status.isVisible}
  autoDismissDuration={status.autoDismissDuration}
  onDismiss={() => hideStatus()}
/>
```

## Page-by-Page Integration Plan

### High Priority Pages (Update First)

#### 1. ContributionsPage
- **Issues**: Icon buttons lack labels, form fields need error ARIA
- **Components to Replace**: 
  - Button (all icon buttons) → AccessibleButton
  - Form fields → AccessibleFormField
  - Table → AccessibleTable
  - Toasts → AccessibleStatus
- **Estimated Changes**: 100-150 lines

#### 2. NotificationsPage
- **Issues**: No live region for real-time updates
- **Components to Replace**:
  - Status display → AccessibleStatus with aria-live
  - Buttons → AccessibleButton
  - Lists → UnorderedList or OrderedList
- **Estimated Changes**: 80-120 lines

#### 3. VotingPage
- **Issues**: Voting buttons not keyboard accessible
- **Components to Replace**:
  - Voting buttons → AccessibleButton with aria-pressed
  - Results display → AccessibleStatus with live updates
  - Buttons → AccessibleButton
- **Estimated Changes**: 70-100 lines

### Medium Priority Pages (Update Next)

#### 4. MessagesPage
- Components: Button, TextField, Table

#### 5. DashboardHome
- Components: Button, Card, Navigation

#### 6. AdminDashboard
- Components: Button, Form, Select, Table

#### 7. ReportsPage
- Components: Table, Select, Button, Status

#### 8. MeetingsPage
- Components: Button, Form, List, Status

#### 9. ProfilePage
- Components: Form, Button, Dialog

#### 10. ApprovalsPage
- Components: Button, Table, Form, Status

## Testing After Migration

### Automated Testing
```bash
# Run Lighthouse accessibility audit
npm run audit:a11y

# Run axe DevTools scan
npm run test:accessibility

# Validate WCAG compliance
npm run validate:wcag
```

### Manual Testing Checklist
- [ ] Tab through all interactive elements
- [ ] Escape closes all modals
- [ ] Arrow keys navigate menus
- [ ] Focus visible on all elements
- [ ] Screen reader announcements working
- [ ] Error messages announced immediately
- [ ] Status updates announced to screen readers

### Browser Testing
- [ ] Chrome DevTools accessibility audit
- [ ] Edge accessibility tools
- [ ] Firefox accessibility inspector
- [ ] Safari rotor

### Screen Reader Testing
- [ ] NVDA (Windows)
- [ ] JAWS (Windows, optional)
- [ ] VoiceOver (Mac/iOS)
- [ ] TalkBack (Android)

## Common Migration Patterns

### Pattern 1: Button with Icon Only

```typescript
// BEFORE
<button className="icon-button">
  <Edit size={18} />
</button>

// AFTER
<AccessibleButton
  ariaLabel="Edit this item"
  size="sm"
  variant="ghost"
>
  <Edit size={18} />
</AccessibleButton>
```

### Pattern 2: Form with Validation

```typescript
// BEFORE
<div>
  <label>Field Label</label>
  <input value={value} onChange={handleChange} />
  {error && <span className="error">{error}</span>}
</div>

// AFTER
<AccessibleFormField
  label="Field Label"
  value={value}
  onChange={handleChange}
  error={error}
  required={isRequired}
  helperText="Additional help text"
/>
```

### Pattern 3: Dynamic Status Updates

```typescript
// BEFORE
const [message, setMessage] = useState('');

// Handle update
setMessage('Item updated');
setTimeout(() => setMessage(''), 3000);

// AFTER
const { status, showSuccess } = useStatus();

// Handle update
showSuccess('Item updated', 3000);

// Render
<AccessibleStatus {...status} />
```

## Accessibility Enhancements by Page Type

### Dashboard Pages
- Add skip links at top
- Ensure heading hierarchy (h1, h2, h3)
- Add aria-live to real-time content
- Make all controls keyboard accessible

### Form Pages
- Use AccessibleFormField for all inputs
- Add ARIA labels to buttons
- Show validation errors with aria-invalid
- Use aria-describedby for help text

### Data Pages (Tables)
- Use AccessibleTable for all data
- Add captions explaining table content
- Make sortable columns keyboard accessible
- Announce sort changes to screen readers

### Modal/Dialog Pages
- Use AccessibleDialog
- Set initial focus to first form field
- Trap focus within modal
- Return focus on close

## Troubleshooting Common Issues

### Issue: Focus not visible
**Solution**: Import accessibility.css and ensure focus-visible styles aren't overridden

### Issue: Screen reader not announcing updates
**Solution**: Use AccessibleStatus with aria-live="polite" or "assertive"

### Issue: Keyboard navigation not working
**Solution**: Ensure all interactive elements use AccessibleButton or proper tabindex

### Issue: Color contrast failing
**Solution**: Check meetsWCAGAA() and use dark mode classes for dark backgrounds

## Success Criteria

Each page should achieve:
- ✓ Lighthouse Accessibility Score: 90+/100
- ✓ Zero WCAG AA violations
- ✓ All controls keyboard accessible
- ✓ Screen reader compatible
- ✓ Focus always visible
- ✓ Proper heading hierarchy
- ✓ 4.5:1 color contrast on all text

## Timeline Estimate

- **Phase 7.1**: Foundation (✓ Complete) - 1 week
- **Phase 7.2**: High Priority Pages (1-3) - 1 week
- **Phase 7.3**: Medium Priority Pages (4-10) - 2 weeks
- **Phase 7.4**: Testing & Fixes - 1 week
- **Total Phase 7**: 5 weeks

## Next Steps

1. Start with ContributionsPage
2. Apply pattern to NotificationsPage
3. Update VotingPage
4. Continue with medium priority pages
5. Run comprehensive accessibility audit
6. Address any remaining issues
7. Document any custom accessibility patterns
8. Proceed to Phase 8

---

**Ready to start page integration? Choose your starting page and begin!**
