// External link that refuses anything but plain http(s) — a stored
// javascript: or userinfo URL renders as inert text, never an anchor.
import { safeHttpUrl } from "@/lib/safe-url";

export default function SafeLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const safe = safeHttpUrl(href);
  if (!safe) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={className}
    >
      {children}
    </a>
  );
}
