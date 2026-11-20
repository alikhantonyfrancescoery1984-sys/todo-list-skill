export interface Note { id: string; path: string; text: string; version: number }
export interface Task { id: string; noteId: string; text: string; line: number; done: boolean; ambiguous: boolean; blockId?: string }
export interface Card { id: string; taskId: string; noteId: string; text: string; column: string; done: boolean; completedAt?: string }
export interface NoteObservation { noteId: string; date: string }
export interface Session { id: string; noteId: string; taskId?: string; start: string; end: string; estimated: boolean; reason: 'switch' | 'idle' | 'blur' | 'pause' | 'interruption' }
export interface Completion { taskId: string; noteId: string; at: string; precision?: 'instant' | 'day' }
export interface Receipt { id: string; noteId: string; taskIds: string[]; at: string }
export interface Operation { id: string; noteId: string; taskIds: string[]; at: string; status: 'pending' | 'success' | 'failed'; error?: string }
export interface State {
  schemaVersion: 2; notes: Note[]; observations: NoteObservation[]; sessions: Session[];
  receipts: Receipt[]; completions: Completion[]; operations: Operation[]; successfulRuns: string[]; taskRegistry: Task[];
}
export interface Config { timezone: 'Asia/Shanghai'; inbox: string; completed: string; fallback: string; cap: number; checklistLimit: number; ignore: string[]; columnMap: Record<string, string>; protectedColumns: string[] }
export interface Result { added: number; skipped: number; message: string }
export const DEFAULT_CONFIG: Config = {
  timezone: 'Asia/Shanghai', inbox: '我做了什么', completed: 'completed', fallback: 'processing', cap: 5, checklistLimit: 10,
  ignore: ['kanban/', '.obsidian/', 'templater/', '.trash/', 'English/review/', 'English/daily output/'],
  columnMap: {'AI learning/': 'AI', 'English/': 'english', '课程/英语/': 'english', 'thai/': 'thai', 'spainish/': 'thai', 'lessons/google lesson assignment/': 'google lesson assignment', 'lessons/research/': 'research', 'lessons/': '课程'},
  protectedColumns: ['research']
};
export const emptyState = (): State => ({ schemaVersion: 2, notes: [], observations: [], sessions: [], receipts: [], completions: [], operations: [], successfulRuns: [], taskRegistry: [] });
export function fingerprint(text: string): string {
  let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}
export const id = (prefix: string): string => `${prefix}-${globalThis.crypto.randomUUID()}`;
