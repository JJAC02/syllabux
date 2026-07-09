import * as coursesService from '../services/courses.js';

export async function create(req, res, next) {
  try {
    const course = await coursesService.create({
      userId: req.user.sub,
      title: req.body.title,
      description: req.body.description,
      duration_hours: req.body.duration_hours,
      level: req.body.level,
      what_you_will_learn: req.body.what_you_will_learn,
      status: req.body.status,
      thumbnail_url: req.body.thumbnail_url,
      category_ids: req.body.category_ids,
    });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const result = await coursesService.list({
      status: req.query.status,
      level: req.query.level,
      category_id: req.query.category_id,
      instructor_id: req.query.instructor_id,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      callerId: req.user.sub,
      callerRole: req.user.role,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const course = await coursesService.getById(req.params.id, {
      callerId: req.user.sub,
      callerRole: req.user.role,
    });
    res.json(course);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const course = await coursesService.update(req.params.id, {
      userId: req.user.sub,
      title: req.body.title,
      description: req.body.description,
      duration_hours: req.body.duration_hours,
      level: req.body.level,
      what_you_will_learn: req.body.what_you_will_learn,
      status: req.body.status,
      thumbnail_url: req.body.thumbnail_url,
      category_ids: req.body.category_ids,
    });
    res.json(course);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await coursesService.remove(req.params.id, req.user.sub);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
