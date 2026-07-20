import pytest

from plans.detector import ChangedFinding, RemovedFinding


@pytest.fixture
def base(repo, boundary, add_cov):
    repo.write("src/a.py", "a")
    repo.write("src/b.py", "b")
    repo.write("context/plans/app/plan-a/p.md", "# p")
    repo.write("context/plans/app/plan-a/q.md", "# q")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    return repo


def findings_for(report, md_id):
    return report.by_md.get(md_id, [])


def test_clean_no_drift(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    report = detect("context/plans/app")
    assert not report.has_drift


def test_changed_carries_commits_and_counts(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.commit("cover")  # land the generated json so the edit commit is clean
    base.write("src/a.py", "a2")
    base.write("src/b.py", "b2")
    base.commit("two-file edit")
    report = detect("context/plans/app")
    changed = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, ChangedFinding)]
    assert len(changed) == 1
    assert changed[0].rel == "src/a.py"
    assert changed[0].commits[0].file_count == 2  # whole commit, not just the path


def test_surgical_vs_sweep_counts(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.commit("cover")  # land the generated json so later edit commits are clean
    base.write("src/a.py", "a2")
    base.commit("surgical")  # only a.py
    base.write("src/a.py", "a3")
    base.write("src/b.py", "b2")
    base.write("src/c.py", "c")
    base.commit("sweep")  # 3 files
    report = detect("context/plans/app")
    commits = findings_for(report, "plan-a/p.md")[0].commits
    counts = {c.subject: c.file_count for c in commits}
    assert counts["surgical"] == 1
    assert counts["sweep"] == 3


def test_removed_when_deleted(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.remove("src/a.py")
    base.commit("delete a")
    report = detect("context/plans/app")
    removed = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, RemovedFinding)]
    assert len(removed) == 1 and removed[0].rel == "src/a.py"
    assert removed[0].renames == []


def test_removed_with_rename_trail_and_uncovered_endpoint(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.rename("src/a.py", "src/a_new.py")
    rename_sha = base.commit("rename a")
    report = detect("context/plans/app")
    removed = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, RemovedFinding)]
    assert len(removed) == 1
    trail = removed[0].renames
    assert len(trail) == 1
    assert trail[0].dst == "src/a_new.py"
    # the new path is uncovered, and shares the rename commit
    uncov = {u.rel: u for u in report.uncovered}
    assert "src/a_new.py" in uncov
    short = base.short(rename_sha)
    assert uncov["src/a_new.py"].birth.sha == short
    assert trail[0].sha == short


def test_multi_hop_rename_trail(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.rename("src/a.py", "src/a2.py")
    base.commit("rename 1")
    base.rename("src/a2.py", "src/a3.py")
    base.commit("rename 2")
    report = detect("context/plans/app")
    removed = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, RemovedFinding)][0]
    dsts = [s.dst for s in removed.renames]
    assert dsts == ["src/a2.py", "src/a3.py"]


def test_content_edit_before_rename_is_visible(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    base.write("src/a.py", "edited")
    base.commit("edit before move")
    base.rename("src/a.py", "src/a_new.py")
    base.commit("move a")
    report = detect("context/plans/app")
    removed = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, RemovedFinding)][0]
    subjects = [c.subject for c in removed.commits]
    assert "edit before move" in subjects


def test_rename_before_stamp_not_in_trail(base, add_cov, detect):
    # Two plans stamped at different times share one batched log window. A rename that
    # happened before q.md's stamp (but inside the shared window, dragged open by p.md's
    # earlier stamp) belongs to an earlier life of the path and must not appear in q.md's
    # rename trail.
    add_cov("context/plans/app/plan-a/p.md", "src/b.py")  # early stamp opens the shared window wide
    base.rename("src/a.py", "src/a_old.py")
    base.commit("rename old a away")
    base.write("src/a.py", "reborn")
    base.commit("new file at old path")
    add_cov("context/plans/app/plan-a/q.md", "src/a.py")
    base.remove("src/a.py")
    base.commit("delete reborn a")
    report = detect("context/plans/app")
    removed = [f for f in findings_for(report, "plan-a/q.md") if isinstance(f, RemovedFinding)]
    assert len(removed) == 1
    assert removed[0].renames == []
    subjects = [c.subject for c in removed[0].commits]
    assert "delete reborn a" in subjects and "rename old a away" not in subjects


def test_uncovered_in_boundary_file(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    report = detect("context/plans/app")
    uncov = {u.rel for u in report.uncovered}
    assert "src/b.py" in uncov
    birth = {u.rel: u.birth for u in report.uncovered}
    assert birth["src/b.py"].subject == "init"


def test_born_and_died_no_finding(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    base.write("src/temp.py", "t")
    base.commit("add temp")
    base.remove("src/temp.py")
    base.commit("remove temp")
    report = detect("context/plans/app")
    # temp.py never covered, gone at HEAD: no finding, no uncovered entry
    assert not report.has_drift


def test_overlap_changed_appears_under_both_mds(base, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    add_cov("context/plans/app/plan-a/q.md", "src/a.py")
    base.write("src/a.py", "a2")
    base.commit("edit a")
    report = detect("context/plans/app")
    p = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, ChangedFinding)]
    q = [f for f in findings_for(report, "plan-a/q.md") if isinstance(f, ChangedFinding)]
    assert len(p) == 1 and len(q) == 1


def test_overlap_reconciled_independently_per_md(base, add_cov, detect):
    # Two nodes cover the same file. One edit lands, then only p.md is re-stamped at the
    # new HEAD; q.md keeps its pre-edit SHA. p.md must read as clean and q.md must still
    # see the edit — neither node's window may be decided by whichever coverage.json a
    # filesystem walk happens to visit first.
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")
    add_cov("context/plans/app/plan-a/q.md", "src/a.py")
    base.write("src/a.py", "a2")
    base.commit("edit a")
    add_cov("context/plans/app/plan-a/p.md", "src/a.py")  # re-stamp only p.md at the post-edit HEAD
    report = detect("context/plans/app")
    p = [f for f in findings_for(report, "plan-a/p.md") if isinstance(f, ChangedFinding)]
    q = [f for f in findings_for(report, "plan-a/q.md") if isinstance(f, ChangedFinding)]
    assert p == []
    assert len(q) == 1 and q[0].rel == "src/a.py"


def test_excluded_file_out_of_scope_no_finding(base, boundary, add_cov, detect):
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    base.write("src/a.py", "a2")
    base.commit("edit a")
    # a.py would be `changed`, but exclude carves it out
    boundary("context/plans/app", "--exclude", "src/a.py")
    report = detect("context/plans/app")
    changed = [f for fs in report.by_md.values() for f in fs if isinstance(f, ChangedFinding) and f.rel == "src/a.py"]
    assert changed == []
    # sha preserved in coverage.json
    assert "src/a.py" in base.coverage("context/plans/app/plan-a")["p.md"]


def test_docs_folder_never_uncovered(base, add_cov, detect):
    # A node's _docs/ supporting-docs folder lives under context/plans/, so it is never in any
    # boundary include and never surfaces as a finding — not even `uncovered`.
    base.write("context/plans/app/plan-a/_docs/ui.md", "# ui rules")
    base.commit("add supporting docs")
    add_cov("context/plans/app/plan-a/p.md", "src/a.py", "src/b.py")
    report = detect("context/plans/app")
    assert not report.has_drift
    assert all("_docs/" not in u.rel for u in report.uncovered)


def test_md_id_is_root_relative_with_nesting(repo, boundary, add_cov, detect):
    repo.write("src/a.py", "a")
    repo.write("context/plans/app/plan-a/deep/p.md", "# p")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    add_cov("context/plans/app/plan-a/deep/p.md", "src/a.py")
    repo.write("src/a.py", "a2")
    repo.commit("edit")
    report = detect("context/plans/app")
    assert "plan-a/deep/p.md" in report.by_md
