import json
import subprocess
import sys
from pathlib import Path

COVERAGE_FILENAME = "coverage.json"
BOUNDARY_FILENAME = "boundary.json"
DRIFT_FILENAME = "DRIFT.md"
# The plan tree's repo-relative root (what coverage refuses to point at) and the folder
# name that anchors a structural root (the immediate child of it). The tree lives under
# context/, so the root is a two-segment path while the anchoring folder is still "plans".
PLAN_TREE_DIR = "context/plans"
PLAN_TREE_NAME = "plans"


class CoverageError(Exception):
    pass


class Commit:
    def __init__(self, sha: str, subject: str, file_count: int):
        self.sha = sha
        self.subject = subject
        self.file_count = file_count


class RenameStep:
    def __init__(self, sha: str, src: str, dst: str):
        self.sha = sha
        self.src = src
        self.dst = dst


def reject_plan_tree(rel: str, raw: str) -> None:
    # Coverage points at code, never at the doc system itself. A path under context/plans/
    # would let a plan cover its own docs/tooling and leak the boundary into the tree.
    if rel == PLAN_TREE_DIR or rel.startswith(PLAN_TREE_DIR + "/"):
        raise CoverageError(f"refusing to cover a path inside the plan tree ({PLAN_TREE_DIR}/): {raw}; coverage points at code, not at plans")


def git_repo_root() -> Path:
    out = run_git(["rev-parse", "--show-toplevel"], cwd=Path.cwd())
    if out is None:
        raise CoverageError("not inside a git repository")
    return Path(out).resolve()


def git_head(repo_root: Path) -> str:
    out = run_git(["rev-parse", "HEAD"], cwd=repo_root)
    if out is None:
        raise CoverageError("could not resolve HEAD")
    return out


_PATHSPEC_CHUNK = 150  # pathspecs per git invocation, comfortably inside Windows' command-length limit


def _chunked(items: list, size: int = _PATHSPEC_CHUNK):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def git_tracked_files(repo_root: Path, relpath: str) -> list[str]:
    return git_tracked_files_multi(repo_root, [relpath])


def git_tracked_files_multi(repo_root: Path, relpaths: list[str]) -> list[str]:
    # All tracked files under the named paths. Chunked so one git call serves many
    # pathspecs instead of one call per path — subprocess spawn is the dominant cost on
    # Windows, so per-path calls are what made large boundaries slow.
    files: list[str] = []
    for chunk in _chunked(list(relpaths)):
        out = run_git(["ls-files", "-z", "--", *chunk], cwd=repo_root)
        if out is None:
            raise CoverageError(f"git ls-files failed for {' '.join(chunk)}")
        files.extend(part for part in out.split("\0") if part)
    return files


def git_untracked_files(repo_root: Path, relpaths: list[str]) -> list[str]:
    # Untracked (not gitignored) files under the named paths, in one chunked read.
    files: list[str] = []
    for chunk in _chunked(list(relpaths)):
        out = run_git(["ls-files", "-z", "--others", "--exclude-standard", "--", *chunk], cwd=repo_root)
        if out is None:
            raise CoverageError(f"git ls-files failed for {' '.join(chunk)}")
        files.extend(part for part in out.split("\0") if part)
    return files


def git_dirty_files(repo_root: Path, relpaths: list[str]) -> list[str]:
    # Tracked files under the named paths whose working tree or index differs from HEAD —
    # i.e. uncommitted changes, staged or unstaged. `diff --name-only` emits bare paths,
    # so there is no status-column format to parse (untracked files are a separate check).
    dirty: set[str] = set()
    for chunk in _chunked(list(relpaths)):
        out = run_git(["diff", "--name-only", "-z", "HEAD", "--", *chunk], cwd=repo_root)
        if out is None:
            raise CoverageError(f"git diff failed for {' '.join(chunk)}")
        dirty.update(part for part in out.split("\0") if part)
    return sorted(dirty)


def git_live_paths(repo_root: Path) -> set[str]:
    # Every path present at HEAD's tree, in one call. Membership in this set replaces a
    # per-file `git ls-tree HEAD -- <path>`: a covered path absent here is `removed`.
    out = run_git(["ls-tree", "-r", "--name-only", "-z", "HEAD"], cwd=repo_root)
    if out is None:
        raise CoverageError("could not list HEAD tree")
    return {part for part in out.split("\0") if part}


def git_window_changes(repo_root: Path, sha: str) -> "WindowChanges":
    # One (sha, HEAD] window read on its own — the fallback path for a stamp SHA that
    # git_batched_windows could not relate to HEAD. Callers slice the result per path:
    #   - a path's commit list and each commit's file_count come from a pathspec-free,
    #     rename-OFF pass (_read_range_commits): a rename shows as a delete on the old name
    #     and an add on the new, so each path is attributed exactly the commits that touched
    #     that name, and a rename counts as one file in its commit's total.
    #   - the rename trail comes from a rename-ON (-M) pass (_read_range_renames), read
    #     lazily on the first rename_trail call, since only `removed` findings need it.
    changes = WindowChanges(repo_root, f"{sha}..HEAD")
    _read_range_commits(repo_root, f"{sha}..HEAD", changes)
    return changes


def git_batched_windows(repo_root: Path, shas: set[str]) -> dict[str, object]:
    # Every (sha, HEAD] window in a constant number of git calls, independent of how many
    # distinct SHAs coverage stores — per-SHA `git log` reads are what made the detector
    # slow, since subprocess spawn dominates on Windows. The trick: the octopus merge-base
    # of all stamp SHAs bounds ONE shared log window (base..HEAD) that is a superset of
    # every stamp's window (base is an ancestor of each stamp, so reach(base) is inside
    # every reach(stamp)); per-SHA membership is then decided in memory — a commit is in
    # sha..HEAD exactly when it is not reachable from sha, and reachability comes from one
    # rev-list --parents read of the same range. A stamp git cannot place (unknown, or not
    # sharing history) falls back to its own git_window_changes read, trading extra calls
    # for correctness only in that rare case.
    if not shas:
        return {}
    base = _octopus_base(repo_root, sorted(shas))
    if base is None:
        return {sha: git_window_changes(repo_root, sha) for sha in shas}
    span = f"{base}..HEAD"
    parent_map = _read_range_parents(repo_root, span)
    shared = _GlobalWindow(repo_root, span)
    _read_range_commits(repo_root, span, shared)
    windows: dict[str, object] = {}
    for sha in shas:
        if sha == base:
            windows[sha] = _WindowView(shared, frozenset())
        elif sha in parent_map:
            windows[sha] = _WindowView(shared, _reachable(sha, parent_map))
        else:
            windows[sha] = git_window_changes(repo_root, sha)
    return windows


def _octopus_base(repo_root: Path, shas: list[str]) -> str | None:
    # The best common ancestor of all stamp SHAs, chunked so the argument list stays inside
    # command-length limits however many SHAs coverage accumulates. None when git cannot
    # relate them (an unknown SHA, unrelated histories) — the caller then falls back.
    if len(shas) == 1:
        return run_git(["rev-parse", "--verify", "--quiet", shas[0] + "^{commit}"], cwd=repo_root)
    base: str | None = None
    for chunk in _chunked(shas):
        args = [base, *chunk] if base else chunk
        base = run_git(["merge-base", "--octopus", *args], cwd=repo_root)
        if base is None:
            return None
    return base


def _read_range_parents(repo_root: Path, span: str) -> dict[str, list[str]]:
    # The commit graph of the range: full sha -> parent shas. Parents outside the range are
    # kept in the lists but never walked (_reachable only follows in-range commits) — a
    # path from a stamp to a range commit can never pass through a commit outside the
    # range, because such a commit is reachable from base and so is everything below it.
    out = run_git(["rev-list", "--parents", span], cwd=repo_root)
    if out is None:
        return {}
    parents: dict[str, list[str]] = {}
    for line in out.splitlines():
        shas = line.split()
        if shas:
            parents[shas[0]] = shas[1:]
    return parents


def _reachable(sha: str, parent_map: dict[str, list[str]]) -> set[str]:
    seen = {sha}
    stack = [sha]
    while stack:
        for p in parent_map.get(stack.pop(), ()):
            if p in parent_map and p not in seen:
                seen.add(p)
                stack.append(p)
    return seen


def _read_range_commits(repo_root: Path, span: str, sink) -> None:
    # Rename detection OFF: a renamed path appears as a delete on the old name and an add on
    # the new name, so each path is attributed exactly the commits that touched that name,
    # and a rename counts as one file in its commit's total. `sink` is any object with
    # `commits` and `touched` dicts (WindowChanges or _GlobalWindow).
    out = run_git(
        ["log", "--no-renames", "--name-only", "--format=%x00%H%x00%h%x00%s", span],
        cwd=repo_root,
    )
    if out is None or not out:
        return
    full = ""
    for line in out.splitlines():
        if line.startswith("\0"):
            _empty, full, short, subj = line.split("\0", 3)
            sink.commits[full] = Commit(short, subj, 0)
            continue
        if not line.strip() or not full:
            continue
        sink.commits[full].file_count += 1
        sink.touched.setdefault(line, []).append(full)


def _read_range_renames(repo_root: Path, span: str) -> list[tuple[str, str, str, str]]:
    # Rename detection ON: the R<score> old new lines git records, read once for the whole
    # range. (full sha, short sha, src, dst) in newest-first order, as git reported them.
    out = run_git(
        ["log", "-M", "--name-status", "--format=%x00%H%x00%h", span],
        cwd=repo_root,
    )
    if out is None:
        return []
    renames: list[tuple[str, str, str, str]] = []
    cur_full = ""
    cur_short = ""
    for line in out.splitlines():
        if line.startswith("\0"):
            _empty, cur_full, cur_short = line.split("\0", 2)
            continue
        parts = line.split("\t")
        if parts[0].startswith("R") and len(parts) == 3:
            renames.append((cur_full, cur_short, parts[1], parts[2]))
    return renames


def _chain_renames(renames_newest_first: list[tuple[str, str, str, str]], oldpath: str, excluded: frozenset[str] | set[str]) -> list[RenameStep]:
    # Follow oldpath through the renames oldest -> newest, hopping src -> dst at each step,
    # so a multi-hop rename chains and the trail stops at the last known name. Renames made
    # by commits outside the window (excluded) belong to an earlier life of the path and
    # must not appear in its trail.
    steps: list[RenameStep] = []
    current = oldpath
    for full, short, src, dst in reversed(renames_newest_first):
        if full in excluded:
            continue
        if src == current:
            steps.append(RenameStep(sha=short, src=src, dst=dst))
            current = dst
    return steps


class WindowChanges:
    def __init__(self, repo_root: Path | None = None, span: str | None = None):
        # full sha -> Commit (file_count is the commit's total touched files)
        self.commits: dict[str, Commit] = {}
        # path -> full shas that touched it, in git-log order (newest first)
        self.touched: dict[str, list[str]] = {}
        self._repo_root = repo_root
        self._span = span
        self._renames: list[tuple[str, str, str, str]] | None = None

    def commits_for(self, relpath: str) -> list[Commit]:
        return [self.commits[full] for full in self.touched.get(relpath, [])]

    def rename_trail(self, oldpath: str) -> list[RenameStep]:
        if self._renames is None:
            self._renames = _read_range_renames(self._repo_root, self._span) if self._span else []
        return _chain_renames(self._renames, oldpath, frozenset())


class _GlobalWindow:
    # The one shared (base, HEAD] read that every _WindowView slices; renames are fetched
    # lazily because only `removed` findings ever ask for a trail.
    def __init__(self, repo_root: Path, span: str):
        self.commits: dict[str, Commit] = {}
        self.touched: dict[str, list[str]] = {}
        self._repo_root = repo_root
        self._span = span
        self._renames: list[tuple[str, str, str, str]] | None = None

    def renames(self) -> list[tuple[str, str, str, str]]:
        if self._renames is None:
            self._renames = _read_range_renames(self._repo_root, self._span)
        return self._renames


class _WindowView:
    # One stamp SHA's view of the shared window: everything the shared read holds, minus
    # the commits reachable from the stamp (those are before it, outside its window).
    def __init__(self, shared: _GlobalWindow, excluded: frozenset[str] | set[str]):
        self._shared = shared
        self._excluded = excluded

    def commits_for(self, relpath: str) -> list[Commit]:
        return [self._shared.commits[full] for full in self._shared.touched.get(relpath, []) if full not in self._excluded]

    def rename_trail(self, oldpath: str) -> list[RenameStep]:
        return _chain_renames(self._shared.renames(), oldpath, self._excluded)


def git_first_commit_for(repo_root: Path, relpath: str) -> Commit | None:
    # The commit that introduced <relpath> (its birth), across all history. An uncovered
    # file has no stored SHA of its own, so its window opens at the file's first appearance.
    commits = _log_commits(repo_root, ["HEAD", "--", relpath])
    return commits[-1] if commits else None


def run_git(args: list[str], cwd: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        raise CoverageError("git is not installed or not on PATH")
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def resolve_path_arg(raw: str, repo_root: Path) -> Path:
    # Resolve a path argument so the scripts work the same from any cwd — the agent runs
    # them from context/_scripts/ yet types repo-relative paths like src/foo.ts.
    # An absolute path is taken as-is. A relative path is tried against both cwd and the
    # repo root: whichever exists wins, and if both exist as *different* files it is an
    # ambiguity error rather than a silent pick (the system never resolves ambiguity quietly).
    p = Path(raw)
    if p.is_absolute():
        return p.resolve()
    from_cwd = (Path.cwd() / p).resolve()
    from_root = (repo_root / p).resolve()
    cwd_exists = from_cwd.exists()
    root_exists = from_root.exists()
    if cwd_exists and root_exists and from_cwd != from_root:
        raise CoverageError(f"ambiguous path {raw!r}: it exists both relative to the current directory ({from_cwd}) and to the repo root ({from_root}). Pass an absolute path to disambiguate.")
    if cwd_exists:
        return from_cwd
    if root_exists:
        return from_root
    # Neither exists; return the repo-root interpretation so the caller's "not found" error
    # names the repo-relative path the agent most likely intended.
    return from_root


def posix_relative(path: Path, repo_root: Path) -> str:
    return path.resolve().relative_to(repo_root).as_posix()


def is_within(path: Path, root: Path) -> bool:
    return path == root or root in path.parents


def find_plan_root(md_path: Path) -> Path:
    # The existing boundary if one is stored above the .md, else the structural root
    # (context/plans/<root>/). Read-only: callers that must not create a boundary use this.
    for parent in md_path.parents:
        if (parent / BOUNDARY_FILENAME).exists():
            return parent
    return structural_root(md_path)


def ensure_plan_root(md_path: Path, repo_root: Path) -> Path:
    # The root for this .md, with an empty boundary.json created on demand the first time
    # coverage is declared — so a plan never has to be initialized by hand. A root defaults
    # to an empty boundary (owning nothing); widening it stays a deliberate set_boundary call.
    root = find_plan_root(md_path)
    if not (root / BOUNDARY_FILENAME).exists():
        write_boundary(root, {"include": [], "exclude": []})
    return root


def structural_root(md_path: Path) -> Path:
    # context/plans/<root>/ — the immediate child of the plans/ folder on the path down to
    # the .md. Anchored on the folder name (plans) rather than the full repo-relative prefix,
    # so it needs no repo_root; the tree lives under context/, but the anchoring folder is
    # still named plans.
    parents = list(md_path.parents)
    for i, parent in enumerate(parents):
        if parent.name == PLAN_TREE_NAME and i > 0:
            return parents[i - 1]
    raise CoverageError(f"{md_path} is not under a {PLAN_TREE_DIR}/<root>/ folder; coverage lives in the plan tree")


def read_json(path: Path, *, what: str) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CoverageError(f"{path} is not valid JSON ({exc})")
    if not isinstance(data, dict):
        raise CoverageError(f"{path} is not a JSON object ({what})")
    return data


def write_json(path: Path, data: dict) -> None:
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8")


def read_boundary(plan_root: Path) -> dict:
    boundary = read_json(plan_root / BOUNDARY_FILENAME, what="boundary")
    boundary.setdefault("include", [])
    boundary.setdefault("exclude", [])
    return boundary


def write_boundary(plan_root: Path, boundary: dict) -> None:
    ordered = {
        "include": sorted(set(boundary.get("include", []))),
        "exclude": sorted(set(boundary.get("exclude", []))),
    }
    write_json(plan_root / BOUNDARY_FILENAME, ordered)


def covered_by(rel: str, prefixes: list[str]) -> bool:
    for prefix in prefixes:
        if rel == prefix or rel.startswith(prefix + "/"):
            return True
    return False


def in_boundary(rel: str, boundary: dict) -> bool:
    return covered_by(rel, boundary["include"]) and not covered_by(rel, boundary["exclude"])


def in_scope_files(boundary: dict, repo_root: Path) -> set[str]:
    if not boundary["include"]:
        return set()
    return {tracked for tracked in git_tracked_files_multi(repo_root, boundary["include"]) if not covered_by(tracked, boundary["exclude"])}


def fail(message: str) -> int:
    print(f"error: {message}", file=sys.stderr)
    return 1


def _log_commits(repo_root: Path, log_args: list[str]) -> list[Commit]:
    # Which commits touched the path, newest first.
    out = run_git(["log", "--format=%H%x00%h%x00%s", *log_args], cwd=repo_root)
    if out is None or not out:
        return []
    entries = [line.split("\0", 2) for line in out.splitlines() if line]
    # Each commit's annotation is how many files *the commit* touched (not just under the
    # path), so a surgical edit reads differently from one slice of a sweep. Counted in one
    # `git show` over exactly these commits, with renames collapsed to a single file.
    counts = _commit_file_counts(repo_root, [full for full, _short, _subj in entries])
    return [Commit(short, subj, counts.get(full, 0)) for full, short, subj in entries]


def _commit_file_counts(repo_root: Path, shas: list[str]) -> dict[str, int]:
    if not shas:
        return {}
    out = run_git(
        ["show", "--name-only", "--format=%x00%H", "--no-renames", *shas],
        cwd=repo_root,
    )
    if out is None:
        return {}
    counts: dict[str, int] = {}
    cur = ""
    for line in out.splitlines():
        if line.startswith("\0"):
            cur = line[1:]
            counts.setdefault(cur, 0)
        elif line.strip() and cur:
            counts[cur] += 1
    return counts
