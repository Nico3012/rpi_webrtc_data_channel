# Install OS
- Using Raspberry Pi Imager, install Raspbian OS Lite 64bit
- Set username and password
- Enable ssh

# Establish connection between pc and pi
1. Plug an Ethernet cable between the PC’s LAN port and the Pi’s Ethernet port.
2. Press `Win+R`, type `ncpa.cpl`, and press Enter to open **Network Connections**.
3. Right-click your **Internet-facing adapter** (e.g., “Wi-Fi”) and choose **Properties**.
4. Go to the **Sharing** tab.
5. Check **Allow other network users to connect through this computer’s Internet connection**.
6. In the **Home networking connection** dropdown, select your **Ethernet** adapter (often labeled “Ethernet” or “Ethernet 2”).
7. Click **OK**.
8. Unplug the Ethernet cable and plug it in again.
9. Find the pi ip using:
   ```powershell
   ipconfig
   arp -a
   ```
10. ssh into pi
    ```powershell
    ssh <username>@<ip>
    ```

# Update Packages
```bash
sudo apt-get update
sudo apt-get full-upgrade
sudo reboot
```

# RaspAP (WiFi Router)
1. Set the WiFi country in raspi-config's **Localisation Options**:
   ```bash
   sudo raspi-config
   ```
2. Invoke RaspAP's Quick Installer (-y for automatic install with recommended parameters):
   ```bash
   curl -sL https://install.raspap.com | bash -s -- -y
   ```
3. Restart PI
   ```bash
   sudo reboot
   ```

- IP address: 10.3.141.1
- Username: admin
- Password: secret
- SSID: RaspAP
- Password: ChangeMe

The Internet from LAN (over the connected pc) will be used to provide internet into the RaspAP WiFi. The lan connection can still be used and is not affected by RaspAP!

# Go
Install go from the official website recommendation WITHOUT a package manager!
This ensures, we always get the latest version!

Go environment variable: `export PATH=$PATH:/usr/local/go/bin`

# Project
Copy this directory `rpi` into a `/app` directory
Copy the `rpi.service` file to `/etc/systemd/system/rpi.service`
Run `systemctl enable rpi.service`
Run `systemctl start rpi.service`

Commands:

sudo cp -r . /app/
sudo cp ./rpi.service /etc/systemd/system/rpi.service
sudo systemctl enable rpi.service
sudo systemctl start rpi.service

sudo systemctl status rpi.service
sudo systemctl restart rpi.service

sudo systemctl stop rpi.service
sudo systemctl disable rpi.service
