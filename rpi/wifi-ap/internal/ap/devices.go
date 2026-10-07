package ap

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Device struct {
	MAC      string `json:"mac"`
	IP       string `json:"ip"`
	Hostname string `json:"hostname"`
	Online   bool   `json:"online"`
}

// GetConnectedDevices liest die DHCP-Leases von dnsmasq und ermittelt
// anhand des Kernel-ARP-Caches (/proc/net/arp auf br0), ob die Geräte online sind.
func GetConnectedDevices() ([]Device, error) {
	leaseData, err := os.ReadFile("/tmp/dnsmasq.leases")
	if err != nil {
		return []Device{}, nil
	}

	activeIPs := getActiveARPIPs()
	now := time.Now().Unix()
	var devices []Device

	for _, line := range strings.Split(string(leaseData), "\n") {
		fields := strings.Fields(line)
		// dnsmasq Format: <expiry-timestamp> <mac> <ip> <hostname> <client-id>
		if len(fields) < 3 {
			continue
		}

		// Abgelaufene Leases ignorieren
		if expiry, err := strconv.ParseInt(fields[0], 10, 64); err == nil && expiry < now {
			continue
		}

		ip := fields[2]
		hostname := ""
		if len(fields) >= 4 && fields[3] != "*" {
			hostname = fields[3]
		}

		devices = append(devices, Device{
			MAC:      strings.ToLower(fields[1]),
			IP:       ip,
			Hostname: hostname,
			Online:   activeIPs[ip],
		})
	}

	return devices, nil
}

// getActiveARPIPs parst /proc/net/arp und liefert alle IPs mit gültigem Flag (0x2) auf br0.
func getActiveARPIPs() map[string]bool {
	active := make(map[string]bool)
	arpData, err := os.ReadFile("/proc/net/arp")
	if err != nil {
		return active
	}

	// Format /proc/net/arp:
	// IP address       HW type     Flags       HW address            Mask     Device
	for _, line := range strings.Split(string(arpData), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 6 && fields[5] == "br0" && fields[2] == "0x2" {
			active[fields[0]] = true
		}
	}

	return active
}
