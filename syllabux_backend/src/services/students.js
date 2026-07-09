import pool from '../config/db.js';
import  * as userServices from './users.js';

export async function loadStudent({
    userId,
    userRole,
}) {
    const [rows] = await pool.query(
        `SELECT u.first_name, u.last_name, s.student_id,
        s.bio, s.avatar_url
        FROM Users u
        INNER JOIN Students s
        ON u.user_id = s.user_id
        WHERE u.user_id = ? AND u.role = ?`,
        [userId, userRole]
    );
    console.log(rows);
    return rows[0] ?? null;
}


export async function loadDashboard(userId) {
    const [rows] = await pool.query(
        `SELECT c.course_id, c.title, c.description,
        CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
        e.progress_percentage, e.status
        FROM Enrollments e
        INNER JOIN Students s ON s.student_id = e.student_id
        INNER JOIN Courses c ON c.course_id = e.course_id
        INNER JOIN Instructors i ON i.instructor_id = c.instructor_id
        INNER JOIN Users u ON u.user_id = i.user_id
        WHERE s.user_id = ?`,
        [userId]
    );
    console.log(rows);
    return rows;
}


export async function enrollStudent({ userId, course_id }) {
    if (!userId || !course_id) {
        throw new HttpError(400, 'userId and course_id are required');
    }
 
    const [studentRows] = await pool.query(
        `SELECT student_id FROM Students WHERE user_id = ?`,
        [userId]
    );
    const student = studentRows[0];
    if (!student) {
        throw new HttpError(404, 'Student not found');
    }
 
    const [courseRows] = await pool.query(
        `SELECT course_id FROM Courses WHERE course_id = ?`,
        [course_id]
    );
    if (!courseRows[0]) {
        throw new HttpError(404, 'Course not found');
    }
 
    const [result] = await pool.query(
        `INSERT INTO Enrollments (student_id, course_id, enrollment_date, progress_percentage, status)
        VALUES (?, ?, CURDATE(), 0, 'active')`,
        [student.student_id, course_id]
    );
    console.log(result,student);
 
    return {
        enrollment_id: result.insertId,
        student_id: student.student_id,
        course_id,
        status: 'active',
    };
}