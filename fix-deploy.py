import paramiko
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.105.49.201', username='root', password='Sudheer@9699', timeout=30)

def run(cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    try:
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: print(out.rstrip())
        if err: print('ERR:', err[:1000].rstrip())
    except:
        pass
    return stdout.channel.recv_exit_status()

# Run prisma db push
print('=== Running Prisma db push ===')
run('cd /root/digiwise-hosting && docker compose exec -T backend npx prisma db push --accept-data-loss --force-reset 2>&1', timeout=120)

print('=== Running Prisma db push (normal) ===')
run('cd /root/digiwise-hosting && docker compose exec -T backend npx prisma db push 2>&1', timeout=120)

# Wait a bit for backend to reconnect
time.sleep(5)

# Test endpoints
print('=== Testing frontend ===')
run('curl -s -o /dev/null -w "%{http_code}" http://localhost/', timeout=15)
print('')

print('=== Testing backend health ===')
run('curl -s http://localhost/api/health 2>&1 || curl -s http://127.0.0.1:4000/health 2>&1', timeout=15)

print('=== Testing backend /auth/me ===')
run('curl -s http://localhost/auth/me 2>&1', timeout=15)

# Check backend logs
print('=== Backend logs (last 20 lines) ===')
run('cd /root/digiwise-hosting && docker compose logs --tail=20 backend 2>&1', timeout=30)

# Check all container status
print('=== All containers ===')
run('cd /root/digiwise-hosting && docker compose ps 2>&1', timeout=30)

client.close()
