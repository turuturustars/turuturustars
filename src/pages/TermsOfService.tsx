import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const TermsOfService = () => {
  usePageMeta({
    title: 'Terms of Service - Turuturu Stars CBO',
    description: 'Read our terms of service and conditions for using Turuturu Stars Community platform.',
    keywords: ['terms of service', 'terms and conditions', 'user agreement', 'Turuturu Stars'],
    ogImage: 'https://img.icons8.com/nolan/256/policy.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/terms-of-service',
  });

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Terms of Service - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main" className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last Updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using this website and the Turuturu Stars Community Based Organization platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) from the Turuturu Stars website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose or for any public display (commercial or non-commercial)</li>
                <li>Attempting to decompile or reverse engineer any software contained on the website</li>
                <li>Removing any copyright or other proprietary notations from the materials</li>
                <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Disclaimer</h2>
              <p>
                The materials on the Turuturu Stars website are provided on an 'as is' basis. Turuturu Stars makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Limitations</h2>
              <p>
                In no event shall Turuturu Stars or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Turuturu Stars website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Accuracy of Materials</h2>
              <p>
                The materials appearing on the Turuturu Stars website could include technical, typographical, or photographic errors. Turuturu Stars does not warrant that any of the materials on the website are accurate, complete, or current. Turuturu Stars may make changes to the materials contained on the website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Links</h2>
              <p>
                Turuturu Stars has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Turuturu Stars of the site. Use of any such linked website is at the user's own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Modifications</h2>
              <p>
                Turuturu Stars may revise these terms of service for the website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of the Republic of Kenya, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Member Responsibilities</h2>
              <p>As a member of Turuturu Stars, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and truthful information during registration</li>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Use the platform in compliance with all applicable laws and regulations</li>
                <li>Not engage in any fraudulent or unlawful activity</li>
                <li>Respect the rights and privacy of other members</li>
                <li>Comply with the organization's policies and procedures</li>
                <li>Make contributions as agreed upon during membership</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Contribution and Payments</h2>
              <p>
                Members acknowledge that contributions are made voluntarily to support the organization's mission. By making a contribution, you authorize us to process the payment through the agreed-upon method. You are responsible for ensuring sufficient funds are available for payment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
              <p>
                Turuturu Stars reserves the right to terminate membership or access to the platform at any time, with or without cause, and with or without notice. In the event of termination, your right to use the service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Limitation of Liability</h2>
              <p>
                In no event shall Turuturu Stars be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of revenue or profits, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p><strong>Turuturu Stars CBO</strong></p>
                <p>Email: support@turuturustars.co.ke</p>
                <p>Phone: +254 (Contact number)</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
