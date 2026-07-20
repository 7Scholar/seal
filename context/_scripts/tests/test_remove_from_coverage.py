import pytest


@pytest.fixture
def covered(repo, boundary, add_cov):
    repo.write("src/a.py", "a")
    repo.write("src/sub/b.py", "b")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.write("context/plans/app/plan-a/q.md", "# q")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/sub/b.py")
    return repo


def test_remove_one_file(covered, remove_cov):
    assert remove_cov("context/plans/app/plan-a/p.md", "src/a.py") == 0
    cov = covered.coverage("context/plans/app/plan-a")
    assert cov == {"p.md": {"src/sub/b.py": cov["p.md"]["src/sub/b.py"]}}


def test_remove_folder_drops_all_under_it(covered, remove_cov):
    assert remove_cov("context/plans/app/plan-a/p.md", "src/sub") == 0
    cov = covered.coverage("context/plans/app/plan-a")
    assert "src/sub/b.py" not in cov["p.md"]
    assert "src/a.py" in cov["p.md"]


def test_removing_last_file_drops_md_key(covered, remove_cov):
    remove_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/sub/b.py")
    cov = covered.coverage("context/plans/app/plan-a")
    assert "p.md" not in cov


def test_remove_path_covering_nothing_refused(covered, remove_cov, capsys):
    rc = remove_cov("context/plans/app/plan-a/q.md", "src/a.py")
    assert rc == 1
    assert "covers nothing" in capsys.readouterr().err


def test_remove_uncovered_path_under_covered_md_refused(covered, remove_cov, capsys):
    covered.write("src/c.py", "c")
    covered.commit("add c")
    rc = remove_cov("context/plans/app/plan-a/p.md", "src/c.py")
    assert rc == 1
    assert "cover anything" in capsys.readouterr().err


def test_readme_refused(covered, remove_cov, capsys):
    covered.write("context/plans/app/plan-a/README.md", "# r")
    covered.commit("add readme")
    rc = remove_cov("context/plans/app/plan-a/README.md", "src/a.py")
    assert rc == 1
    assert "README.md covers no code" in capsys.readouterr().err


def test_deleted_md_whole_key_dropped(covered, remove_cov):
    # The plan .md is gone but its coverage key lingers. Naming the deleted .md with no paths
    # drops the orphaned key — the one removal that must work after the file is deleted.
    covered.remove("context/plans/app/plan-a/p.md")
    covered.commit("drop plan p")
    assert remove_cov("context/plans/app/plan-a/p.md") == 0
    assert "p.md" not in covered.coverage("context/plans/app/plan-a")


def test_deleted_md_with_paths_refused(covered, remove_cov, capsys):
    covered.remove("context/plans/app/plan-a/p.md")
    covered.commit("drop plan p")
    rc = remove_cov("context/plans/app/plan-a/p.md", "src/a.py")
    assert rc == 1
    assert "no longer exists on disk" in capsys.readouterr().err


def test_missing_md_with_no_key_refused(covered, remove_cov, capsys):
    # A .md that never existed (no key) names nothing to drop — a genuine mistake, refused.
    rc = remove_cov("context/plans/app/plan-a/ghost.md")
    assert rc == 1
    assert "covers nothing" in capsys.readouterr().err


def test_live_md_with_no_paths_refused(covered, remove_cov, capsys):
    # A still-present .md drops coverage per-path; omitting paths is refused, not a wholesale drop.
    rc = remove_cov("context/plans/app/plan-a/p.md")
    assert rc == 1
    err = capsys.readouterr().err
    assert "per-path" in err
    assert "p.md" in covered.coverage("context/plans/app/plan-a")
