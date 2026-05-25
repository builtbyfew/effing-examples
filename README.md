# effing-examples

A monorepo of [Effing](https://effing.dev) example projects.

## Structure

Each example project lives in its own package under `projects/`:

```
projects/
  <project-name>/
```

## Adding an example project

From the repo root:

```sh
cd projects
pnpm create @effing
```

Then install workspace dependencies from the root:

```sh
pnpm install
```

## Working in an example project

```sh
pnpm --filter <project-name> <script>
```
