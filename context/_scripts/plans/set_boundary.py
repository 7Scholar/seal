import argparse
import sys
from pathlib import Path

from plans.coverage_lib import (
    BOUNDARY_FILENAME,
    CoverageError,
    covered_by,
    fail,
    git_repo_root,
    is_within,
    posix_relative,
    read_boundary,
    reject_plan_tree,
    resolve_path_arg,
    write_boundary,
)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="set_boundary",
        description="Set a root plan's boundary (the only writer of boundary.json). Add or drop include/exclude paths. A human/setup step, not part of working a plan.",
    )
    parser.add_argument("plan_root", help="the root plan folder")
    parser.add_argument("--include", action="append", default=[], metavar="PATH", help="add a file/dir to the boundary (repeatable)")
    parser.add_argument("--exclude", action="append", default=[], metavar="PATH", help="carve a subtree back out (repeatable)")
    parser.add_argument("--remove-include", action="append", default=[], metavar="PATH", help="drop an include by its stored path (repeatable)")
    parser.add_argument("--remove-exclude", action="append", default=[], metavar="PATH", help="drop an exclude by its stored path (repeatable)")
    args = parser.parse_args(argv)

    try:
        return run(args)
    except CoverageError as exc:
        return fail(str(exc))


def run(args) -> int:
    repo_root = git_repo_root()

    plan_root = resolve_path_arg(args.plan_root, repo_root)
    if not plan_root.is_dir():
        raise CoverageError(f"plan root is not a folder: {args.plan_root}")
    if not is_within(plan_root, repo_root):
        raise CoverageError(f"plan root is outside the repository: {args.plan_root}")

    if not any([args.include, args.exclude, args.remove_include, args.remove_exclude]):
        raise CoverageError("nothing to do; pass --include/--exclude or a remove flag")

    boundary = read_boundary(plan_root)
    include = set(boundary["include"])
    exclude = set(boundary["exclude"])

    include |= {normalize(p, repo_root) for p in args.include}
    exclude |= {normalize(p, repo_root) for p in args.exclude}

    include = remove_entries(include, args.remove_include, repo_root, "include")
    exclude = remove_entries(exclude, args.remove_exclude, repo_root, "exclude")

    stray = [e for e in sorted(exclude) if not covered_by(e, sorted(include))]
    if stray:
        raise CoverageError("these excludes fall under no include (they carve nothing):\n  " + "\n  ".join(stray))

    write_boundary(plan_root, {"include": include, "exclude": exclude})

    rel = posix_relative(plan_root / BOUNDARY_FILENAME, repo_root)
    print(f"boundary: {len(include)} include, {len(exclude)} exclude -> {rel}")
    return 0


def remove_entries(current: set[str], targets: list[str], repo_root: Path, kind: str) -> set[str]:
    # Removal matches stored repo-relative strings. The target may be given either as the
    # stored form (e.g. "src/utils") or as a path resolvable from cwd; whatever it
    # does not match is reported, so a no-op removal never passes silently.
    result = set(current)
    for raw in targets:
        candidates = {as_repo_relative(raw)}
        resolved = resolve_within(raw, repo_root)
        if resolved is not None:
            candidates.add(resolved)
        matched = candidates & result
        if not matched:
            raise CoverageError(f"{kind} entry not currently stored (nothing removed): {raw}")
        result -= matched
    return result


def as_repo_relative(raw: str) -> str:
    return Path(raw).as_posix().strip("/")


def resolve_within(raw: str, repo_root: Path) -> str | None:
    p = Path(raw).resolve()
    if not is_within(p, repo_root):
        return None
    return posix_relative(p, repo_root)


def normalize(raw: str, repo_root: Path) -> str:
    p = resolve_path_arg(raw, repo_root)
    if not p.exists():
        raise CoverageError(f"path not found: {raw}")
    if not is_within(p, repo_root):
        raise CoverageError(f"path is outside the repository: {raw}")
    rel = posix_relative(p, repo_root)
    reject_plan_tree(rel, raw)
    return rel


if __name__ == "__main__":
    raise SystemExit(main())
