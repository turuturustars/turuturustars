import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Sparkles, HeartPulse, Briefcase, GraduationCap } from 'lucide-react';

const features = [
  { icon: HeartPulse, title: 'Medical Cover', desc: 'Group health & in-patient cover for members and dependents.' },
  { icon: Briefcase, title: 'Last Expense', desc: 'Quick payout to ease bereavement burden for families.' },
  { icon: GraduationCap, title: 'Education Cover', desc: 'School fees protection in case of loss of guardian.' },
];

const InsuranceBenefitsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Insurance Benefits
          </h1>
          <p className="text-muted-foreground">Group insurance benefits curated for Turuturu Stars members.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5 text-sm py-1 px-3">
          <Sparkles className="w-3.5 h-3.5" /> Coming Soon
        </Badge>
      </div>

      <Card className="border-dashed bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">We're putting it together</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Our team is partnering with trusted underwriters to bring affordable insurance benefits to every member. Stay tuned!
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-5 space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
              <Badge variant="outline" className="text-xs">Coming soon</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InsuranceBenefitsPage;
