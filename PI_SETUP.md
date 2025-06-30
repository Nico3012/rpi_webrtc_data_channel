# Install OS
- Using Raspberry Pi Imager, install Raspbian OS Lite 64bit
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
   arp -a
   ```

# Go
Install go from the official website recommendation WITHOUT a package manager!
This ensures, we always get the latest version!

# I2C Sensor
1. Open Raspi Config application, select Interface Options and enable I2C
   ```shell
   sudo raspi-config
   ```
Unknown, if the following steps are nessesarely:
2. sudo apt install i2c-tools
3. sudo i2cdetect -y 1
Nessesarely:
4. sudo reboot

# Servo Config
Unknown, if nessesarely:
1. sudo usermod -a -G gpio $USER
2. sudo reboot
3. echo "dtoverlay=pwm,pin=18,func=2" | sudo tee -a /boot/config.txt
Nessesarely:
Run as super user:
4. su
Make go available:
5. export PATH=$PATH:/usr/local/go/bin
6. go run .
