import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Logger, AppErrorHandler } from '@/utils/errorHandler';
import { Search, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { exportToCSV, exportToJSON } from '@/utils/export';

interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  performed_by: string | null;
  created_at: string;
  metadata: any;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredLogs(
        logs.filter(
          (log) =>
            log.action_type.toLowerCase().includes(term) ||
            log.action_description.toLowerCase().includes(term) ||
            log.performed_by?.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, searchTerm]);

  const fetchAuditLogs = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err) {
      Logger.error('Failed to fetch audit logs', err);
      setError(AppErrorHandler.getErrorMessage(err));
      toast({
        title: 'Error',
        description: AppErrorHandler.getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (exportFormat: 'csv' | 'json') => {
    const dataToExport = filteredLogs.map((log) => ({
      'Action Type': log.action_type,
      Description: log.action_description,
      'Performed By': log.performed_by || 'System',
      'Date': format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      Details: JSON.stringify(log.metadata || {}),
    }));

    if (exportFormat === 'csv') {
      exportToCSV(dataToExport, ['Action Type', 'Description', 'Performed By', 'Date', 'Details']);
    } else {
      exportToJSON(dataToExport, `audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    }

    toast({
      title: 'Success',
      description: `Audit logs exported as ${exportFormat.toUpperCase()}`,
    });
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      APPROVE: 'bg-green-100 text-green-800',
      REJECT: 'bg-red-100 text-red-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge className={getActionColor(log.action_type)}>
                      {log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.action_description}</TableCell>
                  <TableCell>{log.performed_by || 'System'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata).substring(0, 50) + '...' : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
