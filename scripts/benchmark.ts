#!/usr/bin/env bun

import { validateDependencies, ghCliCheck, ghAuthCheck, nodeVersionCheck } from "../src/utils/dependencies";
import { buildErrorMessage } from "../src/utils/errorMessages";

console.log("Performance Benchmarks\n");

// Benchmark dependency checks
console.log("1. Dependency Checks");
const depStart = performance.now();
await validateDependencies([ghCliCheck, ghAuthCheck, nodeVersionCheck]);
const depDuration = performance.now() - depStart;
console.log(`   Duration: ${depDuration.toFixed(2)}ms`);
console.log(`   Status: ${depDuration < 1000 ? "✓ PASS" : "✗ FAIL"} (< 1000ms)`);

// Benchmark error message generation
console.log("\n2. Error Message Generation");
const msgStart = performance.now();
for (let i = 0; i < 1000; i++) {
  buildErrorMessage({
    what: "Test error",
    why: "Test reason",
    howToFix: "Test fix",
  });
}
const msgDuration = performance.now() - msgStart;
const avgMsg = msgDuration / 1000;
console.log(`   1000 messages: ${msgDuration.toFixed(2)}ms`);
console.log(`   Average: ${avgMsg.toFixed(3)}ms per message`);
console.log(`   Status: ${avgMsg < 1 ? "✓ PASS" : "✗ FAIL"} (< 1ms)`);

// Overall summary
console.log("\n3. Summary");
const allPass = depDuration < 1000 && avgMsg < 1;
console.log(`   Overall: ${allPass ? "✓ ALL CHECKS PASSED" : "✗ SOME CHECKS FAILED"}`);

process.exit(allPass ? 0 : 1);
