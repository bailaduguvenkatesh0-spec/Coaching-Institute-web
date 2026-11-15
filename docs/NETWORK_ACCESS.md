# Network access

## Same Wi-Fi only

Vite binds to all interfaces, and Express listens on `HOST=0.0.0.0`. On Windows, find the current Wi-Fi IPv4 address with:

```powershell
ipconfig
```

Use the IPv4 address shown under the Wi-Fi adapter, for example `http://192.168.1.25:5173`. The address can change when the router reconnects or renews DHCP. Reserve an address in your router if you need a stable LAN address.

Both devices must be on the same non-guest Wi-Fi. Guest Wi-Fi, client/AP isolation, VPN rules, or an organization network can block device-to-device traffic. The Windows network profile and firewall can also block inbound requests.

For a narrowly scoped Windows Defender Firewall exception, run PowerShell as Administrator and allow only the web/API ports on the appropriate private network profile:

```powershell
New-NetFirewallRule -DisplayName "TEAM B Web 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private
New-NetFirewallRule -DisplayName "TEAM B API 4000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4000 -Profile Private
```

Do not expose PostgreSQL port 5432. Avoid allowing all inbound traffic or changing a managed network policy without its administrator. If the Wi-Fi profile is `Public`, do not broadly switch it to `Private` on a public hotspot; use a trusted private network or have its administrator configure access.

The Vite `/api` proxy sends requests to the local API, so normal frontend API calls use the same host and port 5173. Direct API access is `http://<laptop-ip>:4000/api/health`.

## Different Wi-Fi or mobile data

An address in `10.x.x.x`, `172.16.x.x`–`172.31.x.x`, or `192.168.x.x` is private and is not reachable from unrelated networks or mobile data. Router port-forwarding alone may not work behind carrier-grade NAT and exposes your machine; do not publish the development server or database this way.

Use public HTTPS hosting for access from anywhere. A tunnel can be temporary, but depends on the host laptop, the tunnel process, and permitted outbound network traffic. For this project, prior tunnel diagnostics showed Cloudflare Tunnel transport was blocked on the tested network. A stable all-network link requires a cloud deployment; the laptop can then be powered off.
