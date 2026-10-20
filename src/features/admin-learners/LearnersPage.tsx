import React from 'react';
import { LearnerDirectory } from './LearnerDirectory';
import { LearnerProfile } from './LearnerProfile';

/** `sub` is the route segment after /learners: undefined = directory, numeric id = profile. */
export function LearnersPage({ sub }: { sub?: string }) {
  const id = sub && /^\d+$/.test(sub) ? Number(sub) : null;
  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      {id !== null && <LearnerProfile key={id} id={id} />}
      {/* Stays mounted behind the profile so search, filters and page survive the round trip. */}
      <div hidden={id !== null}><LearnerDirectory /></div>
    </div>
  );
}
