import pytest


@pytest.fixture
def planned(repo, boundary, add_cov):
    # Two roots, several plans, so search has to span roots and resolve bare .md
    # keys back to full plan paths.
    repo.write("src/upload/cancel.ts", "x")
    repo.write("src/upload/hooks/use-file-uploads.ts", "x")
    repo.write("src/library/folders.ts", "x")
    repo.write("src-tauri/src/files/storage.rs", "x")
    repo.write("context/plans/app/files/upload.md", "# upload")
    repo.write("context/plans/app/files/library.md", "# library")
    repo.write("context/plans/app/files/README.md", "# readme")
    repo.write("context/plans/other/storage.md", "# storage")
    repo.write("context/plans/other/README.md", "# readme")
    repo.commit("init")
    boundary("context/plans/app", "--include", "src")
    boundary("context/plans/other", "--include", "src-tauri")
    add_cov("context/plans/app/files/upload.md", "src/upload")
    add_cov("context/plans/app/files/library.md", "src/library")
    add_cov("context/plans/other/storage.md", "src-tauri/src/files/storage.rs")
    return repo


def test_matches_plan_by_covered_file_path(planned, find):
    code, out = find("upload")
    assert code == 0
    assert "context/plans/app/files/upload.md" in out
    assert "context/plans/app/files/library.md" not in out


def test_resolves_bare_md_key_to_full_plan_path(planned, find):
    # coverage.json keys are bare ("upload.md"); the agent needs the full path.
    _code, out = find("cancel")
    assert "context/plans/app/files/upload.md" in out
    assert "upload.md\n" not in out  # never the bare key alone


def test_terms_are_or_and_rank_by_distinct_terms(planned, find):
    # upload.md covers files matching both "upload" and "cancel"; library.md only "library".
    _code, out = find("upload", "cancel", "library")
    upload_at = out.index("context/plans/app/files/upload.md")
    library_at = out.index("context/plans/app/files/library.md")
    assert upload_at < library_at  # broader overlap ranks higher


def test_reports_missing_terms(planned, find):
    _code, out = find("upload", "nonexistent")
    assert "missing nonexistent" in out


def test_spans_multiple_roots(planned, find):
    _code, out = find("storage")
    assert "context/plans/other/storage.md" in out


def test_root_scope_limits_search(planned, find):
    _code, out = find("storage", "--root", "context/plans/app")
    assert "context/plans/other/storage.md" not in out
    assert "no plans cover" in out


def test_no_match_reports_cleanly(planned, find):
    code, out = find("zzznomatch")
    assert code == 0
    assert "no plans cover files matching: zzznomatch" in out


def test_case_insensitive(planned, find):
    _code, out = find("UPLOAD")
    assert "context/plans/app/files/upload.md" in out


def test_limit_caps_results(planned, find):
    # "src" appears in many covered paths across plans; --limit 1 shows one.
    _code, out = find("src", "--limit", "1")
    plan_lines = [ln for ln in out.splitlines() if ln.startswith("context/plans/")]
    assert len(plan_lines) == 1
    assert "showing top 1" in out
