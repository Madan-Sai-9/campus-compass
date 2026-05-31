/**
 * CAMPUS COMPASS - Production-Grade REST & WebSocket Gateway
 * Enforces Helmet / CORS / Rate Limiting security matrix over PostgreSQL
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

import { query, pool, initializeDatabase } from './database.js';
import mapRouter from './routes/map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus_compass_secret_2026_purple_key';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

// Initialize secure WebSocket state channel cluster
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Configure Multer local file locker storage uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

// Serve uploaded resource files securely
app.use('/uploads', express.static(uploadDir));

// --- Production Security Layers Matrix ---
app.use(helmet({
  contentSecurityPolicy: false // Allows index.html inline mounts
}));
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// Constraint request metrics to prevent scrape/flood loops
const platformLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // 100 requests per IP signature
  message: { error: 'Too many transactions dispatched from this signature block. Try again later.' }
});
app.use('/api', platformLimiter);

// --- JWT Auth Guards Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Access denied. Token expired or invalid.' });
    req.user = user;
    next();
  });
}

// --- Mount Map Router v2 & V1 fallbacks ---
app.use('/api/v2/map', mapRouter);
app.use('/api/map', mapRouter); // Forward V1 routes to preserve client hook compatibility

// --- API ROUTES INTERFACE ---

// 1. AUTHENTICATION & PORTAL LOGINS
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  branch: z.string(),
  semester: z.string()
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, branch, semester } = registerSchema.parse(req.body);
    
    const isValidAmritaEmail = email.endsWith('@am.students.amrita.edu') || email.endsWith('@amrita.edu');
    if (!isValidAmritaEmail) {
      return res.status(400).json({ error: 'Access denied. Registration requires a verified @am.students.amrita.edu student address.' });
    }
    
    const checkDup = await query('SELECT email FROM users WHERE email = $1', [email]);
    if (checkDup.rowCount > 0) {
      return res.status(400).json({ error: 'This student email address is already registered.' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, branch, semester) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, hash, name, branch, semester]
    );
    
    const userId = result.rows[0].id;
    const token = jwt.sign({ id: userId, email, name, branch, semester }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: userId, email, name, branch, semester, cgpa: 9.0, achievements: [], joined_clubs: ['Chakravyuha Technical Club'], joined_activities: [] } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed. Password must be 6+ characters.' });
    }
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'No account registered with this student email.' });
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect credentials password. Please check.' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, branch: user.branch, semester: user.semester }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        branch: user.branch,
        semester: user.semester,
        cgpa: user.cgpa,
        achievements: JSON.parse(user.achievements_json || '[]'),
        joined_clubs: JSON.parse(user.joined_clubs_json || '["Chakravyuha Technical Club"]'),
        joined_activities: JSON.parse(user.joined_activities_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.post('/api/auth/google-login', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    const isValidAmritaEmail = email.endsWith('@am.students.amrita.edu') || email.endsWith('@amrita.edu');
    if (!isValidAmritaEmail) {
      return res.status(400).json({ error: 'Google Login Blocked: Requires a verified @am.students.amrita.edu student address.' });
    }
    
    let result = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user = null;
    
    if (result.rowCount === 0) {
      const mockPass = await bcrypt.hash(`google_${Date.now()}`, 10);
      const insertRes = await query(
        `INSERT INTO users (email, password_hash, name, branch, semester) 
         VALUES ($1, $2, $3, 'CSE (AI)', 'Semester 1') RETURNING *`,
        [email, mockPass, name]
      );
      user = insertRes.rows[0];
    } else {
      user = result.rows[0];
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, branch: user.branch, semester: user.semester }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        branch: user.branch,
        semester: user.semester,
        cgpa: user.cgpa,
        achievements: JSON.parse(user.achievements_json || '[]'),
        joined_clubs: JSON.parse(user.joined_clubs_json || '["Chakravyuha Technical Club"]'),
        joined_activities: JSON.parse(user.joined_activities_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Google Login OAuth pipeline crash.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User profiles not found.' });
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      branch: user.branch,
      semester: user.semester,
      cgpa: user.cgpa,
      achievements: JSON.parse(user.achievements_json || '[]'),
      joined_clubs: JSON.parse(user.joined_clubs_json || '["Chakravyuha Technical Club"]'),
      joined_activities: JSON.parse(user.joined_activities_json || '[]')
    });
  } catch (err) {
    res.status(500).json({ error: 'Me profile extraction pipeline failure.' });
  }
});

// 2. DIGITAL LOCKER & RESOURCES HUB
app.get('/api/resources', async (req, res) => {
  try {
    const { branch, type, q } = req.query;
    let sql = 'SELECT * FROM resources WHERE is_verified = TRUE';
    const params = [];
    
    if (branch && branch !== 'All') {
      params.push(branch);
      sql += ` AND branch = $${params.length}`;
    }
    
    if (type && type !== 'All') {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (title ILIKE $${params.length} OR subject ILIKE $${params.length})`;
    }
    
    sql += ' ORDER BY downloads DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Resources locker query failure.' });
  }
});

app.post('/api/resources/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, branch, semester, subject, type } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : '#';
    
    await query(
      `INSERT INTO resources (title, branch, semester, subject, type, uploader_id, uploader_name, uploader_avatar, file_url, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'U', $8, FALSE)`,
      [title, branch, semester, subject, type, req.user.id, req.user.name, fileUrl]
    );
    
    await query(
      `INSERT INTO admin_logs (log_type, action, target, username) 
       VALUES ('resource', 'Upload Requested', $1, $2)`,
      [title, req.user.name]
    );
    
    res.json({ success: true, message: 'Resource request uploaded! Visible once verified by admin moderators.' });
  } catch (err) {
    res.status(500).json({ error: 'Resource upload request failed.' });
  }
});

app.post('/api/resources/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE resources SET downloads = downloads + 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Download logging failure.' });
  }
});

// 3. CLUBS & EVENTS
app.get('/api/clubs', async (req, res) => {
  try {
    const clubsRes = await query('SELECT * FROM clubs');
    const activitiesRes = await query('SELECT * FROM club_activities');
    const clubs = [];
    
    for (const club of clubsRes.rows) {
      const coordRes = await query('SELECT * FROM coordinators WHERE club_id = $1', [club.id]);
      
      // Determine slug for activity match
      let clubSlug = '';
      if (club.name.includes('Chakravyuha')) clubSlug = 'chakravyuha';
      else if (club.name.includes('Drishya')) clubSlug = 'drsya-media';
      else if (club.name.includes('Naadam')) clubSlug = 'naadam-arts';
      else if (club.name.includes('Avisruta')) clubSlug = 'avisruta-athletics';
      
      const nextActivity = activitiesRes.rows.find(act => 
        act.club_id === clubSlug || act.club_id === club.id.toString()
      );
      
      // Parse arrays safely
      let amenities = [];
      if (club.club_amenities) {
        try {
          amenities = Array.isArray(club.club_amenities) ? club.club_amenities : JSON.parse(club.club_amenities);
        } catch (e) {
          // If comma-separated in some fallback
          amenities = typeof club.club_amenities === 'string' ? club.club_amenities.split(',') : [];
        }
      }
      
      let roles = [];
      if (club.recruitment_roles) {
        try {
          roles = Array.isArray(club.recruitment_roles) ? club.recruitment_roles : JSON.parse(club.recruitment_roles);
        } catch (e) {
          roles = typeof club.recruitment_roles === 'string' ? club.recruitment_roles.split(',') : [];
        }
      }
      
      clubs.push({
        ...club,
        gallery: Array.isArray(club.gallery_json) ? club.gallery_json : JSON.parse(club.gallery_json || '[]'),
        club_amenities: amenities,
        recruitment_roles: roles,
        coordinators: coordRes.rows,
        nextActivity: nextActivity ? {
          title: nextActivity.activity_title,
          type: nextActivity.activity_type,
          time: nextActivity.scheduled_time,
          venue: nextActivity.venue_location,
          slots_available: nextActivity.slots_available
        } : null
      });
    }
    
    res.json(clubs);
  } catch (err) {
    console.error('Clubs loading crash:', err);
    res.status(500).json({ error: 'Clubs loading crash.' });
  }
});

app.post('/api/clubs/join', authenticateToken, async (req, res) => {
  try {
    const { clubName } = req.body;
    
    const userRes = await query('SELECT joined_clubs_json FROM users WHERE id = $1', [req.user.id]);
    const joined = JSON.parse(userRes.rows[0].joined_clubs_json || '[]');
    
    if (joined.includes(clubName)) {
      const updated = joined.filter(c => c !== clubName);
      await query('UPDATE users SET joined_clubs_json = $1 WHERE id = $2', [JSON.stringify(updated), req.user.id]);
      await query('UPDATE clubs SET members_count = members_count - 1 WHERE name = $1', [clubName]);
      return res.json({ joined: false, clubs: updated });
    } else {
      joined.push(clubName);
      await query('UPDATE users SET joined_clubs_json = $1 WHERE id = $2', [JSON.stringify(joined), req.user.id]);
      await query('UPDATE clubs SET members_count = members_count + 1 WHERE name = $1', [clubName]);
      return res.json({ joined: true, clubs: joined });
    }
  } catch (err) {
    res.status(500).json({ error: 'Club membership toggle failed.' });
  }
});

app.post('/api/clubs/activities/register', authenticateToken, async (req, res) => {
  try {
    const { activityTitle } = req.body;
    
    const userRes = await query('SELECT joined_activities_json FROM users WHERE id = $1', [req.user.id]);
    let joined = [];
    if (userRes.rowCount > 0 && userRes.rows[0].joined_activities_json) {
      try {
        joined = JSON.parse(userRes.rows[0].joined_activities_json || '[]');
      } catch (e) {
        joined = [];
      }
    }
    
    let registered = false;
    if (joined.includes(activityTitle)) {
      joined = joined.filter(a => a !== activityTitle);
      await query('UPDATE club_activities SET slots_available = slots_available + 1 WHERE activity_title = $1', [activityTitle]);
    } else {
      joined.push(activityTitle);
      registered = true;
      await query('UPDATE club_activities SET slots_available = slots_available - 1 WHERE activity_title = $1', [activityTitle]);
    }
    
    await query('UPDATE users SET joined_activities_json = $1 WHERE id = $2', [JSON.stringify(joined), req.user.id]);
    res.json({ success: true, registered, activities: joined });
  } catch (err) {
    console.error('Activity registration error:', err);
    res.status(500).json({ error: 'Activity registration failed.' });
  }
});

// 4. STUDENT FORUM & FAQ
app.get('/api/forum/questions', async (req, res) => {
  try {
    const { q, category } = req.query;
    let sql = 'SELECT * FROM questions';
    const params = [];
    
    if (category && category !== 'All') {
      params.push(category);
      sql += ` WHERE category = $${params.length}`;
    }
    
    if (q) {
      params.push(`%${q}%`);
      sql += category && category !== 'All' 
        ? ` AND (title ILIKE $${params.length} OR body ILIKE $${params.length})`
        : ` WHERE (title ILIKE $${params.length} OR body ILIKE $${params.length})`;
    }
    
    sql += ' ORDER BY created_at DESC';
    const qRes = await query(sql, params);
    
    const questions = [];
    for (const question of qRes.rows) {
      const answersRes = await query('SELECT * FROM answers WHERE question_id = $1 ORDER BY is_accepted DESC, votes DESC', [question.id]);
      
      const answers = [];
      for (const ans of answersRes.rows) {
        const commRes = await query('SELECT * FROM comments WHERE answer_id = $1 ORDER BY created_at ASC', [ans.id]);
        answers.push({
          ...ans,
          comments: commRes.rows
        });
      }
      
      questions.push({
        ...question,
        replies: answers
      });
    }
    
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Forum loading failed.' });
  }
});

const questionSchema = z.object({
  title: z.string().min(5),
  body: z.string().min(10),
  category: z.string()
});

app.post('/api/forum/questions', authenticateToken, async (req, res) => {
  try {
    const { title, body, category } = questionSchema.parse(req.body);
    
    const profanities = ['abusive_word', 'spam_leak', 'cheat_exam', 'bribe'];
    const hasViolation = profanities.some(word => 
      title.toLowerCase().includes(word) || body.toLowerCase().includes(word)
    );
    
    if (hasViolation) {
      return res.status(400).json({ error: 'Content moderation violation: Keep discussions academic.' });
    }
    
    const result = await query(
      `INSERT INTO questions (title, body, category, author_id, author_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, body, category, req.user.id, req.user.name]
    );
    
    io.emit('new_announcement', {
      title: 'New Forum Question',
      body: `"${title}" has been posted in #${category} by @${req.user.name}.`
    });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Forum broadcast execution crash.' });
  }
});

app.post('/api/forum/questions/:id/answers', authenticateToken, async (req, res) => {
  try {
    const qId = req.params.id;
    const { body } = req.body;
    
    const result = await query(
      `INSERT INTO answers (question_id, author_id, author_name, author_role, author_avatar, body) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [qId, req.user.id, req.user.name, `${req.user.branch} • ${req.user.semester}`, 'S', body]
    );
    
    await query('UPDATE questions SET status = \'answered\' WHERE id = $1', [qId]);
    
    const qAuthor = await query('SELECT author_id FROM questions WHERE id = $1', [qId]);
    if (qAuthor.rowCount > 0 && qAuthor.rows[0].author_id !== req.user.id) {
      const qAuthorId = qAuthor.rows[0].author_id;
      await query(
        `INSERT INTO notifications (user_id, title, body) 
         VALUES ($1, 'Solution Provided', 'Someone answered your forum question: "${body.substring(0, 30)}..."')`,
        [qAuthorId]
      );
      io.emit(`notify_${qAuthorId}`, {
        title: 'Solution Provided',
        body: `Senior ${req.user.name} posted an answer to your question.`
      });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to insert answer.' });
  }
});

app.put('/api/forum/answers/:id/accept', authenticateToken, async (req, res) => {
  try {
    const ansId = req.params.id;
    
    const ans = await query('SELECT question_id FROM answers WHERE id = $1', [ansId]);
    if (ans.rowCount === 0) return res.status(404).json({ error: 'Answer not found.' });
    
    const qId = ans.rows[0].question_id;
    
    await query('UPDATE answers SET is_accepted = FALSE WHERE question_id = $1', [qId]);
    await query('UPDATE answers SET is_accepted = TRUE WHERE id = $1', [ansId]);
    await query('UPDATE questions SET status = \'solved\' WHERE id = $1', [qId]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Solution acceptance backend crash.' });
  }
});

app.post('/api/forum/votes', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, direction } = req.body;
    
    const existing = await query(
      'SELECT id, direction FROM votes WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3',
      [req.user.id, entityType, entityId]
    );
    
    let voteDiff = 0;
    
    if (existing.rowCount > 0) {
      const curDir = existing.rows[0].direction;
      if (curDir === direction) {
        await query('DELETE FROM votes WHERE id = $1', [existing.rows[0].id]);
        voteDiff = direction === 'up' ? -1 : 1;
      } else {
        await query('UPDATE votes SET direction = $1 WHERE id = $2', [direction, existing.rows[0].id]);
        voteDiff = direction === 'up' ? 2 : -2;
      }
    } else {
      await query(
        'INSERT INTO votes (user_id, entity_type, entity_id, direction) VALUES ($1, $2, $3, $4)',
        [req.user.id, entityType, entityId, direction]
      );
      voteDiff = direction === 'up' ? 1 : -1;
    }
    
    if (entityType === 'question') {
      await query('UPDATE questions SET votes = votes + $1 WHERE id = $2', [voteDiff, entityId]);
    } else {
      await query('UPDATE answers SET votes = votes + $1 WHERE id = $2', [voteDiff, entityId]);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Voting transaction failed.' });
  }
});

// 5. ADMIN PANEL & SECURITY
app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
  try {
    const qCount = await query('SELECT COUNT(*) as count FROM questions WHERE status = \'open\'');
    const resCount = await query('SELECT COUNT(*) as count FROM resources WHERE is_verified = TRUE');
    const logs = await query('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      onlineUsers: 480,
      verifiedAssets: resCount.rows[0].count,
      pendingQueries: qCount.rows[0].count,
      activityStream: logs.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Admin Analytics fetch failed.' });
  }
});

app.put('/api/admin/questions/:id/promote', authenticateToken, async (req, res) => {
  try {
    const qId = req.params.id;
    const qResult = await query('SELECT title, category FROM questions WHERE id = $1', [qId]);
    if (qResult.rowCount === 0) return res.status(404).json({ error: 'Question not found.' });
    
    await query('UPDATE questions SET status = \'pinned\' WHERE id = $1', [qId]);
    
    await query(
      `INSERT INTO admin_logs (log_type, action, target, username) 
       VALUES ('forum', 'Promoted FAQ', $1, $2)`,
      [qResult.rows[0].title, req.user.name]
    );
    
    res.json({ success: true, message: `Question "${qResult.rows[0].title}" successfully promoted to FAQ announcements!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote question.' });
  }
});

app.delete('/api/admin/questions/:id', authenticateToken, async (req, res) => {
  try {
    const qId = req.params.id;
    await query('DELETE FROM questions WHERE id = $1', [qId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question.' });
  }
});

// --- Realtime WebSocket linkage channels ---
io.on('connection', (socket) => {
  console.log(`📡 Secure socket channel logged: User session ref ID -> ${socket.id}`);
  
  socket.on('join_discussion_stream', (threadId) => {
    socket.join(`thread_${threadId}`);
    console.log(`👤 Client joined thread room: thread_${threadId}`);
  });

  socket.on('disconnect', () => {
    console.log(`⚡ Session closed gracefully on connection layer ${socket.id}`);
  });
});

// --- Boot Server Services ---
async function startServer() {
  try {
    await initializeDatabase();
    
    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` ✦ CAMPUS COMPASS CORE PRODUCTION ENGINE RUNNING ON PORT ${PORT} ✦`);
      console.log(` Gateway Interface: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Server failed to start due to database error:', err);
    process.exit(1);
  }
}

startServer();
