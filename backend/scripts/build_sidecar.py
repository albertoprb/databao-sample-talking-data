import shutil
import subprocess
import sys
from pathlib import Path


def build():
    # Define paths
    backend_dir = Path(__file__).parent.parent
    dist_dir = backend_dir / "dist"
    tauri_bin_dir = backend_dir.parent / "frontend" / "src-tauri" / "bin"

    # Ensure tauri bin directory exists
    tauri_bin_dir.mkdir(parents=True, exist_ok=True)

    # Get current platform target triple
    # This is a simplified version; for real use, you'd want something more robust
    import platform

    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "linux":
        target = f"{machine}-unknown-linux-gnu"
    elif system == "darwin":
        target = f"{machine}-apple-darwin"
    elif system == "windows":
        target = f"{machine}-pc-windows-msvc"
    else:
        target = "unknown"

    binary_name = f"backend-{target}"
    if system == "windows":
        binary_name += ".exe"

    print(f"Building sidecar for {target}...")

    # Ensure dist directory exists
    dist_dir.mkdir(parents=True, exist_ok=True)

    # Run Nuitka
    # Using --onefile-tempdir-spec to ensure compatibility with AppImage
    subprocess.run(
        [
            sys.executable,
            "-m",
            "nuitka",
            "--onefile",
            "--output-filename=backend",
            f"--output-dir={dist_dir}",
            "--assume-yes-for-downloads",
            "--remove-output",
            "--static-libpython=no",
            "--onefile-tempdir-spec={TEMP}/backend_onefile",
            str(backend_dir / "main.py"),
        ],
        check=True,
    )

    # Copy to tauri bin directory with target suffix
    source_path = dist_dir / ("backend.exe" if system == "windows" else "backend")
    dest_path = tauri_bin_dir / binary_name

    shutil.copy2(source_path, dest_path)
    print(f"Sidecar built and copied to: {dest_path}")


if __name__ == "__main__":
    build()
