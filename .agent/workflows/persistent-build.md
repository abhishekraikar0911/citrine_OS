---
description: how to handle long-running builds persistently using screen
---
# Persistent Build Workflow

This workflow ensures your builds continue running even if your SSH connection is lost.

## 1. Start a Build Session
Use the helper script to start a build in the background:
```bash
./persistent-build.sh start
```

## 2. Monitor or Attach to the Build
To see the output of the build:
```bash
./persistent-build.sh attach
```

## 3. If Disconnected
Simply reconnect via SSH and run the attach command again:
```bash
./persistent-build.sh attach
```

## 4. Stop the Session
Once the build is finished and you no longer need the session:
```bash
./persistent-build.sh stop
```

## Manual screen commands (Professional Way)
If you prefer using screen directly:
- **Start session**: `screen -S citrine-ui-build`
- **Detach**: Press `Ctrl+A` then `D`
- **Reattach**: `screen -r citrine-ui-build`
- **List sessions**: `screen -ls`
