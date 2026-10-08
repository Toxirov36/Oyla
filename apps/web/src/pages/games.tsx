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
          { left: 'cat', right: 'Mushuk', image: '/avatars/cat.svg' },
          { left: 'dog', right: 'Kuchuk', image: '/avatars/dog.svg' },
          { left: 'rabbit', right: 'Quyon', image: '/avatars/rabbit.svg' },
          { left: 'fox', right: 'Tulki', image: '/avatars/fox.svg' },
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
          { left: 'Klaviatura', right: 'Matn kiritish' },
          { left: 'Monitor', right: 'Natijani ko‘rsatish' },
          { left: 'CPU', right: 'Hisoblash' },
          { left: 'SSD', right: 'Doimiy saqlash' },
        ]
      : grade === 6
        ? [
            { left: 'Algoritm', right: 'Buyruqlar ketma-ketligi' },
            { left: 'Shart', right: 'Ha yoki yo‘q tekshiruvi' },
            { left: 'Qidiruv', right: 'Ma’lumot topish' },
            { left: 'Jadval', right: 'Satr va ustunlar' },
          ]
        : [
            { left: 'if', right: 'Shartni tekshirish' },
            { left: 'for', right: 'Takrorlash' },
            { left: 'function', right: 'Qayta ishlatiladigan buyruqlar' },
            { left: 'variable', right: 'Qiymatni saqlash' },
          ];
  return grade === 5
    ? [
        { left: '1/2', right: 'Ikki teng bo‘lakdan biri' },
        { left: '1/4', right: 'To‘rt teng bo‘lakdan biri' },
        { left: '3/4', right: 'To‘rt teng bo‘lakdan uchtasi' },
        { left: '1', right: 'Bir butun' },
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
  const make = () =>
    pairs(grade, subject)
      .flatMap((pair, key) => [
        { id: `${key}-a`, key, text: pair.left, image: undefined },
        { id: `${key}-b`, key, text: pair.right, image: pair.image },
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
        <span>{matched.length} / 4 juftlik</span>
        <span>{moves} urinish</span>
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
          <h2>Bilim bog‘ingiz gulladi!</h2>
          <p>{moves} urinishda barcha juftlikni topdingiz.</p>
          <Button
            onClick={() => {
              setCards(make());
              setMatched([]);
              setOpen([]);
              setMoves(0);
            }}
          >
            Yana o‘ynash
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
                aria-label={visible ? card.text : `Yopiq karta ${i + 1}`}
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
  const { game } = useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState('english');
  const grade = user?.student?.grade ?? 5;
  if (game === 'memory')
    return (
      <div className="play-space">
        <Link className="back-link" to="/games">
          ← O‘yinlarga qaytish
        </Link>
        <PageHeader
          title="Juftini top: bilim bog‘i"
          description="Kartalarni oching, mos juftliklarni toping va bog‘ingizni gullating."
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
        <p className="play-note">
          Bu o‘yin bilimni mustahkamlash uchun. Darslaringizdagi XP va baholar o‘zgarmaydi.
        </p>
      </div>
    );
  return (
    <div className="play-space">
      <PageHeader
        title="O‘yinlar"
        description="Do‘stingiz bilan bellashing yoki kichik o‘yin bilan bilimingizni mustahkamlang."
      />
      <div className="games-grid">
        <Link className="game-entry brain-entry" to="/brain-ring">
          <Swords size={48} />
          <span className="pill">2 o‘yinchi · online</span>
          <h2>Brain Ring</h2>
          <p>
            Do‘stingizni tanlang. Bir xil savollar, bir xil vaqt — kim ko‘proq to‘g‘ri javob beradi?
          </p>
          <strong>Bellashuvni boshlash →</strong>
        </Link>
        <Link className="game-entry memory-entry" to="/games/memory">
          <Brain size={48} />
          <span className="pill">Kichik o‘yin · {grade}-sinf</span>
          <h2>Bilim bog‘i</h2>
          <p>Juftliklarni toping. Har bir juftlik bilan yangi gul o‘sadi!</p>
          <strong>O‘ynash →</strong>
        </Link>
      </div>
      <Link className="video-game-callout" to="/videos">
        <Sparkles size={28} />
        <div>
          <strong>Avval animatsiyada ko‘ramizmi?</strong>
          <p>Qisqa videodarslar bilan mavzuni tushunib oling.</p>
        </div>
        <span>→</span>
      </Link>
    </div>
  );
}
