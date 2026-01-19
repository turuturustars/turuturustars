import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';

const Help = () => {
  usePageMeta({
    title: 'Help & Support - Turuturu Stars CBO',
    description: 'Get help with your Turuturu Stars account, contributions, welfare, and community features.',
    keywords: ['help', 'support', 'assistance', 'FAQ', 'contact', 'Turuturu Stars'],
    ogImage: 'https://img.icons8.com/nolan/256/help.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/help',
  });

  const supportCategories = [
    {
      icon: HelpCircle,
      title: 'Getting Started',
      description: 'Learn how to set up your account and make your first contribution',
      topics: [
        'Creating your account',
        'Verifying your identity',
        'Setting up M-Pesa payments',
        'Understanding membership levels',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Account & Contributions',
      description: 'Help with managing your account and making contributions',
      topics: [
        'Updating profile information',
        'Changing contribution amount',
        'Payment history and receipts',
        'Account security',
      ],
    },
    {
      icon: HelpCircle,
      title: 'Welfare & Benefits',
      description: 'Information about welfare requests and member benefits',
      topics: [
        'How to request welfare assistance',
        'Understanding benefit eligibility',
        'Tracking welfare requests',
        'Appeal process',
      ],
    },
    {
      icon: Mail,
      title: 'Technical Issues',
      description: 'Troubleshoot problems with the platform',
      topics: [
        'Login issues',
        'Payment failures',
        'Mobile app problems',
        'Browser compatibility',
      ],
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Call us during business hours',
      value: '+254 (Contact number)',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us an email anytime',
      value: 'support@turuturustars.co.ke',
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our team in real-time',
      value: 'Available on dashboard',
    },
  ];

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Help & Support - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How Can We Help?
              </h1>
              <p className="text-lg text-gray-600">
                Find answers to common questions and get support from our team.
              </p>
            </div>
          </div>
        </section>

        {/* Support Categories */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Browse Help Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supportCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="w-6 h-6 text-primary" />
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                      </div>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.topics.map((topic) => (
                          <li key={topic} className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="bg-gray-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Card key={method.title}>
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="w-6 h-6 text-primary" />
                        <CardTitle className="text-lg">{method.title}</CardTitle>
                      </div>
                      <CardDescription>{method.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold text-gray-900">{method.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Tips */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Quick Tips</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 md:p-8">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Keep your login credentials secure and never share them with anyone</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Check your email regularly for important updates and notifications</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Make sure your M-Pesa account has sufficient balance before due dates</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Review your transaction history regularly to ensure accuracy</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Contact support immediately if you experience any issues with payments</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Link */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Need More Help?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Check out our comprehensive FAQ page for answers to commonly asked questions.
            </p>
            <a
              href="/faq"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Go to FAQ
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
