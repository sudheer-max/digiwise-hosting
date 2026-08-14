import paramiko, sys, os
os.environ['PYTHONIOENCODING'] = 'utf-8'
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.105.49.201', username='root', password='Sudheer@9699', timeout=30)

def run(cmd, timeout=300):
    print(f'>>> {cmd}', flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip(): print(out[:8000], flush=True)
    if err.strip(): print('STDERR:', err[:3000], flush=True)
    status = stdout.channel.recv_exit_status()
    print(f'Exit: {status}', flush=True)
    return status

KUBECONFIG = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml'
LOCAL_DIR = r'D:\DIGIWISE SOFTECH\APP\digiwise-hosting'
REMOTE_DIR = '/root/digiwise-hosting'

print('='*60, flush=True)
print('DEPLOY FIX: Increase deploy timeout from 8s to 10min', flush=True)
print('='*60, flush=True)

print('\n=== Step 1: SCP upload fixed api.ts ===', flush=True)
sftp = client.open_sftp()
sftp.put(os.path.join(LOCAL_DIR, 'frontend', 'src', 'lib', 'api.ts'),
         f'{REMOTE_DIR}/frontend/src/lib/api.ts')
sftp.close()
print('api.ts uploaded', flush=True)

print('\n=== Step 2: Git pull on server ===', flush=True)
run(f'cd {REMOTE_DIR} && git pull origin main')

print('\n=== Step 3: Build frontend image ===', flush=True)
run(f'cd {REMOTE_DIR}/frontend && docker build -t digiwise-frontend-new:latest .', timeout=300)

print('\n=== Step 4: Import to K3s ===', flush=True)
run(f'docker save digiwise-frontend-new:latest | k3s ctr images import -', timeout=120)

print('\n=== Step 5: Restart frontend ===', flush=True)
run(f'{KUBECONFIG} kubectl rollout restart deployment/frontend -n digiwise-hosting')

print('\n=== Step 6: Wait for rollout ===', flush=True)
run(f'{KUBECONFIG} kubectl rollout status deployment/frontend -n digiwise-hosting --timeout=120s', timeout=150)

print('\n=== Step 7: Verify ===', flush=True)
run(f'{KUBECONFIG} kubectl get pods -n digiwise-hosting')
run('curl -sk -o /dev/null -w "Frontend: %{http_code}" https://digiwisesoftech.com')

client.close()
print('\n' + '='*60, flush=True)
print('DEPLOY COMPLETE - Deploy timeout fixed: 8s -> 10min', flush=True)
print('='*60, flush=True)
