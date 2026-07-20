import argparse
import sys
from pathlib import Path

from plans.coverage_lib import (
    BOUNDARY_FILENAME,
    DRIFT_FILENAME,
    PLAN_TREE_DIR,
    CoverageError,
    fail,
    git_repo_root,
    is_within,
    posix_relative,
    resolve_path_arg,
)
from plans.detector import (
    ChangedFinding,
    RemovedFinding,
    Report,
    build_report,
)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="run_coverage",
        description=(
            "Run the drift detector and write each affected root's DRIFT.md: written when a root has drift, deleted when clean. Always prints a one-line result; exits non-zero if drift is found."
        ),
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--all", action="store_true", help="refresh every root's DRIFT.md")
    group.add_argument("scope", nargs="?", help="a plan root, or any folder under one; refreshes that root's DRIFT.md and reports the scope's drift")
    parser.add_argument("--verbose", action="store_true", help="also print the full findings to stdout")
    args = parser.parse_args(argv)

    try:
        return run(args)
    except CoverageError as exc:
        return fail(str(exc))


def run(args) -> int:
    repo_root = git_repo_root()

    if args.all:
        scopes = [(root, root) for root in find_plan_roots(repo_root)]
    elif args.scope:
        scopes = [resolve_scope(args.scope, repo_root)]
    else:
        raise CoverageError("nothing to do; pass --all or a folder (a plan root, or any folder under one)")

    any_drift = False
    for root, scope in scopes:
        report = build_report(str(root))
        drift_path = root / DRIFT_FILENAME
        if report.has_drift:
            drift_path.write_text(render(report), encoding="utf-8")
        elif drift_path.exists():
            drift_path.unlink()

        scoped = filter_report(report, scope, repo_root)
        if scoped.has_drift:
            any_drift = True
        report_result(scoped, root, drift_path, repo_root, args.verbose)

    return 1 if any_drift else 0


def resolve_scope(scope_arg: str, repo_root: Path) -> tuple[Path, Path]:
    # Accept a plan root or any folder beneath one. The detector always runs against the
    # enclosing root (DRIFT.md lives at the root), but the printed report is narrowed to the
    # folder the caller asked about — so "is this subtree clean?" gets a direct answer.
    scope = resolve_path_arg(scope_arg, repo_root)
    if not scope.is_dir():
        raise CoverageError(f"not a folder: {scope_arg}")
    if not is_within(scope, repo_root):
        raise CoverageError(f"folder is outside the repository: {scope_arg}")
    root = enclosing_root(scope)
    if root is None:
        raise CoverageError(f"{scope_arg} is not under a plan root (no {BOUNDARY_FILENAME} at or above it)")
    return root, scope


def enclosing_root(scope: Path) -> Path | None:
    for folder in [scope, *scope.parents]:
        if (folder / BOUNDARY_FILENAME).exists():
            return folder
    return None


def filter_report(report: Report, scope: Path, repo_root: Path) -> Report:
    # A report scoped to a subfolder keeps only the plans that live under it. Uncovered code
    # findings are root-wide (not attributable to one plan folder), so they appear only when
    # the scope is the whole root.
    scope_rel = posix_relative(scope, repo_root)
    root_rel = report.plan_root_rel
    if scope_rel == root_rel:
        return report

    scoped = Report(scope_rel)
    prefix = scope_rel[len(root_rel) + 1 :] + "/"
    for md_id, findings in report.by_md.items():
        if md_id.startswith(prefix):
            scoped.by_md[md_id] = findings
    return scoped


def report_result(report: Report, root: Path, drift_path: Path, repo_root: Path, verbose: bool) -> None:
    scope = report.plan_root_rel
    if not report.has_drift:
        print(f"{scope}/: no drift — every covered file is reconciled.")
        return
    plans = len(report.by_md)
    noun = "plan" if plans == 1 else "plans"
    extra = "" if not report.uncovered else f", {len(report.uncovered)} uncovered file(s)"
    drift_rel = posix_relative(drift_path, repo_root)
    print(f"{scope}/: drift in {plans} {noun}{extra} — see {drift_rel}")
    if verbose:
        print(render(report))


def find_plan_roots(repo_root: Path) -> list[Path]:
    plans_dir = repo_root / PLAN_TREE_DIR
    if not plans_dir.is_dir():
        return []
    return sorted(p.parent for p in plans_dir.rglob(BOUNDARY_FILENAME))


def render(report: Report) -> str:
    lines = [
        f"# Drift — {report.plan_root_rel}/",
        "",
        "> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record",
        "> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the",
        "> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.",
        "",
    ]
    for md_id in sorted(report.by_md):
        lines.append(f"## {md_id}")
        lines.append("")
        for finding in report.by_md[md_id]:
            lines.extend(render_finding(finding))
        lines.append("")
    if report.uncovered:
        lines.append("## Uncovered")
        lines.append("")
        for finding in report.uncovered:
            lines.append(f"- {finding.rel}")
            if finding.birth is not None:
                lines.append(f"  {finding.birth.sha} (born) {quote(finding.birth.subject)}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_finding(finding: object) -> list[str]:
    if isinstance(finding, ChangedFinding):
        out = [f"- changed {finding.rel}"]
        out.extend(commit_lines(finding.commits))
        return out
    if isinstance(finding, RemovedFinding):
        out = [f"- removed {finding.rel}"]
        out.extend(commit_lines(finding.commits))
        for step in finding.renames:
            out.append(f"  {step.sha} rename -> {step.dst}")
        return out
    return []


def commit_lines(commits: list) -> list[str]:
    out = []
    for c in commits:
        plural = "file" if c.file_count == 1 else "files"
        out.append(f"  {c.sha} ({c.file_count} {plural}) {quote(c.subject)}")
    return out


def quote(subject: str) -> str:
    return f'"{subject}"'


if __name__ == "__main__":
    raise SystemExit(main())
