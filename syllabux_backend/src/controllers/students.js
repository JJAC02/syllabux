import * as studentsService from '../services/students.js';
import { HttpError } from '../utils/httpError.js';

export async function loadDashboard(req, res, next) {
    try{
        const userId = req.user?.sub;
        const result = await studentsService.loadDashboard({
            userId
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
}