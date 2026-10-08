import { BookOpen, Check, CloudRain, Moon, Sun, Umbrella, X } from 'lucide-react';
import type { AnimationVisual } from '../lib/play';
export function AnimationScene({ visual }: { visual: AnimationVisual }) {
  const step = visual.step ?? 0;
  return (
    <div className={`learning-scene scene-${visual.kind}`}>
      {visual.kind === 'pizza' ? (
        <svg className="animated-pizza" viewBox="0 0 220 220" role="img" aria-label={visual.label}>
          <circle cx="110" cy="110" r="94" fill="#edb768" />
          {Array.from({ length: visual.d ?? 1 }, (_, i) => {
            const pieces = visual.d ?? 1;
            const start = (i * Math.PI * 2) / pieces - Math.PI / 2;
            const end = ((i + 1) * Math.PI * 2) / pieces - Math.PI / 2;
            const point = (a: number) => `${110 + 84 * Math.cos(a)},${110 + 84 * Math.sin(a)}`;
            return pieces === 1 ? (
              <circle key={i} cx="110" cy="110" r="84" fill="#ffd77e" />
            ) : (
              <path
                key={i}
                d={`M110,110 L${point(start)} A84,84 0 ${pieces === 1 ? 1 : 0} 1 ${point(end)} Z`}
                fill={i < (visual.n ?? 1) ? '#ffd77e' : '#f3eee5'}
                stroke="white"
                strokeWidth="3"
              />
            );
          })}
          <circle cx="80" cy="63" r="8" fill="#e67360" />
          <circle cx="127" cy="62" r="7" fill="#e67360" />
          <circle cx="148" cy="108" r="8" fill="#e67360" />
          <circle cx="100" cy="136" r="7" fill="#e67360" />
        </svg>
      ) : visual.kind === 'percent' ? (
        <svg className="percent-scene" viewBox="0 0 220 220" role="img" aria-label={visual.label}>
          <circle cx="110" cy="110" r="80" fill="none" stroke="var(--border)" strokeWidth="22" />
          <circle
            cx="110"
            cy="110"
            r="80"
            fill="none"
            stroke="var(--teal)"
            strokeWidth="22"
            strokeDasharray={`${(visual.n ?? 0) * 5.0265} 502.65`}
            transform="rotate(-90 110 110)"
            strokeLinecap="round"
          />
          <text
            x="110"
            y="118"
            textAnchor="middle"
            fill="var(--navy)"
            fontSize="34"
            fontWeight="800"
          >
            {visual.n}%
          </text>
        </svg>
      ) : visual.kind === 'equation' ? (
        <div className="equation-scene">
          <div className="equation-box">
            {step === 0 ? '2x + 3' : step === 1 ? '2x' : step === 2 ? 'x' : '2 × 4 + 3'}
          </div>
          <strong>=</strong>
          <div className="equation-box">
            {step === 0 || step === 3 ? '11' : step === 1 ? '8' : '4'}
          </div>
        </div>
      ) : visual.kind === 'routine' ? (
        <div className="routine-scene">
          {step === 0 ? (
            <Sun className="scene-sun" size={52} />
          ) : step === 2 ? (
            <Moon size={48} />
          ) : (
            <BookOpen size={48} />
          )}
          <img className="scene-character" src="/avatars/rabbit.svg" alt="Quyon qahramon" />
        </div>
      ) : visual.kind === 'verbs' ? (
        <div className="verb-scene">
          <img className="scene-character" src="/avatars/owl.svg" alt="Boyqush qahramon" />
          <span className="scene-word">{visual.label}</span>
        </div>
      ) : visual.kind === 'condition' ? (
        <div className="condition-scene">
          {step === 0 ? (
            <>
              <CloudRain size={65} />
              <Umbrella size={70} />
            </>
          ) : step === 1 ? (
            <Sun className="scene-sun" size={90} />
          ) : step === 2 ? (
            <Check size={100} />
          ) : (
            <X size={100} />
          )}
        </div>
      ) : (
        <div className="robot-scene">
          <img className="scene-character" src="/avatars/robot.svg" alt="Robot qahramon" />
          <div className="robot-path">
            {visual.kind === 'loop' ? (
              Array.from({ length: 3 }, (_, i) => (
                <span className={i < step ? 'star-earned' : ''} key={i}>
                  ★
                </span>
              ))
            ) : (
              <>
                <span className={step >= 1 ? 'path-done' : ''}>1</span>
                <span className={step >= 2 ? 'path-done' : ''}>2</span>
                <span className={step >= 3 ? 'path-done' : ''}>3</span>
              </>
            )}
          </div>
        </div>
      )}
      <strong className="scene-caption">{visual.label}</strong>
    </div>
  );
}
