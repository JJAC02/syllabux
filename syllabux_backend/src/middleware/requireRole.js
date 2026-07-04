import { HttpError } from '../utils/httpError.js';

/**
 * Factory: produces an Express middleware that allows the request to proceed
 * only if the authenticated user's role is in `allowedRoles`.
 *
 * MUST run AFTER the `auth` middleware so `req.user` is populated from the JWT.
 *
 * @param {...string} allowedRoles - One or more role names permitted to access the route.
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   // Admin only
 *   router.get('/admin/users', requireRole('admin'), handler);
 *
 *   // Multiple roles
 *   router.get('/reports', requireRole('admin', 'auditor'), handler);
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    // Belt-and-suspenders: should never fire if `auth` ran first, but guard anyway.
    // Returning 401 (not 403) here is correct — there's no identity to authorize.
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }

    // 403 = "we know who you are, but you can't do this" — correct for role mismatch.
    if (!allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }

    next();
  };
}
