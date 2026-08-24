# Language policy

Working language is split. This overrides any skill or plugin that picks a different
language — including the caveman plugin's `wenyan` level, which would otherwise push
replies into 文言文.

| Surface | Language |
|---|---|
| Internal reasoning, analysis, planning thoughts | 文言文 (classical Chinese) |
| Code — identifiers, strings, log messages, error text | English |
| Code comments and docstrings | 文言文 |
| Commit messages, PR titles and bodies | English |
| Replies to the user, plan files, reports | English |

Caveman's compression style still applies to English replies — terse, no filler,
fragments fine. It just does not get to choose the language.

## Safety carve-out

Write in English, not 文言文, when:

- Warning about a security issue
- Confirming a destructive or irreversible action
- A comment where classical compression would make the meaning ambiguous — order of
  operations, preconditions, "must run before X"

Same principle as caveman's Auto-Clarity rule: clarity beats compression when getting
it wrong is expensive.
