package runner

import (
	"log"
	"os"
	"os/exec"
	"syscall"
)

// New starts the startCommand in the background and returns a stop function.
// The stop function gracefully stops the command if it's still running.
func New(startCommand string) func() {
	log.Printf("[RUNNER]: Starting command")
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
		log.Printf("[RUNNER]: Stopping command...")
		// If the process is still running, stop it gracefully
		if cmd.Process != nil && cmd.ProcessState == nil {
			err := cmd.Process.Signal(syscall.SIGTERM)
			if err != nil {
				log.Printf("Failed to stop process: %v", err)
			}
			// Wait for the process to finish
			<-done
		}
		log.Printf("[RUNNER]: Stopped command")
	}
}
