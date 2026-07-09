import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';
 
export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authorization required'));
  }
 
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}


//OLD AUTH
// import jwt from 'jsonwebtoken';

// export function auth(req, res, next) {
//   const header = req.headers.authorization;
//   if (!header?.startsWith('Bearer ')) {
//     return res.status(401).json({ message: 'Authorization required' });
//   }

//   const token = header.slice(7);
//   try {
//     req.user = jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch {
//     return res.status(401).json({ message: 'Invalid or expired token' });
//   }
// }