package main

import (
	"fmt"

	"go.bug.st/serial/enumerator"
)

func main() {
	ports, err := enumerator.GetDetailedPortsList()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	for _, port := range ports {
		fmt.Printf("Port: %s\n", port.Name)
		if port.IsUSB {
			fmt.Printf("  VID: 0x%04X\n", port.VID)
			fmt.Printf("  PID: 0x%04X\n", port.PID)
			fmt.Printf("  SerialNumber: %s\n", port.SerialNumber)
			fmt.Printf("  Product: %s\n", port.Product)
		} else {
			fmt.Println("  Not a USB device")
		}
		fmt.Println()
	}
}
