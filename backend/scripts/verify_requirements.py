"""Verifies requirements.txt doesn't contain ghost/phantom dependencies.

Strategy:
  1. Get all directly-imported top-level modules in /app/backend.
  2. Map module names back to pip distribution names using `importlib.metadata`.
  3. Walk transitive dependencies of each "reachable" distribution.
  4. Any pinned dist NOT in the reachable set is a ghost.

Run via:  python3 scripts/verify_requirements.py

Exit codes:
  0 — clean
  1 — ghost deps found (likely to break Render or cause conflicts)
"""
import json
import re
import subprocess
import sys
from importlib.metadata import distributions, packages_distributions
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REQUIREMENTS = BACKEND_ROOT / "requirements.txt"

# Dev/tooling packages that are intentionally kept even if not imported directly.
ALLOWED_TOOLING = {
    "black", "isort", "mypy", "mypy-extensions", "mypy_extensions",
    "flake8", "mccabe", "pycodestyle", "pyflakes", "pathspec",
    "platformdirs", "packaging", "pytokens", "pluggy", "iniconfig",
    # Common transitive essentials that self-declare weakly
    "uvicorn", "watchfiles", "websockets", "h11", "httptools",
}


def norm(name: str) -> str:
    """Normalize a pip distribution name: lowercase, dashes=underscores equivalent."""
    return name.lower().replace("_", "-")


def read_requirements() -> list[str]:
    names = []
    for line in REQUIREMENTS.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name = re.split(r"[=<>!~]", line, 1)[0].strip()
        if name:
            names.append(norm(name))
    return names


def scan_direct_imports() -> set[str]:
    """All top-level module names imported anywhere in /app/backend."""
    out = subprocess.check_output(
        ["grep", "-rhoE", r"^\s*(from|import)\s+[a-zA-Z_][a-zA-Z0-9_]*",
         str(BACKEND_ROOT), "--include=*.py"]
    ).decode()
    modules = set()
    for raw in out.splitlines():
        parts = raw.strip().split()
        if len(parts) >= 2:
            modules.add(parts[1].split(".", 1)[0])
    return modules


def module_to_distributions() -> dict[str, list[str]]:
    """Returns {module_name: [dist_name_lowercase, ...]} from installed packages."""
    raw = packages_distributions()
    return {mod: [norm(d) for d in dists] for mod, dists in raw.items()}


def distribution_deps() -> dict[str, set[str]]:
    """Returns {dist_name: {direct_dep_names}} for every installed distribution."""
    deps = {}
    for d in distributions():
        name = norm(d.metadata["Name"] or "")
        if not name:
            continue
        req_names = set()
        for req in (d.requires or []):
            # Parse `foo (>=1.0) ; extra == "..."` — drop everything after first space/;
            dep_name = re.split(r"[\s;\[(<>=!~]", req, 1)[0].strip()
            if dep_name:
                req_names.add(norm(dep_name))
        deps[name] = req_names
    return deps


def compute_reachable(roots: set[str], deps: dict[str, set[str]]) -> set[str]:
    """BFS transitive closure over distribution dep graph."""
    reachable = set(roots)
    frontier = list(roots)
    while frontier:
        current = frontier.pop()
        for child in deps.get(current, set()):
            if child not in reachable:
                reachable.add(child)
                frontier.append(child)
    return reachable


def main() -> int:
    requirements = set(read_requirements())
    direct_imports = scan_direct_imports()
    mod_to_dist = module_to_distributions()

    # Find root distributions = those backing a direct import.
    roots = set()
    for mod in direct_imports:
        for dist in mod_to_dist.get(mod, []):
            roots.add(dist)

    deps = distribution_deps()
    reachable = compute_reachable(roots, deps)

    allowed = {norm(t) for t in ALLOWED_TOOLING}
    ghosts = sorted(requirements - reachable - allowed)

    summary = {
        "total_pinned": len(requirements),
        "direct_import_roots": len(roots),
        "reachable_transitively": len(reachable),
        "ghost_count": len(ghosts),
        "ghosts": ghosts,
    }

    if ghosts:
        print("\nGhost dependencies detected in requirements.txt:\n")
        for g in ghosts:
            print(f"  - {g}")
        print(f"\n{len(ghosts)} package(s) are pinned but not reachable")
        print("from any direct import or its transitive dependencies.")
        print("Consider removing them to avoid Render build surprises.\n")
    else:
        print("requirements.txt is clean — no ghost dependencies.")

    print(json.dumps(summary))
    return 1 if ghosts else 0


if __name__ == "__main__":
    sys.exit(main())
