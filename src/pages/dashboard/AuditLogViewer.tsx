import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { exportAsCSV } from '@/lib/exportUtils';

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
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

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

  useEffect(() => {
    if (canViewOperations) {
      fetchAuditLogs();
    } else {
      setIsLoading(false);
    }
  }, [canViewOperations]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionTypeFilter]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

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

        // Extract unique action types
        const types = [...new Set(mappedLogs.map((log) => log.action_type))];
        setActionTypes(types);
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
  };

  const filterLogs = () => {
    let results = logs;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (log) =>
          log.action_description.toLowerCase().includes(term) ||
          log.performed_by.toLowerCase().includes(term) ||
          log.action_type.toLowerCase().includes(term) ||
          log.performed_by_name?.toLowerCase().includes(term)
      );
    }

    // Action type filter
    if (actionTypeFilter !== 'all') {
      results = results.filter((log) => log.action_type === actionTypeFilter);
    }

    setFilteredLogs(results);
  };

  const exportLogs = () => {
    const exportData = filteredLogs.map((log) => ({
      Date: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Action Type': log.action_type,
      'Description': log.action_description,
      'Performed By': log.performed_by_name || log.performed_by,
      'IP Address': log.ip_address || 'N/A',
    }));

    exportAsCSV(exportData, {
      filename: 'audit_logs',
      includeTimestamp: true,
    });

    toast({
      title: 'Success',
      description: 'Audit logs exported successfully',
    });
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
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredLogs.length === logs.length ? 'Showing all' : 'Matching filters'}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
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
        <AccessibleButton onClick={exportLogs} className="gap-2" ariaLabel="Export audit logs as CSV file">
          <Download className="w-4 h-4" />
          Export Logs
        </AccessibleButton>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Activity Log ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No logs found matching your filters
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {filteredLogs.map((log) => (
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
                  {filteredLogs.map((log) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
