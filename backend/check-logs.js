import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('\n=== Query Rules ===');
const rules = db.prepare('SELECT id, name, schedule_cron, is_active, last_run FROM query_rules').all();
rules.forEach(r => {
  console.log(`Rule #${r.id}: "${r.name}"`);
  console.log(`  - Cron: ${r.schedule_cron}`);
  console.log(`  - Active: ${r.is_active ? 'Yes' : 'No'}`);
  console.log(`  - Last Run: ${r.last_run || 'Never'}`);
});

console.log('\n=== Recent API Calls (Last 20) ===');
const logs = db.prepare('SELECT l.*, r.name as rule_name FROM query_logs l LEFT JOIN query_rules r ON l.rule_id = r.id ORDER BY l.created_at DESC LIMIT 20').all();
logs.forEach(l => {
  console.log(`${l.created_at} | ${l.status.padEnd(7)} | Rule: ${l.rule_name || 'Unknown'} | Found: ${l.items_found} | Error: ${(l.error_message || '-').substring(0, 40)}`);
});

console.log('\n=== API Calls Today ===');
const today = db.prepare("SELECT COUNT(*) as count FROM query_logs WHERE date(created_at) = date('now')").get();
console.log(`API calls today: ${today.count}`);

const total = db.prepare("SELECT COUNT(*) as count FROM query_logs").get();
console.log(`Total API calls in history: ${total.count}`);

db.close();


