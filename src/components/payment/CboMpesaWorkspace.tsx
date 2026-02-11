import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CboMpesaMemberPanel from '@/components/payment/CboMpesaMemberPanel';
import CboTreasurerApprovalPanel from '@/components/payment/CboTreasurerApprovalPanel';

const CboMpesaWorkspace = () => {
  const { hasRole } = useAuth();
  const canApprove = hasRole('treasurer') || hasRole('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>CBO M-Pesa Contributions</CardTitle>
        <CardDescription>
          STK push and till receipt workflows with callback verification and treasurer approvals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="member" className="space-y-4">
          <TabsList>
            <TabsTrigger value="member">Member Payments</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">Treasurer Approvals</TabsTrigger>}
          </TabsList>

          <TabsContent value="member">
            <CboMpesaMemberPanel />
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals">
              <CboTreasurerApprovalPanel />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CboMpesaWorkspace;
