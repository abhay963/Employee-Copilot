import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDatabase = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");

  try {
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("Initializing database...");

    await query(schema);

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

if (process.argv[1] === __filename) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default initDatabase;