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
            <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold mb-4">Preamble</h2>
              <p className="italic">
                We, the alumni of Turuturu Primary School, have resolved to form <strong>Turuturu Stars Alumni Association</strong> with the driving philosophy: <em>"Service to mankind is service to God."</em> We recognize our responsibility before Almighty God and the community. By coming together, we secure our posterity and blessings of modesty and prosperity.
              </p>
              <p className="mt-4 italic">
                This association remains neutral politically and does not discriminate on the basis of gender, creed, political persuasion, or ideology. We uphold the principles of reason, courtesy, peace, justice, liberty, equality, truth, and comradeship.
              </p>
              <p className="mt-4 text-center italic font-semibold text-lg">
                "I AM BECAUSE WE ARE" - Spirit of Ubuntu
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms and Membership</h2>
              <p>
                By accessing and using the Turuturu Stars Alumni Association platform, you accept and agree to be bound by these terms of service and our Constitution. By applying for membership, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Observe and abide by the rules and regulations of the Association</li>
                <li>Attend Association meetings and further the interests of the Association</li>
                <li>Promote unity and friendship among members</li>
                <li>Actively participate in the activities of the Association</li>
                <li>Accept and perform assignments with diligence</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Membership Eligibility and Requirements</h2>
              <div className="bg-amber-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-3">Who Can Join:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Alumni of Turuturu Primary School</li>
                  <li>Persons invited by existing members</li>
                  <li>Anyone interested in supporting the Association's mission</li>
                </ul>
              </div>
              <h3 className="font-semibold mb-3">Membership Fees:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Registration Fee:</strong> KSh 200 (Non-refundable, paid once)</li>
                <li><strong>Biannual Subscription:</strong> KSh 1,000 (Due every 6 months)</li>
                <li><strong>Special Contributions:</strong> As may be required to meet organizational needs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Membership Code of Conduct</h2>
              <p className="font-semibold mb-3">As a member, you commit to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Honesty and integrity in all dealings with the Association</li>
                <li>Respecting confidentiality of Association matters and decisions</li>
                <li>Maintaining order and decorum at all meetings</li>
                <li>Accepting duties assigned without sabotage or obstruction</li>
                <li>Not disclosing Association confidential information to non-members</li>
                <li>Treating all members with respect regardless of gender, creed, or political views</li>
                <li>Attending Association meetings (three consecutive absences may result in suspension)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Disciplinary Offenses and Consequences</h2>
              <h3 className="font-semibold mb-3">The following actions may result in suspension or expulsion:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dishonesty:</strong> False claims or misrepresentation. Any funds obtained through false pretense must be repaid.</li>
                <li><strong>Disorderly Conduct:</strong> Misbehavior, ignoring leadership orders, or abusing the Association</li>
                <li><strong>Sabotage:</strong> Deliberately hindering Association affairs or undermining decisions</li>
                <li><strong>Breach of Confidentiality:</strong> Sharing confidential information with non-members</li>
                <li><strong>Persistent Misconduct:</strong> Violation of meeting procedures or repeated infractions</li>
              </ul>
              <p className="mt-4 italic text-sm text-gray-600">
                Disciplinary decisions are made by the Management Committee and must be approved by the Association membership.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Membership Termination</h2>
              <p>Membership automatically terminates under the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Death of member</li>
                <li>Written resignation (requires 3-month quit notice)</li>
                <li>Conduct detrimental or prejudicial to the Association's interests</li>
                <li>Expulsion by the Association for disciplinary reasons</li>
                <li>Failure to pay subscription fees for one consecutive year</li>
              </ul>
              <p className="mt-4 font-semibold">Important:</p>
              <p>
                Termination of membership does not relieve you of existing personal membership liabilities. No refunds are issued upon withdrawal, expulsion, or termination, as this is a non-profit organization.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Reinstatement of Membership</h2>
              <p>
                Former members may apply for reinstatement after meeting all requirements stipulated by the Association's Management Committee. Applications are subject to approval by the Association membership.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Financial Contributions and Payments</h2>
              <p>
                All funds are maintained in a dedicated bank account in the Association's name. Withdrawals require authorization from at least two-thirds of the Management Committee members. Financial statements are reviewed annually and presented to members at the Annual General Meeting (AGM).
              </p>
              <p className="mt-4">
                You authorize the Association to process payments through agreed-upon methods and acknowledge that you are responsible for ensuring sufficient funds are available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Meeting Requirements and Participation</h2>
              <h3 className="font-semibold mb-3">Regular Meetings:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>General meetings are held in April, August, and December</li>
                <li>Management Committee meets at least twice per year</li>
                <li>Annual General Meeting (AGM) held in December</li>
                <li>Special meetings may be called as needed</li>
              </ul>
              <h3 className="font-semibold mt-4 mb-3">Meeting Quorum:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>General Meetings:</strong> One-third of registered members</li>
                <li><strong>Management Committee:</strong> Simple majority of elected members</li>
                <li><strong>AGM/Special Meetings:</strong> One-third of registered members</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Voting Rights and Resolution Procedures</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Resolutions are decided by simple majority voting (show of hands or as directed by Chairman)</li>
                <li>In case of equal votes, the Chairman casts the deciding vote</li>
                <li>Members address the Association only through the Chairman, one at a time</li>
                <li>Chairman may limit speakers per motion and suspend disruptive members</li>
                <li>All meetings are officially closed by the Chairman</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Elections and Leadership</h2>
              <h3 className="font-semibold mb-3">Election Process:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>First elections held at the first AGM</li>
                <li>Subsequent elections held at subsequent AGMs</li>
                <li>Officers elected by simple majority of members present</li>
                <li>Elected officials serve for three years, maximum two consecutive terms</li>
              </ul>
              <h3 className="font-semibold mt-4 mb-3">Leadership Structure:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chairman</li>
                <li>Vice Chairman</li>
                <li>Secretary</li>
                <li>Vice Secretary</li>
                <li>Treasurer</li>
                <li>Organizing Secretary/Discipline Master</li>
                <li>Committee Members</li>
                <li>Patron (appointed by consensus)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Constitutional Amendments</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Amendments proposed by members are compiled and circulated by the Secretary at least one month before a meeting</li>
                <li>Amendments become effective upon ratification by 50% + 1 of members present in a meeting with at least one-third of all registered members</li>
                <li>No legislation may be passed that contradicts the spirit and letter of this Constitution</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Dissolution</h2>
              <p>
                The Association may be dissolved by resolution passed by 3/4 majority of registered members present at a general meeting called expressly for this purpose. Upon dissolution:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All properties and funds are distributed evenly among members at that time</li>
                <li>All liabilities are settled first</li>
                <li>Prior permission from the Registrar of Societies is required</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Website and Platform Use</h2>
              <p>
                Permission is granted to access the Turuturu Stars platform for personal, non-commercial use only. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify, copy, or distribute platform materials without permission</li>
                <li>Use materials for commercial purposes</li>
                <li>Attempt to decompile or reverse engineer software</li>
                <li>Remove copyright or proprietary notations</li>
                <li>Mirror or transfer content to other servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Limitation of Liability</h2>
              <p>
                The Turuturu Stars platform and materials are provided on an "as is" basis. We do not warrant accuracy, completeness, or fitness for a particular purpose. In no event shall Turuturu Stars be liable for indirect, incidental, special, consequential, or punitive damages, or loss of revenue or profits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">15. Governing Law and Jurisdiction</h2>
              <p>
                These terms of service are governed by and construed in accordance with the laws of the Republic of Kenya. You irrevocably submit to the exclusive jurisdiction of the courts in Kenya.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">16. Contact Information</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p><strong className="text-lg">Turuturu Stars Alumni Association</strong></p>
                <p className="mt-2"><strong>Registered Office:</strong> Turuturu Primary School, P.O. Box 65, Sabasaba, Kigumo 10208, Muranga County, Kenya</p>
                <p className="mt-2"><strong>Email:</strong> support@turuturustars.co.ke</p>
                <p><strong>Phone:</strong> +254 700 000 000</p>
                <p className="mt-4 text-sm text-gray-600">For questions or concerns about these Terms of Service, please contact us through the details above.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">17. Last Updated</h2>
              <p>These Terms of Service were last updated on January 19, 2026, and are based on the Turuturu Stars Alumni Association Constitution. Regular updates may occur to reflect organizational changes or legal requirements.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
