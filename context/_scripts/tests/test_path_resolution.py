"""Path arguments resolve from any cwd.

The scripts are run from context/_scripts/ but are handed repo-relative paths
(src/foo.ts). resolve_path_arg makes that work regardless of cwd, and
turns the one genuinely ambiguous case into a loud error.
"""

import pytest


@pytest.fixture
def planned(repo, boundary):
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.write("context/_scripts/placeholder", "x")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    return repo


def test_add_resolves_repo_relative_path_from_subdir(planned, add_cov, monkeypatch):
    # cwd is context/_scripts/, the path is repo-relative — the real invocation shape.
    monkeypatch.chdir(planned.root / "context" / "_scripts")
    head = planned.head()
    assert add_cov("context/plans/app/plan-a/p.md", "src/a.py") == 0
    assert planned.coverage("context/plans/app/plan-a") == {"p.md": {"src/a.py": head}}


def test_run_coverage_resolves_root_from_subdir(planned, add_cov, run_cov, monkeypatch):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    monkeypatch.chdir(planned.root / "context" / "_scripts")
    # In sync after covering, so a clean root: exit 0 and no DRIFT.md written.
    assert run_cov("context/plans/app") == 0
    assert planned.drift("context/plans/app") is None


def test_absolute_path_still_works(planned, add_cov, monkeypatch):
    monkeypatch.chdir(planned.root / "context" / "_scripts")
    head = planned.head()
    abs_md = str(planned.root / "context" / "plans" / "app" / "plan-a" / "p.md")
    abs_src = str(planned.root / "src" / "a.py")
    assert add_cov(abs_md, abs_src) == 0
    assert planned.coverage("context/plans/app/plan-a") == {"p.md": {"src/a.py": head}}


def test_cwd_relative_path_still_works(planned, add_cov):
    # cwd is the repo root (the repo fixture chdirs there); a path relative to cwd resolves.
    head = planned.head()
    assert add_cov("context/plans/app/plan-a/p.md", "src/a.py") == 0
    assert planned.coverage("context/plans/app/plan-a") == {"p.md": {"src/a.py": head}}


def test_ambiguous_path_is_an_error(planned, add_cov, capsys, monkeypatch):
    # Same relative path exists both under cwd and under the repo root, as different files.
    sub = planned.root / "context" / "_scripts"
    (sub / "src").mkdir()
    (sub / "src" / "a.py").write_text("different", encoding="utf-8")
    monkeypatch.chdir(sub)
    assert add_cov("context/plans/app/plan-a/p.md", "src/a.py") == 1
    err = capsys.readouterr().err
    assert "ambiguous path" in err
