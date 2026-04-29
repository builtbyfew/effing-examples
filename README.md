# effing-examples

A monorepo of [Effing](https://effing.dev) example projects.

## Structure

Each example lives in its own package under `examples/`:

```
examples/
  <example-name>/
```

## Adding an example

From the repo root:

```sh
cd examples
pnpm create @effing
```

Then install workspace dependencies from the root:

```sh
pnpm install
```

## Working in an example

```sh
pnpm --filter <example-name> <script>
```
