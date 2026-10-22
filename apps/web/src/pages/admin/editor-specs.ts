import { z } from 'zod';
import { localizeText, translate as tx } from '../../i18n';
import type { EditorField, EditorSpec } from '../../components/entity-editor';
import type {
  AdminClass,
  AdminCourse,
  AdminLesson,
  AdminQuestion,
  AdminSubject,
  AdminTopic,
  Badge,
  Level,
  User,
} from '../../lib/types';
import { criterions, grades } from './config';

export type ContentKind = 'subjects' | 'courses' | 'topics' | 'lessons' | 'questions';
export type ContentEntity = AdminSubject | AdminCourse | AdminTopic | AdminLesson | AdminQuestion;

export const entityValues = (value?: object): Record<string, unknown> =>
  value ? { ...value } : {};
export const isEligibleClassStudent = (user: User, grade: number | undefined) =>
  user.role === 'STUDENT' && user.active === true && user.student?.grade === grade;

const statuses = [
  {
    value: 'DRAFT',
    get label() {
      return tx('common.draft');
    },
  },
  {
    value: 'PUBLISHED',
    get label() {
      return tx('common.published');
    },
  },
  {
    value: 'ARCHIVED',
    get label() {
      return tx('common.archived');
    },
  },
];
const statusField: EditorField = {
  key: 'status',
  get label() {
    return tx('pages.admin.users.status');
  },
  kind: 'select',
  options: statuses,
};
const titleField: EditorField = {
  key: 'title',
  get label() {
    return tx('pages.admin.avatars.name');
  },
  min: 2,
  max: 100,
};
const positionField: EditorField = {
  key: 'position',
  get label() {
    return tx('pages.admin.avatars.displayOrder');
  },
  kind: 'number',
  min: 0,
  max: 10000,
};
const slugPattern = /^[a-z][a-z0-9-]{1,59}$/;

/** Flattens the subject tree into the labelled lists used by the editors' select fields. */
export function flattenContent(tree: AdminSubject[]) {
  const courses = tree.flatMap((s) =>
    s.courses.map((c) => ({
      ...c,
      get label() {
        return tx('pages.admin.grade', {
          value1: localizeText(s.title),
          value2: c.grade,
          value3: localizeText(c.title),
        });
      },
    })),
  );
  const topics = courses.flatMap((c) =>
    c.topics.map((t) => ({ ...t, label: `${c.label} / ${localizeText(t.title)}` })),
  );
  const lessons = topics.flatMap((t) =>
    t.lessons.map((l) => ({ ...l, label: `${t.label} / ${localizeText(l.title)}` })),
  );
  return { courses, topics, lessons };
}

const select = (
  key: string,
  label: string,
  values: { id: string; title?: string; label?: string }[],
): EditorField => ({
  key,
  label,
  kind: 'select',
  options: values.map((v) => ({ value: v.id, label: v.label || localizeText(v.title) })),
  schema: z.uuid(tx('pages.admin.chooseAnOption')),
});

/** Builds the generic editor for subjects, courses, topics and lessons; questions use their own editor. */
export function contentEditorSpec(
  kind: Exclude<ContentKind, 'questions'>,
  tree: AdminSubject[],
  gradeFilter: string,
  item?: ContentEntity,
  parentId?: string,
): EditorSpec {
  const { courses, topics, lessons } = flattenContent(tree);
  const names = {
    get subjects() {
      return tx('pages.admin.videos.subject');
    },
    get courses() {
      return tx('pages.admin.course');
    },
    get topics() {
      return tx('pages.admin.content.topic');
    },
    get lessons() {
      return tx('pages.admin.content.lesson');
    },
  };
  let fields: EditorField[];
  let values = entityValues(item);
  if (kind === 'subjects')
    fields = [
      titleField,
      {
        key: 'slug',
        get label() {
          return tx('pages.admin.shortNameLatinLetters');
        },
        schema: z.string().regex(slugPattern, tx('pages.admin.useLowercaseLatinLettersAndHyphens')),
      },
      {
        key: 'description',
        get label() {
          return tx('pages.admin.videos.description');
        },
        kind: 'textarea',
        max: 1000,
      },
      statusField,
      positionField,
    ];
  else if (kind === 'courses') {
    fields = [
      select('subjectId', tx('pages.admin.videos.subject'), tree),
      titleField,
      {
        key: 'grade',
        get label() {
          return tx('pages.admin.users.grade');
        },
        kind: 'select',
        options: grades,
      },
      statusField,
      positionField,
    ];
    values = {
      subjectId: parentId,
      grade: gradeFilter,
      ...values,
      ...(item && 'grade' in item ? { grade: String(item.grade) } : {}),
    };
  } else if (kind === 'topics') {
    fields = [select('courseId', tx('pages.admin.course'), courses), titleField, statusField];
    values = { courseId: parentId, ...values };
  } else {
    const currentLesson = item as AdminLesson | undefined;
    fields = [
      select('topicId', tx('pages.admin.content.topic'), topics),
      { ...titleField, max: 150 },
      {
        key: 'youtubeUrl',
        get label() {
          return tx('pages.admin.youtubeVideoLink');
        },
        max: 2048,
        schema:
          currentLesson && !currentLesson.youtubeId
            ? z.union([z.literal(''), z.url(tx('pages.admin.enterValidYoutubeLink'))])
            : z.url(tx('pages.admin.enterValidYoutubeLink')),
        get help() {
          return tx('pages.admin.youtubeVideoLinkHelp');
        },
      },
      {
        key: 'prerequisiteId',
        get label() {
          return tx('pages.admin.prerequisiteLesson');
        },
        kind: 'select',
        optional: true,
        options: [
          {
            value: '',
            get label() {
              return tx('pages.admin.noPrerequisite');
            },
          },
          ...lessons.filter((l) => l.id !== item?.id).map((l) => ({ value: l.id, label: l.label })),
        ],
      },
      ...(item ? [statusField] : []),
    ];
    values = {
      topicId: parentId,
      ...values,
      prerequisiteId: values.prerequisiteId ?? '',
      youtubeUrl: currentLesson?.youtubeId
        ? `https://www.youtube.com/watch?v=${currentLesson.youtubeId}`
        : '',
    };
  }
  return {
    get title() {
      return tx(item ? 'pages.admin.editEntity' : 'pages.admin.createEntity', {
        entity: names[kind],
      });
    },
    endpoint: `/admin/${kind}`,
    fields,
    id: item?.id,
    values,
    serialize: (input) => {
      const body = { ...input };
      if (kind === 'courses') body.grade = Number(body.grade);
      if (kind === 'lessons' && body.youtubeUrl === '') delete body.youtubeUrl;
      return body;
    },
  };
}

export function gameEditorSpec(kind: 'levels' | 'badges', item?: Level | Badge): EditorSpec {
  const fields: EditorField[] =
    kind === 'levels'
      ? [
          {
            key: 'number',
            get label() {
              return tx('pages.admin.levelNumber');
            },
            kind: 'number',
            min: 1,
            max: 1000,
          },
          titleField,
          {
            key: 'threshold',
            get label() {
              return tx('pages.admin.startingXpThreshold');
            },
            kind: 'number',
            min: 0,
          },
        ]
      : [
          titleField,
          {
            key: 'slug',
            get label() {
              return tx('pages.admin.shortName');
            },
            schema: z.string().regex(slugPattern),
          },
          {
            key: 'description',
            get label() {
              return tx('pages.admin.howToEarnIt');
            },
            kind: 'textarea',
            min: 3,
            max: 500,
          },
          {
            key: 'criterion',
            get label() {
              return tx('pages.admin.criterion');
            },
            kind: 'select',
            options: criterions,
          },
          {
            key: 'threshold',
            get label() {
              return tx('pages.admin.requiredNumberOfResults');
            },
            kind: 'number',
            min: 1,
            max: 100000,
          },
        ];
  return {
    title: kind === 'levels' ? tx('pages.admin.configureLevel') : tx('pages.admin.configureBadge'),
    endpoint: `/admin/${kind}`,
    fields,
    id: item?.id,
    values: entityValues(item),
  };
}

export function classEditorSpec(group: AdminClass | undefined, staff: User[]): EditorSpec {
  return {
    title: group ? tx('pages.admin.classes.editClass') : tx('pages.admin.newClass'),
    endpoint: '/admin/classes',
    id: group?.id,
    values: { ...entityValues(group), grade: String(group?.grade || 6) },
    fields: [
      {
        key: 'name',
        get label() {
          return tx('pages.admin.className');
        },
        min: 2,
        max: 80,
      },
      {
        key: 'grade',
        get label() {
          return tx('pages.admin.gradeLevel');
        },
        kind: 'select',
        options: grades,
      },
      {
        key: 'teacherId',
        get label() {
          return tx('role.TEACHER');
        },
        kind: 'select',
        schema: z.uuid(),
        options: staff
          .filter((u) => (u.role === 'TEACHER' || u.teacherAccess) && u.active)
          .map((u) => ({ value: u.id, label: u.name })),
      },
    ],
    serialize: (values) => ({ ...values, grade: Number(values.grade) }),
  };
}
