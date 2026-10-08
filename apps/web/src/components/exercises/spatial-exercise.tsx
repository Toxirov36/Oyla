import { useRef } from 'react';
import type { ExerciseConfig, ExercisePoint } from '../../lib/exercises';
import { Button } from '../ui';

export function SpatialExercise({
  config,
  points,
  onChange,
  disabled,
  image,
  line,
}: {
  config: ExerciseConfig;
  points: ExercisePoint[];
  onChange: (p: ExercisePoint[]) => void;
  disabled: boolean;
  image: boolean;
  line: boolean;
}) {
  const start = useRef<ExercisePoint | null>(null);
  const count = line ? 2 : 1;
  const at = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100))),
      y: Math.round(Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100))),
    };
  };
  const point = (i: number) => points[i] ?? { x: 50, y: 50 };
  return (
    <div className="spatial-exercise">
      <p className="subtle">
        {line
          ? 'Ikki nuqtani ketma-ket belgilang yoki chiziqni sudrab chizing.'
          : 'Kerakli nuqtani belgilang.'}{' '}
        Koordinatalarni pastda ham kiritishingiz mumkin.
      </p>
      <div className={`exercise-board ${image ? 'with-image' : ''}`}>
        {image && (
          <img src={config.imageUrl} alt={config.imageAlt ?? 'Mashq rasmi'} draggable={false} />
        )}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={line ? 'Chiziq chizish maydoni' : 'Nuqtani tanlash maydoni'}
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            start.current = at(e);
          }}
          onPointerUp={(e) => {
            if (disabled || !start.current) return;
            const end = at(e);
            const begin = start.current;
            start.current = null;
            if (line && Math.hypot(end.x - begin.x, end.y - begin.y) > 2) onChange([begin, end]);
            else onChange(line && points.length === 1 ? [points[0]!, end] : [end]);
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          {!image &&
            Array.from({ length: 11 }, (_, i) => (
              <g key={i}>
                <path
                  d={`M ${i * 10} 0 V100 M0 ${i * 10} H100`}
                  stroke="var(--line)"
                  strokeWidth=".3"
                />
              </g>
            ))}
          {config.markers?.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="1.4" fill="var(--navy)" />
              <text x={p.x + 2} y={p.y - 2} fontSize="4">
                {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}
          {line && points.length === 2 && (
            <line
              x1={points[0]!.x}
              y1={points[0]!.y}
              x2={points[1]!.x}
              y2={points[1]!.y}
              stroke="var(--primary)"
              strokeWidth="1"
            />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="var(--primary)" />
          ))}
        </svg>
      </div>
      <div className="coordinate-inputs">
        {Array.from({ length: count }, (_, i) => (
          <fieldset key={i} disabled={disabled}>
            <legend>{i + 1}-nuqta (%)</legend>
            {(['x', 'y'] as const).map((axis) => (
              <label key={axis}>
                {axis.toUpperCase()}
                <input
                  aria-label={`${i + 1}-nuqta ${axis}`}
                  type="number"
                  min="0"
                  max="100"
                  value={points[i]?.[axis] ?? ''}
                  placeholder="50"
                  onChange={(e) => {
                    const next = Array.from({ length: count }, (_, j) => point(j));
                    next[i] = {
                      ...point(i),
                      [axis]: Math.max(0, Math.min(100, Number(e.target.value))),
                    };
                    onChange(next);
                  }}
                />
              </label>
            ))}
          </fieldset>
        ))}
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange([])}>
          Tozalash
        </Button>
      </div>
    </div>
  );
}
