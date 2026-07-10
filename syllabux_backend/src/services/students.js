import pool from '../config/db.js';
import  * as userServices from './users.js';
// import { getByEmail } from './users.js';

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


export async function deleteStudent({ user_id, first_name, last_name }) {
    if (!user_id || !first_name || !last_name) {
        throw new HttpError(400, 'user_id, first_name, and last_name are required');
    }
 
    const [userRows] = await pool.query(
        `SELECT u.user_id, u.first_name, u.last_name
        FROM Users u
        INNER JOIN Students s ON s.user_id = u.user_id
        WHERE u.user_id = ?`,
        [user_id]
    );
    const student = userRows[0];
    if (!student) {
        throw new HttpError(404, 'Student not found');
    }
 
    if (student.first_name !== first_name || student.last_name !== last_name) {
        throw new HttpError(409, 'Provided name does not match the student on record');
    }
 
    const [result] = await pool.query(
        `DELETE FROM Students WHERE user_id = ?`,
        [user_id]
    );
 
    if (result.affectedRows === 0) {
        throw new HttpError(404, 'Student not found');
    }
 
    return { deleted: true };
}

const UPDATABLE_USER_FIELDS = ['first_name', 'last_name'];
const UPDATABLE_STUDENT_FIELDS = ['bio', 'avatar_url'];
 
export async function updateStudentDetails({ userId, first_name, last_name, bio, avatar_url }) {
    if (!userId) {
        throw new HttpError(400, 'userId is required');
    }
 
    const candidateUserFields = { first_name, last_name };
    const candidateStudentFields = { bio, avatar_url };
 
    const userUpdates = Object.fromEntries(
        UPDATABLE_USER_FIELDS
            .filter((field) => candidateUserFields[field] !== undefined)
            .map((field) => [field, candidateUserFields[field]])
    );
    const studentUpdates = Object.fromEntries(
        UPDATABLE_STUDENT_FIELDS
            .filter((field) => candidateStudentFields[field] !== undefined)
            .map((field) => [field, candidateStudentFields[field]])
    );
 
    if (Object.keys(userUpdates).length === 0 && Object.keys(studentUpdates).length === 0) {
        throw new HttpError(400, 'No valid fields provided to update');
    }
 
    if (Object.keys(userUpdates).length > 0) {
        const setClause = Object.keys(userUpdates).map((field) => `${field} = ?`).join(', ');
        await pool.query(
            `UPDATE Users SET ${setClause} WHERE user_id = ?`,
            [...Object.values(userUpdates), userId]
        );
    }
 
    if (Object.keys(studentUpdates).length > 0) {
        const setClause = Object.keys(studentUpdates).map((field) => `${field} = ?`).join(', ');
        await pool.query(
            `UPDATE Students SET ${setClause} WHERE user_id = ?`,
            [...Object.values(studentUpdates), userId]
        );
    }
 
    const [rows] = await pool.query(
        `SELECT u.first_name, u.last_name, s.student_id, s.bio, s.avatar_url
        FROM Users u
        INNER JOIN Students s ON u.user_id = s.user_id
        WHERE u.user_id = ?`,
        [userId]
    );
    return rows[0] ?? null;
}