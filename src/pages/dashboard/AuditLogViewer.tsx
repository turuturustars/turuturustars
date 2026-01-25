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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Search,
  Download,
  Filter,
  Loader2,
  Eye,
  AlertCircle,
  Shield,
  Activity,
} from 'lucide-react';
import { exportAsCSV } from '@/lib/exportUtils';

interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  performed_by: string;
  user_email?: string;
  created_at: string;
  metadata?: any;
  ip_address?: string;
  status: 'success' | 'failed';
}

const AuditLogViewer = () => {
  const { roles } = useAuth();
  const { toast } = useToast();
  const { status: statusMessage, showSuccess } = useStatus();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  const userRoles = roles.map((r) => r.role);
  const isAdmin = userRoles.includes('admin');

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionTypeFilter, statusFilter]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (data) {
        setLogs(data as AuditLog[]);

        // Extract unique action types
        const types = [...new Set((data as AuditLog[]).map((log) => log.action_type))];
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
          log.action_type.toLowerCase().includes(term)
      );
    }

    // Action type filter
    if (actionTypeFilter !== 'all') {
      results = results.filter((log) => log.action_type === actionTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      results = results.filter((log) => log.status === statusFilter);
    }

    setFilteredLogs(results);
  };

  const exportLogs = () => {
    const exportData = filteredLogs.map((log) => ({
      Date: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Action Type': log.action_type,
      'Description': log.action_description,
      'Performed By': log.performed_by,
      'Status': log.status,
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      success: 'active',
      failed: 'missed'
    };
    return <StatusBadge status={statusMap[status] || status} />;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">
              Only administrators can view audit logs
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
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          View all system activities and user actions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium">Successful Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {logs.filter((l) => l.status === 'success').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {logs.length > 0
                ? Math.round(
                    (logs.filter((l) => l.status === 'success').length / logs.length) * 100
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {logs.filter((l) => l.status === 'failed').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {logs.length > 0
                ? Math.round(
                    (logs.filter((l) => l.status === 'failed').length / logs.length) * 100
                  )
                : 0}
              %
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="text-sm">{log.performed_by}</TableCell>
                      <TableCell className="text-sm font-mono text-xs">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
