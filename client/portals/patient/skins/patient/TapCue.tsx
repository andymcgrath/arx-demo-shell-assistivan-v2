/**
 * The tap cue for a fake text message. A text message has no OS affordance that says its link can be tapped, so a
 * first-time viewer needs one in the UI. `TapDot` sits next to the link. `TapHint` goes under the bubble.
 */
export function TapDot() {
  return (
    <span className="relative flex h-3 w-3 flex-shrink-0" aria-hidden="true">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
    </span>
  );
}

export function TapHint() {
  return <p className="text-xs text-blue-400 text-center animate-pulse">Tap the link above to continue</p>;
}
