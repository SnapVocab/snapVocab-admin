import { apiClient, uploadBinaryToPresignedUrl } from '../../lib/api-client';
import type { PresignedUploadResponse } from '../shop/types';
import { badgesUseFixtures } from './config';
import type { AdminBadge, BadgeActivePatch, BadgeContentPatch, BadgeRefillEstimate } from './types';

const base = '/api/admin/badges';
/** Loaded only when the flag is on, so a release build never downloads sample data (design.md §11). */
const fixtures = () => import('./fixtures');

export const getAdminBadges = () => (badgesUseFixtures ? fixtures().then((f) => f.fixtureBadges()) : apiClient<AdminBadge[]>(base));
export const getAdminBadge = (id: number) => (badgesUseFixtures ? fixtures().then((f) => f.fixtureBadge(id)) : apiClient<AdminBadge>(`${base}/${id}`));

/** P2 (badges.md §8.4), not built yet: content and on/off are separate requests, each with the version it was read at. */
export const patchAdminBadge = (id: number, body: BadgeContentPatch | BadgeActivePatch) =>
  badgesUseFixtures ? fixtures().then((f) => f.fixturePatchBadge(id, body)) : apiClient<AdminBadge>(`${base}/${id}`, { method: 'PATCH', body });

/** PD-BDG-13d. Path proposed in admin_badges_ui.md §8; badges.md leaves it open ("chốt khi làm"). */
export const getRefillEstimate = (id: number) =>
  badgesUseFixtures ? fixtures().then((f) => f.fixtureRefillEstimate(id)) : apiClient<BadgeRefillEstimate>(`${base}/${id}/refill-estimate`);

/** Presigned PUT to MinIO under public/badges/; the returned objectName is then PATCHed as imageKey. */
export async function uploadBadgeImage(file: File): Promise<{ objectName: string; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file);
  if (badgesUseFixtures) return { objectName: `public/badges/${crypto.randomUUID()}.png`, previewUrl };
  const presigned = await apiClient<PresignedUploadResponse>(`${base}/assets/upload-url`, { method: 'POST', body: { fileName: file.name } });
  await uploadBinaryToPresignedUrl(presigned.uploadUrl, file, file.type || presigned.contentType || 'image/png');
  return { objectName: presigned.objectName, previewUrl };
}
