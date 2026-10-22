export const safeUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  teacherAccess: true,
  active: true,
  createdAt: true,
  student: { select: { grade: true } },
} as const;
