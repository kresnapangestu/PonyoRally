import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export interface TabItem {
  key: string;
  label: string;
  icon: Icon;
  /** Filled variant shown when the tab is active. */
  activeIcon: Icon;
  active: boolean;
  href?: string;
  onClick?: () => void;
}

/**
 * Bottom navigation, as in most mobile apps: icon + label, the active tab
 * highlighted with a filled icon and a soft pill. Works with links (app
 * sections) or buttons (tabs inside a screen).
 */
export function TabBar({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.active ? item.activeIcon : item.icon;
          const className = `group flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors duration-120 ${
            item.active ? "text-primary" : "text-text-muted"
          }`;
          const content = (
            <>
              <span
                className={`grid h-8 w-14 place-items-center rounded-full transition-[background-color,transform] duration-200 ease-standard group-active:scale-90 ${
                  item.active ? "bg-surface-2" : ""
                }`}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              {item.label}
            </>
          );
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} aria-current={item.active ? "page" : undefined} className={className}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} aria-current={item.active ? "page" : undefined} className={className}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
