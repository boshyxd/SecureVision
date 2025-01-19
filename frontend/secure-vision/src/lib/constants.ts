export const commonPorts = [
  { port: 80, label: 'HTTP' },
  { port: 443, label: 'HTTPS' },
  { port: 3000, label: 'Dev Server' },
  { port: 8080, label: 'Alt HTTP' },
  { port: 8443, label: 'Alt HTTPS' },
  { port: 3389, label: 'RDP' },
] as const;

export const applicationTypes = [
  { name: 'WordPress' },
  { name: 'Citrix' },
  { name: 'Cisco' },
  { name: 'Coremail' },
  { name: 'RDWeb' },
] as const;

export const commonUrlPaths = [
  { path: '/wp-login.php', label: 'WordPress Login' },
  { path: '/rdweb/', label: 'RD Web Access' },
  { path: '/citrix/', label: 'Citrix Gateway' },
  { path: '/webvpn/', label: 'Cisco VPN' },
  { path: '/coremail/', label: 'Coremail' },
] as const; 