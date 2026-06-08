# doloc i18n Translation Action

Translate your i18n files directly in GitHub Actions — no translation platform required.

This action updates or checks localization files with the [doloc](https://doloc.io) API. It supports the same developer-first workflow as the CLI/curl examples: keep source files in your repository, run doloc when strings change, and decide yourself whether to commit, inspect, artifact, or open a pull request with the resulting diff.

## Quick start

1. Create a doloc API token at <https://doloc.io/account>.
2. Add it to your repository secrets as `DOLOC_API_TOKEN`.
3. Pick the workflow that matches your team:

| Workflow | Best fit |
| --- | --- |
| Commit to feature branches | Same-repository branches where translation diffs should appear in the original PR. |
| Check translations in PRs | Local-first workflows where CI catches stale translation files. |
| Commit after merge | Repositories that update generated translations only on the default branch. |
| Open a translation PR | Protected branches or teams that want generated translations reviewed separately. |

## Commit to feature branches

For same-repository feature branches, this is often the leanest workflow: a developer changes source text, CI commits updated translation files back to the same branch, and the existing PR shows the complete diff.

```yaml
name: Update translations

on:
  push:
    branches-ignore:
      - main
    paths:
      - src/lang/en.json
      - .github/workflows/update-translations.yml

permissions:
  contents: write

jobs:
  update-translations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - id: doloc
        uses: doloc-io/doloc-action@v1
        with:
          token: ${{ secrets.DOLOC_API_TOKEN }}
          source: src/lang/en.json
          targets: |
            src/lang/de.json
            src/lang/fr.json

      - name: Commit translation updates
        if: steps.doloc.outputs.changed == 'true'
        uses: stefanzweifel/git-auto-commit-action@v7
        with:
          commit_message: Update translations
          file_pattern: src/lang/de.json src/lang/fr.json
```

The `paths` filter intentionally watches the source file, not the generated target files. This runs the translation only when source text changed. Note, that in any case there there will only a commit when translations actually changed, so no redundant commits are created.

Use this only for trusted same-repository branches. For fork PRs, secrets are not available by default.

## Check mode

Use `mode: check` when translations should be updated locally but verified in CI. Check mode translates into memory, compares with committed target files, and fails if any target would change.

```yaml
name: Check translations

on:
  pull_request:

permissions:
  contents: read

jobs:
  check-translations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: doloc-io/doloc-action@v1
        with:
          token: ${{ secrets.DOLOC_API_TOKEN }}
          mode: check
          source: src/lang/en.json
          targets: |
            src/lang/de.json
            src/lang/fr.json
```

## Commit after merge

If you do not want CI to mutate feature branches, update translations on the default branch after source text changes are merged:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/lang/en.json
      - .github/workflows/update-translations.yml
```

Use the same doloc and `git-auto-commit-action` steps from [Commit to feature branches](#commit-to-feature-branches). This keeps feature PRs simpler, but translation updates appear in a follow-up commit on `main`.

## XLIFF example

```yaml
- uses: doloc-io/doloc-action@v1
  with:
    token: ${{ secrets.DOLOC_API_TOKEN }}
    targets: |
      src/locale/messages.de.xlf
      src/locale/messages.fr.xlf
```

For single-file formats such as XLIFF, the target file itself contains the translatable units, so `source` is not needed. Make sure the target language is configured inside the XLIFF file.

## React Intl / FormatJS JSON example

```yaml
- uses: doloc-io/doloc-action@v1
  with:
    token: ${{ secrets.DOLOC_API_TOKEN }}
    source: src/lang/en.json
    targets: |
      src/lang/de.json
      src/lang/fr.json
```

## Android XML example

```yaml
- uses: doloc-io/doloc-action@v1
  with:
    token: ${{ secrets.DOLOC_API_TOKEN }}
    source: app/src/main/res/values/strings.xml
    source-lang: en
    targets: |
      app/src/main/res/values-de/strings.xml:de
      app/src/main/res/values-fr/strings.xml:fr
```


## Target mappings

Use one mapping per line:

```yaml
targets: |
  src/lang/de.json:de
  src/lang/fr.json:fr
```

If each target has a different source file, use `=>`:

```yaml
targets: |
  src/lang/en.json => src/lang/de.json:de
  src/lang/en-GB.json => src/lang/fr.json:fr
```

The target language suffix is optional when the language can be inferred from the file name or is included in the file contents (e.g. XLIFF) or when you provide `target-lang` in single-target mode.

## doloc API options

Use the `options` input to pass doloc API query parameters. Add one option per line:

```yaml
- uses: doloc-io/doloc-action@v1
  with:
    token: ${{ secrets.DOLOC_API_TOKEN }}
    source: src/lang/en.json
    targets: |
      src/lang/de.json:de
      src/lang/fr.json:fr
    options: |
      untranslated=no-state,needs-translation
```

You can also pass complex DNF option values exactly as you would in a curl query string. For example, this XLIFF 1.2 setting translates units that either have no state and still equal the source text, or have the `needs-translation` state:

```yaml
- uses: doloc-io/doloc-action@v1
  with:
    token: ${{ secrets.DOLOC_API_TOKEN }}
    targets: |
      src/locale/messages.de.xlf
    options: |
      untranslated=no-state_target-equals-source,needs-translation
      newState=translated
```

See the [doloc options reference](https://doloc.io/getting-started/options/) for supported query parameters and format-specific option links.

## Open a translation PR

You can compose this action with a pull request action to open a PR with the translation updates. This is useful when direct bot commits are blocked by branch protection rules or when you want to review generated translations separately from source text changes.

```yaml
name: Update translations

on:
  push:
    branches:
      - main
    paths:
      - src/lang/en.json
      - .github/workflows/update-translations.yml

permissions:
  contents: write
  pull-requests: write

jobs:
  update-translations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - id: doloc
        uses: doloc-io/doloc-action@v1
        with:
          token: ${{ secrets.DOLOC_API_TOKEN }}
          source: src/lang/en.json
          targets: |
            src/lang/de.json
            src/lang/fr.json

      - name: Create pull request
        if: steps.doloc.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v8
        with:
          commit-message: "Update translations"
          title: "Update translations"
          body: "Updated localization files using doloc."
          branch: doloc/update-translations
          delete-branch: true
          add-paths: |
            src/lang/de.json
            src/lang/fr.json
```

The fixed `branch` value updates one reusable translation PR on later workflow runs. If you intentionally want a separate PR per run, add `branch-suffix: timestamp`, but prefer the fixed branch for routine translation updates.

## Try it manually

Manual runs are useful for a first smoke test or an occasional release refresh. Add this trigger to any update workflow:

```yaml
on:
  workflow_dispatch:
```

For normal automation, prefer `push` or `pull_request` triggers with path filters.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `token` | Yes | | doloc API token. Store it as a secret such as `DOLOC_API_TOKEN`. |
| `source` | No | | Default source localization file. Required for JSON, ARB and Android XML target files. Unused for XLIFF. |
| `target` | No | | Single target localization file. |
| `targets` | No | | Multiline target mapping. |
| `source-lang` | No | | Source language, passed as `sourceLang` to the API. |
| `target-lang` | No | | Target language for single-target mode. |
| `mode` | No | `update` | `update` or `check`. |
| `options` | No | | Additional doloc API query parameters, one per line. See [doloc options](https://doloc.io/getting-started/options/). |
| `fail-on-change` | No | `true` in check mode, `false` in update mode | Fail if changes are produced or would be produced. |

At least one of `target` or `targets` is required.

## Outputs

| Output | Description |
| --- | --- |
| `changed` | `true` if any target file changed or would change. |
| `changed-files` | Newline-separated list of changed files. |
| `processed-files` | Number of processed target files. |

The action also writes a GitHub Actions job summary with processed files and change status.

## Security notes

- Store the API token in GitHub Actions secrets.
- Use `permissions: contents: read` for update/check runs that only leave local working-tree changes.
- Add `contents: write` and `pull-requests: write` only when composing with commit or PR actions.


## Versioning

Use the moving major tag for normal workflows:

```yaml
uses: doloc-io/doloc-action@v1
```

This action follows semantic versioning, so `v1` will always point to the latest v1 release and does not introduce breaking changes. Pinning to a specific patch version is also possible, but usually not needed.

## Troubleshooting

### No doloc API token was provided

Add `token: ${{ secrets.DOLOC_API_TOKEN }}` and make sure the secret exists in the repository or organization.

### Target file not found

Create the target file before running the action. For JSON, `{}` is usually enough for a new target file. For Android XML or XLIFF, create a valid empty or initial localization file.

### Check mode failed

Run the same mapping in update mode, commit the changed files, and re-run CI.

### API authentication failed

Create a new token at <https://doloc.io/account> and update the `DOLOC_API_TOKEN` secret.
