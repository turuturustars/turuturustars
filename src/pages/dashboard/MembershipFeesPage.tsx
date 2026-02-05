import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import MembershipFeeManagement from '@/components/dashboard/MembershipFeeManagement';

const MembershipFeesPage = () => {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-purple-50/40 to-transparent p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Membership Fees</h1>
              <p className="text-sm text-muted-foreground">Track your annual membership fee and renewal status</p>
            </div>
          </div>
          <Badge className="w-fit bg-primary/10 text-primary border-primary/20">
            Annual Renewal
          </Badge>
        </div>
      </div>
      <MembershipFeeManagement />
    </div>
  );
};

export default MembershipFeesPage;
