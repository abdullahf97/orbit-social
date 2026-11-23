import { avatarGradient, cn, initials } from "@/lib/utils";

type AvatarUser = {
  username: string;
  name: string;
  avatarUrl: string | null;
};

export function Avatar({
  user,
  size = 40,
  className,
  ring = false,
}: {
  user: AvatarUser;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const style = { width: size, height: size };

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-2",
        ring && "ring-2 ring-bg outline outline-1 outline-accent/50",
        className,
      )}
      style={style}
    >
      {user.avatarUrl ? (
        // Uploaded images are already resized server-side; a plain <img> keeps
        // blob URLs simple and lets the service worker cache them.
        <img
          src={user.avatarUrl}
          alt={`${user.name}'s avatar`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-medium text-white"
          style={{
            backgroundImage: avatarGradient(user.username),
            fontSize: Math.max(10, size * 0.34),
          }}
        >
          {initials(user.name)}
        </span>
      )}
    </span>
  );
}
