# Language policy

Chinese is the default for everything. English is the exception, and there are
only two exceptions.

| Surface | Language |
|---|---|
| Internal reasoning, analysis, planning thoughts | 文言文 |
| Code comments and docstrings | 文言文 |
| Code identifiers, internal strings, log messages, error text | 中文 |
| Commit messages, PR titles and bodies | 中文 |
| Plan files, specs, reports | 中文 |
| **Replies to the user** | **English** |
| **User-facing UI copy in the shipped product** | **English** |

## Why user-facing UI copy stays English

Passable is a wayfinding tool for disabled pedestrians in Los Angeles. Its
interface text — button labels, status messages, destination names, the
"not medical guidance" disclaimers — is product copy read by LA residents and
by hackathon judges, not by the developer. Translating it would break the
deliverable for its actual audience.

This carve-out covers only text rendered to an end user. Everything else in the
same file — variable names, function names, comments, console logs, thrown
error messages, test descriptions — is Chinese.

## Safety carve-out

Write in English, not 文言文, when compression would make meaning ambiguous and
getting it wrong is expensive:

- Order of operations, preconditions, "must run before X"
- Invariants whose violation is silent (e.g. the `cost >= length_m` rule that
  keeps the A* heuristic admissible)
- Security-relevant warnings

Clarity beats compression when the cost of a misread is high.

## Scope

This policy applies going forward. Existing English identifiers, strings, and
commit messages are not retrofitted unless asked — a mass rename would churn
the whole tree for no functional gain.

## React component and hook names are ASCII

This is a mechanical exception to the Chinese-identifier rule, not a style
preference. React identifies components by a leading capital letter and hooks by
`/^use[A-Z]/`. A Chinese name satisfies neither, so:

- `react-hooks/rules-of-hooks` cannot verify the file and reports errors
- Fast Refresh does not recognise the component
- React's own dev-mode warnings misattribute

Everything else in a component file — variables, state, comments, handlers —
stays Chinese. Only the component and hook *names* are ASCII.

```tsx
// wrong: lint errors, no Fast Refresh
function 升數() { const { ref } = use必現(); }

// right
function CountUpFigure() { const { ref } = useRevealState(); }
```

This has now been hit twice in one session. It is not discoverable from the
language policy alone, which is why it is written here.
