import pytest


@pytest.fixture
def planned(repo, boundary):
    repo.write("src/a.py", "a")
    repo.write("src/b.py", "b")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.write("context/plans/app/plan-a/q.md", "# q")
    repo.write("context/plans/app/plan-a/README.md", "# readme")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    return repo


def test_basic_cover_stamps_head(planned, add_cov):
    head = planned.head()
    assert add_cov("context/plans/app/plan-a/p.md", "src/a.py") == 0
    cov = planned.coverage("context/plans/app/plan-a")
    assert cov == {"p.md": {"src/a.py": head}}


def test_folder_expands_to_tracked_files(planned, add_cov):
    head = planned.head()
    assert add_cov("context/plans/app/plan-a/p.md", "src") == 0
    cov = planned.coverage("context/plans/app/plan-a")
    assert cov["p.md"] == {"src/a.py": head, "src/b.py": head}


def test_upsert_merges_does_not_replace(planned, add_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    add_cov("context/plans/app/plan-a/p.md", "src/b.py")
    cov = planned.coverage("context/plans/app/plan-a")
    assert set(cov["p.md"]) == {"src/a.py", "src/b.py"}


def test_re_add_restamps_only_named_file(planned, add_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    first = planned.coverage("context/plans/app/plan-a")["p.md"]["src/a.py"]
    planned.write("src/a.py", "a2")
    new_head = planned.commit("edit a")
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    cov = planned.coverage("context/plans/app/plan-a")["p.md"]
    assert cov["src/a.py"] == new_head and cov["src/a.py"] != first
    # b.py left at its original stamp
    assert cov["src/b.py"] == first


def test_overlap_same_file_two_mds(planned, add_cov):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    add_cov("context/plans/app/plan-a/q.md", "src/a.py")
    cov = planned.coverage("context/plans/app/plan-a")
    assert "src/a.py" in cov["p.md"] and "src/a.py" in cov["q.md"]


def test_untracked_file_refused(planned, add_cov, capsys):
    planned.write("src/new.py", "new")  # written but not committed
    rc = add_cov("context/plans/app/plan-a/p.md", "src/new.py")
    assert rc == 1
    err = capsys.readouterr().err
    assert "not git-tracked" in err and "src/new.py" in err
    assert planned.coverage("context/plans/app/plan-a") is None


def test_untracked_file_inside_folder_refused(planned, add_cov, capsys):
    planned.write("src/new.py", "new")  # untracked, inside the named folder
    rc = add_cov("context/plans/app/plan-a/p.md", "src")
    assert rc == 1
    err = capsys.readouterr().err
    assert "not git-tracked" in err and "src/new.py" in err
    assert planned.coverage("context/plans/app/plan-a") is None


def test_dirty_file_refused(planned, add_cov, capsys):
    planned.write("src/a.py", "a2")  # tracked, modified, not committed
    rc = add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    assert rc == 1
    err = capsys.readouterr().err
    assert "uncommitted changes" in err and "src/a.py" in err
    assert planned.coverage("context/plans/app/plan-a") is None


def test_dirty_file_refused_is_all_or_nothing(planned, add_cov):
    planned.write("src/a.py", "a2")
    rc = add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    assert rc == 1
    assert planned.coverage("context/plans/app/plan-a") is None


def test_out_of_boundary_refused_with_hint(planned, add_cov, capsys):
    planned.write("other/x.py", "x")
    planned.commit("add other")
    rc = add_cov("context/plans/app/plan-a/p.md", "other/x.py")
    assert rc == 1
    err = capsys.readouterr().err
    assert "outside the boundary" in err
    assert "set_boundary context/plans/app --include other/x.py" in err
    assert planned.coverage("context/plans/app/plan-a") is None


def test_out_of_boundary_is_all_or_nothing(planned, add_cov, capsys):
    planned.write("other/x.py", "x")
    planned.commit("add other")
    # one in-boundary, one out: nothing should be covered
    rc = add_cov("context/plans/app/plan-a/p.md", "src/a.py", "other/x.py")
    assert rc == 1
    assert planned.coverage("context/plans/app/plan-a") is None


def test_readme_refused(planned, add_cov, capsys):
    rc = add_cov("context/plans/app/plan-a/README.md", "src/a.py")
    assert rc == 1
    assert "README.md covers no code" in capsys.readouterr().err


def test_plans_path_refused(planned, add_cov, capsys):
    rc = add_cov("context/plans/app/plan-a/p.md", "context/plans/app/plan-a/q.md")
    assert rc == 1
    assert "plan tree" in capsys.readouterr().err


def test_docs_folder_path_refused(planned, add_cov, capsys):
    # A _docs/ supporting-docs path is under context/plans/, so covering it is refused like any
    # other path inside the plan tree — a node never covers its own supporting docs.
    planned.write("context/plans/app/plan-a/_docs/ui.md", "# ui rules")
    planned.commit("add supporting docs")
    rc = add_cov("context/plans/app/plan-a/p.md", "context/plans/app/plan-a/_docs/ui.md")
    assert rc == 1
    assert "plan tree" in capsys.readouterr().err


def test_nonexistent_path_refused(planned, add_cov, capsys):
    rc = add_cov("context/plans/app/plan-a/p.md", "src/ghost.py")
    assert rc == 1
    assert "resolves to nothing" in capsys.readouterr().err


def test_missing_md_refused(planned, add_cov, capsys):
    rc = add_cov("context/plans/app/plan-a/ghost.md", "src/a.py")
    assert rc == 1
    assert "not found" in capsys.readouterr().err


def test_no_boundary_creates_empty_then_refuses_with_hint(repo, add_cov, capsys):
    # With no boundary, the empty boundary.json is created on demand at the root, and the
    # named path (outside the empty boundary) is refused with the exact set_boundary hint.
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.commit("init")
    rc = add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    assert rc == 1
    err = capsys.readouterr().err
    assert "outside the boundary" in err
    assert "set_boundary context/plans/app --include src/a.py" in err
    # the empty boundary was created at the root; nothing was covered
    assert repo.boundary("context/plans/app") == {"include": [], "exclude": []}
    assert repo.coverage("context/plans/app/plan-a") is None


def test_first_add_succeeds_after_seeding_boundary(repo, add_cov, boundary):
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    assert add_cov("context/plans/app/plan-a/p.md", "src/a.py") == 0
    assert "src/a.py" in repo.coverage("context/plans/app/plan-a")["p.md"]
