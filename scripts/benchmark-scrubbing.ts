#!/usr/bin/env bun
/**
 * Performance Benchmark for Secret Scrubbing
 * Tests scrubbing operations to ensure < 1ms per operation
 */

import { scrubSecrets, scrubObject, clearCache } from '../src/utils/scrubber';

const ITERATIONS = 10000;
const MAX_TIME_MS = 1;

interface BenchmarkResult {
  name: string;
  avgTime: number;
  passed: boolean;
}

function benchmark(name: string, fn: () => void): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 100; i++) fn();
  
  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const end = performance.now();
  
  const avgTime = (end - start) / ITERATIONS;
  const passed = avgTime < MAX_TIME_MS;
  
  return { name, avgTime, passed };
}

console.log('🔬 Secret Scrubbing Performance Benchmark\n');
console.log(`Running ${ITERATIONS} iterations per test...\n`);

const results: BenchmarkResult[] = [];

// Test 1: scrubSecrets with KEY=value
clearCache();
results.push(benchmark('scrubSecrets (KEY=value)', () => {
  scrubSecrets('API_KEY=secret123 PASSWORD=admin');
}));

// Test 2: scrubSecrets with URL
clearCache();
results.push(benchmark('scrubSecrets (URL)', () => {
  scrubSecrets('postgres://user:password@localhost:5432/db');
}));

// Test 3: scrubSecrets with no secrets
clearCache();
results.push(benchmark('scrubSecrets (no secrets)', () => {
  scrubSecrets('Hello world, this is a normal message');
}));

// Test 4: scrubObject with nested structure
clearCache();
results.push(benchmark('scrubObject (nested)', () => {
  scrubObject({
    config: {
      apiKey: 'secret',
      password: 'admin',
      port: 3000,
      debug: true
    }
  });
}));

// Test 5: scrubObject with array
clearCache();
results.push(benchmark('scrubObject (array)', () => {
  scrubObject(['API_KEY=secret', 'DEBUG=true', 'PORT=3000']);
}));

// Print results
console.log('Results:');
console.log('─'.repeat(60));

let allPassed = true;
for (const result of results) {
  const status = result.passed ? '✓' : '✗';
  const timeStr = result.avgTime.toFixed(4);
  console.log(`${status} ${result.name}: ${timeStr}ms per call`);
  if (!result.passed) allPassed = false;
}

console.log('─'.repeat(60));

if (allPassed) {
  console.log('\n✅ All benchmarks passed! (< 1ms per operation)');
  process.exit(0);
} else {
  console.log('\n❌ Some benchmarks failed (exceeded 1ms per operation)');
  process.exit(1);
}
