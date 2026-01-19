import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const PrivacyPolicy = () => {
  usePageMeta({
    title: 'Privacy Policy - Turuturu Stars CBO',
    description: 'Our privacy policy explains how we collect, use, and protect your personal information.',
    keywords: ['privacy policy', 'data protection', 'privacy', 'GDPR', 'Turuturu Stars'],
    ogImage: 'https://img.icons8.com/nolan/256/lock.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/privacy-policy',
  });

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Privacy Policy - Turuturu Stars' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main" className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction & Commitment to Privacy</h2>
              <p>
                Turuturu Stars Alumni Association ("we", "us", "our", or "Association") is committed to protecting your privacy and ensuring you have a positive experience on our website and platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website (turuturustars.co.ke) and our member management platform.
              </p>
              <p className="mt-4 italic">
                As a values-driven alumni association guided by the principles of <strong>"Service to mankind is service to God,"</strong> we treat your personal data with the utmost respect and care.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <p>We collect information you voluntarily provide and information automatically collected when you use our platform:</p>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">A. Information You Provide:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Registration:</strong> Full name, email address, phone number, school year, address</li>
                <li><strong>Membership Application:</strong> Personal details, educational background, professional information</li>
                <li><strong>Payment Information:</strong> Contribution amounts, payment method, transaction history (processed securely)</li>
                <li><strong>Profile Information:</strong> Bio, professional title, organization, social media links</li>
                <li><strong>Communication:</strong> Messages, announcements, meeting notes, feedback you provide</li>
                <li><strong>Identification Documents:</strong> ID number (for verification purposes only)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">B. Automatically Collected Information:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent, access times</li>
                <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers</li>
                <li><strong>Cookies & Tracking:</strong> Session cookies for security and functionality</li>
                <li><strong>Log Files:</strong> Server logs containing access and activity information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p>We use collected information for the following purposes:</p>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">Membership & Account Management:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process membership applications and verify eligibility</li>
                <li>Maintain member directory and contact information</li>
                <li>Track membership status and fees</li>
                <li>Send meeting invitations and updates</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">Financial Management:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process membership fees and contributions</li>
                <li>Maintain financial records and receipts</li>
                <li>Generate financial reports for leadership</li>
                <li>Communicate about contribution deadlines</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">Communication & Engagement:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send announcements, newsletters, and event invitations</li>
                <li>Facilitate member-to-member communication</li>
                <li>Share scholarship and welfare opportunities</li>
                <li>Provide customer support and respond to inquiries</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">Platform Improvement:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analyze usage patterns to improve services</li>
                <li>Troubleshoot technical issues</li>
                <li>Prevent fraud and unauthorized access</li>
                <li>Enhance user experience and website functionality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Confidentiality of Member Information</h2>
              <p className="font-semibold">
                In accordance with Article 3.6 of our Constitution, Association confidential information is strictly protected.
              </p>
              <p className="mt-3">
                <strong>Your Information Is Confidential:</strong> Member data is not shared with non-members without explicit consent. This includes names, contact information, contribution records, and any personal details shared with the Association.
              </p>
              <p className="mt-3">
                <strong>Internal Sharing:</strong> Information is shared only with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Management Committee (for leadership and governance)</li>
                <li>Treasurer and Finance Team (for financial management only)</li>
                <li>Secretary (for administrative purposes)</li>
                <li>Other authorized personnel as needed for their roles</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-3">Security Measures Include:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Secure login credentials and password protection</li>
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Restricted access to member information</li>
                <li>Regular security updates and backups</li>
                <li>Secure banking for financial transactions</li>
              </ul>
              <p className="mt-4 italic text-sm text-gray-600">
                Note: No method of transmission over the internet is 100% secure. While we use reasonable security measures, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Your Rights & Data Access</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request and view personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Object:</strong> Object to specific uses of your information</li>
                <li><strong>Restrict Processing:</strong> Request limitation of how we use your data</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, contact us at support@turuturustars.co.ke with your request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
              <p>
                We retain personal information for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-3">Retention Periods:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Active Members:</strong> Data retained during membership and for 3 years after termination</li>
                <li><strong>Financial Records:</strong> Retained for 7 years for audit and compliance</li>
                <li><strong>Meeting Minutes & Decisions:</strong> Retained permanently as organizational records</li>
                <li><strong>User Logs:</strong> Retained for 12 months for security and support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Cookies & Tracking Technologies</h2>
              <p>
                Our website uses cookies to enhance your experience, remember preferences, and understand how you use our platform.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-3">Types of Cookies:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for platform security and functionality</li>
                <li><strong>Preference Cookies:</strong> Remember your language and display preferences</li>
                <li><strong>Analytics Cookies:</strong> Help us understand usage patterns</li>
              </ul>
              <p className="mt-4">
                You can manage cookie preferences through your browser settings. Disabling cookies may limit some platform features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Membership Termination & Data</h2>
              <p>
                When your membership terminates (voluntary or involuntary), your data is handled as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Active account access is removed</li>
                <li>Contact information is retained for future communications (alumni newsletters)</li>
                <li>Financial records are retained for accounting purposes</li>
                <li>You may request complete data deletion (subject to legal requirements)</li>
                <li>Association interactions and meeting records are retained as historical records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Third-Party Links & Services</h2>
              <p>
                Our website may contain links to external sites (social media, payment processors, etc.). We are not responsible for the privacy practices of these third parties. Please review their privacy policies independently.
              </p>
              <p className="mt-4">
                <strong>Third-Party Services:</strong> We may use services like payment processors, email providers, and analytics platforms. These providers are contractually bound to use your information only for agreed purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Breach Notification</h2>
              <p>
                In the unlikely event of a data breach that compromises your personal information, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Notify affected members within 30 days</li>
                <li>Describe the nature of the breach</li>
                <li>Recommend steps you can take to protect yourself</li>
                <li>Provide contact information for questions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Children's Privacy</h2>
              <p>
                Our platform is not intended for individuals under 18 years old. We do not knowingly collect information from children. If we become aware of such collection, we will delete this information immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. International Data Transfers</h2>
              <p>
                Your information may be transferred to, stored in, and processed in countries other than your country of residence. By using our platform, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Policy Updates</h2>
              <p>
                We may update this Privacy Policy periodically to reflect organizational changes, technology developments, or legal requirements. We will notify you of material changes by posting the updated policy and updating the "Last Updated" date.
              </p>
              <p className="mt-4">
                <strong>Continued use of our platform following changes constitutes your acceptance of the updated Privacy Policy.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">15. Contact Us & Complaints</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p><strong className="text-lg">For Privacy Concerns or Inquiries:</strong></p>
                <p className="mt-3"><strong>Turuturu Stars Alumni Association</strong></p>
                <p><strong>Email:</strong> support@turuturustars.co.ke</p>
                <p><strong>Phone:</strong> +254 700 000 000</p>
                <p><strong>Address:</strong> Turuturu Primary School, P.O. Box 65, Sabasaba, Kigumo 10208, Muranga County, Kenya</p>
                <p className="mt-4 text-sm text-gray-600">
                  If you have privacy concerns or complaints, please contact us first. We will investigate and respond within 30 days.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">16. Data Protection Officer</h2>
              <p>
                For data protection inquiries, please contact our Data Protection Officer at support@turuturustars.co.ke with "Data Protection Officer" in the subject line.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">17. Last Updated</h2>
              <p>
                <strong>This Privacy Policy was last updated on January 19, 2026</strong> and is based on the Turuturu Stars Alumni Association Constitution and our commitment to member privacy protection.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
