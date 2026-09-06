import { useEffect, useRef, useState } from "react";
import type { RepoView } from "../ipc";
import { groupByDirectory } from "../managedTree";
import { conditionOf, brokenFirst, repoCondition } from "../state";
import { Icon } from "./Icon";
import { useDisclosure } from "./useDisclosure";

interface Props {
  repos: RepoView[];
  currentRoot: string | null;
  currentPath: string | null;
  onOpenRepository: (root: string) => void;
  onOpenFile: (repo: RepoView, relativePath: string) => void;
  onAdd: () => void;
}

function items(scope: HTMLElement | null): HTMLElement[] {
  if (!scope) return [];
  return [
    ...scope.querySelectorAll<HTMLElement>(
      ":scope > [data-jump], :scope > * > [data-jump]",
    ),
  ];
}

function basename(relativePath: string): string {
  const cut = relativePath.lastIndexOf("/");
  return cut === -1 ? relativePath : relativePath.slice(cut + 1);
}

function activates(event: React.KeyboardEvent): boolean {
  if (event.key !== "Enter" && event.key !== " ") return false;
  event.preventDefault();
  (event.target as HTMLElement).click();
  return true;
}

function step(list: HTMLElement[], from: EventTarget | null, by: number) {
  if (list.length === 0) return;
  const at = list.indexOf(from as HTMLElement);
  const next = at === -1 ? 0 : (at + by + list.length) % list.length;
  list[next]?.focus();
}

interface FilesProps {
  repo: RepoView;
  enter: boolean;
  currentPath: string | null;
  onOpenFile: (repo: RepoView, relativePath: string) => void;
  onLeave: () => void;
}

function Files({ repo, enter, currentPath, onOpenFile, onLeave }: FilesProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const panel = useRef<HTMLDivElement>(null);
  const groups = groupByDirectory(repo.files);

  useEffect(() => {
    if (enter) items(panel.current)[0]?.focus();
  }, [enter]);

  function fold(directory: string) {
    setCollapsed((was) => {
      const next = new Set(was);
      if (next.has(directory)) next.delete(directory);
      else next.add(directory);
      return next;
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (activates(event)) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(items(panel.current), event.target, 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      step(items(panel.current), event.target, -1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onLeave();
    }
  }

  return (
    <div
      ref={panel}
      className="jump__panel jump__panel--files"
      role="menu"
      aria-label={`Files in ${repo.name}`}
      onKeyDown={onKeyDown}
    >
      {repo.files.length === 0 ? (
        <p className="jump__empty">No files under Seal yet.</p>
      ) : (
        groups.map((group) => {
          const open = !collapsed.has(group.directory);
          return (
            <div key={group.directory || "."} className="jump__group">
              {group.directory === "" ? null : (
                <button
                  type="button"
                  role="menuitem"
                  data-jump="folder"
                  className="jump__folder"
                  aria-expanded={open}
                  onClick={() => fold(group.directory)}
                >
                  <span className="jump__bar" />
                  <Icon name={open ? "chevron-down" : "chevron-right"} />
                  <span className="jump__folder-name">
                    {group.directory.split("/").join(" / ")}
                  </span>
                </button>
              )}

              {open
                ? group.files.map((file) => (
                    <button
                      key={file.relativePath}
                      type="button"
                      role="menuitem"
                      data-jump="file"
                      className="jump__file"
                      data-condition={conditionOf(file)}
                      data-indented={group.directory !== ""}
                      aria-current={
                        file.relativePath === currentPath ? "page" : undefined
                      }
                      onClick={() => onOpenFile(repo, file.relativePath)}
                    >
                      <span className="jump__bar" />
                      <span className="jump__file-name">{basename(file.relativePath)}</span>
                    </button>
                  ))
                : null}
            </div>
          );
        })
      )}
    </div>
  );
}

export function JumpMenu({
  repos,
  currentRoot,
  currentPath,
  onOpenRepository,
  onOpenFile,
  onAdd,
}: Props) {
  const { open, setOpen, wrapper, trigger } = useDisclosure();
  const [openRoot, setOpenRoot] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const ordered = brokenFirst(repos);
  const opened = ordered.find((repo) => repo.root === openRoot) ?? null;

  useEffect(() => {
    if (!open) {
      setOpenRoot(null);
      setEntered(false);
      return;
    }
    items(panel.current)[0]?.focus();
  }, [open]);

  function leave(root: string) {
    setOpenRoot(null);
    setEntered(false);
    const row = items(panel.current).find(
      (item) => item.dataset.root === root,
    );
    row?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, root: string | null) {
    if (activates(event)) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpenRoot(null);
      setEntered(false);
      step(items(panel.current), event.target, event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "ArrowRight" && root) {
      event.preventDefault();
      setOpenRoot(root);
      setEntered(true);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setOpenRoot(null);
      setEntered(false);
    }
  }

  return (
    <span className="jump" ref={wrapper}>
      <button
        type="button"
        ref={trigger}
        className="jump__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Jump to a repository or file"
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="chevron-up-down" />
      </button>

      {open ? (
        <span className="jump__panels">
          <div
            ref={panel}
            className="jump__panel jump__panel--repos"
            role="menu"
            aria-label="Jump to a repository or file"
          >
            {repos.length === 0 ? (
              <p className="jump__empty">No repositories yet.</p>
            ) : (
              ordered.map((repo) => (
                <button
                  key={repo.root}
                  type="button"
                  role="menuitem"
                  data-jump="repo"
                  data-root={repo.root}
                  className="jump__repo"
                  data-condition={repoCondition(repo.files)}
                  aria-haspopup="menu"
                  aria-expanded={openRoot === repo.root}
                  aria-current={repo.root === currentRoot ? "page" : undefined}
                  onMouseEnter={() => {
                    setOpenRoot(repo.root);
                    setEntered(false);
                  }}
                  onClick={() => {
                    setOpen(false);
                    onOpenRepository(repo.root);
                  }}
                  onKeyDown={(event) => onKeyDown(event, repo.root)}
                >
                  <span className="jump__bar" />
                  <span className="jump__repo-name">{repo.name}</span>
                  <Icon name="chevron-right" className="jump__more" />
                </button>
              ))
            )}

            <button
              type="button"
              role="menuitem"
              data-jump="add"
              className="jump__add"
              onKeyDown={(event) => onKeyDown(event, null)}
              onClick={() => {
                setOpen(false);
                onAdd();
              }}
            >
              <Icon name="plus" />
              Add repository
            </button>
          </div>

          {opened ? (
            <Files
              key={opened.root}
              repo={opened}
              enter={entered}
              currentPath={opened.root === currentRoot ? currentPath : null}
              onOpenFile={(from, relativePath) => {
                setOpen(false);
                onOpenFile(from, relativePath);
              }}
              onLeave={() => leave(opened.root)}
            />
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
