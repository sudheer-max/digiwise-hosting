import paramiko, sys, os
os.environ['PYTHONIOENCODING'] = 'utf-8'
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

LOCAL_DIR = r'D:\DIGIWISE SOFTECH\APP\digiwise-hosting'
REMOTE_DIR = '/root/digiwise-hosting'
KUBECONFIG = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml'

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
    if out.strip(): print(out[:8000], flush=True)
    if err.strip(): print('STDERR:', err[:3000], flush=True)
    status = stdout.channel.recv_exit_status()
    print(f'Exit: {status}', flush=True)
    return status

print('='*60, flush=True)
print('DEPLOY: Deploy progress page + async build', flush=True)
print('='*60, flush=True)

# Step 1: SCP upload
print('\n=== Step 1: SCP upload ===', flush=True)
client = connect()
sftp = client.open_sftp()
files = [
    'backend/src/routes/apps.ts',
    'frontend/src/lib/api.ts',
    'frontend/src/components/console/ConsoleShell.tsx',
    'frontend/src/components/console/CreateApplicationWizard.tsx',
    'frontend/src/components/console/views/DeployProgressView.tsx',
]
for f in files:
    local_path = os.path.join(LOCAL_DIR, f.replace('/', os.sep))
    print(f'  {f}', flush=True)
    sftp.put(local_path, f'{REMOTE_DIR}/{f}')
sftp.close()
client.close()

# Step 2: Git pull
print('\n=== Step 2: Git pull ===', flush=True)
client = connect()
run(client, f'cd {REMOTE_DIR} && git stash && git pull origin main')
client.close()

# Step 3: Build backend
print('\n=== Step 3: Build backend ===', flush=True)
client = connect()
run(client, f'cd {REMOTE_DIR}/backend && docker build -t digiwise-backend-new:latest .', timeout=300)
client.close()

# Step 4: Build frontend
print('\n=== Step 4: Build frontend ===', flush=True)
client = connect()
run(client, f'cd {REMOTE_DIR}/frontend && docker build -t digiwise-frontend-new:latest .', timeout=300)
client.close()

# Step 5: Import to K3s
print('\n=== Step 5: Import to K3s ===', flush=True)
client = connect()
run(client, 'docker save digiwise-backend-new:latest | k3s ctr images import -', timeout=180)
client.close()

client = connect()
run(client, 'docker save digiwise-frontend-new:latest | k3s ctr images import -', timeout=180)
client.close()

# Step 6: Restart
print('\n=== Step 6: Restart deployments ===', flush=True)
client = connect()
run(client, f'{KUBECONFIG} kubectl rollout restart deployment/backend -n digiwise-hosting')
run(client, f'{KUBECONFIG} kubectl rollout restart deployment/frontend -n digiwise-hosting')
client.close()

# Step 7: Wait
print('\n=== Step 7: Wait for rollout ===', flush=True)
client = connect()
run(client, f'{KUBECONFIG} kubectl rollout status deployment/backend -n digiwise-hosting --timeout=120s', timeout=150)
run(client, f'{KUBECONFIG} kubectl rollout status deployment/frontend -n digiwise-hosting --timeout=120s', timeout=150)
client.close()

# Step 8: Verify
print('\n=== Step 8: Verify ===', flush=True)
client = connect()
run(client, f'{KUBECONFIG} kubectl get pods -n digiwise-hosting')
run(client, 'curl -sk -o /dev/null -w "Frontend: %{http_code}" https://digiwisesoftech.com')
run(client, 'curl -sk https://api.digiwisesoftech.com/health')
client.close()

print('\n' + '='*60, flush=True)
print('DEPLOY COMPLETE', flush=True)
print('='*60, flush=True)
