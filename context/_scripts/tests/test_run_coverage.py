import pytest


@pytest.fixture
def base(repo, boundary, add_cov):
    repo.write("src/a.py", "a")
    repo.write("src/b.py", "b")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    return repo


def test_writes_drift_and_exits_nonzero(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    base.write("src/a.py", "a2")
    base.commit("edit a")
    rc = run_cov("context/plans/app")
    assert rc == 1
    drift = base.drift("context/plans/app")
    assert drift is not None
    assert "## plan-a/p.md" in drift
    assert "- changed src/a.py" in drift


def test_clean_root_no_drift_file_and_exit_zero(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    rc = run_cov("context/plans/app")
    assert rc == 0
    assert base.drift("context/plans/app") is None


def test_deletes_stale_drift_when_clean(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    (base.root / "context/plans/app/DRIFT.md").write_text("stale", encoding="utf-8")
    rc = run_cov("context/plans/app")
    assert rc == 0
    assert base.drift("context/plans/app") is None


def test_all_refreshes_every_root(repo, boundary, add_cov, run_cov):
    repo.write("src/a.py", "a")
    repo.write("lib/c.py", "c")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.write("context/plans/other/o.md", "# o")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    boundary("context/plans/other", "--include", "lib")
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    add_cov("context/plans/other/o.md", "lib/c.py")
    # only the app root drifts
    repo.write("src/a.py", "a2")
    repo.commit("edit a")
    rc = run_cov("--all")
    assert rc == 1
    assert repo.drift("context/plans/app") is not None
    assert repo.drift("context/plans/other") is None


def test_uncovered_block_rendered(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")  # b.py left uncovered
    rc = run_cov("context/plans/app")
    assert rc == 1
    drift = base.drift("context/plans/app")
    assert "## Uncovered" in drift
    assert "- src/b.py" in drift
    assert "(born)" in drift


def test_removed_with_rename_rendered(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    base.rename("src/a.py", "src/a_new.py")
    base.commit("rename a")
    rc = run_cov("context/plans/app")
    assert rc == 1
    drift = base.drift("context/plans/app")
    assert "- removed src/a.py" in drift
    assert "rename -> src/a_new.py" in drift


def test_file_count_pluralization(base, add_cov, run_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.commit("cover")  # land generated json so the edit commit touches only a.py
    base.write("src/a.py", "a2")
    base.commit("solo")  # 1 file
    drift_rc = run_cov("context/plans/app")
    assert drift_rc == 1
    drift = base.drift("context/plans/app")
    assert "(1 file)" in drift and "(1 files)" not in drift


def test_no_arg_refused(base, run_cov, capsys):
    rc = run_cov()
    assert rc == 1
    assert "nothing to do" in capsys.readouterr().err


def test_unknown_folder_refused(base, run_cov, capsys):
    rc = run_cov("context/plans/ghost")
    assert rc == 1
    assert "not a folder" in capsys.readouterr().err


def test_folder_outside_plan_root_refused(base, run_cov, capsys):
    (base.root / "src").mkdir(exist_ok=True)
    rc = run_cov("src")
    assert rc == 1
    assert "not under a plan root" in capsys.readouterr().err


def test_clean_root_prints_no_drift(base, add_cov, run_cov, capsys):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    rc = run_cov("context/plans/app")
    assert rc == 0
    assert "no drift" in capsys.readouterr().out


def test_drifted_root_prints_drift_path(base, add_cov, run_cov, capsys):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    base.write("src/a.py", "a2")
    base.commit("edit a")
    rc = run_cov("context/plans/app")
    assert rc == 1
    out = capsys.readouterr().out
    assert "drift in 1 plan" in out
    assert "context/plans/app/DRIFT.md" in out


def test_subfolder_scope_reports_only_that_subtree(repo, boundary, add_cov, run_cov, capsys):
    repo.write("src/a.py", "a")
    repo.write("src/b.py", "b")
    repo.write("context/plans/app/shell/p.md", "# p")
    repo.write("context/plans/app/files/q.md", "# q")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    add_cov("context/plans/app/shell/p.md", "src/a.py")
    add_cov("context/plans/app/files/q.md", "src/b.py")
    # only the files subtree drifts
    repo.write("src/b.py", "b2")
    repo.commit("edit b")
    # scoping to shell sees no drift, exits zero, but the root DRIFT.md still exists
    rc = run_cov("context/plans/app/shell")
    assert rc == 0
    assert "context/plans/app/shell/: no drift" in capsys.readouterr().out
    assert repo.drift("context/plans/app") is not None


def test_subfolder_scope_surfaces_its_own_drift(repo, boundary, add_cov, run_cov, capsys):
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/shell/p.md", "# p")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    add_cov("context/plans/app/shell/p.md", "src/a.py")
    repo.write("src/a.py", "a2")
    repo.commit("edit a")
    rc = run_cov("context/plans/app/shell")
    assert rc == 1
    assert "context/plans/app/shell/: drift in 1 plan" in capsys.readouterr().out
