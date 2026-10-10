import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Brain, Swords, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { subjectNames } from '../lib/play';
import { Button, PageHeader } from '../components/ui';
import { MemoryBoard } from '../components/memory-board';
export default function GamesPage() {
  usePageLocale();
  const { game } = useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState('english');
  const grade = user?.student?.grade ?? 5;
  if (game === 'memory')
    return (
      <div className="play-space">
        <Link className="back-link" to="/games">
          {tx('pages.games.backToGames')}
        </Link>
        <PageHeader
          title={tx('pages.games.findAPairKnowledgeGarden')}
          description={tx('pages.games.revealCardsFindMatchingPairsAndGrowYour')}
        />
        <div className="play-tabs">
          {Object.entries(subjectNames).map(([key, title]) => (
            <Button
              key={key}
              variant={subject === key ? 'primary' : 'secondary'}
              onClick={() => setSubject(key)}
            >
              {title}
            </Button>
          ))}
        </div>
        <MemoryBoard key={`${grade}-${subject}`} subject={subject} />
        <p className="play-note">{tx('pages.games.thisGameHelpsYouPracticeItDoesNot')}</p>
      </div>
    );
  return (
    <div className="play-space">
      <PageHeader
        title={tx('navigation.games')}
        description={tx('pages.games.challengeAFriendOrPracticeWithAMini')}
      />
      <div className="games-grid">
        <Link className="game-entry brain-entry" to="/brain-ring">
          <Swords size={48} />
          <span className="pill">{tx('pages.games.2PlayersOnline')}</span>
          <h2>Brain Ring</h2>
          <p>{tx('pages.games.chooseAFriendSameQuestionsSameTimeWho')}</p>
          <strong>{tx('pages.games.startAMatch')}</strong>
        </Link>
        <Link className="game-entry memory-entry" to="/games/memory">
          <Brain size={48} />
          <span className="pill">{tx('pages.games.miniGameGrade', { value1: grade })}</span>
          <h2>{tx('pages.games.knowledgeGarden')}</h2>
          <p>{tx('pages.games.findMatchingPairsEveryPairGrowsANew')}</p>
          <strong>{tx('pages.games.play')}</strong>
        </Link>
      </div>
      <Link className="video-game-callout" to="/videos">
        <Sparkles size={28} />
        <div>
          <strong>{tx('pages.games.watchAnAnimationFirst')}</strong>
          <p>{tx('pages.games.understandTheTopicWithShortVideoLessons')}</p>
        </div>
        <span>→</span>
      </Link>
    </div>
  );
}
