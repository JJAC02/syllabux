import * as studentsService from '../services/students.js';
import { HttpError } from '../utils/httpError.js';
 
export async function loadStudent(req, res, next) {
    try {
        const userId = req.user?.sub;
        const userRole = req.user?.role;
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