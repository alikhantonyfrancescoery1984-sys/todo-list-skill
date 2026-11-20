import type { State } from '../core/model';
export interface Clock { now(): Date }
export interface StateStore { load(): Promise<State | null>; save(state: State): Promise<void> }
export interface BoardPort { read(): Promise<string>; process(transform: (current: string) => string): Promise<string> }
export interface NotePort { read(id: string): Promise<{ text: string; version: number }>; open(id: string): Promise<void> }
