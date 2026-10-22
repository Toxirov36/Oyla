import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Trash2 } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import { AssignmentAttachments } from '../../components/assignment-attachments';
import type { Assignment } from '../../lib/types';
import { Button, Card, EmptyState, Modal, ProgressBar, dateLabel } from '../../components/ui';

function assignmentDeadlineLabel(deadline: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(deadline));
  return `${dateLabel(deadline)}, ${time}`;
}

export function AssignmentResults({
  assignments,
  studentCount,
}: {
  assignments: Assignment[];
  studentCount?: number;
}) {
  usePageLocale();
  const cache = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const removeAssignment = useMutation({
    mutationFn: (assignmentId: string) =>
      api(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError('');
      await cache.invalidateQueries({ queryKey: ['teacher'] });
    },
    onError: (error) => setDeleteError(errorText(error)),
  });
  if (!assignments.length)
    return (
      <EmptyState
        title={tx('pages.teacher.noAssignmentsYet')}
        description={tx('pages.teacher.chooseALessonAndGiveYourClassIts')}
      />
    );
  return (
    <div className="teacher-assignments">
      {assignments.map((a) => {
        const count = a.completion?.total ?? studentCount ?? a.class?._count?.students ?? 0;
        const completed = a.completion?.completed ?? a.submissions.length;
        const students =
          a.students ??
          a.submissions.map((submission) => ({
            id: submission.user?.id || submission.createdAt,
            name: submission.user?.name || '',
            submission,
          }));
        const average =
          students.reduce((sum, student) => sum + (student.submission?.score ?? 0), 0) /
          Math.max(1, students.filter((student) => student.submission).length);
        return (
          <Card key={a.id} className="teacher-assignment-card">
            <div className="assignment-card-top">
              <span className="eyebrow">
                {tx('pages.teacher.due', {
                  value1: a.class?.name || tx('pages.teacher.assignmentHeading'),
                  value2: assignmentDeadlineLabel(a.deadline),
                })}
              </span>
              <button
                type="button"
                className="assignment-delete-button"
                aria-label={tx('pages.teacher.deleteAssignment')}
                title={tx('pages.teacher.deleteAssignment')}
                onClick={() => {
                  setDeleteError('');
                  setDeleteTarget(a);
                }}
              >
                <Trash2 size={13} />
                <span>{tx('pages.teacher.deleteAssignment')}</span>
              </button>
            </div>
            <div className="assignment-card-body">
              <div>
                <h3>{a.title}</h3>
                <p>{localizeText(a.lesson.title)}</p>
                <AssignmentAttachments attachments={a.attachments} />
              </div>
              <span className="square-icon blue">
                <ClipboardList size={22} />
              </span>
            </div>
            <div className="progress-label">
              <span>{tx('pages.teacher.completionStatus')}</span>
              <strong>
                {completed} / {count}
              </strong>
            </div>
            <ProgressBar value={count ? (completed / count) * 100 : 0} tone="mint" />
            {!!a.completion?.historical && (
              <p className="subtle">
                {tx('pages.teacher.submissionsFromFormerMembersRetained', {
                  value1: a.completion.historical,
                })}
              </p>
            )}
            {students.length ? (
              <details className="submission-details">
                <summary>{tx('pages.teacher.analyzeResults')}</summary>
                <div className="assignment-analysis-summary">
                  <span>
                    {tx('pages.teacher.completionStatus')}:{' '}
                    <strong>
                      {completed} / {count}
                    </strong>
                  </span>
                  <span>
                    {tx('pages.teacher.averageScore')}:{' '}
                    <strong>{completed ? Math.round(average) : 0}%</strong>
                  </span>
                  <span>
                    {tx('pages.teacher.submittedLateCount')}:{' '}
                    <strong>
                      {a.completion?.late ??
                        students.filter((student) => student.submission?.late).length}
                    </strong>
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{tx('role.STUDENT')}</th>
                        <th>{tx('pages.admin.overview.result')}</th>
                        <th>{tx('pages.teacher.submission')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>
                            <strong>
                              {student.submission
                                ? `${student.submission.score}%`
                                : tx('pages.teacher.notSubmitted')}
                            </strong>
                          </td>
                          <td>
                            {student.submission ? (
                              <>
                                {student.submission.late
                                  ? tx('pages.teacher.submittedLate')
                                  : tx('pages.teacher.onTime')}{' '}
                                · {dateLabel(student.submission.createdAt)}
                              </>
                            ) : (
                              tx('pages.teacher.waitingForSubmission')
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : (
              <p className="subtle">{tx('pages.teacher.noResultsYet')}</p>
            )}
          </Card>
        );
      })}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !removeAssignment.isPending) setDeleteTarget(null);
        }}
        title={tx('pages.teacher.deleteAssignment')}
        description={tx('pages.teacher.deleteAssignmentConfirmation')}
      >
        {deleteError && (
          <div role="alert" className="form-error">
            {localizeText(deleteError)}
          </div>
        )}
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={removeAssignment.isPending}
            onClick={() => setDeleteTarget(null)}
          >
            {tx('common.cancel')}
          </Button>
          <Button
            variant="danger"
            busy={removeAssignment.isPending}
            onClick={() => deleteTarget && removeAssignment.mutate(deleteTarget.id)}
          >
            <Trash2 size={17} />
            {tx('pages.teacher.deleteAssignment')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
