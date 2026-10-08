import type { AvatarOption, Feedback, Question, Status } from './types';
export interface BrainMatch {
  id: string;
  status: 'INVITED' | 'ACTIVE' | 'FINISHED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  hostId: string;
  guestId: string;
  grade: number;
  roundIndex: number;
  total: number;
  winnerId: string | null;
  phase: 'WAITING' | 'COUNTDOWN' | 'ANSWERING' | 'REVEAL';
  question: Question | null;
  ownValue: string | null;
  feedback: Feedback | null;
  roundEndsAt: string | null;
  transitionAt: string | null;
  expiresAt: string;
  serverNow: string;
  players: {
    id: string;
    name: string;
    avatar: AvatarOption | null;
    score: number;
    answered: boolean;
  }[];
}
export interface AnimationVisual {
  kind: string;
  n?: number;
  d?: number;
  step?: number;
  label: string;
}
export interface AnimationChapter {
  title: string;
  text: string;
  visual: AnimationVisual;
}
export interface AnimationDefinition {
  key: string;
  grade: number;
  subject: string;
  title: string;
  chapters: AnimationChapter[];
}
export interface VideoLesson {
  id: string;
  title: string;
  description: string;
  grade: number;
  subject: string;
  kind: 'ANIMATION' | 'YOUTUBE';
  animationKey: string | null;
  youtubeId: string | null;
  status: Status;
  position: number;
  animation: AnimationDefinition | null;
}
export const subjectNames: Record<string, string> = {
  mathematics: 'Matematika',
  english: 'Ingliz tili',
  informatics: 'Informatika',
};
