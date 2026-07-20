def setup_plan(repo):
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.commit("init tree")


def test_include_creates_boundary(repo, boundary):
    setup_plan(repo)
    assert boundary("context/plans/app", "--include", "src") == 0
    assert repo.boundary("context/plans/app") == {"include": ["src"], "exclude": []}


def test_include_and_exclude(repo, boundary):
    setup_plan(repo)
    repo.write("src/legacy/old.py", "o")
    repo.commit("add legacy")
    assert boundary("context/plans/app", "--include", "src", "--exclude", "src/legacy") == 0
    assert repo.boundary("context/plans/app") == {"include": ["src"], "exclude": ["src/legacy"]}


def test_exclude_under_no_include_refused(repo, boundary, capsys):
    setup_plan(repo)
    repo.write("other/x.py", "x")
    repo.commit("add other")
    rc = boundary("context/plans/app", "--include", "src", "--exclude", "other")
    assert rc == 1
    err = capsys.readouterr().err
    assert "carve nothing" in err and "other" in err
    # nothing written
    assert repo.boundary("context/plans/app") is None


def test_remove_include(repo, boundary):
    setup_plan(repo)
    repo.write("pkg/y.py", "y")
    repo.commit("add pkg")
    boundary("context/plans/app", "--include", "src", "--include", "pkg")
    assert boundary("context/plans/app", "--remove-include", "pkg") == 0
    assert repo.boundary("context/plans/app")["include"] == ["src"]


def test_remove_include_not_stored_refused(repo, boundary, capsys):
    setup_plan(repo)
    boundary("context/plans/app", "--include", "src")
    rc = boundary("context/plans/app", "--remove-include", "src/nope")
    assert rc == 1
    assert "not currently stored" in capsys.readouterr().err
    # boundary unchanged
    assert repo.boundary("context/plans/app")["include"] == ["src"]


def test_remove_exclude_not_stored_refused(repo, boundary, capsys):
    setup_plan(repo)
    boundary("context/plans/app", "--include", "src")
    rc = boundary("context/plans/app", "--remove-exclude", "src/whatever")
    assert rc == 1
    assert "not currently stored" in capsys.readouterr().err


def test_plan_tree_path_refused(repo, boundary, capsys):
    setup_plan(repo)
    rc = boundary("context/plans/app", "--include", "context/plans/app/plan-a")
    assert rc == 1
    assert "plan tree" in capsys.readouterr().err


def test_nonexistent_path_refused(repo, boundary, capsys):
    setup_plan(repo)
    rc = boundary("context/plans/app", "--include", "ghost")
    assert rc == 1
    assert "path not found" in capsys.readouterr().err


def test_nothing_to_do_refused(repo, boundary, capsys):
    setup_plan(repo)
    rc = boundary("context/plans/app")
    assert rc == 1
    assert "nothing to do" in capsys.readouterr().err
