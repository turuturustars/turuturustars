import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, DollarSign, Users, Target, TrendingUp, CheckCircle2 } from 'lucide-react';

const HowItWorks = () => {
  usePageMeta({
    title: 'How It Works - Turuturu Stars CBO | Contribution & Membership System',
    description: 'Learn how Turuturu Stars operates. Understand our contribution system, welfare mechanism, and community engagement process in Muranga, Kenya.',
    keywords: [
      'how it works',
      'contribution system',
      'membership process',
      'welfare process Kenya',
      'community contributions',
      'Turuturu process',
      'how to join Turuturu',
      'membership requirements',
      'contribution levels',
      'payment system Kenya',
      'welfare request process',
      'M-Pesa contributions',
      'community engagement',
      'Muranga community process',
      'Turuturu membership',
      'community system Kenya',
      'step by step guide'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/process.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/how-it-works',
  });

  const steps = [
    {
      number: 1,
      title: 'Registration',
      description: 'Sign up as a member by providing your basic information. Go through our verification process to ensure community safety.',
      icon: Users,
    },
    {
      number: 2,
      title: 'Contribution Setup',
      description: 'Choose your contribution level and frequency. Set up automated payments through M-Pesa or other available methods.',
      icon: DollarSign,
    },
    {
      number: 3,
      title: 'Community Engagement',
      description: 'Participate in community activities, announcements, and member benefits. Engage with other members and leadership.',
      icon: Users,
    },
    {
      number: 4,
      title: 'Welfare Access',
      description: 'When you need financial support, submit a welfare request. Our committee reviews and processes requests transparently.',
      icon: Target,
    },
    {
      number: 5,
      title: 'Growth & Development',
      description: 'Access training programs and mentorship. Build your network and grow both personally and professionally.',
      icon: TrendingUp,
    },
    {
      number: 6,
      title: 'Governance',
      description: 'Participate in decision-making. Attend meetings, vote on important matters, and help shape our community.',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'How It Works - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h1>
              <p className="text-lg text-gray-600">
                Understand our simple and transparent process for joining and participating in Turuturu Stars community.
              </p>
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="relative">
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold">
                            {step.number}
                          </div>
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">{step.description}</p>
                      </CardContent>
                    </Card>
                    {step.number < steps.length && (
                      <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                        <ArrowRight className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contribution System */}
        <section className="bg-gray-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Contribution System</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Regular Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Monthly contributions to build the community fund. Amounts are flexible based on your capacity.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Automated payments via M-Pesa</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Full transparency on usage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Tax-deductible contributions</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Special Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Optional contributions for specific community projects and initiatives.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Member-voted projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Clear timelines & budgets</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Community impact tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Welfare Fund</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Dedicated support for members during emergencies and difficult times.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Emergency assistance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Transparent approval process</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Fair and equitable distribution</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Welfare Process */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Welfare Request Process</h2>
            <div className="bg-white rounded-lg border p-6 md:p-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Submit Request</h3>
                    <p className="text-gray-600">
                      Fill out a welfare request form through your dashboard with details of your situation.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Committee Review</h3>
                    <p className="text-gray-600">
                      Our welfare committee reviews your request within 7 days and verifies the need.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Approval & Distribution</h3>
                    <p className="text-gray-600">
                      Once approved, funds are transferred to your account within 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/10 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Join Turuturu Stars today and become part of our growing community of support and mutual prosperity.
            </p>
            <a
              href="/register"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Join Now
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
