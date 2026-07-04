import pool from '../config/db.js'

export async function create({about_self,linkedin_url,years_of_experience,expertise_summary,resume_link,user_id}){
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO InstructorApplication (user_id, about_self, linkedin_url, years_of_experience, expertise_summary, resume_link)
      VALUES(?, ?, ?, ?, ?, ?)`, [user_id, about_self, linkedin_url, years_of_experience, expertise_summary, resume_link]
    );
    await conn.query(
      `INSERT INTO ApplicationDecision (application_id, status)
      VALUES(?, ?)`, [result.insertId, 'pending']
    );
    await conn.commit();
    return{
      application_id: result.insertId,
      status: 'pending'
    }
  } catch (error) {
      await conn.rollback();
      console.error(`Error: ${error}`);
      throw error
  } finally{
    conn.release();
  }
}

export async function applicationList({ status = 'pending', limit = 10, offset = 0 } = {}) {
  const allowedStatuses = new Set(['pending', 'approved', 'rejected']);
  if (!allowedStatuses.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await pool.execute(
    `SELECT
       ia.about_self,
       ia.application_id,
       ia.expertise_summary,
       ia.linkedin_url,
       ia.resume_link,
       ia.submitted_at,
       u.user_id,
       CONCAT(u.first_name, ' ', u.last_name) AS name,
       ad.status
     FROM InstructorApplication ia
     JOIN ApplicationDecision ad ON ia.application_id = ad.application_id
     JOIN Users u ON ia.user_id = u.user_id
     WHERE ad.status = ?
     ORDER BY ia.submitted_at DESC
     LIMIT ? OFFSET ?`,
    [status, safeLimit, safeOffset]
  );

  return rows;
}
