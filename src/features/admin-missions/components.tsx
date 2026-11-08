import React, { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Đang bật' : 'Đang tắt'}</Badge>;
}
export function ErrorBanner({ message, children }: { message: string; children?: ReactNode }) {
  return <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-light p-3 text-xs text-danger-dark"><AlertCircle size={16} className="shrink-0" /><div className="space-y-2"><p>{message}</p>{children}</div></div>;
}
/** Shared form field (components/ui); re-exported for existing Missions call sites. */
export { Field } from '../../components/ui/Field';
