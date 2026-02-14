import { v4 as uuidv4 } from 'uuid';
import { UniversalDB } from '../src/db/index.js';

const db = new UniversalDB({ type: 'sqlite', connectionString: ':memory:' });

async function run() {
    await db.init();
    await db.exec("CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)");

    const id = uuidv4();
    console.log("Generated UUID:", id, typeof id);

    if (!id) {
        console.error("UUID generation failed!");
        process.exit(1);
    }

    await db.query("INSERT INTO test (id, val) VALUES (?, ?)", [id, 'foo']);

    const row = await db.get("SELECT * FROM test");
    console.log("Row form DB:", row);
}

run();
