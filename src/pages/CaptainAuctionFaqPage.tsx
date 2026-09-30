import { useState } from 'react';
import { Link } from 'react-router-dom';

const faqItems = [
  {
    question: 'What is the purpose of the Captain Auction?',
    answer: <>The Captain Auction is the process through which selected captains build their teams by bidding on registered players. Teams will <strong>not be pre-assigned</strong>; they will be formed through the auction.</>,
  },
  {
    question: 'Am I required to attend the auction?',
    answer: <>Yes. Captains are expected to participate in the auction and build their respective teams. If a captain is unavailable, the organizing committee may need to identify a replacement before the auction.</>,
  },
  {
    question: 'Will there be a practice (dummy) auction?',
    answer: <>Yes. A <strong>dummy auction</strong> will be conducted before the actual auction to help captains become familiar with the auction process and platform. The dummy auction may also be recorded and shared for reference.</>,
  },
  {
    question: 'How should I prepare for the auction?',
    answer: <>Player information will be shared with captains before the auction. This may include player profiles, preferred positions, ratings, and other relevant information. Captains are encouraged to review this information and plan their bidding strategy accordingly.</>,
  },
  {
    question: 'How were the captains selected?',
    answer: <>Captains were shortlisted from players who expressed an interest in taking up the captaincy during registration. The organizing committee finalized the captain list based on the registrations received and captain availability.</>,
  },
  {
    question: 'What if I cannot attend the actual auction?',
    answer: <>Please inform the organizing committee as soon as possible. If you are unable to attend, the committee may appoint another captain or make alternative arrangements before the auction begins.</>,
  },
  {
    question: 'How many teams will be formed?',
    answer: <>The current plan is to have <strong>8 teams</strong>, subject to the final number of registered players and their availability.</>,
  },
  {
    question: "Will I know the players' positions before bidding?",
    answer: <>Yes. Player registration includes preferred playing positions and self-assessment information. Relevant player information will be shared with captains before bidding.</>,
  },
  {
    question: 'Will player ratings be available?',
    answer: <>Yes. Player ratings and relevant statistics will be shared with captains before the auction. These ratings provide <strong>guidance for bidding</strong> and should not be considered an absolute measure of a player's performance.</>,
  },
  {
    question: 'Can a captain choose the team name?',
    answer: <>Yes. Once the teams have been formed through the auction, captains will be able to decide their team names.</>,
  },
  {
    question: 'What are my responsibilities after the auction?',
    answer: <ul><li>Communicating with team members.</li><li>Keeping the team informed about match schedules and timings.</li><li>Ensuring players are available for matches.</li><li>Informing the organizing committee promptly about player withdrawals.</li><li>Coordinating the team jersey or shirt colour.</li><li>Ensuring the team follows tournament rules.</li><li>Promoting fair play, discipline, and good sportsmanship.</li></ul>,
  },
  {
    question: 'What happens if a player withdraws after the auction?',
    answer: <>The captain should inform the organizing committee as soon as possible. If a team falls below the minimum number of players required to participate in a match, the tournament committee will determine the appropriate action in accordance with the tournament rules. This may include a walkover for the opposing team.</>,
  },
  {
    question: 'Can players be swapped between teams after the auction?',
    answer: <>No general player-swapping policy has been approved at this time. Teams formed through the auction are expected to remain unchanged unless the organizing committee announces an exception.</>,
  },
  {
    question: 'What is the minimum number of players required to play a match?',
    answer: <>A team must have <strong>at least 5 available players</strong> to participate in a match.</>,
  },
  {
    question: 'What should captains communicate to their players before the tournament?',
    answer: <ul><li>Match dates and timings.</li><li>Attendance expectations.</li><li>Approved footwear requirements.</li><li>Team jersey or shirt colour.</li><li>Tournament rules and sportsmanship guidelines.</li><li>Venue details.</li><li>Relevant transportation arrangements.</li></ul>,
  },
  {
    question: 'How will the female participant be accommodated?',
    answer: <>The organizing committee is currently discussing the appropriate approach and playing arrangements. Further guidance will be communicated to the captains before the auction.</>,
  },
  {
    question: 'What if I need help during the auction?',
    answer: <>The organizing committee and auction administrators will be available throughout both the dummy and actual auctions. They will assist with questions about the auction process, bidding, and technical issues with the platform.</>,
  },
];

const reminders = [
  'Attend the dummy auction and familiarize yourself with the platform.',
  'Be available for the actual auction.',
  'Review player profiles and ratings before the auction.',
  'Plan your squad and budget carefully.',
  'Aim to build a balanced team across different positions.',
  'Inform the committee immediately if your availability changes.',
  'Stay in communication with your players after the auction.',
  'Ensure your team follows the tournament rules.',
  'Encourage fair play and good sportsmanship throughout the tournament.',
];

export function CaptainAuctionFaqPage() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hyland Football Tournament 2026 Captain Auction FAQ',
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  return (
    <div className="blog-page">
      <header className="blog-header">
        <div className="blog-header-inner">
          <Link className="blog-brand" to="/">⚽ Hyland Football Tournament 2026</Link>
          <button className="blog-share-button" type="button" onClick={copyLink}>
            {copied ? 'Link copied' : 'Share FAQ'}
          </button>
        </div>
      </header>
      <main className="blog-main">
        <article className="blog-article">
          <p className="blog-kicker">Captain Auction / Information Centre</p>
          <h1>Captain Auction: Frequently Asked Questions</h1>
          <p className="blog-intro">Everything captains need to know before the Hyland Football Tournament 2026 auction.</p>
          <div className="blog-rule" />
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <section className="faq-item" key={item.question}>
                <p className="faq-number">{String(index + 1).padStart(2, '0')}</p>
                <div>
                  <h2>{item.question}</h2>
                  <div className="faq-answer">{item.answer}</div>
                </div>
              </section>
            ))}
          </div>
          <section className="reminders-section">
            <p className="blog-kicker">Before kickoff</p>
            <h2>Quick reminders for captains</h2>
            <ul className="reminders-list">
              {reminders.map((reminder) => <li key={reminder}>{reminder}</li>)}
            </ul>
          </section>
          <footer className="blog-footer">
            <p>See you at the auction! ⚽</p>
            <strong>Hyland Football Tournament 2026</strong>
          </footer>
        </article>
      </main>
    </div>
  );
}