export type CarePathCategory =
  | 'primary-care'
  | 'urgent-care'
  | 'emergency'
  | 'follow-up'
  | 'information-only';

export type TranscriptMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

export type SummaryCardData = {
  plainSummary: string;
  carePathCategory: CarePathCategory;
  questionsToAsk: string[];
  redFlags: string[];
  disclaimer: string;
};
