import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { Link } from 'react-router-dom';
import { isStructured } from '../../lib/exercises';
import type { ReactNode } from 'react';
import { Layers, BookOpen, CirclePlus, Plus } from 'lucide-react';
import type {
  AdminSubject,
  AdminCourse,
  AdminTopic,
  AdminLesson,
  AdminQuestion,
} from '../../lib/types';
import { Button, Card, EmptyState } from '../../components/ui';
import { grades, typeOptions } from './config';
type ContentKind = 'subjects' | 'courses' | 'topics' | 'lessons' | 'questions';
type ContentEntity = AdminSubject | AdminCourse | AdminTopic | AdminLesson | AdminQuestion;
export function AdminContent({
  data,
  gradeFilter,
  onGradeChange,
  onCreate,
  actions,
}: {
  data: AdminSubject[];
  gradeFilter: string;
  onGradeChange: (value: string) => void;
  onCreate: (kind: ContentKind, item?: ContentEntity, parentId?: string) => void;
  actions: (kind: ContentKind, item: ContentEntity) => ReactNode;
}) {
  usePageLocale();
  return (
    <>
      <Link className="btn btn-secondary" to="/admin/exercises">
        {tx('pages.admin.content.exerciseCatalog20Formats')}
      </Link>
      <div className="filter-bar">
        <div className="segmented">
          {grades.map((g) => (
            <Button
              key={g.value}
              variant={gradeFilter === g.value ? 'primary' : 'ghost'}
              onClick={() => onGradeChange(g.value)}
            >
              {g.label}
            </Button>
          ))}
        </div>
        <p className="subtle">{tx('pages.admin.content.lessonsAndQuestionsStartAsDraftsAndAre')}</p>
      </div>
      <div className="content-tree">
        {data.map((subject) => (
          <Card key={subject.id} className="content-subject">
            <div className="content-node-heading">
              <div>
                <span className="eyebrow">{tx('pages.admin.subjectHeading')}</span>
                <h2>{localizeText(subject.title)}</h2>
                <p>{localizeText(subject.description)}</p>
              </div>
              {actions('subjects', subject)}
            </div>
            {subject.courses
              .filter((c) => c.grade === Number(gradeFilter))
              .map((course) => (
                <details key={course.id} className="content-course" open>
                  <summary>
                    <Layers size={19} />
                    <strong>{localizeText(course.title)}</strong>
                    <span className="pill">
                      {tx('pages.admin.content.topics', { value1: course.topics.length })}
                    </span>
                  </summary>
                  <div className="content-node-toolbar">
                    {actions('courses', course)}
                    <Button
                      variant="secondary"
                      onClick={() => onCreate('topics', undefined, course.id)}
                    >
                      <Plus size={16} />
                      {tx('pages.admin.content.topic')}
                    </Button>
                  </div>
                  {course.topics.map((topic) => (
                    <div key={topic.id} className="content-topic">
                      <div className="content-node-heading">
                        <h3>{localizeText(topic.title)}</h3>
                        {actions('topics', topic)}
                        <Button
                          variant="ghost"
                          onClick={() => onCreate('lessons', undefined, topic.id)}
                        >
                          <CirclePlus size={17} />
                          {tx('pages.admin.content.lesson')}
                        </Button>
                      </div>
                      {topic.lessons.map((lesson) => (
                        <details key={lesson.id} className="content-lesson">
                          <summary>
                            <BookOpen size={18} />
                            <strong>{localizeText(lesson.title)}</strong>
                            <span className="subtle">
                              {tx('pages.admin.content.questions', {
                                value1: lesson.questions.length,
                              })}
                            </span>
                          </summary>
                          <div className="content-node-toolbar">
                            {actions('lessons', lesson)}
                            <Button
                              variant="secondary"
                              onClick={() => onCreate('questions', undefined, lesson.id)}
                            >
                              <Plus size={16} />
                              {tx('pages.admin.content.addQuestion')}
                            </Button>
                          </div>
                          <div className="content-excerpt">
                            <p>{lesson.explanation.slice(0, 240)}...</p>
                          </div>
                          {lesson.questions.map((question, i) => (
                            <div className="content-question" key={question.id}>
                              <span className="question-number">{i + 1}</span>
                              <div>
                                <strong>{question.text}</strong>
                                <small>
                                  {typeOptions.find((t) => t.value === question.type)?.label} ·
                                  {isStructured(question.type)
                                    ? tx('pages.admin.content.structuredGradingV', {
                                        value1: question.version ?? 1,
                                      })
                                    : tx('pages.admin.content.answer', { value1: question.answer })}
                                </small>
                              </div>
                              {actions('questions', question)}
                            </div>
                          ))}
                          {!lesson.questions.length && (
                            <p className="subtle content-excerpt">
                              {tx('pages.admin.content.addAQuestionToPublishTheLesson')}
                            </p>
                          )}
                        </details>
                      ))}
                    </div>
                  ))}
                  {!course.topics.length && (
                    <EmptyState title={tx('pages.admin.content.startByAddingATopic')} />
                  )}
                </details>
              ))}
            <Button
              variant="secondary"
              className="add-course"
              onClick={() => onCreate('courses', undefined, subject.id)}
            >
              <Plus size={16} />
              {tx('pages.admin.content.courseForGrade', { value1: gradeFilter })}
            </Button>
          </Card>
        ))}
      </div>
      {!data.length && (
        <Card>
          <EmptyState title={tx('pages.admin.content.createYourFirstSubject')} />
        </Card>
      )}
    </>
  );
}
