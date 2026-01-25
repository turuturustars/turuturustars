# Phase 7: Accessibility Quick Reference

## 🚀 Quick Start

### Import Components
```typescript
import {
  AccessibleButton,
  AccessibleFormField,
  AccessibleDialog,
  AccessibleTable,
  AccessibleStatus,
  AccessibleSelect,
  useStatus,
} from '@/components/accessible';
```

### Common Patterns

#### 1️⃣ Accessible Button
```typescript
<AccessibleButton ariaLabel="Delete" onClick={handleDelete}>
  <Trash2 size={18} />
</AccessibleButton>
```

#### 2️⃣ Accessible Form
```typescript
<AccessibleFormField
  label="Email"
  type="email"
  error={errors.email}
  required
/>
```

#### 3️⃣ Status Messages
```typescript
const { showSuccess, showError } = useStatus();
showSuccess('Saved!', 3000);
showError('Error', 5000);
```

#### 4️⃣ Dropdown/Select
```typescript
<AccessibleSelect
  label="Choose"
  options={[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]}
  value={selected}
  onChange={setSelected}
/>
```

#### 5️⃣ Data Table
```typescript
<AccessibleTable
  caption="Users"
  columns={[{id: 'name', header: 'Name'}]}
  data={data}
  isSortable
/>
```

#### 6️⃣ Modal/Dialog
```typescript
<AccessibleDialog
  title="Confirm"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
>
  Content here
</AccessibleDialog>
```

---

## 📊 Component Features Matrix

| Feature | Button | Form | Select | Table | Dialog | Status |
|---------|--------|------|--------|-------|--------|--------|
| ARIA Labels | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Keyboard Nav | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Screen Reader | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Focus Trap | - | - | - | - | ✅ | - |
| Dark Mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error Handling | ✅ | ✅ | ✅ | - | - | ✅ |
| Live Updates | - | - | - | - | - | ✅ |

---

## 🎯 WCAG 2.1 AA Checklist

- ✅ 4.5:1 color contrast
- ✅ Keyboard accessible
- ✅ Focus visible (2px)
- ✅ ARIA labels
- ✅ Error messages
- ✅ Screen readers
- ✅ No keyboard traps
- ✅ Proper heading hierarchy

---

## 🧪 Quick Testing

### Keyboard Test
- Tab through all elements
- Escape closes modals
- Arrow keys navigate
- Enter activates

### Screen Reader Test (Windows: NVDA)
- All buttons read correctly
- Error messages announced
- Status updates heard
- Form labels clear

### Contrast Test
- All text ≥ 4.5:1
- Buttons ≥ 3:1
- Focus outline visible
- No color-only info

---

## 📝 Pages to Migrate

**High Priority** (Week 1)
- [ ] ContributionsPage
- [ ] NotificationsPage
- [ ] VotingPage

**Medium Priority** (Weeks 2-3)
- [ ] MessagesPage
- [ ] DashboardHome
- [ ] AdminDashboard
- [ ] ReportsPage

**Remaining** (Week 4)
- [ ] MeetingsPage
- [ ] ProfilePage
- [ ] ApprovalsPage
- [ ] + More

---

## 💡 Pro Tips

1. **Always use ariaLabel on icon buttons**
   ```typescript
   <AccessibleButton ariaLabel="Delete"> ❌ Missing label
   <AccessibleButton ariaLabel="Delete item"> ✅ Clear label
   ```

2. **Required fields need indicator**
   ```typescript
   <AccessibleFormField required label="Name" /> ✅ Shows *
   ```

3. **Show errors immediately**
   ```typescript
   <AccessibleFormField error={errors.email} /> ✅ Announced
   ```

4. **Test keyboard navigation**
   - Unplug mouse
   - Tab through entire page
   - Can you do everything?

5. **Use proper table captions**
   ```typescript
   <AccessibleTable caption="Active users list" /> ✅
   ```

---

## 🔧 Utility Functions

```typescript
// Generate unique IDs
const id = useAriaId('modal');

// Focus trap
const { containerRef } = useFocusTrap(isOpen);

// Announce to screen readers
announceToScreenReader('Action completed');

// Check color contrast
const isCompliant = meetsWCAGAA('#000000', '#ffffff');

// Arrow key navigation
useArrowKeyNavigation(itemCount, onSelect);

// Form field properties
const { inputProps, labelProps } = useFormField('email', error);
```

---

## 📚 Documentation Files

1. **PHASE7_EXTENDED_COMPONENTS.md** - Full component guide
2. **PHASE7_PAGE_INTEGRATION_GUIDE.md** - Step-by-step migration
3. **PHASE7_COMPLETION_SUMMARY.md** - Complete overview
4. **PHASE7_QUICK_REFERENCE.md** - This file

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Focus not visible | Check focus-visible CSS |
| SR not announcing | Use aria-live="polite" |
| Keyboard not working | Use AccessibleButton |
| Contrast failing | Use utility or dark mode |
| Modal not trapping focus | Use useFocusTrap() |

---

## 🎓 Learning Resources

### Quick Learn (15 min)
1. Read this file
2. Open AccessibleButton component
3. Copy-paste a simple example
4. Test with Tab key

### Deep Dive (1 hour)
1. Read PHASE7_EXTENDED_COMPONENTS.md
2. Review all 9 components
3. Check src/lib/a11y.ts
4. Review src/styles/accessibility.css

### Full Mastery (4 hours)
1. Complete all docs
2. Review WCAG guidelines
3. Test with NVDA screen reader
4. Integrate one full page

---

## ✨ Success Looks Like

✅ All buttons keyboard accessible  
✅ All forms have clear labels  
✅ All errors announced  
✅ Screen reader reads everything  
✅ Focus always visible  
✅ Lighthouse 90+/100  
✅ WCAG 2.1 AA compliant  

---

## 🚀 Start Now!

1. Pick a page (ContributionsPage recommended)
2. Import accessible components
3. Replace Button → AccessibleButton
4. Replace form fields → AccessibleFormField
5. Test with keyboard
6. Run Lighthouse audit
7. Celebrate! 🎉

---

**Ready? Let's make the web accessible! 🌐♿**
