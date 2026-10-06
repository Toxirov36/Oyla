import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import type { Analytics } from '../../lib/types';
import { Card, EmptyState, Stat, dateLabel } from '../../components/ui';
export function AdminOverview({ data }: { data: Analytics }) {
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Foydalanuvchilar"
          value={data.users}
          detail={`${data.students} o‘quvchi · ${data.teachers} o‘qituvchi`}
          icon={<Users size={24} />}
        />
        <Stat
          label="Chop etilgan darslar"
          value={data.published}
          detail={`${data.draft} ta qoralama/arxiv`}
          icon={<BookOpen size={24} />}
        />
        <Stat
          label="Yakunlangan mashqlar"
          value={data.completedAttempts}
          icon={<CheckCircle2 size={24} />}
        />
        <Stat
          label="O‘rtacha natija"
          value={`${data.averageScore}%`}
          icon={<GraduationCap size={24} />}
        />
      </div>
      <div className="admin-quick-links">
        <Link to="/admin/content">
          <Layers size={27} />
          <div>
            <h3>O‘quv kontenti</h3>
            <p>
              {data.subjects} fan · {data.lessons} dars
            </p>
          </div>
          <ArrowRight size={20} />
        </Link>
        <Link to="/admin/gamification">
          <Settings2 size={27} />
          <div>
            <h3>Gamifikatsiya</h3>
            <p>Jami {data.totalXp.toLocaleString()} XP berilgan</p>
          </div>
          <ArrowRight size={20} />
        </Link>
      </div>
      <Card>
        <h2>So‘nggi o‘quv faoliyati</h2>
        {data.recent.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>O‘quvchi</th>
                  <th>Faoliyat</th>
                  <th>Natija</th>
                  <th>XP</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{row.user.name}</td>
                    <td>{row.lesson?.title || 'Kunlik challenge'}</td>
                    <td>{row.score}%</td>
                    <td>+{row.earnedXp}</td>
                    <td>{dateLabel(row.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="O‘quv jarayoni boshlanishini kutmoqda"
            description="O‘quvchilar mashq yakunlaganda faoliyat shu yerda ko‘rinadi."
          />
        )}
      </Card>
    </>
  );
}
