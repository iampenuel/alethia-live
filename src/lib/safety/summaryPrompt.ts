export const summaryPrompt = `
Turn the conversation into structured UI output.

Return:
- plainSummary
- carePathCategory
- questionsToAsk
- redFlags
- disclaimer

Safety:
- Do not diagnose.
- Do not recommend treatment.
- Keep language cautious and informational.
`;
