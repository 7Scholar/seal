from pathlib import Path

from plans.coverage_lib import CoverageError, git_repo_root, is_within, resolve_path_arg


def validate_plan_md_arg(md_arg: str, repo_root: Path) -> Path:
    # The shape checks every coverage key must pass, with existence left out: a coverage key
    # is always a plan .md, and a README.md is pure coordination — it covers no code — so it
    # (and any non-.md, or a path outside the repo) is refused, named, with nothing changed.
    # Existence is *not* checked here, so a deleted plan's orphaned key can still be named for
    # removal — the one operation that must work after its .md is gone.
    md_path = resolve_path_arg(md_arg, repo_root)
    if not is_within(md_path, repo_root):
        raise CoverageError(f"plan .md is outside the repository: {md_arg}")
    if md_path.suffix != ".md":
        raise CoverageError(f"not a .md file: {md_arg}")
    if md_path.name == "README.md":
        raise CoverageError(f"a README.md covers no code (it is pure coordination): {md_arg}; name a plan .md instead")
    return md_path


def resolve_plan_md(md_arg: str, repo_root: Path) -> Path:
    # The shape checks plus existence: for callers that must act on a live .md (covering a
    # path under it). A deleted .md is a hard error here.
    md_path = validate_plan_md_arg(md_arg, repo_root)
    if not md_path.exists():
        raise CoverageError(f"plan .md not found: {md_arg}")
    return md_path


# Re-exported so callers need only one import site for the .md resolution.
__all__ = ["resolve_plan_md", "validate_plan_md_arg", "git_repo_root"]
