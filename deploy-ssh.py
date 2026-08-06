#!/usr/bin/env python3
"""
DigiWise Hosting - SSH Deployment Script v5
Fixed path exclusion for Windows
"""

import paramiko
import os
import tarfile
import tempfile
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SERVER_IP = "172.105.49.201"
SERVER_USER = "root"
SERVER_PASS = "Sudheer@9699"
DEPLOY_DIR = "/root/digiwise-hosting"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

EXCLUDE_DIRS = {'.git', 'node_modules', '.next', 'dist', '.next-dev'}

def create_ssh_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASS, timeout=30)
    return client

def execute_command(client, command, timeout=300):
    logger.info(f"Executing: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    if exit_status != 0:
        logger.error(f"Exit status: {exit_status}")
        if error:
            logger.error(f"Error: {error[:2000]}")
    else:
        if output.strip():
            logger.info(f"Output: {output[:2000]}")
    return exit_status, output, error

def should_include(member):
    # Normalize path separators for cross-platform
    name = member.name.replace('\\', '/')
    parts = name.split('/')
    for part in parts:
        if part in EXCLUDE_DIRS:
            return None
    return member

def upload_directory_as_tar(client, local_dir, remote_parent, dir_name):
    tar_path = os.path.join(tempfile.gettempdir(), f'{dir_name}.tar.gz')
    with tarfile.open(tar_path, 'w:gz') as tar:
        tar.add(local_dir, arcname=dir_name, filter=should_include)
    
    tar_size = os.path.getsize(tar_path)
    logger.info(f"Created tar for {dir_name}: {tar_size / (1024*1024):.1f} MB")
    
    sftp = client.open_sftp()
    remote_tar = f"/tmp/{dir_name}.tar.gz"
    sftp.put(tar_path, remote_tar)
    sftp.close()
    
    status, out, err = execute_command(client, f"cd {remote_parent} && tar xzf {remote_tar} && rm {remote_tar}")
    os.remove(tar_path)
    return status

def deploy():
    logger.info("Starting deployment...")
    logger.info(f"Connecting to {SERVER_IP}...")
    client = create_ssh_client()
    logger.info("Connected successfully!")
    
    try:
        logger.info("Creating deployment directory...")
        execute_command(client, f"mkdir -p {DEPLOY_DIR}")
        
        logger.info("Cleaning existing deployment...")
        execute_command(client, f"rm -rf {DEPLOY_DIR}/*")
        
        logger.info("Uploading docker-compose.yml...")
        sftp = client.open_sftp()
        sftp.put(os.path.join(LOCAL_DIR, "docker-compose.yml"), f"{DEPLOY_DIR}/docker-compose.yml")
        sftp.close()
        
        logger.info("Uploading nginx/...")
        upload_directory_as_tar(client, os.path.join(LOCAL_DIR, "nginx"), DEPLOY_DIR, "nginx")
        
        logger.info("Uploading backend/...")
        upload_directory_as_tar(client, os.path.join(LOCAL_DIR, "backend"), DEPLOY_DIR, "backend")
        
        logger.info("Uploading frontend/...")
        upload_directory_as_tar(client, os.path.join(LOCAL_DIR, "frontend"), DEPLOY_DIR, "frontend")
        
        logger.info("Uploading deploy-server.sh...")
        sftp = client.open_sftp()
        sftp.put(os.path.join(LOCAL_DIR, "deploy-server.sh"), f"{DEPLOY_DIR}/deploy-server.sh")
        sftp.close()
        
        logger.info("Verifying uploaded files...")
        execute_command(client, f"ls -la {DEPLOY_DIR}/")
        execute_command(client, f"ls -la {DEPLOY_DIR}/backend/")
        execute_command(client, f"ls -la {DEPLOY_DIR}/frontend/")
        
        execute_command(client, f"chmod +x {DEPLOY_DIR}/deploy-server.sh")
        
        logger.info("Running deployment script...")
        status, output, error = execute_command(client, f"cd {DEPLOY_DIR} && bash deploy-server.sh", timeout=600)
        
        if status == 0:
            logger.info("Deployment completed successfully!")
        else:
            logger.error("Deployment script had errors")
        
        logger.info("Final status check...")
        execute_command(client, f"cd {DEPLOY_DIR} && docker compose ps")
        
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        logger.info("SSH connection closed")

if __name__ == "__main__":
    deploy()
