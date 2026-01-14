# Organizing Secretary / Discipline Master - Complete Access Guide

## Role Overview
The Organizing Secretary (also known as Discipline Master) is a constitutional official responsible for organizing meeting venues, managing discipline, collecting fines, and maintaining order within the association.

**Constitutional Reference:** Article 11.7

---

## 1. Dashboard Access
- **Path:** `/dashboard/organizing-secretary`
- **Features:**
  - Role overview with constitutional responsibilities
  - Statistics: Active Events, Open Incidents, Fines Issued, Resolved Cases
  - Quick action cards linking to all functional areas
  - Meeting preparation checklist
  - Constitutional responsibility breakdown with citations

---

## 2. Meetings Management
- **Path:** `/dashboard/meetings`
- **Permissions:** Fully enabled via `hasRole('organizing_secretary')` check
- **Capabilities:**
  - ✅ Create new meetings (schedule date, venue, agenda)
  - ✅ Manage meeting types (member, official, emergency)
  - ✅ Record meeting attendance
  - ✅ Track member apologies and absences
  - ✅ View meeting history and status
  - ✅ Organize venues and ensure materials availability

**Database Table:** `meetings`
- Fields: title, meeting_type, scheduled_date, venue, agenda, status, created_by
- Attendance tracking: `meeting_attendance` table

**Sidebar Navigation:** "Meetings" link visible for Organizing Secretary

---

## 3. Discipline & Fine Management
- **Path:** `/dashboard/discipline`
- **Permissions:** Fully enabled via `canManage` check including `hasRole('organizing_secretary')`
- **Capabilities:**
  - ✅ Record discipline incidents (misconduct, rule violations)
  - ✅ Specify incident types:
    - Missed meeting
    - Late contribution
    - Misconduct at meeting
    - Breach of constitution
    - Disruptive behavior
    - Unauthorized disclosure
    - Other
  - ✅ Assign fines in KES (Kenyan Shillings)
  - ✅ Track fine payment status
  - ✅ Mark fines as paid when collected
  - ✅ Resolve discipline cases with notes
  - ✅ Dismiss cases if warranted
  - ✅ View all pending and resolved cases

**Database Table:** `discipline_records`
- Fields: member_id, incident_type, description, incident_date, fine_amount, fine_paid, paid_at, status, recorded_by, resolved_by, resolution_notes

**Statistics Displayed:**
- Pending Cases count
- Resolved cases count
- Total Fines Collected (KES)
- Fines Pending Collection (KES)

**Sidebar Navigation:** "Discipline & Fines" link visible for Organizing Secretary

---

## 4. Member Registry Access
- **Path:** `/dashboard/members`
- **Capabilities:**
  - ✅ View complete member list with status
  - ✅ Search members by name or membership number
  - ✅ Filter by membership status (active, dormant, pending, suspended)
  - ✅ Access member contact information
  - ✅ View member joining dates

**Database Table:** `profiles`
- Fields: full_name, email, phone, membership_number, status, is_student, registration_fee_paid, joined_at

**Purpose:** Reference member information when recording incidents or tracking attendance

**Sidebar Navigation:** "Members" link visible for Organizing Secretary

---

## 5. Reports & Analytics
- **Path:** `/dashboard/reports`
- **Capabilities:**
  - ✅ View discipline statistics
  - ✅ Access fine collection reports
  - ✅ View financial summaries
  - ✅ Generate reports for official records
  - ✅ Track trends in discipline cases

**Sidebar Navigation:** "Reports" link visible for Organizing Secretary

---

## 6. Role-Based Permissions Matrix

### Organizing Secretary Permissions
```typescript
permissions: [
  'view_member_registry',      // Can access member list
  'manage_discipline',          // Full discipline management
  'record_incidents',          // Can record new incidents
  'view_disciplines',          // Can view all discipline records
  'create_meetings',           // Can create meetings
  'manage_meetings',           // Can manage meeting details & attendance
  'view_all_contributions',    // Can view financial information
  'view_announcements',        // Can read announcements
  'view_chat',                 // Can access chat system
  'send_chat_messages',        // Can participate in chat
]

features: [
  'dashboard',      // Organizing Secretary dashboard
  'discipline',     // Discipline management page
  'meetings',       // Full meetings management
  'members',        // Member registry access
  'reports',        // Reports and analytics
]
```

---

## 7. Sidebar Navigation for Organizing Secretary

The sidebar displays the following sections for users with `organizing_secretary` role:

**Officials Section:**
- `Org Secretary` → `/dashboard/organizing-secretary` (main dashboard)
- `Meetings` → `/dashboard/meetings` (create/manage meetings)
- `Discipline & Fines` → `/dashboard/discipline` (record incidents, collect fines)
- `Members` → `/dashboard/members` (member registry)
- `Reports` → `/dashboard/reports` (analytics and reports)

---

## 8. Constitutional Responsibilities Mapped to Features

| Constitutional Duty | Implementation | Feature Access |
|-------------------|-----------------|-----------------|
| Organize venue of meetings | Create/manage meetings with venue field | Meetings page |
| Ensure meeting items available | Venue and materials tracking | Meetings page |
| Keep records of misconduct | Incident recording system | Discipline page |
| Collect fines and penalties | Fine tracking and payment status | Discipline page |
| Perform duties as directed | Full dashboard access | All features |
| Be discipline master | Incident management & resolution | Discipline page |

---

## 9. Authentication & Role Verification

**Role Assignment:**
- Roles are stored in `user_roles` table with user_id and role fields
- Organizing Secretary role: `role = 'organizing_secretary'`
- Users can have multiple roles (e.g., Secretary + Patron)

**Primary Role Logic:**
- On login, if user has `organizing_secretary` role, they are auto-redirected to `/dashboard/organizing-secretary`
- Can still access other feature pages via sidebar if they have multiple roles

**Role Hierarchy:**
- Organizing Secretary inherits permissions from: committee_member, member
- Admin and Chairperson have override access to all pages

---

## 10. Auto-Redirect & Dashboard Navigation

When an Organizing Secretary logs in:

1. Authentication → `/dashboard` (DashboardHome)
2. Auto-detection of primary role: `organizing_secretary`
3. Auto-redirect → `/dashboard/organizing-secretary`
4. Sidebar shows all OS-accessible links
5. Quick action cards available for:
   - Manage Meetings
   - Record Misconduct
   - Manage Fines
   - Discipline Records
   - Member Registry
   - Reports

---

## 11. Verification Checklist

✅ **Permissions Configured:**
- rolePermissions.ts includes organizing_secretary with all required permissions
- roleFeatures.ts maps organizing_secretary to: ['dashboard', 'discipline', 'meetings', 'members', 'reports']

✅ **Pages & Routes:**
- OrganizingSecretaryDashboard.tsx (/dashboard/organizing-secretary)
- MeetingsPage.tsx includes hasRole('organizing_secretary') (/dashboard/meetings)
- DisciplinePage.tsx includes hasRole('organizing_secretary') (/dashboard/discipline)
- MembersPage.tsx accessible (/dashboard/members)
- ReportsPage.tsx accessible (/dashboard/reports)

✅ **Sidebar Navigation:**
- DashboardSidebar.tsx includes roleSpecificLinks() for organizing_secretary
- All 5 links properly routed and displayed

✅ **Database Permissions:**
- user_roles table stores 'organizing_secretary' role
- discipline_records allows recording by organizing_secretary
- meetings allows creation/management by organizing_secretary

✅ **Type Safety:**
- useAuth.ts updated with 'organizing_secretary' in UserRole union
- rolePermissions.ts exports 'organizing_secretary' as valid UserRole
- All dashboard pages compile without type errors

---

## 12. Testing Guide

### Test 1: Role Assignment
1. Create a user in Supabase
2. Add entry in user_roles: { user_id, role: 'organizing_secretary' }
3. Login with that user
4. Verify redirect to `/dashboard/organizing-secretary`

### Test 2: Create Meeting
1. Click "Manage Meetings" on dashboard
2. Click "Create Meeting"
3. Fill title, type, date, venue, agenda
4. Submit
5. Verify meeting appears in table

### Test 3: Record Incident
1. Click "Discipline & Fines" on dashboard
2. Click "Record Incident"
3. Select member, incident type, date, fine amount
4. Submit
5. Verify incident appears in pending cases

### Test 4: Collect Fine
1. In Discipline page, find unpaid fine
2. Click "Mark Paid" button
3. Verify fine status changes to "Paid"
4. Verify fine appears in "Fines Collected" stat

### Test 5: Access Member Registry
1. Click "Members" in sidebar
2. Verify list of all members displays
3. Search for a member
4. Filter by status
5. Verify contact info visible

### Test 6: Generate Report
1. Click "Reports" in sidebar
2. Verify discipline statistics
3. Verify fine collection summary
4. Verify report can be exported

---

## 13. Code References

### Key Files Modified:
- `src/lib/rolePermissions.ts` - Role definitions and permissions
- `src/hooks/useAuth.ts` - Updated with all new roles
- `src/components/dashboard/DashboardSidebar.tsx` - Sidebar navigation
- `src/pages/dashboard/OrganizingSecretaryDashboard.tsx` - OS dashboard

### Key Files Used (No Changes Needed):
- `src/pages/dashboard/MeetingsPage.tsx` - Already includes OS role check
- `src/pages/dashboard/DisciplinePage.tsx` - Already includes OS role check
- `src/pages/dashboard/MembersPage.tsx` - Accessible to all officials
- `src/pages/dashboard/ReportsPage.tsx` - Accessible to all officials
- `src/App.tsx` - All routes registered

---

## 14. Troubleshooting

**Issue:** Organizing Secretary can't see Meetings link
- **Solution:** Check user_roles table for 'organizing_secretary' role entry
- **Solution:** Clear browser cache and refresh

**Issue:** Can't create meeting as OS
- **Solution:** Verify hasRole('organizing_secretary') passes in MeetingsPage
- **Solution:** Check Supabase RLS policies allow user_id matching

**Issue:** Fine payment button not showing
- **Solution:** Ensure fine_amount > 0 and fine_paid = false
- **Solution:** Verify canManage includes organizing_secretary

**Issue:** Auto-redirect not working
- **Solution:** Check DashboardHome.tsx getPrimaryRole() implementation
- **Solution:** Verify user has exactly one role or OS is first in list

---

## 15. Future Enhancements

Potential additions to Organizing Secretary role:
- [ ] Bulk fine assignment
- [ ] Incident appeal workflow
- [ ] Automatic fine reminder notifications
- [ ] Meeting material templates
- [ ] Discipline case workflow automation
- [ ] Fine payment proof uploads
- [ ] Attendance reports by member
- [ ] Meeting minute approvals
- [ ] Digital incident evidence attachment
- [ ] Temporary acting appointments

---

**Last Updated:** 2025-01-15  
**Status:** ✅ Fully Implemented & Tested  
**Compliance:** Article 11.7 Constitution Requirements
