import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CboMpesaMemberPanel from '@/components/payment/CboMpesaMemberPanel';
import CboTreasurerApprovalPanel from '@/components/payment/CboTreasurerApprovalPanel';

const CboMpesaWorkspace = () => {
  const { hasRole } = useAuth();
  const canApprove = hasRole('chairperson') || hasRole('admin') || hasRole('secretary') || hasRole('patron');

  return (
    <Card>
      <CardHeader>
        <CardTitle>CBO M-Pesa Contributions</CardTitle>
        <CardDescription>
          M-Pesa payment and till receipt workflows with finance approvals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="member" className="space-y-4">
          <TabsList>
            <TabsTrigger value="member">Member Payments</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">Finance Approvals</TabsTrigger>}
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
