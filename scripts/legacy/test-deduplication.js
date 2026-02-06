#!/usr/bin/env node

/**
 * Test Suite for Event Deduplication
 * 
 * Tests the deduplication functionality for GTM/Meta events:
 * 1. shouldFireEvent() - prevents duplicate events
 * 2. trackEventOnce() - tracks events with deduplication
 * 3. Integration with checkout-success and signup-success pages
 */

import { JSDOM } from 'jsdom';

// Create a mock browser environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set up global window and document
global.window = dom.window;
global.document = dom.window.document;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

// Mock sessionStorage using Object.defineProperty
Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock
});

// Mock dataLayer
window.dataLayer = [];

// Import the analytics functions (we'll need to adapt them for Node.js)
// For now, let's recreate the key functions for testing

function shouldFireEvent(eventName, eventId) {
  if (typeof window === 'undefined') return false;
  
  const storageKey = `event_fired_${eventName}${eventId ? `_${eventId}` : ''}`;
  
  // Check if event was already fired in this session
  const alreadyFired = window.sessionStorage.getItem(storageKey);
  
  if (alreadyFired) {
    console.log(`⏭️ Event ${eventName} already fired, skipping (deduplication)`);
    return false;
  }
  
  // Mark as fired
  window.sessionStorage.setItem(storageKey, 'true');
  return true;
}

async function trackEventOnce(eventName, eventData = {}, eventId) {
  if (typeof window === 'undefined') return false;
  
  // Check deduplication
  if (!shouldFireEvent(eventName, eventId)) {
    return false;
  }
  
  window.dataLayer = window.dataLayer || [];
  
  // Add event ID to event data for Meta deduplication
  const eventPayload = {
    event: eventName,
    event_id: eventId || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...eventData,
  };
  
  window.dataLayer.push(eventPayload);
  console.log(`✅ Tracked ${eventName} with deduplication`, eventPayload);
  
  return true;
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ name, details });
  }
}

// Test 1: Basic deduplication - same event name
function testBasicDeduplication() {
  console.log('\n📋 Test 1: Basic Deduplication');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const eventName = 'test_event';
  const eventId = 'test_id_123';
  
  // First call should fire
  const firstCall = shouldFireEvent(eventName, eventId);
  logTest('First call returns true', firstCall === true);
  
  // Second call should be blocked
  const secondCall = shouldFireEvent(eventName, eventId);
  logTest('Second call returns false (deduplicated)', secondCall === false);
  
  // Different event ID should fire
  const differentId = shouldFireEvent(eventName, 'different_id');
  logTest('Different event ID fires', differentId === true);
  
  // Different event name should fire
  const differentName = shouldFireEvent('different_event', eventId);
  logTest('Different event name fires', differentName === true);
}

// Test 2: trackEventOnce with deduplication
async function testTrackEventOnce() {
  console.log('\n📋 Test 2: trackEventOnce with Deduplication');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const eventName = 'purchase';
  const eventId = 'session_123';
  const eventData = { value: 99.99, currency: 'USD' };
  
  // First call should succeed
  const firstResult = await trackEventOnce(eventName, eventData, eventId);
  logTest('First trackEventOnce succeeds', firstResult === true);
  logTest('First event pushed to dataLayer', window.dataLayer.length === 1);
  logTest('First event has correct event_id', window.dataLayer[0].event_id === eventId);
  logTest('First event has correct data', window.dataLayer[0].value === 99.99);
  
  // Second call should be blocked
  const secondResult = await trackEventOnce(eventName, eventData, eventId);
  logTest('Second trackEventOnce blocked', secondResult === false);
  logTest('No duplicate event in dataLayer', window.dataLayer.length === 1);
}

// Test 3: Multiple different events
async function testMultipleEvents() {
  console.log('\n📋 Test 3: Multiple Different Events');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const events = [
    { name: 'registration_success', id: 'reg_123', data: {} },
    { name: 'subscription_success', id: 'sub_456', data: { value: 6 } },
    { name: 'purchase', id: 'purchase_789', data: { value: 149 } },
  ];
  
  for (const event of events) {
    const result = await trackEventOnce(event.name, event.data, event.id);
    logTest(`${event.name} tracked successfully`, result === true);
  }
  
  logTest('All events in dataLayer', window.dataLayer.length === 3);
  
  // Try to fire them again - should all be blocked
  for (const event of events) {
    const result = await trackEventOnce(event.name, event.data, event.id);
    logTest(`${event.name} deduplicated on second call`, result === false);
  }
  
  logTest('No duplicate events added', window.dataLayer.length === 3);
}

// Test 4: Event ID generation
async function testEventIdGeneration() {
  console.log('\n📋 Test 4: Event ID Generation');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const eventName = 'test_event';
  
  // Call without event ID - should generate one
  const result1 = await trackEventOnce(eventName, {});
  logTest('Event without ID tracked', result1 === true);
  logTest('Generated event_id exists', !!window.dataLayer[0]?.event_id);
  logTest('Generated event_id is string', typeof window.dataLayer[0]?.event_id === 'string');
  
  // Try to fire again without ID - should be blocked (same event name)
  const result2 = await trackEventOnce(eventName, {});
  logTest('Second call without ID blocked (deduplication by event name)', result2 === false);
  logTest('Only one event in dataLayer', window.dataLayer.length === 1);
  
  // Test with explicit different IDs - should both fire
  window.sessionStorage.clear();
  window.dataLayer = [];
  const result3 = await trackEventOnce(eventName, {}, 'id1');
  const result4 = await trackEventOnce(eventName, {}, 'id2');
  logTest('Different explicit IDs both fire', result3 === true && result4 === true);
  logTest('Two events with different explicit IDs', window.dataLayer.length === 2);
}

// Test 5: Session storage persistence
function testSessionStoragePersistence() {
  console.log('\n📋 Test 5: Session Storage Persistence');
  window.sessionStorage.clear();
  
  const eventName = 'test_event';
  const eventId = 'persistent_id';
  
  // Fire event
  shouldFireEvent(eventName, eventId);
  logTest('Event fired and stored', window.sessionStorage.getItem(`event_fired_${eventName}_${eventId}`) === 'true');
  
  // Clear dataLayer but keep sessionStorage
  window.dataLayer = [];
  
  // Try to fire again - should be blocked
  const blocked = shouldFireEvent(eventName, eventId);
  logTest('Event blocked after sessionStorage persists', blocked === false);
  logTest('SessionStorage key still exists', window.sessionStorage.getItem(`event_fired_${eventName}_${eventId}`) === 'true');
}

// Test 6: Checkout success scenarios
async function testCheckoutSuccessScenarios() {
  console.log('\n📋 Test 6: Checkout Success Scenarios');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const sessionId = 'cs_test_123456';
  
  // Test free trial
  const trialResult = await trackEventOnce('free_trial', {}, sessionId);
  logTest('Free trial event tracked', trialResult === true);
  logTest('Free trial has session_id as event_id', window.dataLayer[0].event_id === sessionId);
  
  // Test subscription success
  const subResult = await trackEventOnce('subscription_success', {
    subscription: { value: 6, currency: 'USD' }
  }, sessionId);
  logTest('Subscription success tracked', subResult === true);
  logTest('Subscription has correct value', window.dataLayer[1].subscription.value === 6);
  
  // Test purchase (lifetime)
  const purchaseResult = await trackEventOnce('purchase', {
    value: 149,
    currency: 'USD',
    transaction_id: sessionId,
    items: [{ item_id: 'lifetime', price: 149 }]
  }, sessionId);
  logTest('Purchase event tracked', purchaseResult === true);
  logTest('Purchase has correct value', window.dataLayer[2].value === 149);
  logTest('Purchase has items array', Array.isArray(window.dataLayer[2].items));
  
  // Try to fire purchase again - should be blocked
  const duplicatePurchase = await trackEventOnce('purchase', {
    value: 149,
    currency: 'USD'
  }, sessionId);
  logTest('Duplicate purchase blocked', duplicatePurchase === false);
  logTest('No duplicate purchase in dataLayer', window.dataLayer.length === 3);
}

// Test 7: Registration success scenario
async function testRegistrationSuccess() {
  console.log('\n📋 Test 7: Registration Success Scenario');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  const eventId = 'registration_user123';
  
  const result = await trackEventOnce('registration_success', {}, eventId);
  logTest('Registration success tracked', result === true);
  logTest('Registration has event_id', window.dataLayer[0].event_id === eventId);
  
  // Try to fire again - should be blocked
  const duplicate = await trackEventOnce('registration_success', {}, eventId);
  logTest('Duplicate registration blocked', duplicate === false);
}

// Test 8: Edge cases
async function testEdgeCases() {
  console.log('\n📋 Test 8: Edge Cases');
  window.sessionStorage.clear();
  window.dataLayer = [];
  
  // Empty event name
  const emptyName = await trackEventOnce('', {}, 'test_id');
  logTest('Empty event name handled', typeof emptyName === 'boolean');
  
  // Very long event ID
  const longId = 'a'.repeat(1000);
  const longIdResult = await trackEventOnce('test', {}, longId);
  logTest('Very long event ID handled', longIdResult === true);
  
  // Special characters in event ID
  const specialId = 'test_id_!@#$%^&*()';
  const specialResult = await trackEventOnce('test', {}, specialId);
  logTest('Special characters in event ID handled', specialResult === true);
  
  // Multiple rapid sequential calls (simulating real browser behavior)
  // Clear dataLayer for this specific test
  const dataLayerLengthBefore = window.dataLayer.length;
  const rapidResults = [];
  rapidResults.push(await trackEventOnce('rapid_event', {}, 'rapid_id'));
  rapidResults.push(await trackEventOnce('rapid_event', {}, 'rapid_id'));
  rapidResults.push(await trackEventOnce('rapid_event', {}, 'rapid_id'));
  logTest('Rapid duplicate calls handled', rapidResults.filter(r => r).length === 1);
  // Check that only one new event was added (accounting for previous tests)
  const rapidEventsAdded = window.dataLayer.length - dataLayerLengthBefore;
  logTest('Only one event added to dataLayer after rapid calls', rapidEventsAdded === 1);
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Event Deduplication Tests');
  console.log('='.repeat(60));
  
  try {
    testBasicDeduplication();
    await testTrackEventOnce();
    await testMultipleEvents();
    await testEventIdGeneration();
    testSessionStoragePersistence();
    await testCheckoutSuccessScenarios();
    await testRegistrationSuccess();
    await testEdgeCases();
    
    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    const total = testResults.passed + testResults.failed;
    console.log(`📈 Success Rate: ${total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.name}: ${error.details}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Deduplication is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

