import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useDisclosure } from "./useDisclosure";

export interface Option {
  id: string;
  name: string;
  detail?: string;
}

interface Props {
  label: string;
  options: Option[];
  current: string | null;
  searchLabel: string;
  addLabel: string;
  emptyNote?: string;
  onChoose: (id: string) => void;
  onAdd: () => void;
}

export function Switcher({
  label,
  options,
  current,
  searchLabel,
  addLabel,
  emptyNote,
  onChoose,
  onAdd,
}: Props) {
  const { open, setOpen, wrapper, trigger } = useDisclosure();
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const listId = useId();

  const matches = options.filter((option) =>
    `${option.name} ${option.detail ?? ""}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    setFilter("");
    setActive(0);
    (field.current ?? add.current)?.focus();
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [filter]);

  function choose(id: string) {
    setOpen(false);
    onChoose(id);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((was) => (matches.length === 0 ? 0 : (was + 1) % matches.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((was) =>
        matches.length === 0 ? 0 : (was - 1 + matches.length) % matches.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = matches[active];
      if (option) choose(option.id);
    }
  }

  const activeId = matches[active] ? `${listId}-${matches[active].id}` : undefined;

  return (
    <span className="switcher" ref={wrapper}>
      <button
        type="button"
        ref={trigger}
        className="switcher__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="chevron-up-down" />
      </button>

      {open ? (
        <span id={popoverId} className="switcher__popover" onKeyDown={onKeyDown}>
          {options.length > 0 ? (
            <span className="switcher__search">
              <Icon name="search" className="switcher__search-icon" />
              <input
                ref={field}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-label={searchLabel}
                placeholder={searchLabel}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </span>
          ) : null}

          {options.length === 0 ? (
            <span className="switcher__empty">{emptyNote ?? "Nothing yet."}</span>
          ) : matches.length === 0 ? (
            <span className="switcher__empty">Nothing matches.</span>
          ) : (
            <ul id={listId} role="listbox" aria-label={label} className="switcher__list">
              {matches.map((option, index) => (
                <li
                  key={option.id}
                  id={`${listId}-${option.id}`}
                  role="option"
                  aria-selected={option.id === current}
                  data-active={index === active}
                  className="switcher__option"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option.id)}
                >
                  <span className="switcher__option-name">{option.name}</span>
                  {option.id === current ? (
                    <Icon name="check" className="switcher__tick" />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            ref={add}
            className="switcher__add"
            onClick={() => {
              setOpen(false);
              onAdd();
            }}
          >
            <Icon name="plus" />
            {addLabel}
          </button>
        </span>
      ) : null}
    </span>
  );
}
