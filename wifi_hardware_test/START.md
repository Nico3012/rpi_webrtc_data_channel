# Add device ip to interface
```shell
ip addr add 192.168.50.1/24 dev wlp2s0
```

# Start docker service
```shell
docker compose up
```

# Remove device ip from interface
```shell
ip addr del 192.168.50.1/24 dev wlp2s0
```
