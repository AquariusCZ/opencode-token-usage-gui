# Launch playbook

A working plan for getting `opencode-token-usage-gui` in front of the people who would actually use it.
Everything below assumes one rule: the repository is the product page, and every channel points back to it.

## 1. First principles

Promotion is **relevance × trust × low-friction install**. If any factor is zero, the post does nothing.

- **Relevance.** The plugin solves a narrow, concrete problem: OpenCode Desktop shows the latest request and the
  session total, but not what *this turn* cost. Every channel should lead with that gap, not with "a new plugin".
- **Trust.** A public repo with a readable README, a real screenshot, passing CI, an MIT license and an author who
  answers questions. No inflated numbers, no fake testimonials.
- **Low friction.** One command, then reload. If a reader needs more than 30 seconds to see a capsule, the post
  failed. Do not send people to npm; the package name is a placeholder.

Operating rules that follow from this:

- **One canonical release page.** The GitHub release is the source of truth. Channel posts are short pointers to it.
- **No spray-and-pray.** Five relevant channels done well beat twenty copy-pastes. One post per channel.
- **Let people try in 30 seconds.** Install command first, caveats second, architecture last.
- **Answer issues fast.** The first week's issue response time is the real launch metric.

## 2. Positioning

### One-liner

> Per-turn token, cache and cost capsules for every OpenCode Desktop V2 reply, plus an always-on session total in the composer dock.

### 30-second pitch

OpenCode Desktop tells you how big the context is and what the session has cost so far. It does not tell you what
the reply you are looking at actually cost. This plugin adds one compact line under each turn: input, output, cache
reads, cache hit rate, total tokens and RMB cost. Each turn's capsule stays under its reply and updates live while
the model is thinking or running tools; the composer dock always shows the session summary. A queued or steered
prompt never creates a zero capsule. Hover for a theme-native card with a composition bar, six metrics, request
count and active time. One `opencode plugin add` command, zero runtime dependencies, no network by default.

### Three audience angles

**1. OpenCode Desktop users paying for DeepSeek or Anthropic models.**
The bill is dominated by cache reads and cache hit rate, and those are invisible in the normal UI. Lead with the
cache-aware line and the per-turn cost. This is the largest and most motivated audience.

**2. V2 GUI plugin developers.**
There is no official message-footer slot in the experimental GUI plugin API, so this is a real, working example of
DOM injection into the desktop app: slot discovery, `MutationObserver` re-attachment, fixed body-portal overlays,
theme tokens, and graceful failure when a selector moves. Lead with "a working reference, not a hello world".

**3. Cost- and observability-minded users.**
They already watch context size; they want per-turn attribution plus a lifetime session ledger. Lead with the
distinction between "sum of the transcript" and "what the session was billed", including compaction and subagents.

## 3. Current gaps to fix before posting

Do these in order. Posting before the release page matches the code is the most common way to waste a launch.

- [x] **Push `main`.** v0.3.0 is public on GitHub; the repo and README are the product page.
- [x] **Tag and release v0.3.0.** Public, with the install path on GitHub.
- [ ] **Tag and release v0.3.1.** Use `docs/release-0.3.1.md` as the release body. Attach nothing unless there is a
      real artifact; the install path is GitHub.
- [x] **Leave npm alone.** `opencode-token-usage-gui` on npm is a `0.0.0-stage` placeholder. Do not advertise
      `npm install`, and do not publish to npm as part of the launch.
- [ ] **Real screenshot or GIF.** `assets/screenshot-en.png` is an explicitly labeled illustrative mock. Record a
      real session on OpenCode Desktop 2.2.3 and replace the hero image, or add the real capture beside the mock.
      This is the single highest-value pre-launch task.
- [x] **Enable GitHub Discussions.** Settings → General → Features → Discussions. Create a "Show and tell" category
      if it does not exist.
- [x] **Upload the social preview.** Settings → General → Social preview → upload `assets/social-preview.png`
      (1280×640).
- [ ] **Confirm issue templates render.** Open `/issues/new/choose` and check the two forms and the contact link.
- [ ] **Re-read the README top.** It should state the V2 requirement, the install command and the mock disclaimer
      within the first screen.

## 4. Channel plan

Times are relative to T0, the moment the v0.3.1 release page is live. Do not compress the whole list into one day;
each channel benefits from the previous one existing.

| Order | Channel | Timing | Why | Effort |
| --- | --- | --- | --- | --- |
| 1 | GitHub release + repo metadata | T0 | Canonical page; everything else links here | 30 min |
| 2 | [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) PR | T0 + 1 day | Durable discovery; the list is referenced by OpenCode's own ecosystem page | 15 min |
| 3 | [OpenCode ecosystem docs](https://opencode.ai/docs/ecosystem) PR | T0 + 1–2 days | Official community list, high-intent traffic | 15 min |
| 4 | [OpenCode Discord](https://opencode.ai/discord) | T0 + 2–3 days | Where users report breakage and ask for plugins; one post in the closest channel (`#plugins` / showcase) | 20 min + replies |
| 5 | [opencode.cafe submit](https://www.opencode.cafe/submit) | T0 + 3 days | Community directory with a submission form | 10 min |
| 6 | GitHub Discussions "Show your project" | T0 + 3 days, after enabling | Gives non-Discord users a place to ask; indexable | 15 min |
| 7 | Optional: Reddit / HN / X / 知乎 / V2EX / 少数派 | T0 + 1 week | Only if there is a real demo or a story (e.g. "what 21 requests in one turn actually cost"). Skip otherwise | 1–2 h |

Notes:

- The ecosystem page and awesome-opencode overlap on purpose: one is the official docs, the other is a curated list
  that OpenCode's docs link to. Both are PRs, both are slow, neither is spam.
- Discord is a conversation, not a billboard. Post once, then answer. If the channel rules require an intro or a
  showcase thread, follow them.
- Do not open a Discussions post before Discussions is enabled; the link will 404.

## 5. Exact copy

Replace nothing except the screenshot path once a real capture exists. Keep the install command identical
everywhere.

### 5.1 GitHub release intro

Title:

```text
v0.3.1 — one session summary in the dock, per-turn capsules in the transcript
```

Body: use `docs/release-0.3.1.md` verbatim.

### 5.2 awesome-opencode PR

Title:

```text
Add OpenCode Token Usage plugin
```

Body:

```markdown
Adds a GUI plugin for OpenCode Desktop V2 that shows per-turn token, cache and cost capsules.

- Repo: https://github.com/AquariusCZ/opencode-token-usage-gui
- Entry: `data/plugins/opencode-token-usage.yaml`
- Scope: global
- Install: `opencode plugin add github:AquariusCZ/opencode-token-usage-gui`
- License: MIT

The entry validates against `data/schema.json` (required fields present, tagline under 120 characters).
Happy to adjust the tagline, tags or category if the list has a preferred convention.
```

YAML: `docs/launch/awesome-opencode.yaml` (copy to `data/plugins/opencode-token-usage.yaml` in the PR).

### 5.3 OpenCode ecosystem docs PR

Repository: `anomalyco/opencode`, file `packages/web/src/content/docs/ecosystem.mdx` (verify the path on the current
default branch before editing).

Title:

```text
docs: add opencode-token-usage-gui to ecosystem plugins
```

Body:

```markdown
Adds a community GUI plugin for OpenCode Desktop V2 to the ecosystem plugin table.

- Repo: https://github.com/AquariusCZ/opencode-token-usage-gui
- What it does: one capsule per turn in the transcript with input/output tokens, cache reads and hit rate, total
  tokens and RMB cost; the composer dock always shows the session-wide summary, running or queued.
- Install: `opencode plugin add github:AquariusCZ/opencode-token-usage-gui`
- License: MIT

The plugin uses the experimental V2 GUI plugin API, so the entry describes it as a desktop GUI plugin.
```

Table row:

```markdown
| [opencode-token-usage-gui](https://github.com/AquariusCZ/opencode-token-usage-gui) | Per-turn token, cache and cost capsules in OpenCode Desktop V2 |
```

### 5.4 OpenCode Discord post

Attach `assets/screenshot-en.png` (or the real capture once it exists). Post in `#plugins` or the closest official
showcase channel.

```text
I built a small GUI plugin for OpenCode Desktop V2: per-turn token, cache and cost capsules.

The desktop app shows the latest request and the session total, but not what the turn you're reading actually cost.
This adds one line under each turn — input/output, cache reads, cache hit rate, total tokens, RMB cost — with a
details card on hover. Each turn's capsule stays under its reply and updates live; the composer dock always shows
the session total, running or queued.

Install:
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
then reload (Ctrl/Cmd+R) or `opencode service restart`.

Caveat: it targets the experimental V2 GUI plugin API and injects a footer into the message DOM, so a future
desktop release can break the selector. It fails quietly (one log warning) instead of breaking the timeline. Tested
on Desktop 2.2.3 / Windows 11; macOS and Linux should work but are untested.

MIT, zero runtime deps, no network unless you opt into the daily FX rate. Feedback and selector breakage reports
welcome: https://github.com/AquariusCZ/opencode-token-usage-gui/issues
```

### 5.5 opencode.cafe submission

Use `https://www.opencode.cafe/submit`. If a field is not on the form, skip it rather than inventing one.

- **Name:** OpenCode Token Usage
- **Repo / URL:** https://github.com/AquariusCZ/opencode-token-usage-gui
- **Tagline:** Per-turn token, cache-hit and RMB cost capsules for every OpenCode Desktop V2 reply.
- **Description:** A zero-config GUI plugin for OpenCode Desktop V2. One capsule per turn shows input/output, cache
  reads and hit rate, total tokens and RMB cost. Each turn's capsule stays under its reply and updates live; the
  composer dock always shows the session total, running or queued. Hover for a theme-native breakdown
  card with a composition bar, six metrics, requests, active time and exchange-rate source. Configurable left/right
  popover, compact/detailed modes, zero runtime dependencies, no network unless the optional auto FX rate is enabled.
- **Install:** `opencode plugin add github:AquariusCZ/opencode-token-usage-gui`
- **Tags:** opencode, opencode-plugin, desktop, token-usage, cost-tracking, observability
- **License:** MIT

### 5.6 GitHub Discussion post

Category: Show and tell (or the closest "Show your project" category).

Title:

```text
Per-turn token, cache and cost capsules for OpenCode Desktop V2
```

Body:

````markdown
I wanted to know what the reply in front of me cost, not just how large the context is, so I built a GUI plugin for
OpenCode Desktop V2.

What it shows:
- One capsule per turn: input, output, cache reads, cache hit rate, total tokens, RMB cost. It stays under its
  reply and updates live while the turn runs; a queued or steered prompt never creates a zero capsule.
- A session-wide summary that is always in the composer dock, running or queued. Totals come from the app's
  session ledger, so they include compaction/title usage and, where available, subagents.
- A theme-native details card on hover or pin: composition bar, six metrics, request count, active time, FX source.
- `popoverSide` ("left" default, "right"), compact/detailed modes, bilingual UI.

Install:
```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```
Then reload with Ctrl/Cmd+R or `opencode service restart`.

It is built on the experimental V2 GUI plugin API (`./gui-experimental`, `@opencode/plugin/gui`) and injects the
footer into the message DOM, so a future desktop release can move the selector. It logs one warning and stays quiet
instead of breaking the timeline. Tested with Desktop 2.2.3 on Windows 11; macOS/Linux should work but are untested.

MIT, zero runtime deps, no network by default. Repo and README:
https://github.com/AquariusCZ/opencode-token-usage-gui

If you try it, I would like to know: does the capsule land under the right turn, and does the session summary match
what you expect after a compaction or a subagent run?
````

### 5.7 Chinese short post (V2EX / 少数派 / 即刻)

Title option: `给 OpenCode Desktop 写了个小插件：看每轮对话花了多少 token 和多少钱`

```text
用 OpenCode Desktop 的时候，上下文面板只告诉我现在窗口有多大、这个会话一共花了多少，但我真正想知道的是「眼前这轮回复花了多少」。尤其是 DeepSeek、Anthropic 这种缓存命中影响很大的模型，缓存读和命中率不显示，账单看起来就很没头绪。

所以我写了个 GUI 插件，在每轮回复下面加一行：输入、输出、缓存读、缓存命中率、总 token、人民币花费。每条回复下面的胶囊会随着这一轮实时更新；输入框上方始终显示整个会话的总量，运行中、排队时都在。鼠标悬停能看一张跟随主题的明细卡，有构成条、六项指标、请求数、耗时和汇率来源。卡片可以固定在左边或右边，也能切紧凑/详细模式。

安装只要一条命令，然后重载：

opencode plugin add github:AquariusCZ/opencode-token-usage-gui

然后 Ctrl/Cmd+R 重载，或者 opencode service restart。

几点说明：它用的是 OpenCode Desktop V2 的实验性 GUI 插件接口，而且因为官方没有消息 footer 插槽，最后一步是往 DOM 里注入，所以未来桌面版改结构可能会失效。失效时它只打一条警告，不会把时间线弄坏。我只在 Windows 11 + Desktop 2.2.3 上测过，macOS 和 Linux 理论上可以但没验证。MIT，零运行时依赖，默认不联网（只有主动开启自动汇率才会每天请求一次）。

仓库和 README：https://github.com/AquariusCZ/opencode-token-usage-gui

用着有问题、或者哪一轮的数字对不上，欢迎直接开 issue。
```

Do not add "求 star" or urgency. If the platform requires a cover image, use the real screenshot, not the mock.

### 5.8 English X / HN variants

**Show HN**

Title (≤80 chars):

```text
Show HN: Per-turn token and cost capsules for OpenCode Desktop
```

Body (first comment, since Show HN posts should carry context):

```text
I use OpenCode Desktop and kept opening the context panel to guess what a reply cost. The app shows the latest
request and the session total, but not the turn. I built a GUI plugin that adds one line under each turn with
input/output, cache reads, cache hit rate, total tokens and RMB cost, plus a details card on hover.

The hard part was not the arithmetic; it was rendering inside someone else's app. The V2 GUI plugin API is
experimental and has no message-footer slot, so the footer is injected into the message DOM and re-attached with a
MutationObserver. It fails quietly if a selector moves. Zero runtime deps, no network by default, MIT.

Install: opencode plugin add github:AquariusCZ/opencode-token-usage-gui
Repo: https://github.com/AquariusCZ/opencode-token-usage-gui

Happy to answer questions about the V2 plugin API or the injection approach.
```

**X**

```text
OpenCode Desktop shows the session total, not what this turn cost.

Built a GUI plugin: per-turn tokens, cache hit rate and RMB cost. Each turn's capsule stays under its reply and
updates live; the dock always shows the session total. MIT, zero deps.

opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Attach the real screenshot. Do not thread more than two posts.

## 6. Rules and etiquette

- **Disclose the author.** "I built" in every first-person channel. Never imply OpenCode/Anomaly endorses it.
- **No fake stars, votes, comments or alt accounts.** No asking friends to upvote. No purchased promotion.
- **One post per channel.** Do not repost because the first one was quiet. If a channel has a weekly showcase
  thread, use it once.
- **No DM spam.** Do not cold-DM maintainers, influencers or Discord members.
- **Follow each community's format.** Read the pinned rules before posting; some channels require a tag, an intro,
  or a specific category.
- **Answer every question, including critical ones.** "Does it phone home?" and "won't DOM injection break?" are
  legitimate; answer with the README facts.
- **Do not overstate V2 stability.** Say "experimental GUI plugin API" and "tested with Desktop 2.2.3" every time.
- **Do not claim npm.** GitHub install is the supported path; the npm name is a placeholder.
- **Keep the mock labeled.** If the launch image is still `assets/screenshot-en.png`, call it an illustrative mock.

## 7. Launch-day checklist

Two hours before:

- [ ] `git status` clean, `main` pushed, tag `v0.3.1` created and pushed.
- [ ] Release page published with the body from `docs/release-0.3.1.md`.
- [ ] README hero image loads on a logged-out browser (no cache).
- [ ] Install command tested from a clean profile: `opencode plugin add github:...`, reload, capsule appears.
- [ ] Issue templates render; contact link opens Discord.
- [ ] Social preview uploaded and visible in a link unfurl (use a private window or a link preview tester).

At T0:

- [ ] Publish the release.
- [ ] Post in Discord with the real screenshot.
- [ ] Open the awesome-opencode PR and the ecosystem docs PR.
- [ ] Submit to opencode.cafe.
- [ ] Open the Discussions post.
- [ ] Watch notifications for the first two hours; reply to every question.

After:

- [ ] Add follow-up issues for every reproducible bug, even if the fix is obvious.
- [ ] Thank the first outside contributor or bug reporter by name in the next release notes.

## 8. First-week metrics

Track these once a day in a scratch file; do not add analytics or telemetry to the plugin.

| Metric | Where | Healthy signal |
| --- | --- | --- |
| Stars | repo | steady trickle, not a spike that dies |
| Clones / views | Insights → Traffic | traffic follows the channel that was posted |
| Issues opened | repo | at least one real bug or question; silence usually means nobody installed it |
| Issue first response | repo | < 24 h |
| Install reports | Discord / Discussions | someone posts a working capsule unprompted |
| Channel referrals | referrers | at least one channel produces more than noise |

Response policy for week one:

- Reply within 24 hours, even if the answer is "reproduced, looking".
- Ship at least one fix or README clarification in the first week and mention it in the thread where it was reported.
- If a selector breakage is reported, ask for the desktop version and a screenshot; add the version to the
  compatibility table when fixed.
- Do not argue about star counts or ranking. If a channel flops, note why and move on.

## 9. FAQ and objections

**Is it safe? Does it send my data anywhere?**
No network by default, no telemetry, no API keys. It reads the session state the desktop app already holds in
memory. The only network path is opting into `usdToCny: "auto"`, which fetches a daily USD→CNY rate from
`open.er-api.com` and caches it for 24 hours.

**Isn't DOM injection fragile?**
Yes, intentionally so. The GUI plugin API has no message-footer slot, so the last step is DOM injection. If a
future desktop release renames the slot, the footer disappears and the plugin logs one warning; it does not corrupt
the timeline. Selector, footer, placement and aggregation live in separate files, so adapting is usually a one-line
change. A selector health check is on the roadmap.

**Does it work in the TUI?**
No. It is a desktop GUI plugin for the V2 app. For the TUI, use the CLI's built-in `debug.turn_tokens`.

**Which models/providers does it support?**
All of them, because it reads the app's own per-request usage and cost. Cache metrics are most useful on providers
that report cache reads (DeepSeek, Anthropic). If a provider reports no cost, the cost is hidden and tokens still
show.

**Why is the session summary larger than the sum of the per-turn capsules?**
The summary comes from the app's session ledger, so it includes title/compaction usage, reverted usage (a revert
does not refund) and, where the API is available, subagent usage. The ledger is a lifetime billed total, not the sum
of the loaded transcript. Turn/request/active-time counts come from the loaded transcript and are marked "loaded"
when older pages exist.

**Is the RMB number a second bill?**
No. Cost comes from the app as USD; CNY is a display conversion at a manual or daily-cached rate. The USD amount
stays in the details card.

**Why not install from npm?**
The npm name is a `0.0.0-stage` placeholder. GitHub is the supported install path:
`opencode plugin add github:AquariusCZ/opencode-token-usage-gui`.

**Is this an official OpenCode plugin?**
No. It is a community plugin, MIT-licensed, built against the experimental V2 GUI plugin API.
