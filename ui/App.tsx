import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as ipc from "./ipc";
import { explain, reason } from "./errors";
import { Acknowledge } from "./screens/Acknowledge";
import { EnvEditor } from "./screens/EnvEditor";
import { FileOpening, FileFailed } from "./screens/FileStates";
import { ManageFlow } from "./screens/ManageFlow";
import { RepoDetail, filePath } from "./screens/RepoDetail";
import { Repositories, type Load } from "./screens/Repositories";
import { Unlock } from "./screens/Unlock";
import { PasswordChange } from "./screens/PasswordChange";
import { Breadcrumbs, type Crumb } from "./components/Breadcrumbs";
import { Confirm } from "./components/Confirm";
import { Problem } from "./components/Problem";
import { Overflow } from "./components/Overflow";
import { ThemeControl } from "./components/ThemeControl";
import { fileName } from "./format";
import * as theme from "./theme";

const REOBSERVE_INTERVAL_MS = 5000;

type Overlay =
  | { name: "none" }
  | { name: "manage"; root: string; scan: ipc.ScanView | null; failure: string | null }
  | { name: "rekey" };

type Route =
  | { at: "repositories" }
  | { at: "repository"; root: string }
  | { at: "file"; root: string; path: string };

type Opened =
  | { kind: "opening" }
  | { kind: "failed"; why: string }
  | { kind: "env"; file: ipc.EnvView }
  | { kind: "opaque"; path: string; bytes: number };

export function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [established, setEstablished] = useState<boolean | null>(null);
  const [lockNote, setLockNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [repos, setRepos] = useState<ipc.RepoView[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [route, setRoute] = useState<Route>({ at: "repositories" });
  const [opened, setOpened] = useState<Opened | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ name: "none" });
  const [acknowledging, setAcknowledging] = useState<null | (() => void)>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [releasingRepo, setReleasingRepo] = useState<ipc.RepoView | null>(null);
  const [sealing, setSealing] = useState<null | {
    paths: string[];
    recent: { path: string; secondsAgo: number }[];
  }>(null);
  const [outcomes, setOutcomes] = useState<ipc.SealOutcome[] | null>(null);
  const [rekey, setRekey] = useState<ipc.Manifest | null>(null);
  const [mode, setMode] = useState<theme.Mode>("system");
  const [expired, setExpired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = await ipc.overview();
      setRepos(fresh);
      setLoad("ready");
      return fresh;
    } catch (error) {
      setLoad("failed");
      throw error;
    }
  }, []);

  useEffect(() => {
    ipc
      .isUnlocked()
      .then(setUnlocked)
      .catch(() => setUnlocked(false));
    ipc
      .isEstablished()
      .then(setEstablished)
      .catch(() => setEstablished(true));
    void theme.load().then(setMode);
  }, []);

  useEffect(() => {
    theme.apply(theme.resolve(mode));
    if (mode !== "system") return;
    return theme.watchSystem(() => theme.apply(theme.systemTheme()));
  }, [mode]);

  useEffect(() => {
    if (!unlocked) return;
    setLoad("loading");
    refresh().catch(() => undefined);
    ipc.rekeyStatus().then(setRekey).catch(() => setRekey(null));
  }, [unlocked, refresh]);

  function chooseTheme(next: theme.Mode) {
    setMode(next);
    void theme.store(next);
  }

  function relock() {
    setLockNote(
      "Seal locked itself while you were away. Everything stayed sealed — unlock to continue.",
    );
    setUnlocked(false);
    setRoute({ at: "repositories" });
    setOpened(null);
    setOverlay({ name: "none" });
    setAcknowledging(null);
    setReleasing(null);
    setReleasingRepo(null);
    setSealing(null);
    setOutcomes(null);
  }

  function fail(doing: string, error: unknown) {
    if (ipc.isCommandError(error) && error.kind === "locked") {
      relock();
      return;
    }
    setProblem(explain(doing, error));
  }

  async function attempt(doing: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      fail(doing, error);
    }
  }

  async function withAcknowledgement(doing: string, action: () => Promise<void>) {
    if (await ipc.hasAcknowledged()) {
      await action();
      return;
    }
    setAcknowledging(() => () =>
      attempt(doing, async () => {
        await ipc.acknowledge();
        setAcknowledging(null);
        await action();
      }),
    );
  }

  const currentRepo =
    route.at === "repositories"
      ? null
      : (repos.find((repo) => repo.root === route.root) ?? null);

  function reconcile(fresh: ipc.RepoView[]) {
    if (route.at === "repositories") return;
    const repo = fresh.find((entry) => entry.root === route.root);
    if (!repo) {
      setRoute({ at: "repositories" });
      setOpened(null);
      return;
    }
    if (route.at !== "file") return;
    const stillThere = repo.files.some(
      (file) => filePath(repo, file.relativePath) === route.path,
    );
    if (!stillThere) {
      setRoute({ at: "repository", root: repo.root });
      setOpened(null);
    }
  }

  const reconcileRef = useRef(reconcile);
  reconcileRef.current = reconcile;

  const routeRef = useRef(route);
  routeRef.current = route;

  async function refreshAndReconcile() {
    reconcile(await refresh());
  }


  const reobserve = useCallback(async (openPath: string | null) => {
    try {
      const seen = await ipc.reobserve(openPath);
      setRepos((current) =>
        JSON.stringify(current) === JSON.stringify(seen.repos) ? current : seen.repos,
      );
      setLoad("ready");
      if (openPath && !seen.stillHeld) setExpired(true);
      return seen.repos;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    let running = false;
    const look = () => {
      if (running) return;
      running = true;
      void reobserve(routeRef.current.at === "file" ? routeRef.current.path : null)
        .then((fresh) => {
          if (fresh) reconcileRef.current(fresh);
        })
        .finally(() => {
          running = false;
        });
    };

    window.addEventListener("focus", look);
    document.addEventListener("visibilitychange", look);
    const timer = window.setInterval(look, REOBSERVE_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", look);
      document.removeEventListener("visibilitychange", look);
      window.clearInterval(timer);
    };
  }, [unlocked, reobserve]);

  async function closeOpenFile() {
    if (route.at !== "file") return;
    const path = route.path;
    setOpened(null);
    await attempt(`close ${fileName(path)}`, () => ipc.closeFile(path));
  }

  async function goToRepositories() {
    await closeOpenFile();
    setRoute({ at: "repositories" });
    setOutcomes(null);
  }

  async function goToRepository(root: string) {
    await closeOpenFile();
    setRoute({ at: "repository", root });
    setOutcomes(null);
  }

  async function goToFile(root: string, path: string) {
    await closeOpenFile();
    setRoute({ at: "file", root, path });
    setOutcomes(null);
    setExpired(false);
    setOpened({ kind: "opening" });
    try {
      const file = await ipc.openFile(path);
      setOpened(
        file.kind === "env"
          ? { kind: "env", file }
          : { kind: "opaque", path: file.path, bytes: file.bytes },
      );
    } catch (error) {
      if (ipc.isCommandError(error) && error.kind === "locked") {
        relock();
        return;
      }
      setOpened({
        kind: "failed",
        why: ipc.isCommandError(error)
          ? reason(error.kind)
          : "Something unexpected went wrong — nothing was changed.",
      });
    }
  }

  async function sealNow(path: string) {
    await withAcknowledgement(`seal ${fileName(path)}`, async () => {
      await ipc.sealFile(path);
      await refreshAndReconcile();
    });
  }

  async function seal(path: string) {
    await attempt(`seal ${fileName(path)}`, async () => {
      const warning = await ipc.sealWarning(path);
      if (warning) {
        setSealing({
          paths: [path],
          recent: [{ path, secondsAgo: warning.modifiedSecondsAgo }],
        });
        return;
      }
      await sealNow(path);
    });
  }

  async function sealManyNow(paths: string[]) {
    await withAcknowledgement(`seal ${paths.length} files`, async () => {
      setOutcomes(await ipc.sealFiles(paths));
      await refreshAndReconcile();
    });
  }

  async function sealMany(paths: string[]) {
    if (paths.length === 0) return;
    await attempt(`seal ${paths.length} files`, async () => {
      const warnings = (
        await Promise.all(
          paths.map(async (path) => {
            const warning = await ipc.sealWarning(path);
            return warning ? { path, secondsAgo: warning.modifiedSecondsAgo } : null;
          }),
        )
      ).filter((entry) => entry !== null);

      if (warnings.length > 0) {
        setSealing({ paths, recent: warnings });
        return;
      }
      await sealManyNow(paths);
    });
  }

  async function scanInto(root: string) {
    setOverlay({ name: "manage", root, scan: null, failure: null });
    try {
      const scan = await ipc.scanFolder(root);
      setOverlay({ name: "manage", root, scan, failure: null });
    } catch (error) {
      if (ipc.isCommandError(error) && error.kind === "locked") {
        setOverlay({ name: "none" });
        relock();
        return;
      }
      setOverlay({
        name: "manage",
        root,
        scan: null,
        failure: explain("scan the repository", error),
      });
    }
  }

  async function startAdd() {
    await attempt("open the folder picker", async () => {
      const root = await ipc.pickFolder();
      if (!root) return;
      await scanInto(root);
    });
  }

  async function startRescan(root: string) {
    await scanInto(root);
  }

  if (!unlocked && established === null) return <Frame />;

  if (!unlocked) {
    return (
      <Frame>
        <Unlock
          mode={established ? "verify" : "create"}
          notice={lockNote ?? undefined}
          onSubmit={async (passphrase) => {
            if (established) {
              await ipc.unlock(passphrase);
            } else {
              await ipc.establish(passphrase);
              setEstablished(true);
            }
            setLockNote(null);
            setUnlocked(true);
          }}
        />
      </Frame>
    );
  }

  if (overlay.name === "manage") {
    return (
      <Frame>
        <ManageFlow
          root={overlay.root}
          scan={overlay.scan}
          failure={overlay.failure}
          onRetry={() => void scanInto(overlay.root)}
          onCancel={() => setOverlay({ name: "none" })}
          onConfirm={(selected) =>
            attempt("add the folder", async () => {
              const root = overlay.root;
              await ipc.manageFiles(root, selected);
              const fresh = await refresh();
              setOverlay({ name: "none" });
              if (fresh.some((repo) => repo.root === root)) {
                setRoute({ at: "repository", root });
              }
            })
          }
        />
      </Frame>
    );
  }

  if (overlay.name === "rekey") {
    return (
      <Frame>
        <PasswordChange
          manifest={rekey}
          onBegin={async () => {
            setRekey(await ipc.rekeyBegin());
          }}
          onRun={async (current, replacement) => {
            const outcome = await ipc.rekeyRun(current, replacement);
            const done = outcome.entries.every((e) => e.standing === "converted");
            setRekey(done ? null : outcome);
            if (done) setOverlay({ name: "none" });
          }}
          onAbandon={() =>
            attempt("forget the password change", async () => {
              await ipc.rekeyAbandon();
              setRekey(null);
            })
          }
          onClose={() => setOverlay({ name: "none" })}
        />
      </Frame>
    );
  }

  const exposedRepos = repos.filter((repo) => repo.files.some((file) => file.alert));

  const crumbs: Crumb[] = [
    {
      key: "repositories",
      label: "Repositories",
      onNavigate: () => void goToRepositories(),
      switcher: {
        label: "Open a repository",
        searchLabel: "Find repository...",
        addLabel: "Add repository",
        emptyNote: "No repositories yet.",
        current: null,
        options: repos.map((repo) => ({
          id: repo.root,
          name: repo.name,
          detail: repo.root,
        })),
        onChoose: (root) => void goToRepository(root),
        onAdd: () => void startAdd(),
      },
    },
  ];

  if (currentRepo) {
    crumbs.push({
      key: currentRepo.root,
      label: currentRepo.name,
      onNavigate: () => void goToRepository(currentRepo.root),
      switcher: {
        label: "Switch repository",
        searchLabel: "Find repository...",
        addLabel: "Add repository",
        current: currentRepo.root,
        options: repos.map((repo) => ({
          id: repo.root,
          name: repo.name,
          detail: repo.root,
        })),
        onChoose: (root) => void goToRepository(root),
        onAdd: () => void startAdd(),
      },
    });
  }

  if (route.at === "file" && currentRepo) {
    crumbs.push({
      key: route.path,
      label: fileName(route.path),
      switcher: {
        label: "Switch file",
        searchLabel: "Find file...",
        addLabel: "Add file",
        current: route.path,
        options: currentRepo.files.map((file) => ({
          id: filePath(currentRepo, file.relativePath),
          name: file.relativePath,
        })),
        onChoose: (path) => void goToFile(currentRepo.root, path),
        onAdd: () => void startRescan(currentRepo.root),
      },
    });
  }

  const onlyRecent =
    sealing && sealing.recent.length === 1 ? sealing.recent[0] : null;

  const openedRelativePath =
    route.at === "file" && currentRepo
      ? route.path.slice(currentRepo.root.length + 1)
      : "";
  const openedState =
    route.at === "file" && currentRepo
      ? (currentRepo.files.find(
          (file) => filePath(currentRepo, file.relativePath) === route.path,
        )?.state ?? "unknown")
      : "unknown";

  return (
    <Frame
      trail={<Breadcrumbs crumbs={crumbs} />}
      controls={
        <>
          {exposedRepos.length > 0 && exposedRepos[0] ? (
            <button
              type="button"
              className="exposure-pill"
              onClick={() => void goToRepository(exposedRepos[0]!.root)}
            >
              {exposedRepos.length === 1
                ? "1 repository has a readable secret"
                : `${exposedRepos.length} repositories have readable secrets`}
            </button>
          ) : null}

          <ThemeControl mode={mode} onChoose={chooseTheme} />

          <button
            type="button"
            className="shell__lock"
            onClick={() =>
              attempt("lock Seal", async () => {
                await ipc.lock();
                setUnlocked(false);
                setRoute({ at: "repositories" });
                setOpened(null);
              })
            }
          >
            Lock
          </button>

          <Overflow label="Seal settings">
            <button type="button" onClick={() => setOverlay({ name: "rekey" })}>
              Change master password
            </button>
          </Overflow>
        </>
      }
    >
        {rekey !== null ? (
          <div className="shell__rekey" role="alert">
            <span>
              A password change was not finished. Some files are on the old
              password and some on the new — keep both until it completes.
            </span>
            <button type="button" onClick={() => setOverlay({ name: "rekey" })}>
              Finish it
            </button>
          </div>
        ) : null}

        {problem ? (
          <Problem message={problem} onDismiss={() => setProblem(null)} />
        ) : null}

        {route.at === "repositories" ? (
          <Repositories
            repos={repos}
            load={load}
            onRetry={() => {
              setLoad("loading");
              refresh().catch(() => undefined);
            }}
            onOpen={(root) => void goToRepository(root)}
            onAdd={startAdd}
            onRescan={(root) => void startRescan(root)}
            onReleaseRepo={setReleasingRepo}
          />
        ) : null}

        {route.at === "repository" && currentRepo ? (
          <RepoDetail
            repo={currentRepo}
            load={load}
            onRetry={() => {
              setLoad("loading");
              refresh().catch(() => undefined);
            }}
            onOpen={(path) => void goToFile(currentRepo.root, path)}
            onSeal={seal}
            onSealMany={sealMany}
            onRelease={setReleasing}
            onReleaseRepo={() => setReleasingRepo(currentRepo)}
            onRescan={() => void startRescan(currentRepo.root)}
            outcomes={outcomes}
            onDismissOutcomes={() => setOutcomes(null)}
          />
        ) : null}

        {route.at === "file" && opened?.kind === "opening" ? (
          <FileOpening relativePath={openedRelativePath} />
        ) : null}

        {route.at === "file" && opened?.kind === "failed" ? (
          <FileFailed
            relativePath={openedRelativePath}
            why={opened.why}
            onRetry={() => void goToFile(route.root, route.path)}
            onBack={() => void goToRepository(route.root)}
          />
        ) : null}

        {route.at === "file" && opened?.kind === "env" ? (
          <EnvEditor
            file={opened.file}
            relativePath={openedRelativePath}
            state={openedState}
            expired={expired}
            onReveal={async (key) => {
              try {
                return await ipc.reveal(opened.file.path, key);
              } catch (error) {
                fail(`reveal ${key}`, error);
                throw error;
              }
            }}
            onSave={async (edits) => {
              try {
                await withAcknowledgement("save the changes", async () => {
                  await ipc.save(opened.file.path, edits);
                  await refreshAndReconcile();
                });
              } catch (error) {
                fail("save the changes", error);
                throw error;
              }
            }}
            onSeal={() => seal(opened.file.path)}
          />
        ) : null}

        {route.at === "file" && opened?.kind === "opaque" ? (
          <section className="opaque">
            <header className="file-head">
              <div className="file-head__text">
                <p className="file-head__path">{openedRelativePath}</p>
              </div>
              <span className="file-head__state" data-state={openedState}>
                {openedState === "sealed" ? "Sealed" : "Readable"}
              </span>
            </header>
            <p>
              Seal manages this file and encrypts it as it is. It is not an env
              file, so there is nothing to edit here — {opened.bytes} bytes,
              stored exactly as you wrote them.
            </p>
          </section>
        ) : null}

      {acknowledging ? (
        <Acknowledge
          onAcknowledge={acknowledging}
          onCancel={() => setAcknowledging(null)}
        />
      ) : null}

      {sealing ? (
        <Confirm
          title={
            onlyRecent
              ? `Seal ${fileName(onlyRecent.path)} while something may be editing it?`
              : `Seal ${sealing.paths.length} files while something may be editing ${sealing.recent.length} of them?`
          }
          confirmLabel={
            sealing.paths.length === 1 ? "Seal it anyway" : "Seal them anyway"
          }
          cancelLabel="Not yet"
          onCancel={() => setSealing(null)}
          onConfirm={async () => {
            const { paths } = sealing;
            const only = paths.length === 1 ? paths[0] : null;
            setSealing(null);
            if (only) {
              await attempt(`seal ${fileName(only)}`, () => sealNow(only));
              return;
            }
            await attempt(`seal ${paths.length} files`, () => sealManyNow(paths));
          }}
        >
          {onlyRecent ? (
            <p>
              This file changed {onlyRecent.secondsAgo} seconds ago, so a program
              may be working in it right now. Seal cannot see an editor's unsaved
              buffer: if one is open, its next save will overwrite the sealed
              file with readable text. Close the file in your editor first, then
              seal.
            </p>
          ) : (
            <>
              <p>
                These files changed moments ago, so a program may be working in
                them right now. Seal cannot see an editor's unsaved buffer: if
                one is open, its next save will overwrite the sealed file with
                readable text. Close them in your editor first, then seal.
              </p>
              <ul className="confirm__list">
                {sealing.recent.map((entry) => (
                  <li key={entry.path}>
                    {fileName(entry.path)} — changed {entry.secondsAgo} seconds
                    ago
                  </li>
                ))}
              </ul>
            </>
          )}
        </Confirm>
      ) : null}

      {releasing ? (
        <Confirm
          title={`Stop managing ${fileName(releasing)}?`}
          confirmLabel="Stop managing it"
          cancelLabel="Keep managing it"
          onCancel={() => setReleasing(null)}
          onConfirm={async () => {
            const path = releasing;
            setReleasing(null);
            await attempt(`stop managing ${fileName(path)}`, async () => {
              await ipc.release(path, "restorePlaintext");
              await refreshAndReconcile();
            });
          }}
        >
          <p>
            Seal will forget this file and leave its readable contents at the
            same path. The file itself is not deleted.
          </p>
        </Confirm>
      ) : null}

      {releasingRepo ? (
        <Confirm
          title={`Stop managing ${releasingRepo.name}?`}
          confirmLabel="Stop managing it"
          cancelLabel="Keep managing it"
          onCancel={() => setReleasingRepo(null)}
          onConfirm={async () => {
            const root = releasingRepo.root;
            setReleasingRepo(null);
            await attempt(`stop managing ${fileName(root)}`, async () => {
              await ipc.releaseRepo(root, "restorePlaintext");
              const fresh = await refresh();
              if (!fresh.some((repo) => repo.root === root)) {
                setRoute({ at: "repositories" });
                setOpened(null);
              }
            });
          }}
        >
          <p>
            Seal will forget all {releasingRepo.files.length}{" "}
            {releasingRepo.files.length === 1 ? "file" : "files"} in{" "}
            {releasingRepo.name} and leave their readable contents at their own
            paths. No file is deleted, and the repository itself is untouched.
          </p>
        </Confirm>
      ) : null}
    </Frame>
  );
}

interface FrameProps {
  trail?: ReactNode;
  controls?: ReactNode;
  children?: ReactNode;
}

function Frame({ trail, controls, children }: FrameProps) {
  const bare = !trail && !controls;
  return (
    <div className="shell">
      <header
        className="shell__titlebar"
        data-bare={bare || undefined}
        data-tauri-drag-region="deep"
      >
        {trail}
        <span className="shell__spacer" />
        {controls}
      </header>

      <main className="shell__main">{children}</main>
    </div>
  );
}
