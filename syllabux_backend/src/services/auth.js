import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { getByEmail } from './users.js';
import crypto from 'crypto';
import { PoolConnection } from 'mysql2';

const BCRYPT_ROUNDS = 12;

export async function register({
  first_name,
  last_name,
  email,
  password,
  role,
}) {
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO Users (first_name, last_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, password_hash, role]
    );
    const [rows] = await conn.query(
      'SELECT user_id, first_name, last_name, email, role FROM Users WHERE user_id = ?',
      [result.insertId]
    );
    
    const student = rows[0];
    await conn.query(
      `INSERT INTO Students (user_id) VALUES (?)`, [student.user_id]
    );
    
    await conn.commit();
    return rows[0];

  } catch (error) {
    await conn.rollback();
      console.error(`Error: ${error}`);
      throw error
  } finally{
    conn.release();
  }
}

export async function login({ email, password, remember_me}) {
  const user = await getByEmail(email);
  let remember_token = null;
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  if(remember_me){
    remember_token = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(remember_token).digest('hex');
    try{
        await pool.query(`
          INSERT INTO RememberTokens(user_id, token_hash, expires_at)
          VALUES(?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
          [user.user_id, token_hash]
        );
    }catch(error){
        console.error("Failed to create remember token:", error);
    }
  }
  const token = jwt.sign(
    { sub: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    remember_token,
    token,
    user: {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function logout({user_id,remember_token}) {
  if(!remember_token) {
    return {
      isLoggedOut:true,
      message: "no token to remove"
    }
  }

  const token_hash = crypto.createHash('sha256').update(remember_token).digest('hex');

  try {
      const [result] = await pool.query(`
      DELETE FROM RememberTokens
      WHERE token_hash = ?
      AND user_id = ?
    `,  
    [token_hash,user_id]
  );
  if(result.affectedRows > 0){
    return {
      isLoggedOut: true,
      message: 'Logged out successfully'
    };
  }else{
    return {
      isLoggedOut: false,
      message: 'Token not found' //Eror 401
    };
  }
  } catch (error) {
      console.log("Failed to signout") //Eror 500
      return {
      isLoggedOut: false,
      message: "Server Error"
      };
  }
}

export async function tokenValidator(token){
  let token_hash = crypto.createHash('sha256').update(token).digest('hex');
  try{
    const [rows] = await pool.query(`
        SELECT  * FROM RememberTokens
        WHERE token_hash = ?
        AND expires_at > NOW()
      `,  
      [token_hash]
    );
    if(rows.length > 0){
      return {
        isValid: true,
        message: 'The token is valid'
      };
    }else{
      return {
        isValid: false,
        message: 'The token is invalid'
      };
    }
  }catch(error){
    console.log("Error checking token: ", error);
    return false;
  }
}