import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Brain, Swords, Trophy, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { subjectNames } from '../lib/play';
import { Button, Card, PageHeader, ProgressBar } from '../components/ui';
type Pair = { left: string; right: string; image?: string };
function pairs(grade: number, subject: string): Pair[] {
  if (subject === 'english')
    return grade === 5
      ? [
          {
            left: 'cat',
            get right() {
              return tx('pages.games.cat');
            },
            image: '/avatars/cat.svg',
          },
          {
            left: 'dog',
            get right() {
              return tx('pages.games.dog');
            },
            image: '/avatars/dog.svg',
          },
          {
            left: 'rabbit',
            get right() {
              return tx('pages.games.rabbit');
            },
            image: '/avatars/rabbit.svg',
          },
          {
            left: 'fox',
            get right() {
              return tx('pages.games.fox');
            },
            image: '/avatars/fox.svg',
          },
        ]
      : grade === 6
        ? [
            { left: 'go', right: 'went' },
            { left: 'see', right: 'saw' },
            { left: 'eat', right: 'ate' },
            { left: 'write', right: 'wrote' },
          ]
        : [
            { left: 'go', right: 'gone' },
            { left: 'see', right: 'seen' },
            { left: 'eat', right: 'eaten' },
            { left: 'write', right: 'written' },
          ];
  if (subject === 'informatics')
    return grade === 5
      ? [
          {
            get left() {
              return tx('pages.games.keyboard');
            },
            get right() {
              return tx('pages.games.textInput');
            },
          },
          {
            get left() {
              return tx('pages.games.monitor');
            },
            get right() {
              return tx('pages.games.displayOutput');
            },
          },
          {
            left: 'CPU',
            get right() {
              return tx('pages.games.computation');
            },
          },
          {
            left: 'SSD',
            get right() {
              return tx('pages.games.persistentStorage');
            },
          },
        ]
      : grade === 6
        ? [
            {
              get left() {
                return tx('pages.games.algorithm');
              },
              get right() {
                return tx('pages.games.sequenceOfInstructions');
              },
            },
            {
              get left() {
                return tx('pages.games.condition');
              },
              get right() {
                return tx('pages.games.yesornoCheck');
              },
            },
            {
              get left() {
                return tx('pages.games.search');
              },
              get right() {
                return tx('pages.games.findingInformation');
              },
            },
            {
              get left() {
                return tx('pages.games.table');
              },
              get right() {
                return tx('pages.games.rowsAndColumns');
              },
            },
          ]
        : [
            {
              left: 'if',
              get right() {
                return tx('pages.games.checkingACondition');
              },
            },
            {
              left: 'for',
              get right() {
                return tx('pages.games.repetition');
              },
            },
            {
              left: 'function',
              get right() {
                return tx('pages.games.reusableInstructions');
              },
            },
            {
              left: 'variable',
              get right() {
                return tx('pages.games.storingAValue');
              },
            },
          ];
  return grade === 5
    ? [
        {
          left: '1/2',
          get right() {
            return tx('pages.games.oneOfTwoEqualParts');
          },
        },
        {
          left: '1/4',
          get right() {
            return tx('pages.games.oneOfFourEqualParts');
          },
        },
        {
          left: '3/4',
          get right() {
            return tx('pages.games.threeOfFourEqualParts');
          },
        },
        {
          left: '1',
          get right() {
            return tx('pages.games.oneWhole');
          },
        },
      ]
    : grade === 6
      ? [
          { left: '1/2', right: '50%' },
          { left: '1/4', right: '25%' },
          { left: '3/4', right: '75%' },
          { left: '1/10', right: '10%' },
        ]
      : [
          { left: '2x = 10', right: 'x = 5' },
          { left: '3x + 1 = 10', right: 'x = 3' },
          { left: 'x − 7 = 2', right: 'x = 9' },
          { left: '4x = 8', right: 'x = 2' },
        ];
}
function MemoryBoard({ grade, subject }: { grade: number; subject: string }) {
  usePageLocale();
  const make = () =>
    pairs(grade, subject)
      .flatMap((pair, key) => [
        {
          id: `${key}-a`,
          key,
          get text() {
            return pair.left;
          },
          image: undefined,
        },
        {
          id: `${key}-b`,
          key,
          get text() {
            return pair.right;
          },
          image: pair.image,
        },
      ])
      .map((card) => ({ card, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.card);
  const [cards, setCards] = useState(make);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  useEffect(() => {
    if (open.length !== 2) return;
    const [left, right] = open.map((id) => cards.find((card) => card.id === id)!);
    const same = left!.key === right!.key;
    const timer = setTimeout(
      () => {
        if (same) setMatched((previous) => [...previous, left!.key]);
        setOpen([]);
      },
      same ? 350 : 900,
    );
    return () => clearTimeout(timer);
  }, [open, cards]);
  return (
    <Card className="memory-board">
      <div className="play-round-heading">
        <span>{tx('pages.games.4Pairs', { value1: matched.length })}</span>
        <span>{tx('pages.games.moves', { value1: moves })}</span>
      </div>
      <ProgressBar value={matched.length * 25} tone="mint" />
      <div className="memory-garden" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={i < matched.length ? 'garden-grown' : ''}>
            {i < matched.length ? '🌻' : '🌱'}
          </span>
        ))}
      </div>
      {matched.length === 4 ? (
        <div className="memory-result" role="status">
          <Trophy size={50} />
          <h2>{tx('pages.games.yourKnowledgeGardenHasBloomed')}</h2>
          <p>{tx('pages.games.youFoundAllPairsInMoves', { value1: moves })}</p>
          <Button
            onClick={() => {
              setCards(make());
              setMatched([]);
              setOpen([]);
              setMoves(0);
            }}
          >
            {tx('pages.games.playAgain')}
          </Button>
        </div>
      ) : (
        <div className="memory-grid">
          {cards.map((card, i) => {
            const visible = open.includes(card.id) || matched.includes(card.key);
            return (
              <button
                key={card.id}
                className={`memory-card ${visible ? 'is-open' : ''} ${matched.includes(card.key) ? 'is-matched' : ''}`}
                aria-label={visible ? card.text : tx('pages.games.hiddenCard', { value1: i + 1 })}
                disabled={open.length === 2 || open.includes(card.id) || matched.includes(card.key)}
                onClick={() => {
                  if (open.length === 1) setMoves((value) => value + 1);
                  setOpen((previous) => [...previous, card.id]);
                }}
              >
                {visible ? (
                  <>
                    {card.image && <img src={card.image} alt="" />}
                    <span>{card.text}</span>
                  </>
                ) : (
                  <Brain size={32} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
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
        <MemoryBoard key={`${grade}-${subject}`} grade={grade} subject={subject} />
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
