export type MissionCategory = 'SCAN' | 'VOCABULARY' | 'FLASHCARD' | 'SRS' | 'QUIZ' | 'RETENTION' | 'SHOP';
export type MissionTrigger = 'QUIZ_COMPLETED' | 'LEARNING_ACTIVITY_RECORDED' | 'TOPIC_ITEM_CREATED' | 'SHOP_ITEM_PURCHASED' | 'BOOSTER_USED';
export type MissionEligibility = 'NONE' | 'HAS_IDLE_XP_BOOSTER' | 'HAS_PURCHASABLE_ITEM';
export interface MissionContent {
  name: string;
  description: string;
  category: MissionCategory;
  triggerEvent: MissionTrigger;
  minQuizAccuracyPercent: number | null;
  quizRequestedCount: 5 | 10 | 20 | null;
  targetValue: number;
  rewardCoin: number;
  rewardXp: number;
  rewardItemCode: string | null;
  rewardItemFallbackCoin: number | null;
  weight: number;
  eligibilityRule: MissionEligibility;
}
export interface MissionTemplate extends MissionContent {
  id: number;
  code: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export type CreateMission = MissionContent & { code: string };
export type SaveMission = Partial<MissionContent> & { version: number };
export type ActivateMission = { version: number; isActive: boolean };
export type MissionForm = Omit<CreateMission, 'targetValue' | 'rewardCoin' | 'rewardXp' | 'weight' | 'minQuizAccuracyPercent' | 'quizRequestedCount' | 'rewardItemFallbackCoin'> & {
  targetValue: string; rewardCoin: string; rewardXp: string; weight: string;
  minQuizAccuracyPercent: string; quizRequestedCount: string; rewardItemFallbackCoin: string;
};
