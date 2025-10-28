import { spawn } from 'child_process';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

function runTest(testPath: string, name: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const projectRoot = join(process.cwd(), '..');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log('='.repeat(60));
    
    const child = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });

    child.on('close', (code: number | null) => {
      const duration = Date.now() - start;
      
      if (code === 0) {
        resolve({
          name,
          passed: true,
          duration
        });
      } else {
        resolve({
          name,
          passed: false,
          duration,
          error: `Exited with code ${code}`
        });
      }
    });

    child.on('error', (error: Error) => {
      const duration = Date.now() - start;
      resolve({
        name,
        passed: false,
        duration,
        error: error.message
      });
    });
  });
}

async function main() {
  console.log('\n🧪 NFT Trading Game - Comprehensive Test Suite');
  console.log('='.repeat(60));
  console.log();

  const tests = [
    {
      path: 'tests/integration/01-full-mint-flow.test.ts',
      name: 'Integration Test 1: Full Mint Flow'
    },
    {
      path: 'tests/integration/02-marketplace-flow.test.ts',
      name: 'Integration Test 2: Marketplace Flow'
    },
    {
      path: 'tests/integration/03-websocket-flow.test.ts',
      name: 'Integration Test 3: WebSocket Flow'
    },
    {
      path: 'tests/integration/04-analytics-flow.test.ts',
      name: 'Integration Test 4: Analytics Flow'
    },
    {
      path: 'tests/e2e/full-stack.test.ts',
      name: 'E2E Test: Full Stack Lifecycle'
    }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.path, test.name);
    results.push(result);
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log();

  let passCount = 0;
  let failCount = 0;
  let totalDuration = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const durationStr = `${(result.duration / 1000).toFixed(2)}s`;
    
    console.log(`${icon} ${result.name} (${durationStr})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
    
    totalDuration += result.duration;
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`Tests Passed: ${passCount}/${results.length}`);
  console.log(`Tests Failed: ${failCount}/${results.length}`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('='.repeat(60));
  console.log();

  if (failCount === 0) {
    console.log('✅ ALL TESTS PASSED');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.log('❌ SOME TESTS FAILED');
    setTimeout(() => process.exit(1), 100);
  }
}

main().catch(error => {
  console.error('Test runner failed:', error);
  setTimeout(() => process.exit(1), 100);
});