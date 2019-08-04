export interface Etf2lPlayer {
  id: number;
  name: string;
  country: string;
  classes: string[];
  bans?: Array<{ end: number, reason: string, start: number }>;
}
