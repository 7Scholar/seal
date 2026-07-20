import argparse
import sys

from plans.coverage_lib import (
    COVERAGE_FILENAME,
    CoverageError,
    covered_by,
    fail,
    find_plan_root,
    git_repo_root,
    posix_relative,
    read_json,
    resolve_path_arg,
    write_json,
)
from plans.plan_md import validate_plan_md_arg


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="remove_from_coverage",
        description="Drop these paths from <plan.md>'s coverage. The only way a file leaves a .md, so no call silently drops coverage. With no paths and a deleted .md, drops the whole orphaned key.",
    )
    parser.add_argument("md", help="the plan .md file")
    parser.add_argument("paths", nargs="*", help="files and/or folders to drop (a folder drops every covered file under it); omit to drop a deleted .md's whole orphaned key")
    args = parser.parse_args(argv)

    try:
        return run(args)
    except CoverageError as exc:
        return fail(str(exc))


def run(args) -> int:
    repo_root = git_repo_root()
    md_path = validate_plan_md_arg(args.md, repo_root)
    find_plan_root(md_path)  # validates the .md sits under a context/plans/<root>/; raises if not

    coverage_path = md_path.parent / COVERAGE_FILENAME
    manifest = read_json(coverage_path, what="coverage")
    md_map = manifest.get(md_path.name)
    if not isinstance(md_map, dict) or not md_map:
        raise CoverageError(f"{md_path.name} covers nothing in {posix_relative(coverage_path, repo_root)}; nothing to remove (wrong .md, or these paths were never added)")

    # A deleted .md leaves an orphaned key no per-path call can reach (the file is gone, so the
    # agent has no live paths to name). Dropping the whole key is then the only — and a still
    # deliberate — way to clear it: the agent names the deleted .md by hand. A path argument
    # for a deleted .md is contradictory, so it is refused rather than half-honored.
    if not md_path.exists():
        if args.paths:
            raise CoverageError(f"{md_path.name} no longer exists on disk; its coverage key can only be dropped whole — re-run with no path arguments to drop it")
        del manifest[md_path.name]
        write_json(coverage_path, {k: manifest[k] for k in sorted(manifest)})
        print(f"dropped the orphaned coverage key for the deleted {md_path.name} -> {posix_relative(coverage_path, repo_root)}")
        return 0

    if not args.paths:
        raise CoverageError(f"name the files or folders to drop from {md_path.name} (it still exists, so coverage is dropped per-path, not wholesale)")

    targets = [posix_relative(resolve_path_arg(raw, repo_root), repo_root) for raw in args.paths]
    to_drop = sorted(f for f in md_map if any(f == t or covered_by(f, [t]) for t in targets))
    if not to_drop:
        raise CoverageError("none of the given paths cover anything under " + md_path.name + ":\n  " + "\n  ".join(sorted(targets)) + "\n(wrong .md, or a path that was never added)")

    for f in to_drop:
        del md_map[f]
    if md_map:
        manifest[md_path.name] = {k: md_map[k] for k in sorted(md_map)}
    else:
        del manifest[md_path.name]
    write_json(coverage_path, {k: manifest[k] for k in sorted(manifest)})

    print(f"dropped {len(to_drop)} file(s) from {md_path.name} -> {posix_relative(coverage_path, repo_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
