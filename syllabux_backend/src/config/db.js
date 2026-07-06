import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testPool() {
  try {
    const connection = await pool.getConnection();
    console.log(
      `Database connection pool successfully established. Thread ID: ${connection.threadId}`,
    );
    connection.release();
  } catch (error) {
    console.error(`Connection failed: `, error.message);
  }
}

testPool();

export default pool;
