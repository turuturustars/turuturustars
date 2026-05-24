import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles } from '@/lib/rolePermissions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Search,
  Download,
  Loader2,
  Eye,
  AlertCircle,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePaginationState } from '@/hooks/usePaginationState';
import { useDebounce } from '@/hooks/useDebounce';
import { enqueueBackgroundJob, shortJobId } from '@/lib/backgroundJobs';

// Interface matches actual database schema
interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  performed_by: string;
  performed_by_name?: string | null;
  performed_by_role?: string | null;
  entity_type?: string;
  entity_id?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
}

const AuditLogViewer = () => {
  const { roles } = useAuth();
  const { toast } = useToast();
  const { status: statusMessage } = useStatus();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);
  const pagination = usePaginationState(50);
  const { page, pageSize, updateTotal } = pagination;

  const userRoles = normalizeRoles(roles);
  const auditRoles = [
    'admin',
    'chairperson',
    'vice_chairman',
    'treasurer',
    'secretary',
    'vice_secretary',
    'organizing_secretary',
    'patron',
  ];
  const canViewOperations = userRoles.some((role) => auditRoles.includes(role));

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const offset = (page - 1) * pageSize;
      let query = supabase
        .from('audit_logs')
        .select(
          'id, action_type, action_description, performed_by, performed_by_name, performed_by_role, entity_type, entity_id, created_at, metadata, ip_address',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (actionTypeFilter !== 'all') {
        query = query.eq('action_type', actionTypeFilter);
      }

      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.replace(/[,%]/g, ' ');
        query = query.or(`action_description.ilike.%${term}%,performed_by_name.ilike.%${term}%,action_type.ilike.%${term}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        // Map database rows to our interface
        const mappedLogs: AuditLog[] = data.map((row) => ({
          id: row.id,
          action_type: row.action_type,
          action_description: row.action_description,
          performed_by: row.performed_by,
          performed_by_name: row.performed_by_name,
          performed_by_role: row.performed_by_role,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          created_at: row.created_at,
          metadata: row.metadata as Record<string, unknown> | null,
          ip_address: row.ip_address,
        }));
        setLogs(mappedLogs);
        updateTotal(count ?? mappedLogs.length);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [actionTypeFilter, debouncedSearchTerm, page, pageSize, updateTotal, toast]);

  const fetchActionTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action_type')
      .order('action_type')
      .limit(200);

    if (!error && data) {
      setActionTypes([...new Set(data.map((row) => row.action_type).filter(Boolean))]);
    }
  }, []);

  useEffect(() => {
    if (canViewOperations) {
      void fetchAuditLogs();
    } else {
      setIsLoading(false);
    }
  }, [canViewOperations, fetchAuditLogs]);

  useEffect(() => {
    if (canViewOperations) {
      void fetchActionTypes();
    }
  }, [canViewOperations, fetchActionTypes]);

  const exportLogs = async () => {
    try {
      const jobId = await enqueueBackgroundJob({
        jobType: 'audit_log_export',
        payload: {
          actionType: actionTypeFilter === 'all' ? null : actionTypeFilter,
          search: debouncedSearchTerm || null,
          format: 'csv',
          requestedAt: new Date().toISOString(),
        },
        priority: 8,
        dedupeKey: `audit_log_export:${actionTypeFilter}:${debouncedSearchTerm || 'all'}`,
      });

      toast({
        title: 'Export queued',
        description: `Audit log export is processing as job ${shortJobId(jobId)}.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Could not queue audit log export',
        variant: 'destructive',
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('login')) return <Activity className="w-4 h-4" />;
    if (actionType.includes('delete')) return <AlertCircle className="w-4 h-4" />;
    if (actionType.includes('role')) return <Shield className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  if (!canViewOperations) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">
              Only authorized admins can view the Operations Center
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4 space-y-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Operations Center</h1>
          <p className="text-muted-foreground">
            Transparent, read-only feed of admin activity across the organization.
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Visibility</div>
          <p>
            Accessible to admin, chair, vice chair, secretary (and deputy), treasurer, organizing secretary, and patron. Members cannot access or see this area.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagination.totalItems}</p>
            <p className="text-xs text-muted-foreground mt-1">Matching filters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current page
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  pagination.goToPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={actionTypeFilter}
              onValueChange={(value) => {
                setActionTypeFilter(value);
                pagination.goToPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All action types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All action types</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <AccessibleButton onClick={() => void exportLogs()} className="gap-2" ariaLabel="Queue audit logs CSV export">
          <Download className="w-4 h-4" />
          Queue Export
        </AccessibleButton>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Activity Log ({pagination.totalItems} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No logs found matching your filters
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {logs.map((log) => (
                  <Card key={log.id} className="border border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.performed_by_name || log.performed_by}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs font-medium">
                            {getActionIcon(log.action_type)}
                            <span>{log.action_type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {log.action_description}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t">
                        <span className="text-muted-foreground">IP Address</span>
                        <span className="font-mono">{log.ip_address || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          {log.action_type}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {log.action_description}
                      </TableCell>
                      <TableCell className="text-sm">{log.performed_by_name || log.performed_by}</TableCell>
                      <TableCell className="text-sm font-mono text-xs">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </>
          )}
          {logs.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
              </div>
              <div className="flex items-center gap-2">
                <AccessibleButton
                  variant="outline"
                  size="sm"
                  ariaLabel="Previous audit log page"
                  onClick={() => pagination.goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </AccessibleButton>
                <div className="text-sm">
                  Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                </div>
                <AccessibleButton
                  variant="outline"
                  size="sm"
                  ariaLabel="Next audit log page"
                  onClick={() => pagination.goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </AccessibleButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
