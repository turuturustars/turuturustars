import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Heart, Users, Coins, Shield, TrendingUp } from 'lucide-react';

const Benefits = () => {
  usePageMeta({
    title: 'Member Benefits - Turuturu Stars CBO in Muranga, Kenya | Welfare & Support',
    description: 'Discover exclusive member benefits of joining Turuturu Stars Community Organization. Access welfare support, savings programs, and community privileges in Turuturu, Githima, Kigumo, and Muranga County.',
    keywords: [
      'member benefits',
      'welfare benefits',
      'community welfare Kenya',
      'Turuturu welfare',
      'mutual help benefits',
      'savings programs Kenya',
      'community support Muranga',
      'Turuturu assistance',
      'community benefits',
      'welfare programs Kenya',
      'financial support Kenya',
      'Turuturu support programs',
      'Muranga community benefits',
      'Githima community programs',
      'Kigumo community support',
      'emergency assistance Kenya',
      'savings Kenya'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/gift.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/benefits',
  });

  const benefits = [
    {
      icon: Heart,
      title: 'Welfare Support',
      description: 'Access emergency financial assistance and welfare benefits when needed. Our community stands together during challenging times.',
    },
    {
      icon: Coins,
      title: 'Structured Savings',
      description: 'Participate in organized savings programs and grow your wealth collectively while supporting community development.',
    },
    {
      icon: Users,
      title: 'Community Network',
      description: 'Build meaningful connections with like-minded individuals. Networking opportunities for business and personal growth.',
    },
    {
      icon: Shield,
      title: 'Financial Security',
      description: 'Strengthen your financial resilience through collective planning and transparent financial management systems.',
    },
    {
      icon: TrendingUp,
      title: 'Growth Opportunities',
      description: 'Access training, mentorship, and development programs to enhance your skills and economic opportunities.',
    },
    {
      icon: CheckCircle2,
      title: 'Transparent Operations',
      description: 'Benefit from our clear governance structure with regular audits and member accountability at every level.',
    },
  ];

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Benefits - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Member Benefits
              </h1>
              <p className="text-lg text-gray-600">
                Discover the comprehensive benefits of joining our community-driven organization.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <Card key={benefit.title} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl">{benefit.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{benefit.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Additional Benefits Section */}
        <section className="bg-gray-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Why Choose Turuturu Stars?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Ubuntu Philosophy
                </h3>
                <p className="text-gray-600">
                  Built on African values of Ubuntu - "I am because we are". We believe in collective prosperity and mutual support.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Transparency
                </h3>
                <p className="text-gray-600">
                  Full transparency in all financial and operational matters. Regular reports and accountability to all members.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Member-Driven
                </h3>
                <p className="text-gray-600">
                  Every decision is made by and for the benefit of our members. Your voice matters in our governance.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Professional Management
                </h3>
                <p className="text-gray-600">
                  Led by experienced leaders committed to sustainable growth and community development.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Join?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Become part of our thriving community and start enjoying these benefits today.
            </p>
            <a
              href="/register"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Register Now
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Benefits;
