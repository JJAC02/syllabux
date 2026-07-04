import * as instructorApplicationService from '../services/instructorApplication.js'
import {HttpError} from '../utils/httpError.js'

export async function apply(req, res, next){
  try {
    const {about_self, linkedin_url, years_of_experience, expertise_summary, resume_link} = req.body ?? {};
    const user_id = req.user.sub;
    if(!about_self || !linkedin_url || !years_of_experience || !expertise_summary || !resume_link){
      throw new HttpError(400, 'All fields are required.');
    }
    const result = await instructorApplicationService.create({
      user_id,
      about_self,
      linkedin_url,
      years_of_experience,
      expertise_summary,
      resume_link
    });
    res.status(201).json(result);
  } catch (error){
    next(error);
  }
}

export async function applicationList(req, res, next){
  try {
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    const status = req.query.status ?? 'pending';
    if (!allowedStatuses.includes(status)) {
      throw new HttpError(
        400,
        `status must be one of: ${allowedStatuses.join(', ')}`
      );
    }

    const { limit, offset } = req.query;
    const rows = await instructorApplicationService.applicationList({
      status,
      limit,
      offset,
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
}
