import type { ReactNode } from "react";

export interface Crumb {
  key: string;
  label: string;
  onNavigate?: () => void;
}

interface Props {
  crumbs: Crumb[];
  jump?: ReactNode;
}

export function Breadcrumbs({ crumbs, jump }: Props) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <li key={crumb.key} className="crumbs__item">
              {index > 0 ? (
                <span className="crumbs__sep" aria-hidden="true">
                  /
                </span>
              ) : null}

              {isCurrent ? (
                <span className="crumbs__current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  className="crumbs__link"
                  onClick={crumb.onNavigate}
                >
                  {crumb.label}
                </button>
              )}

              {isCurrent ? jump : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
