import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Constitution = () => {
  usePageMeta({
    title: 'Constitution - Turuturu Stars Alumni Association',
    description: 'The official constitution and governing principles of Turuturu Stars Alumni Association, guiding our mission, objectives, and member conduct.',
    keywords: ['constitution', 'alumni association', 'governing principles', 'Turuturu Stars', 'rules and regulations'],
    ogImage: 'https://img.icons8.com/nolan/256/document.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/constitution',
  });

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Constitution - Turuturu Stars Alumni Association' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main" className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Constitution</h1>
          <p className="text-gray-600 mb-8">Turuturu Stars Alumni Association | Last Updated: January 19, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold mb-6">PREAMBLE</h2>
              <p className="italic text-lg leading-relaxed mb-4">
                We, the alumni of <strong>Turuturu Primary School</strong>, do hereby solemnly adopt, ordain, and give ourselves to this constitution. We are guided by the principle:
              </p>
              <p className="text-center text-xl font-bold text-blue-700 my-6">
                "Service to mankind is service to God"
              </p>
              <p className="italic leading-relaxed mb-4">
                We recognize our humble submission to Almighty God and our responsibility before Him and the community. By coming together as the <strong>Turuturu Stars Alumni Association</strong>, we secure our posterity and blessings of modesty and prosperity. The association is united by common purpose, interest, and aspirations.
              </p>
              <p className="italic leading-relaxed mb-4">
                This association shall remain neutral politically and shall not discriminate against its members on the basis of gender, creed, political persuasion, or ideology. We uphold the principles of:
              </p>
              <div className="text-center font-semibold space-y-1 my-4">
                <p>✦ Reason & Courtesy</p>
                <p>✦ Peace & Justice</p>
                <p>✦ Liberty & Equality</p>
                <p>✦ Truth & Comradeship</p>
              </div>
              <p className="text-center italic text-xl font-bold text-blue-700 mt-6">
                I AM BECAUSE WE ARE - Spirit of Ubuntu
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 1: Organization Identity</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <h3 className="font-semibold">1.1 Name & Alma Mater</h3>
                  <p>The name of this association is <strong>TURUTURU STARS ALUMNI ASSOCIATION</strong> (referred to as "the Association"). Our Alma Mater is <strong>Turuturu Primary School</strong>.</p>
                </div>
                <div>
                  <h3 className="font-semibold">1.2 Registered Office</h3>
                  <p>Turuturu Primary School, P.O. Box 65, Sabasaba, Kigumo 10208, Muranga County, Kenya</p>
                </div>
                <div>
                  <h3 className="font-semibold">1.3 Faith Foundation</h3>
                  <p>The Association is guided by Christian faith and principles.</p>
                </div>
                <div>
                  <h3 className="font-semibold">1.4 Slogan</h3>
                  <p className="text-lg font-bold">"Together We Stand"</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 2: Mission & Vision</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3 text-blue-700">Mission</h3>
                  <p className="italic">
                    To promote the welfare and prosperity of our members through meaningful interaction, support, and community engagement.
                  </p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3 text-indigo-700">Vision</h3>
                  <p className="italic">
                    Turuturu Stars serves as a platform for alumni interaction driven by ideals and values that uplift present and future members, building social, knowledgeable, and motivational capital.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 3: Specific Objectives</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li>Encourage, foster, and promote close relations among alumni</li>
                <li>Promote lifelong relations and act as a forum for information exchange</li>
                <li>Mobilize and generate resources through subscriptions and membership fees</li>
                <li>Establish scholarship funds for needy and deserving students</li>
                <li>Provide career development and guidance for current students</li>
                <li>Motivate alumni to contribute to their Alma Mater's progress</li>
                <li>Develop programs and projects benefiting the community and underprivileged</li>
                <li>Assist members in times of need, particularly the bereaved</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 4: Membership</h2>
              <div className="bg-amber-50 p-4 rounded-lg space-y-3">
                <div>
                  <h3 className="font-semibold">4.1 Eligibility</h3>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Alumni of Turuturu Primary School</li>
                    <li>Persons invited by existing members</li>
                    <li>Anyone interested in supporting our mission</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">4.2 Membership Fees</h3>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>Registration Fee:</strong> KSh 200 (Non-refundable, one-time)</li>
                    <li><strong>Biannual Subscription:</strong> KSh 1,000 (Every 6 months)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">4.3 Admission</h3>
                  <p className="mt-2">Via written application or invitation, with fee payment upon approval.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 5: Code of Conduct & Discipline</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-red-500 bg-red-50 p-4">
                  <h3 className="font-bold text-red-700">5.1 Dishonesty</h3>
                  <p>Members proved dishonest face suspension and dismissal. Funds obtained through false pretense must be repaid.</p>
                </div>
                <div className="border-l-4 border-orange-500 bg-orange-50 p-4">
                  <h3 className="font-bold text-orange-700">5.2 Disorderly Conduct</h3>
                  <p>Members misbehaving or ignoring leadership orders are expelled from meetings, with further disciplinary action as determined by members.</p>
                </div>
                <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  <h3 className="font-bold text-yellow-700">5.3 Sabotage</h3>
                  <p>Members sabotaging Association affairs must appear before the Management Committee for explanation and appropriate disciplinary action.</p>
                </div>
                <div className="border-l-4 border-purple-500 bg-purple-50 p-4">
                  <h3 className="font-bold text-purple-700">5.4 Confidentiality Breach</h3>
                  <p>Disclosing confidential Association information to non-members results in Management Committee review and appropriate disciplinary action.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 6: Termination & Reinstatement</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <h3 className="font-semibold">6.1 Membership Termination</h3>
                  <p className="mt-2">Members cease membership through: death, voluntary resignation, conduct prejudicial to the Association, expulsion, or one-year subscription lapse.</p>
                </div>
                <div>
                  <h3 className="font-semibold">6.2 Quit Notice</h3>
                  <p className="mt-2">Resignations require 3-month advance notice to the Management Committee.</p>
                </div>
                <div>
                  <h3 className="font-semibold">6.3 No Refunds</h3>
                  <p className="mt-2">This non-profit organization issues no refunds upon withdrawal, expulsion, or termination.</p>
                </div>
                <div>
                  <h3 className="font-semibold">6.4 Reinstatement</h3>
                  <p className="mt-2">Former members may reapply after meeting all Association requirements, subject to approval.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 7: Financial Management</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>The Association maintains a dedicated bank account in its name</li>
                <li>All contributions are properly recorded in books of account</li>
                <li>Withdrawals require authorization from at least 2/3 of Management Committee members</li>
                <li>Four signatories: Chairman, Treasurer, Secretary, and one member (any three endorse withdrawals)</li>
                <li>Annual audited accounts are presented at the AGM</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 8: Leadership Structure</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-3">Executive Committee</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Chairman</li>
                    <li>✓ Vice Chairman</li>
                    <li>✓ Secretary</li>
                    <li>✓ Vice Secretary</li>
                    <li>✓ Treasurer</li>
                    <li>✓ Organizing Secretary</li>
                    <li>✓ Committee Members</li>
                    <li>✓ Patron</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-3">Leadership Term</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Elected for 3-year terms</li>
                    <li>✓ Maximum 2 consecutive terms</li>
                    <li>✓ Elections held at Annual General Meetings</li>
                    <li>✓ Simple majority voting</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 9: Meetings & Procedures</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">9.1 Regular Meetings</h3>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>General meetings: April, August, December</li>
                    <li>Management Committee: At least twice yearly</li>
                    <li>Annual General Meeting (AGM): December</li>
                    <li>Special meetings: As needed</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">9.2 Quorum Requirements</h3>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>General meetings: One-third of registered members</li>
                    <li>Management Committee: Simple majority</li>
                    <li>AGM: One-third of registered members</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">9.3 Voting & Decisions</h3>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Resolutions decided by simple majority (show of hands)</li>
                    <li>Chairman breaks ties with casting vote</li>
                    <li>Members address through Chairman, one at a time</li>
                    <li>Missing 3 consecutive meetings without permission leads to suspension</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Article 10: Amendments & Dissolution</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold">10.1 Constitutional Amendments</h3>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Proposed amendments circulated one month before meetings</li>
                    <li>Effective upon 50%+1 approval with 1/3 member participation</li>
                    <li>Cannot contradict the Constitution's spirit and letter</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-bold">10.2 Dissolution</h3>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Requires 3/4 majority of members present</li>
                    <li>Requires Registrar of Societies permission</li>
                    <li>Assets distributed evenly after liabilities settled</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-6 text-center">Member Commitment</h2>
              <p className="italic text-center mb-4">
                As a member of Turuturu Stars Alumni Association, I commit to:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-center">
                <div className="bg-white p-4 rounded border-l-4 border-green-500">
                  <p className="font-semibold">Observe Constitution</p>
                </div>
                <div className="bg-white p-4 rounded border-l-4 border-green-500">
                  <p className="font-semibold">Attend Meetings</p>
                </div>
                <div className="bg-white p-4 rounded border-l-4 border-green-500">
                  <p className="font-semibold">Promote Unity</p>
                </div>
                <div className="bg-white p-4 rounded border-l-4 border-green-500">
                  <p className="font-semibold">Active Participation</p>
                </div>
                <div className="bg-white p-4 rounded border-l-4 border-green-500 md:col-span-2">
                  <p className="font-semibold">Perform Duties with Diligence</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Historical Context</h2>
              <div className="bg-amber-50 p-6 rounded-lg">
                <p className="font-semibold mb-3">"EAST-WEST, HOME IS BEST"</p>
                <p className="mb-4">
                  In 1975, Turuturu Primary School was established under Muranga District Education Board. Our pioneer Head Teacher, Mr. James Kimani Gachoka, laid the foundation for excellence. Since then, the school has grown in leaps and bounds, producing many distinguished graduates impacting the world.
                </p>
                <p className="italic">
                  Turuturu Primary made us what we are. It will remain our identity and pride for generations. The purpose of Turuturu Stars Alumni Association is to bring Turuturu Primary alumni together to promote member welfare and prosperity, leverage effective social capital, mentorship, and impact the community holistically.
                </p>
                <p className="text-center font-bold text-lg mt-4 text-amber-700">
                  Let's keep the fire burning in the Spirit of Ubuntu!
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact & More Information</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p><strong>Turuturu Stars Alumni Association</strong></p>
                <p><strong>Alma Mater:</strong> Turuturu Primary School</p>
                <p><strong>Address:</strong> P.O. Box 65, Sabasaba, Kigumo 10208, Muranga County, Kenya</p>
                <p><strong>Email:</strong> support@turuturustars.co.ke</p>
                <p><strong>Phone:</strong> +254 700 000 000</p>
                <p className="mt-4 text-sm text-gray-600">
                  For full constitutional details, membership inquiries, or to download the official constitution document, please contact us.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Constitution;
