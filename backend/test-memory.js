// Simple test script for conversation memory system functions
import conversationMemoryService from './src/services/conversationMemoryService.js';

async function testMemorySystem() {
  console.log('Testing Conversation Memory System Functions...\n');

  try {
    // Test 1: Entity extraction
    console.log('Test 1: Testing entity extraction...');
    const testMemory = {
      currentTopic: null,
      lastCalendarEvent: null,
      lastLeaveRequest: null,
      lastGmailContext: null,
      referencedEntities: [],
      importantDates: [],
      pendingAction: null,
      toolState: {}
    };
    
    const testMessage1 = 'Schedule a meeting next Tuesday at 3 PM for 1 hour';
    conversationMemoryService.extractEntitiesFromMessage(testMessage1, testMemory);
    console.log('✓ Entities extracted from:', testMessage1);
    console.log('  - Referenced entities:', testMemory.referencedEntities);
    console.log('  - Important dates:', testMemory.importantDates);

    const testMessage2 = 'I need to take annual leave from 2024-09-01 to 2024-09-05';
    conversationMemoryService.extractEntitiesFromMessage(testMessage2, testMemory);
    console.log('✓ Entities extracted from:', testMessage2);
    console.log('  - Referenced entities:', testMemory.referencedEntities);
    console.log('  - Important dates:', testMemory.importantDates);

    // Test 2: Contextual reference resolution
    console.log('\nTest 2: Testing contextual reference resolution...');
    const compactContext = {
      structuredMemory: {
        currentTopic: 'calendar_events',
        lastCalendarEvent: {
          lastQuery: 'What meetings do I have tomorrow?',
          lastResultSummary: 'You have 3 meetings tomorrow'
        },
        importantDates: ['tomorrow', 'Friday'],
        referencedEntities: ['calendar']
      }
    };

    const resolved1 = conversationMemoryService.resolveContextualReferences(
      'What about tomorrow?',
      compactContext
    );
    console.log('✓ Resolved: "What about tomorrow?"');
    console.log('  - Temporal context:', resolved1.resolvedContext.temporalContext);

    const resolved2 = conversationMemoryService.resolveContextualReferences(
      'Change it to 4 PM',
      compactContext
    );
    console.log('✓ Resolved: "Change it to 4 PM"');
    console.log('  - Action context:', resolved2.resolvedContext.actionContext);

    // Test 3: LLM context building
    console.log('\nTest 3: Testing LLM context building...');
    const testContext = {
      summary: 'User asked about calendar meetings for tomorrow and Friday',
      currentTopic: 'calendar_events',
      lastIntent: 'calendar_events',
      currentWorkflowStep: 'IDLE',
      pendingAction: null,
      recentMessages: [
        { role: 'user', content: 'What meetings do I have tomorrow?', timestamp: new Date() },
        { role: 'assistant', content: 'You have 3 meetings tomorrow', timestamp: new Date() }
      ],
      structuredMemory: {
        currentTopic: 'calendar_events',
        lastCalendarEvent: {
          lastQuery: 'What meetings do I have tomorrow?',
          lastResultSummary: 'You have 3 meetings tomorrow'
        },
        importantDates: ['tomorrow', 'Friday'],
        referencedEntities: ['calendar']
      },
      useSummary: true
    };

    const systemPrompt = 'You are an Employee Copilot.';
    const llmContext = conversationMemoryService.buildLLMContext(testContext, systemPrompt);
    console.log('✓ LLM context built');
    console.log('  - Context length:', llmContext.length, 'characters');
    console.log('  - Uses summary:', testContext.useSummary);
    console.log('  - Context preview:', llmContext.substring(0, 200) + '...');

    // Test 4: Calendar context extraction
    console.log('\nTest 4: Testing calendar context extraction...');
    const calendarContext = conversationMemoryService.extractCalendarContext(
      'What meetings do I have tomorrow at 2:30 PM?',
      'You have a team standup at 2:30 PM tomorrow'
    );
    console.log('✓ Calendar context extracted');
    console.log('  - Last query:', calendarContext.lastQuery);
    console.log('  - Referenced dates:', calendarContext.referencedDates);
    console.log('  - Referenced times:', calendarContext.referencedTimes);

    // Test 5: Leave context extraction
    console.log('\nTest 5: Testing leave context extraction...');
    const leaveContext = conversationMemoryService.extractLeaveContext(
      'I need to take sick leave from Monday to Wednesday',
      'Your sick leave balance is 10 days'
    );
    console.log('✓ Leave context extracted');
    console.log('  - Last query:', leaveContext.lastQuery);
    console.log('  - Referenced leave types:', leaveContext.referencedLeaveTypes);
    console.log('  - Referenced dates:', leaveContext.referencedDates);

    // Test 6: Email context extraction
    console.log('\nTest 6: Testing email context extraction...');
    const emailContext = conversationMemoryService.extractEmailContext(
      'Send an email to john@example.com about the project',
      'Email draft prepared'
    );
    console.log('✓ Email context extracted');
    console.log('  - Last query:', emailContext.lastQuery);
    console.log('  - Referenced emails:', emailContext.referencedEmails);

    console.log('\n✅ All memory system function tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testMemorySystem().then(success => {
  process.exit(success ? 0 : 1);
});