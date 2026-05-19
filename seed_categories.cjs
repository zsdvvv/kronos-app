require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  console.log('Connecting to:', process.env.DATABASE_URL ? 'DB URL found' : 'NO DB URL!');
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  console.log('Connected!');
  
  await conn.execute(`
    INSERT INTO categories (name, label, icon, color, isSystem, userId) VALUES 
    ('work', '일/직장', 'briefcase', '#e8a95e', 1, 0),
    ('study', '학업', 'book-open', '#7d8a74', 1, 0),
    ('friends', '친구', 'users', '#bc6c25', 1, 0),
    ('meeting', '미팅', 'calendar-days', '#3a4f41', 1, 0),
    ('exercise', '운동', 'dumbbell', '#2f3e35', 1, 0),
    ('personal', '개인', 'user', '#7d8a74', 1, 0),
    ('family', '가족', 'heart', '#e8a95e', 1, 0),
    ('health', '건강', 'stethoscope', '#2f3e35', 1, 0)
  `);
  
  console.log('Categories inserted!');
  await conn.end();
}

main().catch(console.error);
