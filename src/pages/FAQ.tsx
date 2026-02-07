import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ = () => {
  usePageMeta({
    title: 'FAQ - Turuturu Stars CBO',
    description: 'Frequently asked questions about Turuturu Stars Community platform, membership, contributions, and welfare services.',
    keywords: ['FAQ', 'frequently asked questions', 'help', 'support', 'Turuturu Stars'],
    ogImage: 'https://img.icons8.com/nolan/256/faq.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/faq',
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'Membership',
      question: 'How do I become a member of Turuturu Stars?',
      answer:
        'You can register on our website by clicking the Register button and providing your basic information. After verification, you\'ll be able to access all member features.',
    },
    {
      category: 'Membership',
      question: 'What is the membership fee?',
      answer:
        'We offer flexible membership with no fixed fee. You choose your contribution level based on your capacity, typically ranging from KES 500 to KES 5,000 per month.',
    },
    {
      category: 'Membership',
      question: 'Can I cancel my membership anytime?',
      answer:
        'Yes, you can request to cancel your membership anytime. Please contact our support team and we\'ll process your request within 7 days.',
    },
    {
      category: 'Contributions',
      question: 'How do I set up my contribution?',
      answer:
        'Log into your dashboard, go to Contributions, and set up your preferred contribution amount and frequency. Payments are processed securely via Pesapal.',
    },
    {
      category: 'Contributions',
      question: 'Can I change my contribution amount?',
      answer:
        'Yes, you can adjust your contribution amount anytime through your dashboard. Changes will take effect from the next contribution period.',
    },
    {
      category: 'Contributions',
      question: 'What payment methods do you accept?',
      answer:
        'We accept payments via Pesapal. You will choose your preferred method during checkout.',
    },
    {
      category: 'Welfare',
      question: 'How do I request welfare assistance?',
      answer:
        'Go to the Welfare section in your dashboard and click "Request Assistance". Fill out the form with details about your situation and submit. Our welfare committee will review within 7 days.',
    },
    {
      category: 'Welfare',
      question: 'What are the eligibility criteria for welfare?',
      answer:
        'You must be an active member with a good contribution history. The specific eligibility depends on the type of assistance needed. Our committee evaluates each request based on community guidelines.',
    },
    {
      category: 'Welfare',
      question: 'How long does welfare approval take?',
      answer:
        'Our welfare committee reviews requests within 7 days. Once approved, funds are transferred within 24-48 hours to your registered account.',
    },
    {
      category: 'Technical',
      question: 'I forgot my password. How do I reset it?',
      answer:
        'Click on "Forgot Password" on the login page. Enter your email address and we\'ll send you a reset link. Follow the instructions to create a new password.',
    },
    {
      category: 'Technical',
      question: 'Why is my payment failing?',
      answer:
        'Check that your payment method has sufficient balance and try again. If issues persist, contact our support team.',
    },
    {
      category: 'Technical',
      question: 'Is the platform mobile-friendly?',
      answer:
        'Yes! Our platform is fully optimized for mobile devices. You can access all features through our responsive website or download our mobile app.',
    },
    {
      category: 'Account',
      question: 'How do I update my profile information?',
      answer:
        'Log into your dashboard and click on Profile. You can update your personal information, contact details, and bank account information.',
    },
    {
      category: 'Account',
      question: 'How secure is my financial information?',
      answer:
        'We use industry-standard encryption and security measures to protect your data. Your financial information is never shared with third parties without your consent.',
    },
    {
      category: 'Account',
      question: 'How do I check my contribution history?',
      answer:
        'You can view your complete contribution history in the Contributions section of your dashboard. Download statements and receipts anytime.',
    },
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'FAQ - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-gray-600">
                Find quick answers to common questions about Turuturu Stars membership and services.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            {categories.map((category) => (
              <div key={category} className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-primary">{category}</h2>
                <div className="space-y-4">
                  {faqs
                    .filter(faq => faq.category === category)
                    .map((faq, index) => {
                      const globalIndex = faqs.indexOf(faq);
                      return (
                        <Card
                          key={globalIndex}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => toggleExpand(globalIndex)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base md:text-lg">{faq.question}</CardTitle>
                              <div className="text-primary flex-shrink-0">
                                {expandedIndex === globalIndex ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {expandedIndex === globalIndex && (
                            <CardContent>
                              <p className="text-gray-600">{faq.answer}</p>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Still Need Help */}
        <section className="bg-gray-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Don't find your answer? Contact our support team and we'll be happy to help.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="/help"
                className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-hover transition-colors"
              >
                Get Help
              </a>
              <a
                href="/support"
                className="inline-block border border-primary text-primary px-8 py-3 rounded-lg hover:bg-primary/10 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
