import "dotenv/config";
import { answerQuestion } from "./agent.js";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error('Usage: npm run ask "your question here"');
  process.exit(1);
}

console.error(`\n💬 ${question}\n`);
const { text, toolCalls } = await answerQuestion(question, [], (status) =>
  console.error(`   ${status}`),
);
console.error(`\n   (${toolCalls.length} tool calls)\n`);
console.log("─".repeat(60));
console.log(text);
console.log("─".repeat(60));
