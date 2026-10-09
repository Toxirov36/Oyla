import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
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
  usePageLocale();
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
        <h2>{tx('pages.teacher-analysis.topicAnalysis')}</h2>
        <span className="subtle">
          {tx('pages.teacher-analysis.gradeVisibleLessons', {
            value1: group.grade,
            value2: group.totalLessons,
          })}
        </span>
      </div>
      <Card>
        <div className="teacher-analysis-filters">
          <ComboboxField
            options={[
              {
                value: '',
                get label() {
                  return tx('pages.teacher-analysis.allSubjects');
                },
              },
              ...subjects.map((name) => ({ value: name, label: name })),
            ]}
            value={subject}
            onChange={setSubject}
            label={tx('pages.teacher-analysis.selectSubjectForAnalysis')}
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={helpOnly}
              onChange={(event) => setHelpOnly(event.target.checked)}
            />
            {tx('pages.teacher-analysis.onlyTopicsNeedingSupport')}
          </label>
        </div>
        <p className="formula-note">
          {tx('pages.teacher-analysis.masteryUsesTheBestScoresOnCompletedLessons')}
        </p>
        {topics.length ? (
          <div className="table-scroll">
            <table className="teacher-topic-table">
              <thead>
                <tr>
                  <th>{tx('pages.admin.content.topic')}</th>
                  <th>{tx('pages.student-data.masteryVariant348')}</th>
                  <th>{tx('pages.teacher-analysis.participation')}</th>
                  <th>{tx('pages.teacher.needsSupport')}</th>
                  <th>{tx('pages.teacher-analysis.nextStep')}</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <td>
                      <strong>{localizeText(topic.title)}</strong>
                      <small>
                        {tx('pages.teacher-analysis.lessons', {
                          value1: topic.subject,
                          value2: topic.totalLessons,
                        })}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {topic.mastery === null
                          ? tx('pages.teacher-analysis.noResultsYet')
                          : `${topic.mastery}%`}
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
                      <small>
                        {tx('pages.teacher-analysis.notStarted', { value1: topic.notStarted })}
                      </small>
                    </td>
                    <td>
                      <span className={`pill ${topic.struggling ? 'warm' : ''}`}>
                        {tx('pages.admin.classes.students', { value1: topic.struggling })}
                      </span>
                    </td>
                    <td>
                      <Button variant="secondary" onClick={() => assign(topic.suggestedLesson.id)}>
                        {tx('pages.teacher-analysis.assignPractice')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={tx('pages.teacher-analysis.noTopicsMatchTheFilter')} />
        )}
      </Card>
      <div className="section-title">
        <h2>{tx('pages.teacher-analysis.exerciseTypeAnalysis')}</h2>
        <span className="subtle">{tx('pages.teacher-analysis.latestCompletedAttempts')}</span>
      </div>
      <Card>
        <p className="formula-note">
          {tx('pages.teacher-analysis.usesTheFirstAnswersFromEachStudentsLatest')}
        </p>
        {exerciseTypes.length ? (
          <div className="table-scroll">
            <table className="teacher-exercise-table">
              <thead>
                <tr>
                  <th>{tx('pages.teacher-analysis.exerciseType')}</th>
                  <th>{tx('pages.admin.config.correctAnswers')}</th>
                  <th>{tx('pages.teacher-analysis.participants')}</th>
                  <th>{tx('pages.teacher.needsSupport')}</th>
                </tr>
              </thead>
              <tbody>
                {exerciseTypes.map((t) => (
                  <tr key={`${t.subject}:${t.type}`}>
                    <td>
                      <strong>{exerciseLabels[t.type]}</strong>
                      <small>{localizeText(t.subject)}</small>
                    </td>
                    <td>
                      <strong>{t.accuracy}%</strong>
                      <small>
                        {tx('pages.teacher-analysis.answers', {
                          value1: t.correct,
                          value2: t.answers,
                        })}
                      </small>
                      <ProgressBar value={t.accuracy} tone={t.accuracy < 60 ? 'orange' : 'mint'} />
                    </td>
                    <td>{tx('pages.admin.classes.students', { value1: t.participants })}</td>
                    <td>
                      <span className={`pill ${t.struggling ? 'warm' : ''}`}>
                        {tx('pages.admin.classes.students', { value1: t.struggling })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={tx('pages.teacher-analysis.noExerciseTypeResultsYet')}
            description={tx(
              'pages.teacher-analysis.firstanswerAnalysisAppearsWhenStudentsCompleteLessons',
            )}
          />
        )}
      </Card>
      <div className="section-title">
        <h2>{tx('pages.teacher-analysis.studentsNeedingSupport')}</h2>
        <span className="subtle">
          {tx('pages.teacher-analysis.masteryBelow60InAtLeastOneTopic')}
        </span>
      </div>
      <Card>
        {group.studentsNeedingHelp.length ? (
          group.studentsNeedingHelp.map((student) => (
            <div className="teacher-help-row" key={student.id}>
              <strong>{student.name}</strong>
              <div>
                {student.topics.map((topic) => (
                  <span className="pill warm" key={topic.id}>
                    {localizeText(topic.title)}: {topic.mastery}%
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title={tx('pages.teacher-analysis.noLowscoringTopicsFound')}
            description={tx('pages.teacher-analysis.encourageStudentsWhoHaveNotStartedToTry')}
          />
        )}
      </Card>
    </>
  );
}
