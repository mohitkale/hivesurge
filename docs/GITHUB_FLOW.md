# GitHub flow

From now on, every change to Hive Surge goes through GitHub at
https://github.com/mohitkale/hivesurge. The order is: branch, push, PR, green CI, merge, pull.

1. **Branch.** Create a branch from an up-to-date `origin/main`, using a worktree under
   `/workspace/hivesurge-wt/`.
2. **Push.** Push the branch to `origin`.
3. **Open a PR.** Open a GitHub PR against `main` through the REST API.
4. **Wait for green CI.** The CI workflow (`.github/workflows/ci.yml`) runs `npm ci`, `npm run lint`,
   `npm test`, and `npm run build` on Node 20. Do not merge a PR while CI is red or still running.
5. **Merge.** Only `hivesurge-review` or `hivesurge-ceo` merges, through the API with merge method
   `merge`.
6. **Pull.** After the merge, update local `main`.

Local `prs/` files are optional. You can still write one for review notes, but the GitHub PR is the
source of truth.

**Never deploy to Netlify without Mohit's explicit OK.**

## Setup (already done in `/workspace/hivesurge`, shared by all worktrees)

- `origin` = `https://github.com/mohitkale/hivesurge.git`. The URL contains no token.
- Credentials come from a helper that reads `$HIVESURGE_GITHUB_TOKEN`. Never print the token or
  put it in a URL, a file, or a commit.
- The repo config sets `user.name = Mohit Kale` and
  `user.email = 32022185+mohitkale@users.noreply.github.com`. Do not override them with
  `git -c user.*`, `GIT_AUTHOR_*`, or `--author`.
- The `commit-msg` hook in `.git/hooks` adds
  `Co-authored-by: Grok Bot <grokbot@users.noreply.github.com>` to each commit message, once.
- SSH is blocked on this box. Use https only.

## Commands

```sh
# 1. Branch
cd /workspace/hivesurge && git fetch origin
git worktree add -b feat/my-change /workspace/hivesurge-wt/feat-my-change origin/main
cd /workspace/hivesurge-wt/feat-my-change
# ...edit, then run: npm run lint && npm test && npm run build
git add -A && git commit -m "feat: my change"

# 2. Push
git push -u origin feat/my-change

# 3. Open the PR
API=https://api.github.com/repos/mohitkale/hivesurge
H=(-H "Authorization: Bearer $HIVESURGE_GITHUB_TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
curl -sS "${H[@]}" -X POST $API/pulls \
  -d "$(jq -n --arg h feat/my-change --arg t 'feat: my change' --arg b 'What and why.' \
        '{head:$h, base:"main", title:$t, body:$b}')" | jq '{number, html_url}'

# 4. Check CI on the PR head
SHA=$(curl -sS "${H[@]}" $API/pulls/$PR | jq -r .head.sha)
curl -sS "${H[@]}" $API/commits/$SHA/check-runs | jq '.check_runs[] | {name, status, conclusion}'

# 5. Merge (hivesurge-review or hivesurge-ceo only, after every check run has conclusion "success")
curl -sS "${H[@]}" -X PUT $API/pulls/$PR/merge -d '{"merge_method":"merge"}' | jq '{merged, message, sha}'

# 6. Pull
cd /workspace/hivesurge && git fetch origin && git checkout main && git merge --ff-only origin/main
git push origin --delete feat/my-change   # optional cleanup
```
