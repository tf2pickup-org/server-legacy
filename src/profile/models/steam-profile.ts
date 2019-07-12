export interface SteamProfile {
  // identifier: string;
  provider: 'steam';
  id: string;
  displayName: string;
  photos: Array<{ value: string; }>;
}
