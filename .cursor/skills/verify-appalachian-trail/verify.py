#!/usr/bin/env python3
"""Verification runner for AppalachianTrail. See SKILL.md."""
import json, os, subprocess, sys, time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
failures = []

def check(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL'), name, (':: ' + str(detail))[:400] if detail else '')
    if not ok:
        failures.append(name)

def run(cmd, **kw):
    return subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=900, **kw)

def main():
    if not (REPO / 'node_modules').is_dir():
        proc = run(['npm', 'install', '--no-audit', '--no-fund'])
        check('npm install', proc.returncode == 0, proc.stderr[-300:])
    proc = run(['npm', 'run', 'build'])
    check('vite build', proc.returncode == 0, (proc.stdout + proc.stderr)[-300:])
    env = dict(os.environ, WIDTH=os.environ.get('VERIFY_WIDTH', '390'), THEMES=os.environ.get('VERIFY_THEMES', 'dark'))
    proc = run(['node', 'verification/check.cjs'], env=env)
    tail = proc.stdout + proc.stderr
    check('scene interaction check (real Chromium: drag/reset, keyboard, opt-in, label floors)', proc.returncode == 0 and 'PASS' in tail, tail[-300:])
    print('FAILURES=%d' % len(failures))
    evidence = {'repo': 'AppalachianTrail', 'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'failures': failures}
    with open(REPO / '.cursor/skills/verify-appalachian-trail/evidence.json', 'w') as f:
        json.dump(evidence, f, indent=2)
    return 1 if failures else 0

if __name__ == '__main__':
    sys.exit(main())
