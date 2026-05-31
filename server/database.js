/**
 * CAMPUS COMPASS - PostgreSQL Relational Database Engine
 * Direct pooling bindings with an automated, ultra-resilient Graceful Local JSON Database Fallback
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_DB_PATH = path.join(__dirname, 'db_fallback.json');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campus_compass';

// Smart Resilient Database Gateway Proxy Class
class SmartDBPool {
  constructor() {
    this.realPool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });
    
    this.useFallback = false;
    this.fallbackDb = null;
    
    this.realPool.on('connect', () => {
      if (!this.useFallback) {
        console.log('Database Engine: Connected to PostgreSQL Pool');
      }
    });

    this.realPool.on('error', (err) => {
      if (!this.useFallback) {
        // Suppress print if it's a known refused code since we will swap to fallback gracefully
        if (err.code !== 'ECONNREFUSED' && err.message?.indexOf('ECONNREFUSED') === -1) {
          console.error('Database Engine: Unexpected error on idle PostgreSQL client', err);
        }
      }
    });
  }

  on(event, handler) {
    // Forward listener requests safely
    if (this.realPool && typeof this.realPool.on === 'function') {
      this.realPool.on(event, handler);
    }
  }

  async query(text, params = []) {
    if (this.useFallback) {
      return this.queryFallback(text, params);
    }
    try {
      return await this.realPool.query(text, params);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('connect') || err.code === '42P01') {
        console.warn('⚠️  PostgreSQL connection refused or failed. Swap -> Resilient Local JSON Database Fallback.');
        this.useFallback = true;
        this.initFallbackDb();
        return this.queryFallback(text, params);
      }
      throw err;
    }
  }

  initFallbackDb() {
    let dbExists = fs.existsSync(FALLBACK_DB_PATH);
    let shouldReset = false;
    if (dbExists) {
      try {
        const content = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf-8'));
        if (!content.clubs || content.clubs.length < 4 || !content.club_activities || !content.map_locations[0].club_amenities) {
          shouldReset = true;
        }
      } catch (e) {
        shouldReset = true;
      }
    }
    if (!dbExists || shouldReset) {
      console.log('✦ Creating/Upgrading Graceful Local Database File (db_fallback.json) ✦');
      const initialDb = {
        map_locations: [
          { id: 'acad_a', name: 'Academic Block A', description: 'Main academic building housing engineering classrooms, basic science physics/chemistry labs, and centralized administration offices.', asset_category: 'academic', floors_count: 4, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Guest_5G', center_x: 250, center_y: 180, walking_time_from_hostel: 240, club_amenities: [], recruitment_roles: [] },
          { id: 'acad_b', name: 'Academic Block B', description: 'Engineering & Advanced Computing Hub. Houses core CSE/ECE system processing computer labs, cybersecurity wings, and faculty research cabins.', asset_category: 'academic', floors_count: 5, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Academic_WiFi', center_x: 380, center_y: 150, walking_time_from_hostel: 180, club_amenities: [], recruitment_roles: [] },
          { id: 'hostel_boys', name: 'Boys Hostel Block', description: 'Residential block for male engineering students. Equipped with indoor gym spaces, internal laundry setups, and digital common rooms.', asset_category: 'hostel', floors_count: 8, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Hostel_Net', center_x: 180, center_y: 350, walking_time_from_hostel: 0, club_amenities: [], recruitment_roles: [] },
          { id: 'hostel_girls', name: 'Girls Hostel Block', description: 'Highly secure residential complex for female students containing study common halls, multi-purpose recreational spaces, and security counters.', asset_category: 'hostel', floors_count: 8, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Hostel_Net', center_x: 500, center_y: 320, walking_time_from_hostel: 0, club_amenities: [], recruitment_roles: [] },
          { id: 'mess', name: 'Central Mess Complex', description: 'Grand multi-tiered dining hall processing vegetarian culinary routines daily for hostellers across distinct student wings.', asset_category: 'mess', floors_count: 2, accessibility_verified: true, campus_wifi_ssid: 'No public WiFi', center_x: 340, center_y: 300, walking_time_from_hostel: 120, club_amenities: [], recruitment_roles: [] },
          { id: 'sports', name: 'Avisruta Sports Arena', description: 'Expansive outdoor layout tracking basketball courts, volleyball segments, and a massive playground infrastructure for football and cricket.', asset_category: 'sports', floors_count: 1, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Sports_WiFi', center_x: 620, center_y: 220, walking_time_from_hostel: 240, club_amenities: ['Basketball Courts', 'Volleyball Courts', 'Soccer Grounds'], recruitment_roles: ['Point Guard', 'Striker', 'Volleyball Setter'] },
          { id: 'gate', name: 'Main Security Gate', description: 'Primary perimeter entry check-point. Rigorous structural verification matrix enforced via student identity smart cards 24/7.', asset_category: 'utility', floors_count: 1, accessibility_verified: true, campus_wifi_ssid: 'Amrita_Security_Secured', center_x: 80, center_y: 250, walking_time_from_hostel: 720, club_amenities: [], recruitment_roles: [] }
        ],
        users: [],
        clubs: [
          {
            id: 1,
            name: 'Chakravyuha Technical Club',
            logo: '⚡',
            category: 'Technical',
            description: 'The premier technical student organization at Amrita Amaravati. We empower freshers to dive deep into Web3, AI, Cyber Security, App Development, and Competitive Programming through bootcamps, workshops, and our signature annual hackathon.',
            detailed_desc: 'Chakravyuha is not just a club, it is the center of engineering culture on campus. Founded with the mission to bridge the gap between classroom theory and industry-grade engineering, we conduct weekly coding sprints, mentor student startups, and host expert talks from alumni at FAANG and top research labs.',
            members_count: 142,
            recruitment_info: 'Applications open in August 2026. Consists of a basic coding screening, followed by a task round and a friendly senior panel interview. High passion wins over pre-existing coding skills!',
            gallery_json: '["Hackathon 2025", "Linux Installfest", "AI Workshop"]',
            club_amenities: ['GPU Cluster Rig', 'IoT Prototyping Lab', 'VR Headsets'],
            recruitment_roles: ['Full Stack Engineer', 'AI/ML Researcher', 'Smart Contract Auditor']
          },
          {
            id: 2,
            name: 'Team Drishya // Right Side Vision',
            logo: '🎬',
            category: 'Creative',
            description: 'Multimedia and film production powerhouse. We handle cinematography, photography, creative editing, scriptwriting, and direct campus trailer launches.',
            detailed_desc: 'Team Drishya is a group of visual storytellers, editing masters, and sound designers. We organize cinema workshops, short film set runs, and are the official eyes of all cultural and technical fests at Amrita.',
            members_count: 48,
            recruitment_info: 'Recruitment tasks open in August 2026. Submit a portfolio of 3 edits, photos, or scripts to get shortlisted for the jury panel.',
            gallery_json: '["Trailer Launch", "Focal Lengths 101", "Short Film Set"]',
            club_amenities: ['Sony FX3 Cinema Rig', 'DJI Ronin Gimbal', 'Davinci Resolve Studio Suite'],
            recruitment_roles: ['Director of Photography', 'Audio Manipulator', 'Colorist', 'Scriptwriter']
          },
          {
            id: 3,
            name: 'Naadam Cultural Club',
            logo: '🎨',
            category: 'Cultural',
            description: 'The heartbeat of music, dance, fine arts, and theater at Amrita. We organize college fests, cultural nights, and national-level competition delegations.',
            detailed_desc: 'Naadam brings together artists of all varieties under one roof. Whether you play the mridangam, bass guitar, perform classical Bharatanatyam, street hip-hop, or sketch digital art, Naadam has a subgroup for you to shine.',
            members_count: 95,
            recruitment_info: 'Auditions open during the third week of August 2026. Prepare a 2-minute performance representing your art form.',
            gallery_json: '["Gokulashtami Night", "Aarambh Fest", "Art Exhibition"]',
            club_amenities: ['Yamaha Stage Piano', 'Shure SM58 Microphones', 'Line 6 Guitar Processors'],
            recruitment_roles: ['Classical Vocalist', 'Bass Guitarist', 'Digital Illustrator']
          },
          {
            id: 4,
            name: 'Avisruta Sports Club',
            logo: '🏆',
            category: 'Sports',
            description: 'Leading all athletic schedules, varsity teams, gym routines, and campus-wide league tournaments across Amrita.',
            detailed_desc: 'Avisruta keeps the campus fit and competitive. We manage the sports arena, run official practices for football, basketball, and volleyball, and orchestrate the annual Inter-Block Olympics.',
            members_count: 110,
            recruitment_info: 'Roster trials held on main arena ground in August 2026. Consists of a fitness drill, skill showcase, and match scrimmages.',
            gallery_json: '["Inter-Block Soccer", "Basketball Finals", "Avisruta Arena Launch"]',
            club_amenities: ['Basketball Courts', 'Volleyball Courts', 'Campus Soccer Grounds', 'Pro Volleyball Nets'],
            recruitment_roles: ['Point Guard', 'Striker', 'Volleyball Setter']
          }
        ],
        coordinators: [
          { id: 1, club_id: 1, name: 'Rohan Sharma', role: 'President', year: '3rd Year B.Tech CSE', contact: 'rohan.sharma@am.students.edu', linkedin: '#', insta: '#' },
          { id: 2, club_id: 1, name: 'Sneha Reddy', role: 'Technical Lead', year: '3rd Year B.Tech CSE (AI)', contact: 'sneha.reddy@am.students.edu', linkedin: '#', insta: '#' },
          { id: 3, club_id: 3, name: 'Vikram Sen', role: 'Cultural Secretary', year: '4th Year B.Tech ECE', contact: 'vikram.sen@am.students.edu', linkedin: '#', insta: '#' },
          { id: 4, club_id: 2, name: 'Akash Kumar', role: 'Media Head', year: '3rd Year B.Tech ECE', contact: 'akash.kumar@am.students.edu', linkedin: '#', insta: '#' },
          { id: 5, club_id: 4, name: 'Karthik Rao', role: 'Sports Captain', year: '4th Year B.Tech ME', contact: 'karthik.rao@am.students.edu', linkedin: '#', insta: '#' }
        ],
        club_activities: [
          { id: 1, club_id: 'drsya-media', activity_title: 'Cinematic Trailer Shoot (Finding My Pace)', activity_type: 'Film Set', scheduled_time: new Date(Date.now() + 86400000).toISOString(), venue_location: 'Academic Block B Horizon Lawn', slots_available: 15 },
          { id: 2, club_id: 'naadam-arts', activity_title: 'Aarambh Induction Jam Session', activity_type: 'Acoustic Jam', scheduled_time: new Date(Date.now() + 172800000).toISOString(), venue_location: 'Main Auditorium Common Stage', slots_available: 25 },
          { id: 3, club_id: 'avisruta-athletics', activity_title: 'Inter-Block Football Practice Run', activity_type: 'Match Scrimmage', scheduled_time: new Date(Date.now() + 259200000).toISOString(), venue_location: 'Campus Soccer Grounds', slots_available: 18 },
          { id: 4, club_id: 'chakravyuha', activity_title: 'Annual Chakravyuha Hackfest Briefing', activity_type: 'Hackathon Info Session', scheduled_time: new Date(Date.now() + 345600000).toISOString(), venue_location: 'Academic Block B Seminar Hall', slots_available: 40 }
        ],
        resources: [
          { id: 1, title: 'Data Structures Lecture Notes (Complete)', branch: 'CSE', semester: 'Semester 3', subject: 'Data Structures', type: 'Notes', uploader_name: 'Senior Rohan S.', uploader_avatar: 'RS', downloads: 184, file_url: '#', rating: 4.8, is_verified: true, created_at: new Date().toISOString() },
          { id: 2, title: 'OOP in Java CIA-1 Previous Year Paper (2025)', branch: 'CSE', semester: 'Semester 1', subject: 'OOP in Java', type: 'PYQs', uploader_name: 'Sneha R.', uploader_avatar: 'SR', downloads: 245, file_url: '#', rating: 4.9, is_verified: true, created_at: new Date().toISOString() },
          { id: 3, title: 'Digital Electronics Lab Manual & Solved Sheets', branch: 'ECE', semester: 'Semester 1', subject: 'Digital Electronics', type: 'Assignments', uploader_name: 'Varun K.', uploader_avatar: 'VK', downloads: 98, file_url: '#', rating: 4.2, is_verified: true, created_at: new Date().toISOString() }
        ],
        questions: [
          { id: 1, title: 'How strict is the 75% attendance rule in the first semester for lab courses?', body: 'I am a fresher joining B.Tech CSE in July 2026. I live in the hostel and wanted to know what happens if I drop to like 72% attendance in a lab subject due to illness. Do they really condone it or block you from the end sem?', category: 'Academics', author_id: 99, author_name: 'ExcitedFresher26', views: 310, votes: 14, status: 'solved', created_at: new Date().toISOString() },
          { id: 2, title: 'Best resources/IDE to setup before joining CSE AI branches in July?', body: 'I want to utilize the next two months to configure my laptop. What operating system is preferred, and which applications are recommended for our core curriculum in the first semester?', category: 'Must-Have Tools', author_id: 100, author_name: 'CodeNovice', views: 185, votes: 9, status: 'answered', created_at: new Date().toISOString() }
        ],
        answers: [
          { id: 1, question_id: 1, author_id: 1, author_name: 'Senior Rohan S.', author_role: '3rd Year Senior (Chakravyuha)', author_avatar: 'RS', body: 'For lab courses, they are extremely strict. If you miss even a single lab session, you miss the record submission for that week. If you have valid medical certificates, you can submit a condonation letter. The HOD will allow it if it stays above 65%. But do NOT play around with lab attendance; it is much harder to make up compared to lectures.', votes: 12, is_accepted: true, created_at: new Date().toISOString() }
        ],
        comments: [
          { id: 1, answer_id: 1, author_name: 'ExcitedFresher26', body: 'Wow, thanks Rohan! I will make sure to attend every single lab.', created_at: new Date().toISOString() }
        ],
        votes: [],
        notifications: [],
        admin_logs: [
          { id: 1, log_type: 'system', action: 'Initialize Fallback', target: 'Campus Compass Database', username: 'System', created_at: new Date().toISOString() }
        ]
      };
      
      if (dbExists) {
        try {
          const oldDb = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf-8'));
          if (oldDb.users) initialDb.users = oldDb.users;
          if (oldDb.resources && oldDb.resources.length > 3) initialDb.resources = oldDb.resources;
          if (oldDb.questions && oldDb.questions.length > 2) initialDb.questions = oldDb.questions;
          if (oldDb.answers && oldDb.answers.length > 1) initialDb.answers = oldDb.answers;
          if (oldDb.comments && oldDb.comments.length > 1) initialDb.comments = oldDb.comments;
        } catch(e) {}
      }
      
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialDb, null, 2));
    }
  }

  readDb() {
    this.initFallbackDb();
    return JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf-8'));
  }

  writeDb(data) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
  }

  queryFallback(text, params = []) {
    const db = this.readDb();
    let normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // 0. New Fallback endpoints for non-coding telemetry and registrations
    if (normalizedText.startsWith('SELECT * FROM club_activities')) {
      return { rows: db.club_activities, rowCount: db.club_activities.length };
    }

    if (normalizedText.includes('SELECT joined_activities_json FROM users WHERE id = $1')) {
      const id = parseInt(params[0]);
      const user = db.users.find(u => u.id === id);
      const rows = user ? [{ joined_activities_json: user.joined_activities_json || '[]' }] : [];
      return { rows, rowCount: rows.length };
    }

    if (normalizedText.includes('UPDATE users SET joined_activities_json = $1 WHERE id = $2')) {
      const joinedVal = params[0];
      const id = parseInt(params[1]);
      const u = db.users.find(item => item.id === id);
      if (u) u.joined_activities_json = joinedVal;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    if (normalizedText.startsWith('UPDATE club_activities SET slots_available = slots_available + 1 WHERE activity_title = $1')) {
      const title = params[0];
      const c = db.club_activities.find(item => item.activity_title === title);
      if (c) c.slots_available++;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    if (normalizedText.startsWith('UPDATE club_activities SET slots_available = slots_available - 1 WHERE activity_title = $1')) {
      const title = params[0];
      const c = db.club_activities.find(item => item.activity_title === title);
      if (c) c.slots_available--;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 1. SELECT * FROM map_locations ORDER BY name ASC
    if (normalizedText.startsWith('SELECT * FROM map_locations ORDER BY name ASC')) {
      const list = [...db.map_locations];
      list.sort((a, b) => a.name.localeCompare(b.name));
      return { rows: list, rowCount: list.length };
    }

    // 2. SELECT id, name, center_x, center_y, walking_time_from_hostel FROM map_locations WHERE id IN ($1, $2)
    if (normalizedText.includes('FROM map_locations WHERE id IN')) {
      const ids = params;
      const list = db.map_locations.filter(loc => ids.includes(loc.id));
      return { rows: list, rowCount: list.length };
    }

    // 3. SELECT email FROM users WHERE email = $1
    // 4. SELECT * FROM users WHERE email = $1
    if (normalizedText.includes('FROM users WHERE email = $1')) {
      const email = params[0];
      const user = db.users.find(u => u.email === email);
      const rows = user ? [user] : [];
      return { rows, rowCount: rows.length };
    }

    // 5. SELECT * FROM users WHERE id = $1
    if (normalizedText.includes('FROM users WHERE id = $1')) {
      const id = parseInt(params[0]);
      const user = db.users.find(u => u.id === id);
      const rows = user ? [user] : [];
      return { rows, rowCount: rows.length };
    }

    // 6. SELECT joined_clubs_json FROM users WHERE id = $1
    if (normalizedText.includes('SELECT joined_clubs_json FROM users WHERE id = $1')) {
      const id = parseInt(params[0]);
      const user = db.users.find(u => u.id === id);
      const rows = user ? [{ joined_clubs_json: user.joined_clubs_json }] : [];
      return { rows, rowCount: rows.length };
    }

    // 7. SELECT * FROM clubs
    if (normalizedText.startsWith('SELECT * FROM clubs')) {
      return { rows: db.clubs, rowCount: db.clubs.length };
    }

    // 8. SELECT * FROM coordinators WHERE club_id = $1
    if (normalizedText.includes('FROM coordinators WHERE club_id = $1')) {
      const clubId = parseInt(params[0]);
      const list = db.coordinators.filter(c => c.club_id === clubId);
      return { rows: list, rowCount: list.length };
    }

    // 9. SELECT * FROM resources
    if (normalizedText.includes('FROM resources WHERE is_verified = TRUE')) {
      let list = db.resources.filter(r => r.is_verified);
      
      let currentParamIdx = 1;
      if (normalizedText.includes('AND branch = $')) {
        const branchVal = params[currentParamIdx - 1];
        list = list.filter(r => r.branch === branchVal);
        currentParamIdx++;
      }
      if (normalizedText.includes('AND type = $')) {
        const typeVal = params[currentParamIdx - 1];
        list = list.filter(r => r.type === typeVal);
        currentParamIdx++;
      }
      if (normalizedText.includes('ILIKE $')) {
        const qVal = params[currentParamIdx - 1].replace(/%/g, '').toLowerCase();
        list = list.filter(r => r.title.toLowerCase().includes(qVal) || r.subject.toLowerCase().includes(qVal));
      }
      
      list.sort((a, b) => b.downloads - a.downloads);
      return { rows: list, rowCount: list.length };
    }

    // 10. SELECT * FROM questions
    if (normalizedText.startsWith('SELECT * FROM questions')) {
      let list = [...db.questions];
      
      let currentParamIdx = 1;
      if (normalizedText.includes('WHERE category = $')) {
        const catVal = params[0];
        list = list.filter(q => q.category === catVal);
        currentParamIdx++;
      }
      if (normalizedText.includes('ILIKE $')) {
        const qVal = params[currentParamIdx - 1].replace(/%/g, '').toLowerCase();
        list = list.filter(q => q.title.toLowerCase().includes(qVal) || q.body.toLowerCase().includes(qVal));
      }
      
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: list, rowCount: list.length };
    }

    // 11. SELECT * FROM answers WHERE question_id = $1 ORDER BY is_accepted DESC, votes DESC
    if (normalizedText.includes('FROM answers WHERE question_id = $1')) {
      const qId = parseInt(params[0]);
      const list = db.answers.filter(a => a.question_id === qId);
      list.sort((a, b) => {
        if (a.is_accepted && !b.is_accepted) return -1;
        if (!a.is_accepted && b.is_accepted) return 1;
        return b.votes - a.votes;
      });
      return { rows: list, rowCount: list.length };
    }

    // 12. SELECT * FROM comments WHERE answer_id = $1 ORDER BY created_at ASC
    if (normalizedText.includes('FROM comments WHERE answer_id = $1')) {
      const ansId = parseInt(params[0]);
      const list = db.comments.filter(c => c.answer_id === ansId);
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { rows: list, rowCount: list.length };
    }

    // 13. SELECT id, direction FROM votes WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
    if (normalizedText.includes('FROM votes WHERE user_id = $1')) {
      const userId = parseInt(params[0]);
      const entityType = params[1];
      const entityId = parseInt(params[2]);
      const list = db.votes.filter(v => v.user_id === userId && v.entity_type === entityType && v.entity_id === entityId);
      return { rows: list, rowCount: list.length };
    }

    // 14. SELECT COUNT(*) as count FROM questions WHERE status = 'open'
    if (normalizedText.includes("COUNT(*) as count FROM questions WHERE status = 'open'") || normalizedText.includes("COUNT(*) as count FROM questions WHERE status = ''open''")) {
      const count = db.questions.filter(q => q.status === 'open').length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // 15. SELECT COUNT(*) as count FROM resources WHERE is_verified = TRUE
    if (normalizedText.includes('COUNT(*) as count FROM resources WHERE is_verified = TRUE')) {
      const count = db.resources.filter(r => r.is_verified).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // 16. SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 5
    if (normalizedText.includes('FROM admin_logs ORDER BY created_at DESC LIMIT 5')) {
      const list = [...db.admin_logs];
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const sliced = list.slice(0, 5);
      return { rows: sliced, rowCount: sliced.length };
    }

    // 17. SELECT title, category FROM questions WHERE id = $1
    if (normalizedText.includes('SELECT title, category FROM questions WHERE id = $1')) {
      const id = parseInt(params[0]);
      const q = db.questions.find(q => q.id === id);
      const rows = q ? [{ title: q.title, category: q.category }] : [];
      return { rows, rowCount: rows.length };
    }

    // --- INSERT OPERATORS ---
    
    // 18. INSERT INTO users (email, password_hash, name, branch, semester) VALUES ($1, $2, $3, $4, $5) RETURNING id
    if (normalizedText.startsWith('INSERT INTO users') && normalizedText.includes('RETURNING id')) {
      const newUser = {
        id: db.users.length + 1,
        email: params[0],
        password_hash: params[1],
        name: params[2],
        branch: params[3],
        semester: params[4],
        cgpa: 9.0,
        avatar: null,
        achievements_json: '[]',
        joined_clubs_json: '["Chakravyuha Technical Club"]',
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      this.writeDb(db);
      return { rows: [{ id: newUser.id }], rowCount: 1 };
    }

    // 19. INSERT INTO users (email, password_hash, name, branch, semester) VALUES ($1, $2, $3, 'CSE (AI)', 'Semester 1') RETURNING *
    if (normalizedText.startsWith('INSERT INTO users') && normalizedText.includes('RETURNING *')) {
      const newUser = {
        id: db.users.length + 1,
        email: params[0],
        password_hash: params[1],
        name: params[2],
        branch: 'CSE (AI)',
        semester: 'Semester 1',
        cgpa: 9.0,
        avatar: null,
        achievements_json: '[]',
        joined_clubs_json: '["Chakravyuha Technical Club"]',
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      this.writeDb(db);
      return { rows: [newUser], rowCount: 1 };
    }

    // 20. INSERT INTO resources (title, branch, semester, subject, type, uploader_id, uploader_name, uploader_avatar, file_url, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, 'U', $8, FALSE)
    if (normalizedText.startsWith('INSERT INTO resources')) {
      const newRes = {
        id: db.resources.length + 1,
        title: params[0],
        branch: params[1],
        semester: params[2],
        subject: params[3],
        type: params[4],
        uploader_id: parseInt(params[5]),
        uploader_name: params[6],
        uploader_avatar: 'U',
        downloads: 0,
        file_url: params[7],
        rating: 4.5,
        is_verified: false,
        created_at: new Date().toISOString()
      };
      db.resources.push(newRes);
      this.writeDb(db);
      return { rows: [newRes], rowCount: 1 };
    }

    // 21. INSERT INTO admin_logs (log_type, action, target, username) VALUES ('resource', 'Upload Requested', $1, $2)
    // 22. INSERT INTO admin_logs (log_type, action, target, username) VALUES ('forum', 'Promoted FAQ', $1, $2)
    if (normalizedText.startsWith('INSERT INTO admin_logs')) {
      let logType = 'system';
      let action = '';
      if (normalizedText.includes("'resource'")) {
        logType = 'resource';
        action = 'Upload Requested';
      } else if (normalizedText.includes("'forum'")) {
        logType = 'forum';
        action = 'Promoted FAQ';
      }
      const newLog = {
        id: db.admin_logs.length + 1,
        log_type: logType,
        action: action,
        target: params[0],
        username: params[1],
        created_at: new Date().toISOString()
      };
      db.admin_logs.push(newLog);
      this.writeDb(db);
      return { rows: [newLog], rowCount: 1 };
    }

    // 23. INSERT INTO questions (title, body, category, author_id, author_name) VALUES ($1, $2, $3, $4, $5) RETURNING *
    if (normalizedText.startsWith('INSERT INTO questions') && normalizedText.includes('RETURNING *')) {
      const newQ = {
        id: db.questions.length + 1,
        title: params[0],
        body: params[1],
        category: params[2],
        author_id: parseInt(params[3]),
        author_name: params[4],
        views: 0,
        votes: 1,
        status: 'open',
        created_at: new Date().toISOString()
      };
      db.questions.push(newQ);
      this.writeDb(db);
      return { rows: [newQ], rowCount: 1 };
    }

    // 24. INSERT INTO answers (question_id, author_id, author_name, author_role, author_avatar, body) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    if (normalizedText.startsWith('INSERT INTO answers') && normalizedText.includes('RETURNING *')) {
      const newA = {
        id: db.answers.length + 1,
        question_id: parseInt(params[0]),
        author_id: parseInt(params[1]),
        author_name: params[2],
        author_role: params[3],
        author_avatar: params[4],
        body: params[5],
        votes: 0,
        is_accepted: false,
        created_at: new Date().toISOString()
      };
      db.answers.push(newA);
      this.writeDb(db);
      return { rows: [newA], rowCount: 1 };
    }

    // 25. INSERT INTO notifications (user_id, title, body) VALUES ($1, 'Solution Provided', 'Someone answered your forum question: "${body.substring(0, 30)}..."')
    if (normalizedText.startsWith('INSERT INTO notifications')) {
      const newN = {
        id: db.notifications.length + 1,
        user_id: parseInt(params[0]),
        title: params[1],
        body: params[2],
        is_read: false,
        created_at: new Date().toISOString()
      };
      db.notifications.push(newN);
      this.writeDb(db);
      return { rows: [newN], rowCount: 1 };
    }

    // 26. INSERT INTO votes (user_id, entity_type, entity_id, direction) VALUES ($1, $2, $3, $4)
    if (normalizedText.startsWith('INSERT INTO votes')) {
      const newV = {
        id: db.votes.length + 1,
        user_id: parseInt(params[0]),
        entity_type: params[1],
        entity_id: parseInt(params[2]),
        direction: params[3]
      };
      db.votes.push(newV);
      this.writeDb(db);
      return { rows: [newV], rowCount: 1 };
    }

    // --- UPDATE OPERATORS ---
    
    // 27. UPDATE resources SET downloads = downloads + 1 WHERE id = $1
    if (normalizedText.includes('UPDATE resources SET downloads = downloads + 1 WHERE id = $1')) {
      const id = parseInt(params[0]);
      const r = db.resources.find(item => item.id === id);
      if (r) r.downloads++;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 28. UPDATE users SET joined_clubs_json = $1 WHERE id = $2
    if (normalizedText.includes('UPDATE users SET joined_clubs_json = $1 WHERE id = $2')) {
      const joinedVal = params[0];
      const id = parseInt(params[1]);
      const u = db.users.find(item => item.id === id);
      if (u) u.joined_clubs_json = joinedVal;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 29. UPDATE clubs SET members_count = members_count + 1 WHERE name = $1
    // 30. UPDATE clubs SET members_count = members_count - 1 WHERE name = $1
    if (normalizedText.startsWith('UPDATE clubs SET members_count = members_count + 1 WHERE name = $1')) {
      const name = params[0];
      const c = db.clubs.find(item => item.name === name);
      if (c) c.members_count++;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }
    if (normalizedText.startsWith('UPDATE clubs SET members_count = members_count - 1 WHERE name = $1')) {
      const name = params[0];
      const c = db.clubs.find(item => item.name === name);
      if (c) c.members_count--;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 31. UPDATE questions SET status = 'answered' WHERE id = $1
    if (normalizedText.includes("UPDATE questions SET status = 'answered' WHERE id = $1")) {
      const id = parseInt(params[0]);
      const q = db.questions.find(item => item.id === id);
      if (q) q.status = 'answered';
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 32. UPDATE questions SET status = 'solved' WHERE id = $1
    if (normalizedText.includes("UPDATE questions SET status = 'solved' WHERE id = $1")) {
      const id = parseInt(params[0]);
      const q = db.questions.find(item => item.id === id);
      if (q) q.status = 'solved';
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 33. UPDATE questions SET status = 'pinned' WHERE id = $1
    if (normalizedText.includes("UPDATE questions SET status = 'pinned' WHERE id = $1")) {
      const id = parseInt(params[0]);
      const q = db.questions.find(item => item.id === id);
      if (q) q.status = 'pinned';
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 34. UPDATE answers SET is_accepted = FALSE WHERE question_id = $1
    if (normalizedText.includes('UPDATE answers SET is_accepted = FALSE WHERE question_id = $1')) {
      const qId = parseInt(params[0]);
      db.answers.filter(item => item.question_id === qId).forEach(item => item.is_accepted = false);
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 35. UPDATE answers SET is_accepted = TRUE WHERE id = $1
    if (normalizedText.includes('UPDATE answers SET is_accepted = TRUE WHERE id = $1')) {
      const id = parseInt(params[0]);
      const a = db.answers.find(item => item.id === id);
      if (a) a.is_accepted = true;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 36. UPDATE votes SET direction = $1 WHERE id = $2
    if (normalizedText.includes('UPDATE votes SET direction = $1 WHERE id = $2')) {
      const dir = params[0];
      const id = parseInt(params[1]);
      const v = db.votes.find(item => item.id === id);
      if (v) v.direction = dir;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 37. UPDATE questions SET votes = votes + $1 WHERE id = $2
    if (normalizedText.includes('UPDATE questions SET votes = votes + $1 WHERE id = $2')) {
      const diff = parseInt(params[0]);
      const id = parseInt(params[1]);
      const q = db.questions.find(item => item.id === id);
      if (q) q.votes += diff;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 38. UPDATE answers SET votes = votes + $1 WHERE id = $2
    if (normalizedText.includes('UPDATE answers SET votes = votes + $1 WHERE id = $2')) {
      const diff = parseInt(params[0]);
      const id = parseInt(params[1]);
      const a = db.answers.find(item => item.id === id);
      if (a) a.votes += diff;
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // --- DELETE OPERATORS ---
    
    // 39. DELETE FROM votes WHERE id = $1
    if (normalizedText.includes('DELETE FROM votes WHERE id = $1')) {
      const id = parseInt(params[0]);
      db.votes = db.votes.filter(item => item.id !== id);
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // 40. DELETE FROM questions WHERE id = $1
    if (normalizedText.includes('DELETE FROM questions WHERE id = $1')) {
      const id = parseInt(params[0]);
      db.questions = db.questions.filter(item => item.id !== id);
      this.writeDb(db);
      return { rows: [], rowCount: 1 };
    }

    // Default mock response to let arbitrary SQL schema migrations complete silently
    return { rows: [], rowCount: 0 };
  }
}

export const pool = new SmartDBPool();

// Parameterized Query helper
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err) {
    console.error('Database query failure:', err);
    throw err;
  }
}

// --- SCHEMA MIGRATIONS (Auto-executed on startup) ---
export async function initializeDatabase() {
  console.log('Running PostgreSQL migrations...');
  
  try {
    // Ping real pool to check connection before running full migration scripts
    await pool.realPool.query('SELECT 1');
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection refused or unavailable. Swapping dynamically to Graceful Local JSON Database Fallback.');
    pool.useFallback = true;
    pool.initFallbackDb();
    console.log('✦ SmartDB Fallback: Active Graceful Local JSON Database Engine Fallback ✦');
    return;
  }
  
  try {
    // 1. Create Campus Asset enum if not exists
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campus_asset_type') THEN
          CREATE TYPE campus_asset_type AS ENUM ('academic', 'hostel', 'mess', 'sports', 'utility');
        END IF;
      END
      $$;
    `);

    // 2. Map Locations Table
    await query(`
      CREATE TABLE IF NOT EXISTS map_locations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        asset_category campus_asset_type DEFAULT 'academic',
        floors_count INT DEFAULT 1,
        accessibility_verified BOOLEAN DEFAULT TRUE,
        campus_wifi_ssid VARCHAR(100) DEFAULT 'Amrita_Academic_WiFi',
        center_x INT NOT NULL,
        center_y INT NOT NULL,
        walking_time_from_hostel INT NOT NULL DEFAULT 120, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        semester VARCHAR(100) NOT NULL,
        cgpa REAL DEFAULT 9.0,
        avatar VARCHAR(255),
        achievements_json TEXT DEFAULT '[]',
        joined_clubs_json TEXT DEFAULT '["Chakravyuha Technical Club"]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Clubs Table
    await query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        logo VARCHAR(50),
        category VARCHAR(100) NOT NULL,
        description TEXT,
        detailed_desc TEXT,
        members_count INTEGER DEFAULT 0,
        recruitment_info TEXT,
        gallery_json TEXT DEFAULT '[]'
      )
    `);

    // 5. Coordinators Table
    await query(`
      CREATE TABLE IF NOT EXISTS coordinators (
        id SERIAL PRIMARY KEY,
        club_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        year VARCHAR(50) NOT NULL,
        contact VARCHAR(255),
        linkedin VARCHAR(255),
        insta VARCHAR(255)
      )
    `);

    // 6. Resources Table
    await query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        semester VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        uploader_id INTEGER,
        uploader_name VARCHAR(255),
        uploader_avatar VARCHAR(50),
        downloads INTEGER DEFAULT 0,
        file_url VARCHAR(255),
        rating REAL DEFAULT 4.5,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Forum Questions Table
    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        author_id INTEGER,
        author_name VARCHAR(255) NOT NULL,
        views INTEGER DEFAULT 0,
        votes INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Forum Answers Table
    await query(`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        author_id INTEGER,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(100),
        author_avatar VARCHAR(50),
        body TEXT NOT NULL,
        votes INTEGER DEFAULT 0,
        is_accepted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Comments Table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Votes Table
    await query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        direction VARCHAR(10) NOT NULL
      )
    `);

    // 11. Notifications Table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Admin Activity Logs
    await query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        log_type VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Club Activities & Upgrades (Creative, Cultural, Sports modules)
    try {
      await query(`
        ALTER TABLE map_locations ADD COLUMN IF NOT EXISTS club_amenities TEXT[];
        ALTER TABLE map_locations ADD COLUMN IF NOT EXISTS recruitment_roles TEXT[];
      `);
    } catch (e) {
      console.warn("Non-critical: Alter map_locations failed, typical of SQLite fallback or columns already exist.");
    }
    
    try {
      await query(`
        ALTER TABLE clubs ADD COLUMN IF NOT EXISTS club_amenities TEXT[];
        ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recruitment_roles TEXT[];
      `);
    } catch (e) {
      console.warn("Non-critical: Alter clubs failed.");
    }

    try {
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_activities_json TEXT DEFAULT '[]';
      `);
    } catch (e) {
      console.warn("Non-critical: Alter users joined_activities failed.");
    }

    await query(`
      CREATE TABLE IF NOT EXISTS club_activities (
        id SERIAL PRIMARY KEY,
        club_id VARCHAR(50) NOT NULL,
        activity_title VARCHAR(255) NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
        venue_location VARCHAR(255) NOT NULL,
        slots_available INT DEFAULT 20
      )
    `);

    // --- SEED TABLES IF EMPTY ---
    await seedTables();
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      console.warn('⚠️  PostgreSQL offline during migrations. Dynamic Swap -> Resilient Local JSON Database Fallback.');
      pool.useFallback = true;
      pool.initFallbackDb();
      return;
    }
    console.error('Database migration/seed critical crash:', err);
    throw err;
  }
}

async function seedTables() {
  // Seed Map Locations
  const locCount = await query('SELECT COUNT(*) as count FROM map_locations');
  if (parseInt(locCount.rows[0].count) === 0) {
    console.log('Seeding Amrita Amaravati spatial coordinates...');
    await query(`
      INSERT INTO map_locations (id, name, description, asset_category, floors_count, accessibility_verified, campus_wifi_ssid, center_x, center_y, walking_time_from_hostel)
      VALUES 
      ('acad_a', 'Academic Block A', 'Main academic building housing engineering classrooms, basic science physics/chemistry labs, and centralized administration offices.', 'academic', 4, TRUE, 'Amrita_Guest_5G', 250, 180, 240),
      ('acad_b', 'Academic Block B', 'Engineering & Advanced Computing Hub. Houses core CSE/ECE system processing computer labs, cybersecurity wings, and faculty research cabins.', 'academic', 5, TRUE, 'Amrita_Academic_WiFi', 380, 150, 180),
      ('hostel_boys', 'Boys Hostel Block', 'Residential block for male engineering students. Equipped with indoor gym spaces, internal laundry setups, and digital common rooms.', 'hostel', 8, TRUE, 'Amrita_Hostel_Net', 180, 350, 0),
      ('hostel_girls', 'Girls Hostel Block', 'Highly secure residential complex for female students containing study common halls, multi-purpose recreational spaces, and security counters.', 'hostel', 8, TRUE, 'Amrita_Hostel_Net', 500, 320, 0),
      ('mess', 'Central Mess Complex', 'Grand multi-tiered dining hall processing vegetarian culinary routines daily for hostellers across distinct student wings.', 'mess', 2, TRUE, 'No public WiFi', 340, 300, 120),
      ('sports', 'Avisruta Sports Arena', 'Expansive outdoor layout tracking basketball courts, volleyball segments, and a massive playground infrastructure for football and cricket.', 'sports', 1, TRUE, 'Amrita_Sports_WiFi', 620, 220, 240),
      ('gate', 'Main Security Gate', 'Primary perimeter entry check-point. Rigorous structural verification matrix enforced via student identity smart cards 24/7.', 'utility', 1, TRUE, 'Amrita_Security_Secured', 80, 250, 720)
    `);
  }

  // Seed Clubs & Activities
  const clubCount = await query('SELECT COUNT(*) as count FROM clubs');
  if (parseInt(clubCount.rows[0].count) === 0) {
    console.log('Seeding clubs, activities and coordinators...');
    const chakRes = await query(`
      INSERT INTO clubs (name, logo, category, description, detailed_desc, members_count, recruitment_info, gallery_json, club_amenities, recruitment_roles)
      VALUES (
        'Chakravyuha Technical Club', '⚡', 'Technical',
        'The premier technical student organization at Amrita Amaravati. We empower freshers to dive deep into Web3, AI, Cyber Security, App Development, and Competitive Programming through bootcamps, workshops, and our signature annual hackathon.',
        'Chakravyuha is not just a club, it is the center of engineering culture on campus. Founded with the mission to bridge the gap between classroom theory and industry-grade engineering, we conduct weekly coding sprints, mentor student startups, and host expert talks from alumni at FAANG and top research labs.',
        142, 'Applications open in August 2026. Consists of a basic coding screening, followed by a task round and a friendly senior panel interview. High passion wins over pre-existing coding skills!',
        '["Hackathon 2025", "Linux Installfest", "AI Workshop"]',
        ARRAY['GPU Cluster Rig', 'IoT Prototyping Lab', 'VR Headsets'],
        ARRAY['Full Stack Engineer', 'AI/ML Researcher', 'Smart Contract Auditor']
      ) RETURNING id
    `);

    const drishyaRes = await query(`
      INSERT INTO clubs (name, logo, category, description, detailed_desc, members_count, recruitment_info, gallery_json, club_amenities, recruitment_roles)
      VALUES (
        'Team Drishya // Right Side Vision', '🎬', 'Creative',
        'Multimedia and film production powerhouse. We handle cinematography, photography, creative editing, scriptwriting, and direct campus trailer launches.',
        'Team Drishya is a group of visual storytellers, editing masters, and sound designers. We organize cinema workshops, short film set runs, and are the official eyes of all cultural and technical fests at Amrita.',
        48, 'Recruitment tasks open in August 2026. Submit a portfolio of 3 edits, photos, or scripts to get shortlisted for the jury panel.',
        '["Trailer Launch", "Focal Lengths 101", "Short Film Set"]',
        ARRAY['Sony FX3 Cinema Rig', 'DJI Ronin Gimbal', 'Davinci Resolve Studio Suite'],
        ARRAY['Director of Photography', 'Audio Manipulator', 'Colorist', 'Scriptwriter']
      ) RETURNING id
    `);

    const naadamRes = await query(`
      INSERT INTO clubs (name, logo, category, description, detailed_desc, members_count, recruitment_info, gallery_json, club_amenities, recruitment_roles)
      VALUES (
        'Naadam Cultural Club', '🎨', 'Cultural',
        'The heartbeat of music, dance, fine arts, and theater at Amrita. We organize college fests, cultural nights, and national-level competition delegations.',
        'Naadam brings together artists of all varieties under one roof. Whether you play the mridangam, bass guitar, perform classical Bharatanatyam, street hip-hop, or sketch digital art, Naadam has a subgroup for you to shine.',
        95, 'Auditions open during the third week of August 2026. Prepare a 2-minute performance representing your art form.',
        '["Gokulashtami Night", "Aarambh Fest", "Art Exhibition"]',
        ARRAY['Yamaha Stage Piano', 'Shure SM58 Microphones', 'Line 6 Guitar Processors'],
        ARRAY['Classical Vocalist', 'Bass Guitarist', 'Digital Illustrator']
      ) RETURNING id
    `);

    const avisrutaRes = await query(`
      INSERT INTO clubs (name, logo, category, description, detailed_desc, members_count, recruitment_info, gallery_json, club_amenities, recruitment_roles)
      VALUES (
        'Avisruta Sports Club', '🏆', 'Sports',
        'Leading all athletic schedules, varsity teams, gym routines, and campus-wide league tournaments across Amrita.',
        'Avisruta keeps the campus fit and competitive. We manage the sports arena, run official practices for football, basketball, and volleyball, and orchestrate the annual Inter-Block Olympics.',
        110, 'Roster trials held on main arena ground in August 2026. Consists of a fitness drill, skill showcase, and match scrimmages.',
        '["Inter-Block Soccer", "Basketball Finals", "Avisruta Arena Launch"]',
        ARRAY['Basketball Courts', 'Volleyball Courts', 'Campus Soccer Grounds', 'Pro Volleyball Nets'],
        ARRAY['Point Guard', 'Striker', 'Volleyball Setter']
      ) RETURNING id
    `);

    const chakId = chakRes.rows[0].id;
    const drishyaId = drishyaRes.rows[0].id;
    const naadamId = naadamRes.rows[0].id;
    const avisrutaId = avisrutaRes.rows[0].id;

    await query(
      `INSERT INTO coordinators (club_id, name, role, year, contact, linkedin, insta) VALUES 
       ($1, 'Rohan Sharma', 'President', '3rd Year B.Tech CSE', 'rohan.sharma@am.students.edu', '#', '#'),
       ($1, 'Sneha Reddy', 'Technical Lead', '3rd Year B.Tech CSE (AI)', 'sneha.reddy@am.students.edu', '#', '#')`,
      [chakId]
    );

    await query(
      `INSERT INTO coordinators (club_id, name, role, year, contact, linkedin, insta) VALUES 
       ($1, 'Vikram Sen', 'Cultural Secretary', '4th Year B.Tech ECE', 'vikram.sen@am.students.edu', '#', '#')`,
      [naadamId]
    );

    await query(
      `INSERT INTO coordinators (club_id, name, role, year, contact, linkedin, insta) VALUES 
       ($1, 'Akash Kumar', 'Media Head', '3rd Year B.Tech ECE', 'akash.kumar@am.students.edu', '#', '#')`,
      [drishyaId]
    );

    await query(
      `INSERT INTO coordinators (club_id, name, role, year, contact, linkedin, insta) VALUES 
       ($1, 'Karthik Rao', 'Sports Captain', '4th Year B.Tech ME', 'karthik.rao@am.students.edu', '#', '#')`,
      [avisrutaId]
    );

    await query(`
      INSERT INTO club_activities (club_id, activity_title, activity_type, scheduled_time, venue_location, slots_available)
      VALUES 
      ('drsya-media', 'Cinematic Trailer Shoot (Finding My Pace)', 'Film Set', NOW() + INTERVAL '1 day', 'Academic Block B Horizon Lawn', 15),
      ('naadam-arts', 'Aarambh Induction Jam Session', 'Acoustic Jam', NOW() + INTERVAL '2 days', 'Main Auditorium Common Stage', 25),
      ('avisruta-athletics', 'Inter-Block Football Practice Run', 'Match Scrimmage', NOW() + INTERVAL '3 days', 'Campus Soccer Grounds', 18),
      ('chakravyuha', 'Annual Chakravyuha Hackfest Briefing', 'Hackathon Info Session', NOW() + INTERVAL '4 days', 'Academic Block B Seminar Hall', 40)
    `);
  }

  // Seed Resources
  const resCount = await query('SELECT COUNT(*) as count FROM resources');
  if (parseInt(resCount.rows[0].count) === 0) {
    console.log('Seeding locker assets...');
    const resources = [
      ['Data Structures Lecture Notes (Complete)', 'CSE', 'Semester 3', 'Data Structures', 'Notes', 'Senior Rohan S.', 'RS', 184, '#', 4.8, true],
      ['OOP in Java CIA-1 Previous Year Paper (2025)', 'CSE', 'Semester 1', 'OOP in Java', 'PYQs', 'Sneha R.', 'SR', 245, '#', 4.9, true],
      ['Digital Electronics Lab Manual & Solved Sheets', 'ECE', 'Semester 1', 'Digital Electronics', 'Assignments', 'Varun K.', 'VK', 98, '#', 4.2, true]
    ];
    for (const r of resources) {
      await query(
        `INSERT INTO resources (title, branch, semester, subject, type, uploader_name, uploader_avatar, downloads, file_url, rating, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        r
      );
    }
  }

  // Seed Forum Questions
  const forumCount = await query('SELECT COUNT(*) as count FROM questions');
  if (parseInt(forumCount.rows[0].count) === 0) {
    console.log('Seeding student forum...');
    const q1 = await query(`
      INSERT INTO questions (title, body, category, author_name, views, votes, status)
      VALUES (
        'How strict is the 75% attendance rule in the first semester for lab courses?',
        'I am a fresher joining B.Tech CSE in July 2026. I live in the hostel and wanted to know what happens if I drop to like 72% attendance in a lab subject due to illness. Do they really condone it or block you from the end sem?',
        'Academics', 'ExcitedFresher26', 310, 14, 'solved'
      ) RETURNING id
    `);
    const q1Id = q1.rows[0].id;

    const a1 = await query(
      `INSERT INTO answers (question_id, author_name, author_role, author_avatar, body, votes, is_accepted)
       VALUES ($1, 'Senior Rohan S.', '3rd Year Senior (Chakravyuha)', 'RS', 
       'For lab courses, they are extremely strict. If you miss even a single lab session, you miss the record submission for that week. If you have valid medical certificates, you can submit a condonation letter. The HOD will allow it if it stays above 65%. But do NOT play around with lab attendance; it is much harder to make up compared to lectures.', 
       12, true) RETURNING id`,
      [q1Id]
    );
    const a1Id = a1.rows[0].id;

    await query(
      `INSERT INTO comments (answer_id, author_name, body)
       VALUES ($1, 'ExcitedFresher26', 'Wow, thanks Rohan! I will make sure to attend every single lab.')`,
      [a1Id]
    );

    await query(`
      INSERT INTO questions (title, body, category, author_name, views, votes, status)
      VALUES (
        'Best resources/IDE to setup before joining CSE AI branches in July?',
        'I want to utilize the next two months to configure my laptop. What operating system is preferred, and which applications are recommended for our core curriculum in the first semester?',
        'Must-Have Tools', 'CodeNovice', 185, 9, 'answered'
      )
    `);
  }
}
