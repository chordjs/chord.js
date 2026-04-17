# Contributing to Chord.js

Thank you for your interest in contributing to Chord.js! We welcome contributions from everyone.

## Getting Started

1.  **Fork the repository** to your own GitHub account.
2.  **Clone the fork** to your local machine:
    ```bash
    git clone https://github.com/your-username/chord.js.git
    ```
3.  **Install dependencies**:
    ```bash
    bun install
    ```
4.  **Create a branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/my-new-feature
    ```

## Development Workflow

We use **Bun** for development and **swc** for fast compilation.

### Build all packages
```bash
bun run build
```

### Run tests
```bash
bun test
```

### Type checking
```bash
bun run typecheck
```

## Creating a Pull Request

1.  **Follow the coding style**: We use Biome for linting and formatting. Run `bunx biome check --apply .` before committing.
2.  **Add tests**: If you're adding a new feature, please include tests.
3.  **Create a Changeset**: We use [Changesets](https://github.com/changesets/changesets) for version management.
    ```bash
    bun run changeset
    ```
    Follow the prompts to describe your changes and their impact level (patch, minor, major).
4.  **Push to your fork** and submit a Pull Request.

## Community

Join our Discord server if you have questions! (Link to be added)

---

By contributing to Chord.js, you agree that your contributions will be licensed under the MIT License.
