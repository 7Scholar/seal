import { Switcher, type Option } from "./Switcher";

export interface Crumb {
  key: string;
  label: string;
  onNavigate?: () => void;
  switcher?: {
    label: string;
    searchLabel: string;
    addLabel: string;
    options: Option[];
    current: string | null;
    onChoose: (id: string) => void;
    onAdd: () => void;
  };
}

interface Props {
  crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: Props) {
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

              {crumb.switcher ? (
                <Switcher
                  label={crumb.switcher.label}
                  searchLabel={crumb.switcher.searchLabel}
                  addLabel={crumb.switcher.addLabel}
                  options={crumb.switcher.options}
                  current={crumb.switcher.current}
                  onChoose={crumb.switcher.onChoose}
                  onAdd={crumb.switcher.onAdd}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
