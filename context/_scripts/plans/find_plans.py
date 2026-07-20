import argparse
import sys
from pathlib import Path

from plans.coverage_lib import (
    COVERAGE_FILENAME,
    PLAN_TREE_DIR,
    CoverageError,
    fail,
    git_repo_root,
    is_within,
    read_json,
    resolve_path_arg,
)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="find_plans",
        description=(
            "Search every coverage.json for plans whose covered files match the query terms, ranked by match strength. "
            "Read-only: it never touches coverage. Use it at intake to find which existing plans already describe the code an incoming request touches."
        ),
    )
    parser.add_argument("terms", nargs="+", help="one or more search terms; a file path matches if it contains any term (case-insensitive)")
    parser.add_argument("--root", dest="plan_root", help="limit the search to one root (default: every root under context/plans/)")
    parser.add_argument("--limit", type=int, default=10, help="max plans to report (default: 10)")
    args = parser.parse_args(argv)

    try:
        return run(args)
    except CoverageError as exc:
        return fail(str(exc))


def run(args) -> int:
    repo_root = git_repo_root()
    terms = [t.lower() for t in args.terms]

    search_dir = repo_root / PLAN_TREE_DIR
    if args.plan_root:
        root = resolve_path_arg(args.plan_root, repo_root)
        if not is_within(root, repo_root):
            raise CoverageError(f"plan root is outside the repository: {args.plan_root}")
        if not root.is_dir():
            raise CoverageError(f"plan root not found: {args.plan_root}")
        search_dir = root

    matches = search(search_dir, repo_root, terms)
    matches.sort(key=lambda m: (-m.term_count, -len(m.files), m.plan_rel))
    print_matches(matches[: args.limit], terms, len(matches))
    return 0


class PlanMatch:
    def __init__(self, plan_rel: str):
        self.plan_rel = plan_rel  # repo-relative path to the plan .md
        self.files: list[str] = []  # covered files that matched, best-matching first
        self.terms: set[str] = set()  # which query terms matched at all

    @property
    def term_count(self) -> int:
        return len(self.terms)


def search(search_dir: Path, repo_root: Path, terms: list[str]) -> list[PlanMatch]:
    matches: list[PlanMatch] = []
    for cov_path in sorted(search_dir.rglob(COVERAGE_FILENAME)):
        coverage = read_json(cov_path, what="coverage")
        for md_name, files in coverage.items():
            if not isinstance(files, dict):
                continue
            plan_rel = (cov_path.parent / md_name).resolve().relative_to(repo_root).as_posix()
            match = match_plan(plan_rel, list(files.keys()), terms)
            if match is not None:
                matches.append(match)
    return matches


def match_plan(plan_rel: str, files: list[str], terms: list[str]) -> PlanMatch | None:
    # A file matches the plan if it contains any query term. The plan's rank is how many
    # *distinct* terms it covers (breadth of overlap with the request) and how many files
    # hit, so the plan whose code most surrounds the request floats to the top. Files are
    # ordered by how many terms each contains, so the most on-point file shows first.
    match = PlanMatch(plan_rel)
    scored: list[tuple[int, str]] = []
    for f in files:
        lower = f.lower()
        hit_terms = [t for t in terms if t in lower]
        if hit_terms:
            match.terms.update(hit_terms)
            scored.append((len(hit_terms), f))
    if not scored:
        return None
    scored.sort(key=lambda s: (-s[0], s[1]))
    match.files = [f for _n, f in scored]
    return match


def print_matches(matches: list[PlanMatch], terms: list[str], total: int) -> None:
    if not matches:
        print(f"no plans cover files matching: {' '.join(terms)}")
        return
    shown = len(matches)
    header = f"{total} plan(s) match {' '.join(terms)}"
    if shown < total:
        header += f" (showing top {shown})"
    print(header)
    print()
    for m in matches:
        missing = [t for t in terms if t not in m.terms]
        tag = f"{m.term_count}/{len(terms)} terms" + (f", missing {' '.join(missing)}" if missing else "")
        print(f"{m.plan_rel}  ({tag}, {len(m.files)} file(s))")
        for f in m.files[:8]:
            print(f"  {f}")
        if len(m.files) > 8:
            print(f"  … {len(m.files) - 8} more")
        print()


if __name__ == "__main__":
    raise SystemExit(main())
