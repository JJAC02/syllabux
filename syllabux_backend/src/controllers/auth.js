import * as authService from '../services/auth.js';
import { HttpError } from '../utils/httpError.js';

export async function register(req, res, next) {
  try {
    const { first_name, last_name, email, password, role } = req.body ?? {};
    if (!first_name || !last_name || !email || !password || !role) {
      throw new HttpError(
        400,
        'first_name, last_name, email, password, role are required',
      );
    }
    if (!['student', 'instructor', 'admin'].includes(role)) {
      throw new HttpError(400, 'role must be student, instructor, or admin');
    }
    const user = await authService.register({
      first_name,
      last_name,
      email,
      password,
      role,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, remember_me } = req.body ?? {};
    if (!email || !password || !remember_me) {
      throw new HttpError(400, 'email, password and remember me are required');
    }
    const result = await authService.login({ email, password, remember_me });
    if (!result) throw new HttpError(401, 'Invalid credentials');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { remember_token } = req.body;
    const result = await authService.logout({
      user_id: req.user.sub,
      remember_token,
    });

    if (!result.isLoggedOut) {
      const status = result.message === 'Server Error' ? 500 : 401;
      throw new HttpError(status, result.message);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function tokenValidator(req, res, next) {
  try {
    const { token } = req.body ?? {};
    if (!token || token.trim() === '') {
      throw new HttpError(401, 'Invalid token');
    }
    const result = await authService.tokenValidator(token);
    if (!result) throw new HttpError(401, 'Invalid token');
    res.json(result);
  } catch (error) {
    next(err);
  }
}
