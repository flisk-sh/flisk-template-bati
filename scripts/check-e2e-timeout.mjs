import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/e2e.yml', import.meta.url), 'utf8');
const job = /^  e2e:\n([\s\S]*)$/m.exec(workflow)?.[1] ?? '';
const problems = [];

const jobTimeout = /^\s+timeout-minutes:\s*(\d+)\s*$/m.exec(job)?.[1];
if (!jobTimeout || Number(jobTimeout) > 10) problems.push('jobs.e2e.timeout-minutes must be set to 10 or less');

const runStart = job.indexOf('name: Run the template through flisk up');
const runRest = runStart === -1 ? '' : job.slice(runStart);
const runEnd = runRest.indexOf('\n      - name:', 1);
const runStep = runEnd === -1 ? runRest : runRest.slice(0, runEnd);
const stepTimeout = /timeout-minutes:\s*(\d+)/.exec(runStep)?.[1];
if (!stepTimeout || Number(stepTimeout) > 5) problems.push('the flisk up step must have timeout-minutes of 5 or less');
if (!/timeout-minutes: 5/.test(runStep)) problems.push('the flisk up step must time out before the job');

if (!/name:\s*Diagnose a hung flisk up/.test(job) || !/flisk status/.test(job)) {
  problems.push('a failure step must print flisk status');
}
if (!/name:\s*Keep the flisk up log[\s\S]*?if:\s*failure\(\)[\s\S]*?actions\/upload-artifact@/.test(job)) {
  problems.push('evidence must still be uploaded after a failed flisk up');
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('e2e job and flisk up step have bounded timeouts and failure diagnosis');
}
