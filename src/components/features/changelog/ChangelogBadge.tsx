"use client";

interface ChangelogBadgeProps {
  visible: boolean;
}

/**
 * A small green dot rendered on top of the Changelog nav icon when
 * there is an unseen release. Renders null when not visible.
 */
export function ChangelogBadge({ visible }: ChangelogBadgeProps) {
  if (!visible) return null;

  return (
    <span
      className="w-2 h-2 rounded-full bg-green-500 absolute -top-1 -right-1"
      aria-label="Novidade disponível"
      role="status"
    />
  );
}
