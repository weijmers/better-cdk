export type Game = {
  identifier: string;
  date: string;
  dateTime: string;
  countryCode: string;
  division: number;
  homeTeam: Team;
  awayTeam: Team;
  odds?: Odds[];
  lastUpdatedAt: string;
  // DynamoDB specifies TTL in epoch seconds 
  expiresAt?: number;
}

export type Team = {
  identifier: string;
  name: string;
}

export type Odds = {
  identifier: string;
  home: number;
  draw: number;
  away: number;
}