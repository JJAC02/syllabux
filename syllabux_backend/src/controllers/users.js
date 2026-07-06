import * as usersService from '../services/users.js';
import { HttpError } from '../utils/httpError.js';



export async function create(req, res, next) {
  try {
    const { first_name, last_name, email, password_hash, role } = req.body ?? {};
    if (!first_name || !last_name || !email || !password_hash || !role) {
      throw new HttpError(
        400,
        'first_name, last_name, email, password_hash, role are required'
      );
    }
    if (!['student', 'instructor', 'admin'].includes(role)) {
      throw new HttpError(400, 'role must be student, instructor, or admin');
    }
    const user = await usersService.create({
      first_name,
      last_name,
      email,
      password_hash,
      role,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const user = await usersService.update(req.params.id, req.body ?? {});
    if (!user) throw new HttpError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await usersService.remove(req.params.id);
    if (!deleted) throw new HttpError(404, 'User not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}