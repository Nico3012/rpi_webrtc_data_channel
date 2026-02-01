package runner

import (
	"log"
	"os"
	"os/exec"
	"syscall"
)

// New starts the startCommand in the background and returns a stop function.
// The stop function gracefully stops the command if it's still running and then runs the cleanupCommand synchronously.
func New(startCommand, cleanupCommand string) func() {
	cmd := exec.Command("sh", "-c", startCommand)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Start()
	if err != nil {
		log.Printf("Failed to start command '%s': %v", startCommand, err)
	}

	done := make(chan struct{})
	go func() {
		if cmd.Process != nil {
			cmd.Wait()
		}
		close(done)
	}()

	return func() {
		// If the process is still running, stop it gracefully
		if cmd.Process != nil && cmd.ProcessState == nil {
			err := cmd.Process.Signal(syscall.SIGTERM)
			if err != nil {
				log.Printf("Failed to stop process: %v", err)
			}
			// Wait for the process to finish
			<-done
		}

		// Run the cleanup command and wait for it to finish
		cleanupCmd := exec.Command("sh", "-c", cleanupCommand)
		cleanupCmd.Stdout = os.Stdout
		cleanupCmd.Stderr = os.Stderr
		err := cleanupCmd.Run()
		if err != nil {
			log.Printf("Cleanup command '%s' failed: %v", cleanupCommand, err)
		}
	}
}
