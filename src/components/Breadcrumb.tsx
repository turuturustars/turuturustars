import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  readonly items?: readonly BreadcrumbItem[];
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  home: 'Home',
  profile: 'Profile',
  contributions: 'Contributions',
  'all-contributions': 'All Contributions',
  welfare: 'Welfare',
  announcements: 'Announcements',
  members: 'Members',
  approvals: 'Approvals',
  meetings: 'Meetings',
  discipline: 'Discipline',
  voting: 'Voting',
  reports: 'Reports',
  'mpesa-management': 'M-Pesa',
  roles: 'Roles',
  chairperson: 'Chairperson',
  'vice-chairperson': 'Vice Chairperson',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  admin: 'Admin',
  messages: 'Messages',
  'role-handover': 'Role Handover',
  finance: 'Finance',
  communication: 'Communication',
  governance: 'Governance',
  'welfare-management': 'Welfare Management',
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => (
          <li key={item.path || index} className="flex items-center gap-1">
            {item.path ? (
              <Link to={item.path} className="text-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
            {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    currentPath += `/${part}`;

    // Skip role paths and show them as one item
    if (part === 'roles' && i + 1 < parts.length) {
      const rolePart = parts[i + 1];
      const roleLabel = ROUTE_LABELS[rolePart] || rolePart;
      breadcrumbs.push({
        label: roleLabel,
        path: currentPath + `/${rolePart}`,
      });
      i += 2; // Skip next iteration
      currentPath += `/${rolePart}`;
      continue;
    }

    const label = ROUTE_LABELS[part] || part.split('-').join(' ');
    breadcrumbs.push({
      label,
      path: i < parts.length - 1 ? currentPath : undefined,
    });
    i++;
  }

  return breadcrumbs;
}
