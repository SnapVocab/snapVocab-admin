import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMissionRibbonMetrics,
  calculateWorstCaseDailyOutput,
  validateMissionActivation,
  filterMissions,
} from '../src/domains/missions/selectors';
import {
  INITIAL_MISSIONS,
  INITIAL_MISSION_VIOLATIONS,
  DEFAULT_MISSION_GUARDRAILS,
} from '../src/domains/missions/mock-data';
import { BACKEND_CAPABILITY_REGISTRY } from '../src/domains/missions/capabilities';
import { Mission } from '../src/domains/missions/types';

test('computeMissionRibbonMetrics - Correctly calculates 5 slot coverage and weekly milestones count', () => {
  const metrics = computeMissionRibbonMetrics(INITIAL_MISSIONS, INITIAL_MISSION_VIOLATIONS);

  assert.equal(metrics.weeklyMilestonesCount, 3, 'Should have 3 weekly milestones (Bronze, Silver, Gold)');
  assert.equal(metrics.slotCoverageCount, 5, 'All 5 mandatory slots must be covered by active missions in mock data');
  assert.ok(metrics.activeDailyPoolCount >= 5, 'Should have at least 5 active daily missions');
});

test('calculateWorstCaseDailyOutput - Sums max coins for all 5 slots + bonus + daily chest', () => {
  const result = calculateWorstCaseDailyOutput(INITIAL_MISSIONS, 150, 2500);

  // Check that all 5 slots have a maxCoins value
  assert.ok(result.slotBreakdown.SCAN_CAPTURE.maxCoins > 0);
  assert.ok(result.slotBreakdown.VOCAB_BUILDING.maxCoins > 0);
  assert.ok(result.slotBreakdown.FLASHCARD_SRS.maxCoins > 0);
  assert.ok(result.slotBreakdown.QUIZ_ACCURACY.maxCoins > 0);
  assert.ok(result.slotBreakdown.RETENTION_GAMIFICATION.maxCoins > 0);

  // Total worst case = mandatory + bonus + chest
  assert.equal(
    result.totalWorstCaseCoins,
    result.mandatoryCoinsMax + result.bonusCoinsMax + result.chestCoins
  );
  assert.equal(result.isExceeded, false, 'Default mock data should not exceed 2500 coin limit');
});

test('calculateWorstCaseDailyOutput - Detects cap breach when rewards are excessively high', () => {
  const tightCap = 200; // Very low cap
  const result = calculateWorstCaseDailyOutput(INITIAL_MISSIONS, 150, tightCap);

  assert.equal(result.isExceeded, true, 'Should detect cap breach when total > tightCap');
});

test('validateMissionActivation - Validates capability and schema before activation', () => {
  const draftMission: Mission = { ...INITIAL_MISSIONS[0], status: 'draft' };
  const validation = validateMissionActivation(
    draftMission,
    INITIAL_MISSIONS,
    DEFAULT_MISSION_GUARDRAILS
  );

  assert.equal(validation.canActivate, true, 'Standard draft mission should pass activation validation');
  assert.equal(validation.errors.length, 0);
});

test('validateMissionActivation - Rejects incompatible triggerEvent and action', () => {
  const invalidMission: Mission = {
    ...INITIAL_MISSIONS[0],
    actionType: 'SCAN_OBJECT',
    triggerEvent: 'QUIZ_COMPLETED' as any, // Incompatible
  };

  const validation = validateMissionActivation(
    invalidMission,
    INITIAL_MISSIONS,
    DEFAULT_MISSION_GUARDRAILS
  );

  assert.equal(validation.canActivate, false, 'Should reject incompatible trigger event');
  assert.ok(validation.errors.some((err) => err.includes('không tương thích')));
});

test('filterMissions - Correctly filters by Slot Category and Bonus', () => {
  const scanMissions = filterMissions(INITIAL_MISSIONS, {
    searchQuery: '',
    type: 'ALL',
    category: 'SCAN_CAPTURE',
    actionType: 'ALL',
    status: 'ALL',
    difficulty: 'ALL',
    targetAudience: 'ALL',
    sortBy: 'newest',
  });

  assert.ok(scanMissions.length > 0);
  for (const m of scanMissions) {
    assert.equal(m.category, 'SCAN_CAPTURE');
    assert.equal(Boolean(m.isBonus), false);
  }

  const bonusMissions = filterMissions(INITIAL_MISSIONS, {
    searchQuery: '',
    type: 'ALL',
    category: 'BONUS',
    actionType: 'ALL',
    status: 'ALL',
    difficulty: 'ALL',
    targetAudience: 'ALL',
    sortBy: 'newest',
  });

  assert.ok(bonusMissions.length > 0);
  for (const m of bonusMissions) {
    assert.equal(m.isBonus, true);
  }
});
