import paramiko, sys, os
os.environ['PYTHONIOENCODING'] = 'utf-8'
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('172.105.49.201', username='root', password='Sudheer@9699', timeout=30)
    return client

def run(client, cmd, timeout=300):
    print(f'>>> {cmd}', flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip(): print(out[:5000], flush=True)
    if err.strip(): print('STDERR:', err[:3000], flush=True)
    status = stdout.channel.recv_exit_status()
    print(f'Exit: {status}', flush=True)
    return status

KUBECONFIG = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml'
LOCAL = r'D:\DIGIWISE SOFTECH\APP\digiwise-hosting'
REMOTE = '/root/digiwise-hosting'

print('=== Upload fixed nginx.conf ===', flush=True)
client = connect()
sftp = client.open_sftp()
sftp.put(os.path.join(LOCAL, 'frontend', 'nginx.conf'), f'{REMOTE}/frontend/nginx.conf')
sftp.close()
client.close()

print('\n=== Build frontend ===', flush=True)
client = connect()
run(client, f'cd {REMOTE}/frontend && docker build -t digiwise-frontend-new:latest .', timeout=300)
client.close()

print('\n=== Import to K3s ===', flush=True)
client = connect()
run(client, 'docker save digiwise-frontend-new:latest | k3s ctr images import -', timeout=180)
client.close()

print('\n=== Restart frontend ===', flush=True)
client = connect()
run(client, f'{KUBECONFIG} kubectl rollout restart deployment/frontend -n digiwise-hosting')
run(client, f'{KUBECONFIG} kubectl rollout status deployment/frontend -n digiwise-hosting --timeout=120s', timeout=150)
client.close()

print('\n=== Upload backend source ===', flush=True)
client = connect()
sftp = client.open_sftp()
# Upload the fixed builds.ts
sftp.put(os.path.join(LOCAL, 'backend', 'src', 'routes', 'builds.ts'), f'{REMOTE}/backend/src/routes/builds.ts')
sftp.close()
client.close()

print('\n=== Build backend ===', flush=True)
client = connect()
run(client, f'cd {REMOTE}/backend && docker build -t digiwise-backend-new:latest .', timeout=300)
client.close()

print('\n=== Import backend to K3s ===', flush=True)
client = connect()
run(client, 'docker save digiwise-backend-new:latest | k3s ctr images import -', timeout=180)
client.close()

print('\n=== Restart backend ===', flush=True)
client = connect()
run(client, f'{KUBECONFIG} kubectl rollout restart deployment/backend -n digiwise-hosting')
run(client, f'{KUBECONFIG} kubectl rollout status deployment/backend -n digiwise-hosting --timeout=120s', timeout=150)
client.close()

print('\n=== Verify ===', flush=True)
client = connect()
run(client, 'curl -sk -o /dev/null -w "Frontend: %{http_code}" https://digiwisesoftech.com/auth/login')
run(client, 'curl -sk -o /dev/null -w "Backend: %{http_code}" https://api.digiwisesoftech.com/health')
client.close()

print('\nDONE', flush=True)
