import json
import subprocess

keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]
patch = []
for k in keys:
    patch.append({
        "op": "add",
        "path": "/spec/template/spec/containers/0/env/-",
        "value": {
            "name": k,
            "valueFrom": {
                "secretKeyRef": {
                    "name": "digiwise-smtp",
                    "key": k
                }
            }
        }
    })

with open("/tmp/smtp-patch.json", "w") as f:
    json.dump(patch, f)

r = subprocess.run(
    ["kubectl", "patch", "deployment", "backend", "-n", "digiwise-hosting", "--type=json", "-p", open("/tmp/smtp-patch.json").read()],
    capture_output=True, text=True
)
print(r.stdout)
print(r.stderr)
