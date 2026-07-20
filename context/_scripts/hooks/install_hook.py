import shutil
import stat
import subprocess
import sys
from pathlib import Path

# Each hook installed into .git/hooks, paired with a marker string unique to our version
# of it. The marker lets a re-install overwrite our own hook while refusing to clobber an
# unrelated hook a user already placed there.
HOOKS = {
    "pre-commit": "plan-system pre-commit",
    "post-commit": "plan-system post-commit",
}


def main(argv: list[str] | None = None) -> int:
    repo_root = git_repo_root()
    if repo_root is None:
        print("error: not inside a git repository", file=sys.stderr)
        return 1

    # The hook source files (post-commit, pre-commit) sit beside this module in the hooks/
    # package — shared context tooling, not plan-specific.
    source_dir = Path(__file__).resolve().parent
    hooks_dir = repo_root / ".git" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)

    for hook_name, marker in HOOKS.items():
        rc = install_one(source_dir, hooks_dir, hook_name, marker)
        if rc != 0:
            return rc
    return 0


def install_one(source_dir: Path, hooks_dir: Path, hook_name: str, marker: str) -> int:
    source = source_dir / hook_name
    if not source.exists():
        print(f"error: hook source missing: {source}", file=sys.stderr)
        return 1

    dest = hooks_dir / hook_name
    if dest.exists():
        existing = dest.read_text(encoding="utf-8", errors="ignore")
        if marker not in existing:
            print(
                f"error: a different {hook_name} hook already exists at {dest}.\nInspect it and merge by hand, then re-run.",
                file=sys.stderr,
            )
            return 1

    shutil.copyfile(source, dest)
    dest.chmod(dest.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    print(f"installed {hook_name} hook -> {dest}")
    return 0


def git_repo_root() -> Path | None:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip()).resolve()


if __name__ == "__main__":
    raise SystemExit(main())
