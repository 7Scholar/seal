import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class Repo:
    def __init__(self, root: Path):
        self.root = root

    def write(self, relpath: str, content: str = "x") -> Path:
        path = self.root / relpath
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def remove(self, relpath: str) -> None:
        self._git("rm", "-q", "--", relpath)

    def rename(self, src: str, dst: str) -> None:
        (self.root / dst).parent.mkdir(parents=True, exist_ok=True)
        self._git("mv", src, dst)

    def commit(self, message: str = "c") -> str:
        self._git("add", "-A")
        self._git("commit", "-m", message, "--allow-empty")
        return self.head()

    def head(self) -> str:
        return self._git("rev-parse", "HEAD")

    def short(self, ref: str = "HEAD") -> str:
        return self._git("rev-parse", "--short", ref)

    def coverage(self, relfolder: str) -> dict | None:
        return self._read_json(relfolder, "coverage.json")

    def boundary(self, relfolder: str) -> dict | None:
        return self._read_json(relfolder, "boundary.json")

    def drift(self, relfolder: str) -> str | None:
        path = self.root / relfolder / "DRIFT.md"
        return path.read_text(encoding="utf-8") if path.exists() else None

    def _read_json(self, relfolder: str, name: str) -> dict | None:
        path = self.root / relfolder / name
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _git(self, *args: str) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=self.root,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()


@pytest.fixture
def repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Repo:
    root = tmp_path / "repo"
    root.mkdir()
    r = Repo(root)
    r._git("init")
    r._git("config", "user.email", "test@test.com")
    r._git("config", "user.name", "test")
    r._git("config", "core.autocrlf", "false")
    r._git("commit", "-m", "init", "--allow-empty")
    monkeypatch.chdir(root)
    return r


@pytest.fixture
def add_cov():
    from plans import add_to_coverage

    def _run(*args: str) -> int:
        return add_to_coverage.main(list(args))

    return _run


@pytest.fixture
def remove_cov():
    from plans import remove_from_coverage

    def _run(*args: str) -> int:
        return remove_from_coverage.main(list(args))

    return _run


@pytest.fixture
def boundary():
    from plans import set_boundary

    def _run(*args: str) -> int:
        return set_boundary.main(list(args))

    return _run


@pytest.fixture
def detect():
    from plans.detector import build_report

    def _detect(plan_root: str):
        return build_report(plan_root)

    return _detect


@pytest.fixture
def run_cov():
    from plans import run_coverage

    def _run(*args: str) -> int:
        return run_coverage.main(list(args))

    return _run


@pytest.fixture
def find(capsys):
    from plans import find_plans

    def _run(*args: str) -> tuple[int, str]:
        code = find_plans.main(list(args))
        return code, capsys.readouterr().out

    return _run

