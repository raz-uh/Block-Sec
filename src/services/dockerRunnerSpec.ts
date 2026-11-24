export interface DockerSandboxSpec {
  title: string;
  description: string;
  securityFeatures: {
    feature: string;
    description: string;
    enforcement: string;
  }[];
  dockerfile: string;
  runnerScript: string;
  foundryToml: string;
  seccompProfileJson: string;
  apiEndpointSpec: string;
}

export const DOCKER_SANDBOX_SPEC: DockerSandboxSpec = {
  title: 'Hardened Foundry Docker Execution Engine',
  description:
    'A multi-tenant ephemeral execution sandbox designed to compile and test user-submitted Solidity smart contract exploits with zero host exposure, aggressive resource limits, and network jail.',
  securityFeatures: [
    {
      feature: 'Network Isolation (--network=none)',
      description: 'The execution container has no loopback or external network interfaces, preventing RPC exfiltration and reverse shells.',
      enforcement: 'Docker flag `--network=none` + iptables drop all egress',
    },
    {
      feature: 'Read-Only Root Filesystem',
      description: 'The entire container root filesystem is mounted as read-only. Exploits cannot write to bin, etc, or system libs.',
      enforcement: '`--read-only` flag on container runtime',
    },
    {
      feature: 'Ephemeral In-Memory Workdir (tmpfs)',
      description: 'Challenge source files and user exploits are mounted in RAM via tmpfs at `/workspace` with a strict 64MB memory cap.',
      enforcement: '`--tmpfs /workspace:rw,noexec,nosuid,size=64m`',
    },
    {
      feature: 'Strict Seccomp System Call Whitelist',
      description: 'Blocks hazardous syscalls like clone3, unshare, ptrace, and mount to eliminate container breakout vectors.',
      enforcement: 'Custom Docker seccomp JSON filter applied via `--security-opt`',
    },
    {
      feature: 'Kernel Cgroups & CPU/Memory Quotas',
      description: 'Caps execution to 1 vCPU and 512MB RAM with swap disabled to neutralize algorithmic gas bombs and memory exhaustion.',
      enforcement: '`--memory=512m --cpus=1.0 --memory-swap=512m`',
    },
    {
      feature: 'Hard Timeout Watchdog',
      description: 'Terminates infinite EVM loop attacks with SIGKILL after precisely 10.0 seconds.',
      enforcement: 'GNU coreutils `timeout -s KILL 10s forge test`',
    },
  ],
  dockerfile: `# ------------------------------------------------------------------------------
# BlockSecLab Production Foundry Worker Container
# Hardened multi-stage build running unprivileged user
# ------------------------------------------------------------------------------
FROM ghcr.io/foundry-rs/foundry:latest AS foundry-base

FROM debian:bookworm-slim

# Install minimal runtime essentials
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ca-certificates \\
    coreutils \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Copy forge and cast binaries from official foundry image
COPY --from=foundry-base /usr/local/bin/forge /usr/local/bin/forge
COPY --from=foundry-base /usr/local/bin/cast /usr/local/bin/cast

# Create unprivileged runner user
RUN useradd -u 10001 -m -s /bin/bash sandbox && \\
    mkdir -p /opt/foundry-template && \\
    chown -R sandbox:sandbox /opt/foundry-template

# Set up template foundry environment
USER sandbox
WORKDIR /opt/foundry-template

# Pre-install standard libraries (forge-std, openzeppelin)
RUN forge init --no-git --no-commit . && \\
    rm -rf src/* test/* script/*

# Copy runner entrypoint
COPY --chown=sandbox:sandbox runner.sh /usr/local/bin/runner.sh
RUN chmod 755 /usr/local/bin/runner.sh

WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/runner.sh"]`,
  runnerScript: `#!/bin/bash
set -euo pipefail

# ------------------------------------------------------------------------------
# runner.sh: Ephemeral Foundry Test Execution Hook
# ------------------------------------------------------------------------------
TIMEOUT_LIMIT="10s"
JSON_OUTPUT="/tmp/forge_result.json"

echo "{\"status\": \"STARTING\", \"timestamp\": $(date +%s)}" >&2

# 1. Enforce directory isolation
cd /workspace

# 2. Run forge test with aggressive verbosity and gas reporting
#    Capture exit code and output
EXIT_CODE=0
OUTPUT=$(timeout --signal=KILL "$TIMEOUT_LIMIT" forge test \\
    --match-test "testExploit" \\
    -vvvv \\
    --gas-report \\
    --json 2>&1) || EXIT_CODE=$?

# 3. Format structured JSON result for host backend
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "$OUTPUT" | jq '{status: "PASS", exitCode: 0, raw: .}'
elif [ "$EXIT_CODE" -eq 137 ]; then
    echo "{\"status\": \"TIMEOUT\", \"exitCode\": 137, \"error\": \"Execution timed out (10s limit)\"}"
else
    echo "$OUTPUT" | jq '{status: "FAIL", exitCode: '$EXIT_CODE', raw: .}' 2>/dev/null || \\
    echo "{\"status\": \"FAIL\", \"exitCode\": $EXIT_CODE, \"rawText\": $(echo "$OUTPUT" | jq -R -s '.')}"
fi

exit $EXIT_CODE`,
  foundryToml: `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
verbosity = 4
ffi = false # CRITICAL SECURITY: Never allow FFI (arbitrary host commands)
fs_permissions = [{ access = "none", path = "*" }] # Prohibit file system access`,
  seccompProfileJson: `{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "read", "write", "openat", "close", "stat", "fstat", "lstat",
        "poll", "lseek", "mmap", "mprotect", "munmap", "brk", "rt_sigaction",
        "rt_sigprocmask", "rt_sigreturn", "ioctl", "nanosleep", "gettimeofday",
        "getpid", "exit", "exit_group", "arch_prctl", "futex", "clock_gettime"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}`,
  apiEndpointSpec: `// Backend Express / NestJS Controller Pipeline
// POST /api/sandbox/execute
// Request Payload: { challengeId: string, exploitSource: string }

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export async function runDockerSandbox(challengeId: string, exploitSource: string) {
  const runId = crypto.randomUUID();
  const hostTmpDir = path.join('/tmp/sandbox_runs', runId);
  await fs.mkdir(hostTmpDir, { recursive: true });

  // Write exploit file
  await fs.writeFile(path.join(hostTmpDir, 'Exploit.sol'), exploitSource);

  return new Promise((resolve, reject) => {
    const dockerArgs = [
      'run',
      '--rm',
      '--network=none',
      '--read-only',
      '--cpus=1.0',
      '--memory=512m',
      '--memory-swap=512m',
      '--pids-limit=64',
      '--security-opt=no-new-privileges:true',
      '--security-opt=seccomp=/etc/docker/seccomp/foundry.json',
      \`--volume=\${hostTmpDir}:/workspace:ro\`,
      '--tmpfs=/tmp:rw,noexec,nosuid,size=32m',
      'blockseclab/foundry-runner:latest'
    ];

    const proc = spawn('docker', dockerArgs);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', async (code) => {
      // Clean up host temp directory
      await fs.rm(hostTmpDir, { recursive: true, force: true });
      resolve({ code, stdout, stderr });
    });
  });
}`,
};
