import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDashboardViewModel, DEFAULT_INFRA_SERVICES } from '../src/domains/dashboard/selectors';
import { MOCK_AI_SCAN_HEALTH } from '../src/domains/ai-scan/mock-data';
import { MOCK_ECONOMY_STATE } from '../src/domains/economy/mock-data';
import { InfraServiceHealth } from '../src/domains/dashboard/types';

test('projectDashboardViewModel - Pure selector returns correct refreshedAt and valid stats', () => {
  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '08:00:00',
    vocabularyList: [],
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: MOCK_ECONOMY_STATE,
  });

  assert.equal(vm.lastUpdated, '08:00:00');
  assert.ok(vm.contentPipeline.totalWords > 0);
  assert.ok(vm.contentPipeline.byCefr.length > 0);

  // Check no NaN in CEFR calculations
  for (const cefr of vm.contentPipeline.byCefr) {
    assert.ok(!isNaN(cefr.count));
  }
});

test('projectDashboardViewModel - Generates Critical P1 Action when urgentReportCount > 0', () => {
  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '09:00:00',
    aiHealth: { ...MOCK_AI_SCAN_HEALTH, urgentReportCount: 5 },
    economyState: MOCK_ECONOMY_STATE,
  });

  const p1Item = vm.actionItems.find((item) => item.id === 'act-p1-scan');
  assert.ok(p1Item, 'Should find act-p1-scan in actionItems');
  assert.equal(p1Item.priority, 'P1');
  assert.equal(p1Item.severity, 'critical');
  assert.equal(p1Item.count, 5);
  assert.equal(p1Item.targetNav, 'reports');
  assert.equal(p1Item.slaState, 'breached');
});

test('projectDashboardViewModel - No Guardrail action when violationsDetected === 0 and healthy', () => {
  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '09:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: { ...MOCK_ECONOMY_STATE, guardrails: { ...MOCK_ECONOMY_STATE.guardrails, status: 'healthy', violationsDetected: 0 } },
  });

  const guardrailItem = vm.actionItems.find((item) => item.id === 'act-guardrail-alert');
  assert.equal(guardrailItem, undefined, 'Should not generate guardrail action when healthy with 0 violations');
});

test('projectDashboardViewModel - Generates Guardrail action when violationsDetected > 0', () => {
  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '09:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: { ...MOCK_ECONOMY_STATE, guardrails: { ...MOCK_ECONOMY_STATE.guardrails, status: 'warning', violationsDetected: 2 } },
  });

  const guardrailItem = vm.actionItems.find((item) => item.id === 'act-guardrail-alert');
  assert.ok(guardrailItem, 'Should generate guardrail alert');
  assert.equal(guardrailItem.count, 2);
  assert.equal(guardrailItem.severity, 'warning');
  assert.equal(guardrailItem.targetNav, 'shop');
});

test('projectDashboardViewModel - Infrastructure Health calculation: healthy vs degraded vs outage', () => {
  // Case 1: All online
  const allOnlineServices: InfraServiceHealth[] = [
    { name: 'S1', status: 'online', latencyMs: 10, detail: 'OK' },
    { name: 'S2', status: 'online', latencyMs: 20, detail: 'OK' },
  ];
  const vmHealthy = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '10:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: MOCK_ECONOMY_STATE,
    infraServices: allOnlineServices,
  });
  assert.equal(vmHealthy.infraHealthSummary.overallStatus, 'healthy');
  assert.equal(vmHealthy.infraHealthSummary.onlineCount, 2);
  assert.equal(vmHealthy.infraHealthSummary.offlineCount, 0);

  // Case 2: One degraded, no offline -> degraded
  const degradedServices: InfraServiceHealth[] = [
    { name: 'S1', status: 'online', latencyMs: 10, detail: 'OK' },
    { name: 'S2', status: 'degraded', latencyMs: 500, detail: 'Slow' },
  ];
  const vmDegraded = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '10:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: MOCK_ECONOMY_STATE,
    infraServices: degradedServices,
  });
  assert.equal(vmDegraded.infraHealthSummary.overallStatus, 'degraded');
  assert.equal(vmDegraded.infraHealthSummary.degradedCount, 1);

  // Case 3: One offline -> outage
  const outageServices: InfraServiceHealth[] = [
    { name: 'S1', status: 'online', latencyMs: 10, detail: 'OK' },
    { name: 'S2', status: 'offline', latencyMs: 0, detail: 'Down' },
  ];
  const vmOutage = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '10:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: MOCK_ECONOMY_STATE,
    infraServices: outageServices,
  });
  assert.equal(vmOutage.infraHealthSummary.overallStatus, 'outage');
  assert.equal(vmOutage.infraHealthSummary.offlineCount, 1);
});

test('projectDashboardViewModel - Action items sorting: Critical comes first', () => {
  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '11:00:00',
    aiHealth: { ...MOCK_AI_SCAN_HEALTH, urgentReportCount: 2, pendingQueueCount: 15 },
    economyState: MOCK_ECONOMY_STATE,
  });

  assert.ok(vm.actionItems.length >= 2);
  // First item must be critical (P1)
  assert.equal(vm.actionItems[0].severity, 'critical');
  assert.equal(vm.actionItems[0].priority, 'P1');
  // Second item should be warning or info
  assert.notEqual(vm.actionItems[1].severity, 'critical');
});

test('projectDashboardViewModel - Coins-only LiveOps projection without Gems', () => {
  const customEconomy = {
    coins: { faucet: 1200000, sink: 800000 },
    streakMetrics: { avgStreakDays: 14.2, streaksOver7Days: 8420, streaksOver30Days: 1920, pendingRecoveryRequests: 12 },
    guardrails: { status: 'healthy' as const, violationsDetected: 0 },
  };

  const vm = projectDashboardViewModel({
    timeRange: '7d',
    refreshedAt: '12:00:00',
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: customEconomy as any,
  });

  assert.ok(vm.liveops.coins);
  assert.equal(vm.liveops.coins.faucet, 1200000);
  assert.equal(vm.liveops.coins.sink, 800000);
  assert.equal(vm.liveops.coins.netCirculation, 400000);
  assert.equal(vm.liveops.coins.faucetSinkRatio, 1.5);
  assert.equal(vm.liveops.coins.absorptionRate, 66.7);

  // Assert Gems is completely absent from liveops projection
  assert.equal((vm.liveops as any).gems, undefined);

  // Assert Metric Ribbon does not mention Gems
  const economyCard = vm.metrics.find((c: any) => c.id === 'metric-economy');
  assert.ok(economyCard);
  assert.ok(!economyCard.subValue?.includes('Gems'), 'Metric Ribbon should not mention Gems');
  assert.ok(economyCard.subValue?.includes('Lưu thông ròng'), 'Metric Ribbon should show Net Coins Circulation');
});

