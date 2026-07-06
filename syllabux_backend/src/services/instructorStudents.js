import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

async function getInstructorIdByUserId(userId) {
  const [rows] = await pool.execute(
    'SELECT instructor_id FROM Instructors WHERE user_id = ?',
    [userId],
  );
  return rows[0]?.instructor_id ?? null;
}

export async function listStudents({ userId, page = 1, limit = 10 } = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 200);
  const safeOffset = (safePage - 1) * safeLimit;

  const instructorId = await getInstructorIdByUserId(userId);
  if (!instructorId) {
    throw new HttpError(404, 'Instructor profile not found for this user');
  }

  const [rows] = await pool.execute(
    `SELECT
       i.instructor_id,
       CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
       c.course_id,
       c.title,
       c.description,
       c.created_at AS course_created_at,
       e.student_id,
       s.user_id AS student_user_id,
       CONCAT(utwo.first_name, ' ', utwo.last_name) AS student_name
     FROM Instructors i
     INNER JOIN Users u ON i.user_id = u.user_id
     INNER JOIN Courses c ON i.instructor_id = c.instructor_id
     INNER JOIN Enrollments e ON c.course_id = e.course_id
     INNER JOIN Students s ON e.student_id = s.student_id
     INNER JOIN Users utwo ON s.user_id = utwo.user_id
     WHERE i.instructor_id = ?
     ORDER BY c.created_at DESC, s.user_id ASC
     LIMIT ? OFFSET ?`,
    [instructorId, safeLimit, safeOffset],
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM Instructors i
     INNER JOIN Courses c ON i.instructor_id = c.instructor_id
     INNER JOIN Enrollments e ON c.course_id = e.course_id
     WHERE i.instructor_id = ?`,
    [instructorId],
  );

  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}
