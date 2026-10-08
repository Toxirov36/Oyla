import { useState } from 'react';
import type { Classroom } from '../lib/types';
import { Button, Card, EmptyState, ProgressBar } from './ui';
import { ComboboxField } from './combobox-field';
import { exerciseLabels } from '../lib/exercises';

export function TeacherAnalysis({
  group,
  assign,
}: {
  group: Classroom;
  assign: (lessonId: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [helpOnly, setHelpOnly] = useState(false);
  const subjects = [...new Set(group.topics.map((topic) => topic.subject))];
  const topics = group.topics.filter(
    (topic) => (!subject || topic.subject === subject) && (!helpOnly || topic.struggling > 0),
  );
  const exerciseTypes = (group.exerciseTypes ?? []).filter(
    (t) => (!subject || t.subject === subject) && (!helpOnly || t.struggling > 0),
  );
  return (
    <>
      <div className="section-title">
        <h2>Mavzular bo‘yicha tahlil</h2>
        <span className="subtle">
          {group.grade}-sinf · {group.totalLessons} ta ko‘rinadigan dars
        </span>
      </div>
      <Card>
        <div className="teacher-analysis-filters">
          <ComboboxField
            options={[
              { value: '', label: 'Barcha fanlar' },
              ...subjects.map((name) => ({ value: name, label: name })),
            ]}
            value={subject}
            onChange={setSubject}
            label="Tahlil fanini tanlash"
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={helpOnly}
              onChange={(event) => setHelpOnly(event.target.checked)}
            />
            Faqat yordam kerak mavzular
          </label>
        </div>
        <p className="formula-note">
          O‘zlashtirish bajarilgan darslarning eng yaxshi ballaridan hisoblanadi. Hali
          boshlamaganlar o‘rtacha ballga qo‘shilmaydi.
        </p>
        {topics.length ? (
          <div className="table-scroll">
            <table className="teacher-topic-table">
              <thead>
                <tr>
                  <th>Mavzu</th>
                  <th>O‘zlashtirish</th>
                  <th>Ishtirok</th>
                  <th>Yordam kerak</th>
                  <th>Keyingi qadam</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <td>
                      <strong>{topic.title}</strong>
                      <small>
                        {topic.subject} · {topic.totalLessons} dars
                      </small>
                    </td>
                    <td>
                      <strong>
                        {topic.mastery === null ? 'Hali natija yo‘q' : `${topic.mastery}%`}
                      </strong>
                      {topic.mastery !== null && (
                        <ProgressBar
                          value={topic.mastery}
                          tone={topic.mastery < 60 ? 'orange' : 'mint'}
                        />
                      )}
                    </td>
                    <td>
                      {topic.participants} / {group.students.length}
                      <small>{topic.notStarted} ta boshlamagan</small>
                    </td>
                    <td>
                      <span className={`pill ${topic.struggling ? 'warm' : ''}`}>
                        {topic.struggling} o‘quvchi
                      </span>
                    </td>
                    <td>
                      <Button variant="secondary" onClick={() => assign(topic.suggestedLesson.id)}>
                        Mashq tayinlash
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Filtr bo‘yicha mavzular yo‘q" />
        )}
      </Card>
      <div className="section-title">
        <h2>Mashq turlari bo‘yicha tahlil</h2>
        <span className="subtle">Eng so‘nggi yakunlangan urinishlar</span>
      </div>
      <Card>
        <p className="formula-note">
          Har o‘quvchining har darsdagi eng so‘nggi yakunlangan urinishining birinchi javoblari
          olinadi. Mustahkamlash uchun bir savolni qayta tekshirish hisobga qo‘shilmaydi.
        </p>
        {exerciseTypes.length ? (
          <div className="table-scroll">
            <table className="teacher-exercise-table">
              <thead>
                <tr>
                  <th>Mashq turi</th>
                  <th>To‘g‘ri javoblar</th>
                  <th>Ishtirokchilar</th>
                  <th>Yordam kerak</th>
                </tr>
              </thead>
              <tbody>
                {exerciseTypes.map((t) => (
                  <tr key={`${t.subject}:${t.type}`}>
                    <td>
                      <strong>{exerciseLabels[t.type]}</strong>
                      <small>{t.subject}</small>
                    </td>
                    <td>
                      <strong>{t.accuracy}%</strong>
                      <small>
                        {t.correct} / {t.answers} javob
                      </small>
                      <ProgressBar value={t.accuracy} tone={t.accuracy < 60 ? 'orange' : 'mint'} />
                    </td>
                    <td>{t.participants} o‘quvchi</td>
                    <td>
                      <span className={`pill ${t.struggling ? 'warm' : ''}`}>
                        {t.struggling} o‘quvchi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Mashq turlari bo‘yicha hali natija yo‘q"
            description="O‘quvchilar darsni yakunlaganda birinchi javoblar tahlili ko‘rinadi."
          />
        )}
      </Card>
      <div className="section-title">
        <h2>Yordam kerak o‘quvchilar</h2>
        <span className="subtle">Kamida bitta mavzuda o‘zlashtirish 60% dan past</span>
      </div>
      <Card>
        {group.studentsNeedingHelp.length ? (
          group.studentsNeedingHelp.map((student) => (
            <div className="teacher-help-row" key={student.id}>
              <strong>{student.name}</strong>
              <div>
                {student.topics.map((topic) => (
                  <span className="pill warm" key={topic.id}>
                    {topic.title}: {topic.mastery}%
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Past natijali mavzular aniqlanmadi"
            description="Boshlamagan o‘quvchilarni darslarni bajarishga taklif qiling."
          />
        )}
      </Card>
    </>
  );
}
