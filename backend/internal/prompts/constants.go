package prompts

// CRITICAL SYSTEM PROMPTS ONLY - No domain-specific content!
const (
	// Tool instructions that apply to all phases
	ToolInstructions = `
The system will automatically:
1. Show you what data is required for this phase
2. Guide you through collecting it via collect_structured_data
3. Transition to the next phase when requirements are met
`

	// Data collection reminder
	DataCollectionReminder = `
Remember:
- Only collect data explicitly provided by the user
- Use the exact field names shown in phase requirements
- Let the system handle phase transitions automatically
`

	// When all requirements are met
	RequirementsMetGuidance = `
All requirements for this phase have been satisfied.
Continue the conversation naturally.
The system will automatically transition when appropriate.
Do not ask for information you've already collected.
`
)