package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
)

func main() {
	RemoveOtherVersions()
}

func RemoveOtherVersions() {
	// Determine current working directory (the version directory being executed)
	wd, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to get working directory: %v\n", err)
		os.Exit(1)
	}

	// Parent directory that holds versioned directories (e.g. v1.0.0, v2.0.0)
	parent := filepath.Dir(wd)

	// Safety: don't operate if parent is same as cwd or empty
	if parent == "" || parent == wd {
		fmt.Fprintf(os.Stderr, "refusing to operate on parent '%s' for cwd '%s'\n", parent, wd)
		return
	}

	// Only remove directories that start with 'v' followed by a digit (e.g. v1, v2, v10, v1.0.0, v1.2rc1)
	vPattern := regexp.MustCompile(`^v\d+`)

	entries, err := os.ReadDir(parent)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read parent dir '%s': %v\n", parent, err)
		os.Exit(1)
	}

	// Remove any directory entries in parent that are not the current working directory
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}

		childPath := filepath.Join(parent, e.Name())

		// Skip the directory we are currently in
		absChild, _ := filepath.Abs(childPath)
		absWd, _ := filepath.Abs(wd)
		if absChild == absWd {
			continue
		}

		// Extra safety: ensure the child path is one level below parent
		if filepath.Dir(absChild) != filepath.Clean(parent) {
			continue
		}

		// Only remove directories that look like version folders (start with v + digit)
		if !vPattern.MatchString(e.Name()) {
			continue
		}

		// Remove the directory and its contents
		fmt.Printf("removing old version directory: %s\n", absChild)
		if err := os.RemoveAll(absChild); err != nil {
			fmt.Fprintf(os.Stderr, "failed to remove '%s': %v\n", absChild, err)
		}
	}
}

func WriteSystemdService(serviceName, execPath, workDir string) error {
	if serviceName == "" || execPath == "" || workDir == "" {
		return fmt.Errorf("serviceName, execPath and workDir must be provided")
	}

	unitDir := "/etc/systemd/system"
	unitPath := filepath.Join(unitDir, serviceName+".service")

	if err := os.MkdirAll(unitDir, 0755); err != nil {
		return err
	}

	unit := fmt.Sprintf(`[Service]
Type=simple
User=root
ExecStart=%s
WorkingDirectory=%s
Restart=on-failture

[Install]
WantedBy=multi-user.target
`, execPath, workDir)

	return os.WriteFile(unitPath, []byte(unit), 0644)
}

// RestartSystemdDaemon reloads systemd unit files and re-executes the daemon.
func RestartSystemdDaemon() error {

	// reload unit files
	cmd := exec.Command("systemctl", "daemon-reload")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("systemctl daemon-reload failed: %w", err)
	}

	// re-exec systemd to pick up any binary changes (optional but commonly used)
	cmd = exec.Command("systemctl", "daemon-reexec")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("systemctl daemon-reexec failed: %w", err)
	}

	return nil
}
