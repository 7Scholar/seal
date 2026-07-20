from pathlib import Path

from plans.coverage_lib import (
    BOUNDARY_FILENAME,
    COVERAGE_FILENAME,
    Commit,
    CoverageError,
    RenameStep,
    covered_by,
    git_batched_windows,
    git_first_commit_for,
    git_live_paths,
    git_repo_root,
    in_scope_files,
    is_within,
    posix_relative,
    read_boundary,
    read_json,
)


class ChangedFinding:
    def __init__(self, rel: str, commits: list[Commit]):
        self.rel = rel
        self.commits = commits


class RemovedFinding:
    def __init__(self, rel: str, commits: list[Commit], renames: list[RenameStep]):
        self.rel = rel
        self.commits = commits
        self.renames = renames


class UncoveredFinding:
    def __init__(self, rel: str, birth: Commit | None):
        self.rel = rel
        self.birth = birth


class Report:
    def __init__(self, plan_root_rel: str):
        self.plan_root_rel = plan_root_rel
        # grouped by md_id (root-relative .md path) -> list of findings, in declared order
        self.by_md: dict[str, list[object]] = {}
        self.uncovered: list[UncoveredFinding] = []

    def add(self, md_id: str, finding: object) -> None:
        self.by_md.setdefault(md_id, []).append(finding)

    @property
    def has_drift(self) -> bool:
        return bool(self.by_md or self.uncovered)


class Covered:
    def __init__(self):
        # md_id -> stamped sha, so two nodes covering the same file each judge drift
        # against their own last-reconcile point instead of sharing a single SHA.
        self.sha_by_md: dict[str, str] = {}


def build_report(plan_root_arg: str) -> Report:
    repo_root = git_repo_root()

    plan_root = Path(plan_root_arg).resolve()
    if not plan_root.is_dir():
        raise CoverageError(f"plan root is not a folder: {plan_root_arg}")
    if not is_within(plan_root, repo_root):
        raise CoverageError(f"plan root is outside the repository: {plan_root_arg}")
    if not (plan_root / BOUNDARY_FILENAME).exists():
        raise CoverageError(f"no {BOUNDARY_FILENAME} in {plan_root_arg}; not a root plan")

    boundary = read_boundary(plan_root)
    covered = collect_covered(plan_root, repo_root)
    in_scope = in_scope_files(boundary, repo_root)
    report = Report(posix_relative(plan_root, repo_root))

    # The whole drift judgement reduces to a handful of batched git reads, regardless of
    # file or SHA count: one HEAD-tree listing for existence, and one shared log window
    # bounded by the octopus merge-base of every distinct stored SHA, sliced per SHA in
    # memory (git_batched_windows). The rename pass inside it is read lazily, only when a
    # removed file asks for its trail.
    live = git_live_paths(repo_root)
    all_shas = {sha for entry in covered.values() for sha in entry.sha_by_md.values()}
    windows = git_batched_windows(repo_root, all_shas)

    # Coverage is keyed by .md; group every finding under the covering .md(s) so each
    # DRIFT.md block is a self-contained reconcile unit. Each md_id is judged against its
    # own stamped SHA, since two nodes covering the same file can be reconciled at different
    # points in time. Iterate files, classify each md_id's window independently.
    for rel in sorted(covered):
        entry = covered[rel]
        # An exclude that now carves this out: out of scope. Skip silently; the stored
        # SHA stays untouched so removing the exclude later flags it again.
        if covered_by(rel, boundary["exclude"]):
            continue
        # A covered file whose include was dropped (still tracked, no longer in scope)
        # is likewise out of scope; only files under a live include are judged.
        in_include = covered_by(rel, boundary["include"])
        removed = rel not in live
        for md_id in sorted(entry.sha_by_md):
            window = windows[entry.sha_by_md[md_id]]
            # Existence at HEAD is checked first: a vanished file is `removed`, never `changed`.
            if removed:
                commits = window.commits_for(rel)
                renames = window.rename_trail(rel)
                report.add(md_id, RemovedFinding(rel, commits, renames))
                continue
            if not in_include:
                continue
            commits = window.commits_for(rel)
            if commits:
                report.add(md_id, ChangedFinding(rel, commits))

    for rel in sorted(in_scope):
        if rel not in covered:
            report.uncovered.append(UncoveredFinding(rel, git_first_commit_for(repo_root, rel)))

    return report


def collect_covered(plan_root: Path, repo_root: Path) -> dict[str, Covered]:
    covered: dict[str, Covered] = {}
    for coverage_path in sorted(plan_root.rglob(COVERAGE_FILENAME)):
        manifest = read_json(coverage_path, what="coverage")
        md_dir = posix_relative(coverage_path.parent, repo_root)
        root_rel = posix_relative(plan_root, repo_root)
        for md_name, files in manifest.items():
            # md_id is relative to the plan root, matching the DRIFT.md block headings.
            sub = md_dir[len(root_rel) + 1 :] if md_dir != root_rel else ""
            md_id = f"{sub}/{md_name}" if sub else md_name
            if not isinstance(files, dict):
                raise CoverageError(f"{coverage_path}: key {md_name} is not a file->sha object")
            for rel, sha in files.items():
                entry = covered.setdefault(rel, Covered())
                entry.sha_by_md[md_id] = sha
    return covered
