import * as studentsService from '../services/students.js';
import { HttpError } from '../utils/httpError.js';
// import { get } from '../services/users.js';
 
export async function loadStudent(req, res, next) {
    try {
        const userId = req.user?.sub;
        const userRole = req.user?.role;
        console.log(userId,userRole);
        const result = await studentsService.loadStudent({
            userId,
            userRole,
        });
 
        if (!result) {
            return next(new HttpError(404, 'Student not found'));
        }
 
        res.json(result);
    } catch (err) {
        next(err);
    }
}
 
export async function loadDashboard(req, res, next) {
    try {
        const userId = req.user?.sub;
        const result = await studentsService.loadDashboard(userId);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function enrollStudent(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { course_id } = req.body;
 
        if (!course_id) {
            throw new HttpError(400, 'course_id is required');
        }
 
        const result = await studentsService.enrollStudent({
            userId,
            course_id,
        });
 
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function deleteStudent(req, res, next) {
    try {
        const { user_id, first_name, last_name } = req.body;
 
        if (!user_id || !first_name || !last_name) {
            throw new HttpError(400, 'user_id, first_name, and last_name are required');
        }
 
        await studentsService.deleteStudent({
            user_id,
            first_name,
            last_name,
        });
 
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

export async function updateStudentDetails(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { first_name, last_name, bio, avatar_url } = req.body;
 
        const result = await studentsService.updateStudentDetails({
            userId,
            first_name,
            last_name,
            bio,
            avatar_url,
        });
 
        res.json(result);
    } catch (err) {
        next(err);
    }
}