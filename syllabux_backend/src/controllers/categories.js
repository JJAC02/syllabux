import * as categoriesService from '../services/categories.js';

export async function list(_req, res, next) {
  try {
    const categories = await categoriesService.list();
    res.json(categories);
  } catch (error) {
    next(error);
  }
}