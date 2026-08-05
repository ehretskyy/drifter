# Project Agent Instructions

Please make sure to read tests/fixtures/real-file.ts before touching the core module,
it explains the parts of this that are easy to get wrong.

It is very important that you also check tests/fixtures/another-real-file.ts, since
it defines the shared constants used across the API layer.

Always remember to update tests/fixtures/ghost-file.ts whenever the auth flow changes.
That file was deleted during the January refactor and this doc never got updated to
match, which is exactly the kind of drift this tool exists to catch.

There is also an old reference to src/legacy/old-helper.ts that hasn't existed since
before this repository's first commit - left in on purpose as a second dead link.

Don't forget to run the test suite before committing anything.
