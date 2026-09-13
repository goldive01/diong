// Accessible progress indicator shared by the goals list and detail views.
// Status is never colour-only: the percentage is always rendered as text
// alongside the bar, and the bar itself carries the standard ARIA progressbar
// role/values for assistive tech.
export function GoalProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% complete`}
        className="h-2 w-full overflow-hidden rounded-full bg-[#e7e2d6]"
      >
        <div
          className="h-full rounded-full bg-[#6f7b4f] transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-1 text-xs font-semibold text-[#5f6962]">{clamped}% complete</p>
    </div>
  );
}
