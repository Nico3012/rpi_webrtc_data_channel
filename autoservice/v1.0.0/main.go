package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	//
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
