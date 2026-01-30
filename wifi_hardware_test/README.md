apt update
apt install hostapd
apt install dnsmasq

# Wifi interface finden:
```shell
iw dev
```
![List of wifi interfaces](iw_dev.png)

# Add device ip to interface
```shell
ip addr add 192.168.50.1/24 dev wlp2s0
```

# Start hostapd service (runs forever)
```shell
hostapd ./hostapd.conf
```

# Start dnsmasq service (runs forever)
```shell
dnsmasq --conf-file=./dnsmasq.conf --no-daemon
```

# Remove device ip from interface
```shell
ip addr del 192.168.50.1/24 dev wlp2s0
```
