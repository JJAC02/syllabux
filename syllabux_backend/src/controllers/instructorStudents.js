import * as instructorStudentsService from '../services/instructorStudents.js';

export async function listStudents(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { page, limit } = req.query;
    const result = await instructorStudentsService.listStudents({
      userId,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
