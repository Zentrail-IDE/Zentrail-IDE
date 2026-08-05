use std::process::Command;
use std::str::FromStr;

use serde::Serialize;

/// A single working-tree change reported by `git status --porcelain`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub old_path: Option<String>,
    pub staged: bool,
}

/// Aggregate repository state from `git status`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitState {
    pub branch: String,
    pub detached: bool,
    pub ahead: u32,
    pub behind: u32,
    pub changes: Vec<GitFileStatus>,
}

/// A single commit in the history log.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitLogEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
    pub refs: Vec<String>,
}

/// A local or remote branch.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranch {
    pub name: String,
    pub current: bool,
    pub remote: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

/// A configured remote.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemote {
    pub name: String,
    pub fetch: String,
    pub push: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchesResult {
    pub branches: Vec<GitBranch>,
    pub remotes: Vec<GitRemote>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitResult {
    pub hash: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncResult {
    pub stdout: String,
}

/// Run a git subcommand in `root`, returning stdout or a stderr error.
fn run_git(root: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// True when `root` is inside a git work tree.
fn is_git_repo(root: &str) -> bool {
    run_git(root, &["rev-parse", "--is-inside-work-tree"])
        .map(|out| out.trim() == "true")
        .unwrap_or(false)
}

/// Parse ref decoration (e.g. ` (HEAD -> main, tag: v1.0)`) into labels.
fn parse_refs(decor: &str) -> Vec<String> {
    let inner = decor.trim().trim_start_matches('(').trim_end_matches(')').trim();
    if inner.is_empty() {
        return vec![];
    }
    inner
        .split(',')
        .map(|p| p.trim().trim_start_matches("HEAD -> ").to_string())
        .filter(|p| !p.is_empty())
        .collect()
}

/// Classify a porcelain `XY` pair into a display status + staging state.
/// Returns `(status, old_path_for_renames, staged)`.
fn classify(x: &str, y: &str, rest: &str) -> (String, Option<String>, bool) {
    let code = if x != " " && x != "?" && x != "U" { x } else { y };
    let staged = x != " " && x != "?" && x != "U";
    let status = match code {
        "A" => "added",
        "D" => "deleted",
        "M" => "modified",
        "R" => "renamed",
        "C" => "copied",
        "U" => "unmerged",
        _ => "untracked",
    }
    .to_string();
    let old_path = if code == "R" || code == "C" {
        rest.split_once(" -> ").map(|(old, _)| old.to_string())
    } else {
        None
    };
    (status, old_path, staged)
}

/// Repository status (null when `root` is not a git repo).
#[tauri::command]
pub fn git_status(root: String) -> Result<Option<GitState>, String> {
    if !is_git_repo(&root) {
        return Ok(None);
    }
    let out = run_git(
        &root,
        &["status", "--porcelain=v1", "-b", "--untracked-files=all"],
    )?;

    let mut branch = "HEAD".to_string();
    let mut detached = false;
    let mut ahead = 0u32;
    let mut behind = 0u32;
    let mut changes = Vec::new();

    for line in out.lines() {
        if let Some(rest) = line.strip_prefix("## ") {
            if rest.starts_with("HEAD") || rest.starts_with("no branch") {
                detached = true;
                branch = "detached".into();
            } else {
                branch = rest.split("...").next().unwrap_or(rest).trim().to_string();
                if let Some(start) = rest.find('[') {
                    let meta = &rest[start + 1..];
                    for part in meta.split(',') {
                        let p = part.trim();
                        if let Some(v) = p.strip_prefix("ahead ") {
                            ahead = v.trim_end_matches(']').trim().parse().unwrap_or(0);
                        } else if let Some(v) = p.strip_prefix("behind ") {
                            behind = v.trim_end_matches(']').trim().parse().unwrap_or(0);
                        }
                    }
                }
            }
            continue;
        }
        if line.len() < 4 {
            continue;
        }
        let x = &line[0..1];
        let y = &line[1..2];
        let rest = &line[3..];
        let (status, old_path, staged) = classify(x, y, rest);
        changes.push(GitFileStatus {
            path: rest.to_string(),
            status,
            old_path,
            staged,
        });
    }

    Ok(Some(GitState {
        branch,
        detached,
        ahead,
        behind,
        changes,
    }))
}

/// Recent commit history.
#[tauri::command]
pub fn git_log(root: String, limit: i64) -> Result<Vec<GitLogEntry>, String> {
    if !is_git_repo(&root) {
        return Ok(vec![]);
    }
    let fmt = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x00%d%x00";
    let out = run_git(&root, &["log", &format!("-n{limit}"), &format!("--pretty=format:{fmt}")])?;
    let parts: Vec<&str> = out.split('\0').collect();
    let mut log = Vec::new();
    for chunk in parts.chunks(7) {
        if chunk.len() < 7 {
            continue;
        }
        log.push(GitLogEntry {
            hash: chunk[0].to_string(),
            short_hash: chunk[1].to_string(),
            author: chunk[2].to_string(),
            email: chunk[3].to_string(),
            date: chunk[4].to_string(),
            message: chunk[5].to_string(),
            refs: parse_refs(chunk[6]),
        });
    }
    Ok(log)
}

/// Local/remote branches and configured remotes.
#[tauri::command]
pub fn git_branches(root: String) -> Result<BranchesResult, String> {
    if !is_git_repo(&root) {
        return Ok(BranchesResult {
            branches: vec![],
            remotes: vec![],
        });
    }

    let mut branches = Vec::new();
    let out = run_git(
        &root,
        &[
            "for-each-ref",
            "--format=%(refname:short)\t%(HEAD)\t%(upstream:short)\t%(upstream:track)",
            "refs/heads",
        ],
    )?;
    for line in out.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 4 {
            continue;
        }
        let name = cols[0].to_string();
        let current = cols[1] == "*";
        let upstream = if cols[2].is_empty() {
            None
        } else {
            Some(cols[2].to_string())
        };
        let mut ahead = 0u32;
        let mut behind = 0u32;
        if let Some(up) = &upstream {
            if let Ok(count) = run_git(&root, &["rev-list", "--left-right", "--count", &format!("{up}...{name}")]) {
                let mut it = count.split('\t');
                behind = it.next().and_then(|v| u32::from_str(v.trim()).ok()).unwrap_or(0);
                ahead = it.next().and_then(|v| u32::from_str(v.trim()).ok()).unwrap_or(0);
            }
        }
        branches.push(GitBranch {
            name,
            current,
            remote: false,
            upstream,
            ahead,
            behind,
        });
    }

    let mut remotes = Vec::new();
    if let Ok(remote_out) = run_git(&root, &["remote", "-v"]) {
        for line in remote_out.lines() {
            let cols: Vec<&str> = line.split_whitespace().collect();
            if cols.len() >= 3 {
                let name = cols[0].to_string();
                let url = cols[1].to_string();
                let kind = cols[2].trim_matches(['(', ')']);
                if let Some(r) = remotes.iter_mut().find(|r: &mut GitRemote| r.name == name) {
                    if kind == "push" {
                        r.push = url;
                    } else {
                        r.fetch = url;
                    }
                } else {
                    remotes.push(GitRemote {
                        name: name.clone(),
                        fetch: if kind == "push" { String::new() } else { url.clone() },
                        push: if kind == "push" { url.clone() } else { String::new() },
                    });
                }
            }
        }
    }

    Ok(BranchesResult { branches, remotes })
}

/// Stage files. An empty list stages everything (`git add -A`).
#[tauri::command]
pub fn git_stage(root: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        run_git(&root, &["add", "-A"])?;
    } else {
        let mut args = vec!["add".to_string(), "--".to_string()];
        args.extend(paths);
        run_git(&root, &args.iter().map(String::as_str).collect::<Vec<_>>())?;
    }
    Ok(())
}

/// Unstage files. An empty list unstages everything (`git reset`).
#[tauri::command]
pub fn git_unstage(root: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        run_git(&root, &["reset"])?;
    } else {
        let mut args = vec!["restore".to_string(), "--staged".to_string(), "--".to_string()];
        args.extend(paths);
        run_git(&root, &args.iter().map(String::as_str).collect::<Vec<_>>())?;
    }
    Ok(())
}

/// Checkout (switch to) a branch.
#[tauri::command]
pub fn git_checkout(root: String, name: String) -> Result<(), String> {
    run_git(&root, &["checkout", &name])?;
    Ok(())
}

/// Create a commit. When `all` is set, stage tracked changes first.
#[tauri::command]
pub fn git_commit(root: String, message: String, all: bool) -> Result<GitCommitResult, String> {
    if all {
        run_git(&root, &["add", "-A"])?;
    }
    run_git(&root, &["commit", "-m", &message])?;
    let hash = run_git(&root, &["rev-parse", "HEAD"])?.trim().to_string();
    Ok(GitCommitResult { hash })
}

/// Pull from the given remote (or the default upstream).
#[tauri::command]
pub fn git_pull(root: String, remote: Option<String>) -> Result<GitSyncResult, String> {
    let mut args = vec!["pull"];
    if let Some(r) = &remote {
        args.push(r);
    }
    let stdout = run_git(&root, &args)?;
    Ok(GitSyncResult { stdout })
}

/// Push to the given remote (or the default upstream).
#[tauri::command]
pub fn git_push(root: String, remote: Option<String>) -> Result<GitSyncResult, String> {
    let mut args = vec!["push"];
    if let Some(r) = &remote {
        args.push(r);
    }
    let stdout = run_git(&root, &args)?;
    Ok(GitSyncResult { stdout })
}

/// Merge a branch into the current one.
#[tauri::command]
pub fn git_merge(root: String, branch: String) -> Result<GitSyncResult, String> {
    let stdout = run_git(&root, &["merge", &branch])?;
    Ok(GitSyncResult { stdout })
}

/// Initialize a git repository in `root`.
#[tauri::command]
pub fn git_init(root: String) -> Result<(), String> {
    run_git(&root, &["init"])?;
    Ok(())
}
