import argparse
import sys
from pathlib import Path

from plans.coverage_lib import (
    COVERAGE_FILENAME,
    CoverageError,
    covered_by,
    ensure_plan_root,
    fail,
    git_dirty_files,
    git_head,
    git_repo_root,
    git_tracked_files_multi,
    git_untracked_files,
    posix_relative,
    read_boundary,
    read_json,
    reject_plan_tree,
    resolve_path_arg,
    write_json,
)
from plans.plan_md import resolve_plan_md


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="add_to_coverage",
        description="Cover these paths under <plan.md>, stamped at HEAD. Re-run on reviewed files to reconcile them. An upsert: named files are merged in, others left alone.",
    )
    parser.add_argument("md", help="the plan .md file")
    parser.add_argument("paths", nargs="+", help="files and/or folders to cover (folders expand to tracked files)")
    args = parser.parse_args(argv)

    try:
        return run(args)
    except CoverageError as exc:
        return fail(str(exc))


def run(args) -> int:
    repo_root = git_repo_root()
    md_path = resolve_plan_md(args.md, repo_root)
    plan_root = ensure_plan_root(md_path, repo_root)
    boundary = read_boundary(plan_root)

    rels = resolve_inputs(args.paths, repo_root)
    files, untracked = expand_to_files(rels, repo_root)

    if untracked:
        raise CoverageError("these files are not git-tracked; commit them first, then cover them:\n  " + "\n  ".join(untracked))

    out_of_boundary = sorted(f for f in files if not covered_by(f, boundary["include"]) or covered_by(f, boundary["exclude"]))
    if out_of_boundary:
        root_rel = posix_relative(plan_root, repo_root)
        widen = " ".join(f"--include {p}" for p in dedupe_includes(out_of_boundary, boundary))
        raise CoverageError(
            "these files fall outside the boundary; nothing was covered (the add is all-or-nothing). "
            "Widen the boundary, then retry:\n  " + "\n  ".join(out_of_boundary) + f"\n\n  set_boundary {root_rel} {widen}"
        )

    dirty = git_dirty_files(repo_root, files)
    if dirty:
        raise CoverageError(
            "these files have uncommitted changes; the stamp records HEAD, which predates them, "
            "so stamping now would read as instant drift once they are committed. Commit first, then stamp:\n  " + "\n  ".join(dirty)
        )

    head = git_head(repo_root)
    coverage_path = md_path.parent / COVERAGE_FILENAME
    manifest = read_json(coverage_path, what="coverage")
    md_map = manifest.get(md_path.name, {})
    if not isinstance(md_map, dict):
        raise CoverageError(f"{coverage_path}: key {md_path.name} is not a file->sha object")
    for rel in files:
        md_map[rel] = head
    manifest[md_path.name] = {k: md_map[k] for k in sorted(md_map)}
    write_json(coverage_path, {k: manifest[k] for k in sorted(manifest)})

    rel_cov = posix_relative(coverage_path, repo_root)
    print(f"covered {len(files)} file(s) under {md_path.name} -> {rel_cov} @ {head[:8]}")
    return 0


def resolve_inputs(paths: list[str], repo_root: Path) -> list[str]:
    rels: list[str] = []
    for raw in paths:
        p = resolve_path_arg(raw, repo_root)
        if not p.exists():
            raise CoverageError(f"path resolves to nothing on disk: {raw}")
        rel = posix_relative(p, repo_root)
        reject_plan_tree(rel, raw)
        rels.append(rel)
    return rels


def expand_to_files(rels: list[str], repo_root: Path) -> tuple[list[str], list[str]]:
    # Expands the named paths to (all files, the untracked ones among them) in two batched
    # git reads. Untracked files under a named folder are kept, not skipped, so the
    # untracked refusal names every offender instead of silently covering around them.
    tracked = set(git_tracked_files_multi(repo_root, rels))
    untracked = set(git_untracked_files(repo_root, rels))
    for rel in rels:
        if (repo_root / rel).is_file() and rel not in tracked and rel not in untracked:
            # A directly named file that is neither tracked nor listed as untracked is
            # gitignored; keep it so the refusal names it rather than silently dropping it.
            untracked.add(rel)
    return sorted(tracked | untracked), sorted(untracked)


def dedupe_includes(out_of_boundary: list[str], boundary: dict) -> list[str]:
    # Suggest the offending files themselves as includes; the agent can coarsen to a
    # folder by hand. Drop any already implied by an existing include.
    return [f for f in out_of_boundary if not covered_by(f, boundary["include"])]


if __name__ == "__main__":
    raise SystemExit(main())
