import type { AppData } from '../data';
import type { AppState } from '../db';

export interface ScreenProps { data: AppData; state: AppState; update: (next: AppState) => void }
