import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived']);

const UPDATABLE_FIELDS = new Set([
  'title',
  'description',
  'duration_hours',
  'level',
  'what_you_will_learn',
  'status',
  'thumbnail_url',
]);

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LEARN_LENGTH = 5000;
const MAX_URL_LENGTH = 500;
const MAX_LIMIT = 200;

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m);
}

function normalizeCategoryIds(value) {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'category_ids must be an array of integers');
  }
  const seen = new Set();
  for (const id of value) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'category_ids must be an array of positive integers');
    }
    seen.add(id);
  }
  return [...seen];
}

function validateString(value, field, { required, maxLength }) {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new HttpError(400, `${field} is required`);
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function validateDurationHours(value) {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    throw new HttpError(400, 'duration_hours must be a non-negative number');
  }
  // DECIMAL(5,1) — at most 9999.9
  return Math.round(n * 10) / 10;
}

function validateUrl(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'thumbnail_url must be a string');
  }
  if (value.length > MAX_URL_LENGTH) {
    throw new HttpError(400, `thumbnail_url must be at most ${MAX_URL_LENGTH} characters`);
  }
  try {
    new URL(value);
  } catch {
    throw new HttpError(400, 'thumbnail_url must be a valid URL');
  }
  return value;
}

function validateEnum(value, allowed, field) {
  if (value === undefined || value === null) return null;
  if (!allowed.has(value)) {
    throw new HttpError(400, `${field} must be one of: ${[...allowed].join(', ')}`);
  }
  return value;
}

async function getInstructorId(userId) {
  const [rows] = await pool.execute(
    'SELECT instructor_id FROM Instructors WHERE user_id = ?',
    [userId],
  );
  return rows[0]?.instructor_id ?? null;
}

async function fetchCourseRow(conn, courseId) {
  const [rows] = await conn.execute(
    `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS instructor_name
     FROM Courses c
     JOIN Instructors i ON c.instructor_id = i.instructor_id
     JOIN Users u ON i.user_id = u.user_id
     WHERE c.course_id = ?`,
    [courseId],
  );
  return rows[0] ?? null;
}

async function fetchCategoriesForCourse(conn, courseId) {
  const [rows] = await conn.execute(
    `SELECT cat.category_id, cat.name
     FROM Categories cat
     JOIN CourseCategories cc ON cat.category_id = cc.category_id
     WHERE cc.course_id = ?
     ORDER BY cat.name`,
    [courseId],
  );
  return rows;
}

export async function getCourseWithCategories(courseId) {
  const course = await fetchCourseRow(pool, courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  course.categories = await fetchCategoriesForCourse(pool, courseId);
  return course;
}

export async function create({
  userId,
  title,
  description,
  duration_hours,
  level,
  what_you_will_learn,
  status,
  thumbnail_url,
  category_ids,
}) {
  const cleanTitle = validateString(title, 'title', {
    required: true,
    maxLength: MAX_TITLE_LENGTH,
  });
  const cleanDescription = validateString(description, 'description', {
    required: true,
    maxLength: MAX_DESCRIPTION_LENGTH,
  });
  const cleanLearn = validateString(
    what_you_will_learn,
    'what_you_will_learn',
    { required: false, maxLength: MAX_LEARN_LENGTH },
  );
  const cleanDuration = validateDurationHours(duration_hours);
  const cleanLevel = validateEnum(level, ALLOWED_LEVELS, 'level');
  const cleanStatus = validateEnum(status ?? 'draft', ALLOWED_STATUSES, 'status');
  const cleanUrl = validateUrl(thumbnail_url);
  const cleanCategoryIds = normalizeCategoryIds(category_ids);

  const instructorId = await getInstructorId(userId);
  if (!instructorId) {
    throw new HttpError(404, 'Instructor profile not found');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO Courses
        (instructor_id, title, description, duration_hours, level, what_you_will_learn, status, thumbnail_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instructorId,
        cleanTitle,
        cleanDescription,
        cleanDuration,
        cleanLevel,
        cleanLearn,
        cleanStatus,
        cleanUrl,
      ],
    );
    const courseId = result.insertId;

    if (cleanCategoryIds.length) {
      await conn.query(
        'INSERT INTO CourseCategories (course_id, category_id) VALUES ?',
        [cleanCategoryIds.map((cid) => [courseId, cid])],
      );
    }

    // Read back inside the same connection to avoid a race window where the
    // course could be deleted between commit and read.
    const course = await fetchCourseRow(conn, courseId);
    course.categories = await fetchCategoriesForCourse(conn, courseId);

    await conn.commit();
    return course;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function list({
  status,
  level,
  category_id,
  instructor_id,
  search,
  page = 1,
  limit = 10,
  callerId = null,
  callerRole = null,
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), MAX_LIMIT);
  const safeOffset = (safePage - 1) * safeLimit;

  const cleanStatus = validateEnum(status, ALLOWED_STATUSES, 'status');
  const cleanLevel = validateEnum(level, ALLOWED_LEVELS, 'level');
  const cleanCategoryId =
    category_id === undefined || category_id === null || category_id === ''
      ? null
      : toPositiveInt(category_id);
  if (category_id && !cleanCategoryId) {
    throw new HttpError(400, 'category_id must be a positive integer');
  }
  const cleanInstructorId =
    instructor_id === undefined || instructor_id === null || instructor_id === ''
      ? null
      : toPositiveInt(instructor_id);
  if (instructor_id && !cleanInstructorId) {
    throw new HttpError(400, 'instructor_id must be a positive integer');
  }

  const where = ['1=1'];
  const params = [];

  if (cleanStatus) {
    where.push('c.status = ?');
    params.push(cleanStatus);
  }
  if (cleanLevel) {
    where.push('c.level = ?');
    params.push(cleanLevel);
  }
  if (cleanInstructorId) {
    where.push('c.instructor_id = ?');
    params.push(cleanInstructorId);
  }
  if (cleanCategoryId) {
    where.push(
      'c.course_id IN (SELECT cc.course_id FROM CourseCategories cc WHERE cc.category_id = ?)',
    );
    params.push(cleanCategoryId);
  }
  if (search) {
    const escaped = escapeLike(search);
    where.push('(c.title LIKE ? OR c.description LIKE ?)');
    params.push(`%${escaped}%`, `%${escaped}%`);
  }

  // Visibility filter: students see only published, instructors see their own
  // (any status) plus all published, admins see everything.
  if (callerRole !== 'admin') {
    if (callerRole === 'instructor' && callerId) {
      const callerInstructorId = await getInstructorId(callerId);
      if (callerInstructorId) {
        where.push('(c.status = ? OR c.instructor_id = ?)');
        params.push('published', callerInstructorId);
      } else {
        where.push('c.status = ?');
        params.push('published');
      }
    } else {
      where.push('c.status = ?');
      params.push('published');
    }
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM Courses c ${whereClause}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.execute(
    `SELECT c.*,
            ANY_VALUE(CONCAT(u.first_name, ' ', u.last_name)) AS instructor_name,
            JSON_ARRAYAGG(
              JSON_OBJECT('category_id', cat.category_id, 'name', cat.name)
            ) AS categories_json
     FROM Courses c
     JOIN Instructors i ON c.instructor_id = i.instructor_id
     JOIN Users u ON i.user_id = u.user_id
     LEFT JOIN CourseCategories cc ON c.course_id = cc.course_id
     LEFT JOIN Categories cat ON cc.category_id = cat.category_id
     ${whereClause}
     GROUP BY c.course_id
     ORDER BY c.created_at DESC, c.course_id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset],
  );

  const data = rows.map(({ categories_json, ...rest }) => ({
    ...rest,
    categories: Array.isArray(categories_json)
      ? categories_json
          .filter((c) => c && c.category_id !== null)
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      : [],
  }));

  return { data, pagination: { page: safePage, limit: safeLimit, total, totalPages } };
}

export async function getById(courseId, { callerId = null, callerRole = null } = {}) {
  const id = toPositiveInt(courseId);
  if (!id) throw new HttpError(400, 'Invalid course id');

  const course = await getCourseWithCategories(id);

  if (callerRole === 'admin') return course;

  if (callerRole === 'instructor' && callerId) {
    const callerInstructorId = await getInstructorId(callerId);
    if (callerInstructorId && course.instructor_id === callerInstructorId) {
      return course;
    }
  }

  // Non-owner, non-admin: only published is visible. Return 404 to avoid leaking
  // the existence of unpublished courses.
  if (course.status !== 'published') {
    throw new HttpError(404, 'Course not found');
  }
  return course;
}

export async function update(courseId, { userId, ...fields }) {
  const id = toPositiveInt(courseId);
  if (!id) throw new HttpError(400, 'Invalid course id');

  const course = await fetchCourseRow(pool, id);
  if (!course) throw new HttpError(404, 'Course not found');

  const instructorId = await getInstructorId(userId);
  if (!instructorId || course.instructor_id !== instructorId) {
    // Return 404 (not 403) to avoid leaking the existence of other instructors' courses.
    throw new HttpError(404, 'Course not found');
  }

  const setters = [];
  const values = [];
  let categoryIdsUpdate;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === 'category_ids') {
      categoryIdsUpdate = normalizeCategoryIds(value);
      continue;
    }
    if (!UPDATABLE_FIELDS.has(key)) {
      throw new HttpError(400, `Field '${key}' is not updatable`);
    }
    switch (key) {
      case 'title':
        setters.push('title = ?');
        values.push(
          validateString(value, 'title', {
            required: true,
            maxLength: MAX_TITLE_LENGTH,
          }),
        );
        break;
      case 'description':
        setters.push('description = ?');
        values.push(
          validateString(value, 'description', {
            required: true,
            maxLength: MAX_DESCRIPTION_LENGTH,
          }),
        );
        break;
      case 'what_you_will_learn':
        setters.push('what_you_will_learn = ?');
        values.push(
          validateString(value, 'what_you_will_learn', {
            required: false,
            maxLength: MAX_LEARN_LENGTH,
          }),
        );
        break;
      case 'duration_hours':
        setters.push('duration_hours = ?');
        values.push(validateDurationHours(value));
        break;
      case 'level':
        setters.push('level = ?');
        values.push(validateEnum(value, ALLOWED_LEVELS, 'level'));
        break;
      case 'status':
        setters.push('status = ?');
        values.push(validateEnum(value, ALLOWED_STATUSES, 'status'));
        break;
      case 'thumbnail_url':
        setters.push('thumbnail_url = ?');
        values.push(validateUrl(value));
        break;
    }
  }

  if (!setters.length && categoryIdsUpdate === undefined) {
    throw new HttpError(400, 'No fields to update');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (setters.length) {
      values.push(id);
      await conn.query(`UPDATE Courses SET ${setters.join(', ')} WHERE course_id = ?`, values);
    }

    if (categoryIdsUpdate !== undefined) {
      await conn.query('DELETE FROM CourseCategories WHERE course_id = ?', [id]);
      if (categoryIdsUpdate.length) {
        await conn.query(
          'INSERT INTO CourseCategories (course_id, category_id) VALUES ?',
          [categoryIdsUpdate.map((cid) => [id, cid])],
        );
      }
    }

    const updated = await fetchCourseRow(conn, id);
    updated.categories = await fetchCategoriesForCourse(conn, id);

    await conn.commit();
    return updated;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function remove(courseId, userId) {
  const id = toPositiveInt(courseId);
  if (!id) throw new HttpError(400, 'Invalid course id');

  const course = await fetchCourseRow(pool, id);
  if (!course) throw new HttpError(404, 'Course not found');

  const instructorId = await getInstructorId(userId);
  if (!instructorId || course.instructor_id !== instructorId) {
    // Same reasoning as update: hide existence from non-owners.
    throw new HttpError(404, 'Course not found');
  }

  // Block delete if there are active enrollments; surface a clean 409 instead
  // of letting the FK violation bubble up.
  const [enrollRows] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM Enrollments WHERE course_id = ?',
    [id],
  );
  if (Number(enrollRows[0]?.cnt ?? 0) > 0) {
    throw new HttpError(
      409,
      'Cannot delete a course with enrolled students. Archive it instead.',
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM CourseCategories WHERE course_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM Courses WHERE course_id = ?', [id]);
    await conn.commit();
    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Course not found');
    }
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
