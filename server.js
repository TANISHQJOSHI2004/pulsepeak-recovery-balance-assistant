const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const sqlite3 = require('sqlite3').verbose();

const PORT = 3000;
const publicDir = path.join(__dirname, 'public');
const dbPath = path.join(__dirname, 'pulsepeak.db');

//Opening the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to pulsepeak.db');
});

//Creating the tables used in the website
db.serialize(() => {
  //This are existing enquiries table from the 10.2D task
  db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      topic TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating enquiries table:', err.message);
    } else {
      console.log('Enquiries table ready.');
    }
  });

  //New feature table which will store the recovery assistant check-ins and outcomes
  db.run(`
    CREATE TABLE IF NOT EXISTS recovery_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal TEXT NOT NULL,
      workout_days INTEGER NOT NULL,
      sleep_quality INTEGER NOT NULL,
      stress_level INTEGER NOT NULL,
      soreness INTEGER NOT NULL,
      energy INTEGER NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      reasons TEXT NOT NULL,
      advice TEXT NOT NULL,
      weekly_plan TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating recovery_checks table:', err.message);
    } else {
      console.log('Recovery checks table ready.');
    }
  });
});

//This will remove the unsafe brackets and trim the spaces
function sanitiseValue(value) {
  return String(value || '').trim().replace(/[<>]/g, '');
}

//This Reads the JSON request body
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Request body too large.'));
      }
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

//Sends the JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

//This Serves the correct file types
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

//This Serves the static files from the public folder
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Page not found.');
      return;
    }

    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

//This is the 10.2D task enquiry feature

function validateEnquiry(data) {
  const errors = [];

  const fullName = sanitiseValue(data.full_name);
  const email = sanitiseValue(data.email);
  const phone = sanitiseValue(data.phone);
  const topic = sanitiseValue(data.topic);
  const message = sanitiseValue(data.message);

  if (!fullName) {
    errors.push('Full name is required.');
  } else if (fullName.length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  if (!email) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address.');
  }

  if (!phone) {
    errors.push('Phone number is required.');
  } else if (!/^\d+$/.test(phone)) {
    errors.push('Phone number must contain digits only.');
  } else if (phone.length < 8 || phone.length > 10) {
    errors.push('Phone number should be between 8 and 10 digits.');
  }

  if (!topic) {
    errors.push('Please choose a topic.');
  }

  if (!message) {
    errors.push('Message is required.');
  } else if (message.length < 10) {
    errors.push('Message should be at least 10 characters.');
  }

  return {
    errors,
    clean: {
      fullName,
      email,
      phone,
      topic,
      message
    }
  };
}

function listEnquiries(urlObj, res) {
  const clauses = [];
  const values = [];
  let query = 'SELECT * FROM enquiries';

  const topic = urlObj.searchParams.get('topic');
  const status = urlObj.searchParams.get('status');
  const search = urlObj.searchParams.get('search');

  if (topic) {
    clauses.push('topic = ?');
    values.push(topic);
  }

  if (status) {
    clauses.push('status = ?');
    values.push(status);
  }

  if (search) {
    clauses.push('(full_name LIKE ? OR topic LIKE ? OR message LIKE ?)');
    const likeValue = `%${search}%`;
    values.push(likeValue, likeValue, likeValue);
  }

  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }

  query += ' ORDER BY id DESC';

  db.all(query, values, (err, rows) => {
    if (err) {
      sendJson(res, 500, { message: 'Database read error.' });
      return;
    }
    sendJson(res, 200, rows);
  });
}

function insertEnquiry(body, res) {
  const { errors, clean } = validateEnquiry(body);

  if (errors.length > 0) {
    sendJson(res, 400, { message: 'Validation failed.', errors });
    return;
  }

  const now = new Date().toLocaleString();

  db.run(
    `INSERT INTO enquiries (full_name, email, phone, topic, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'New', ?, ?)`,
    [clean.fullName, clean.email, clean.phone, clean.topic, clean.message, now, now],
    function (err) {
      if (err) {
        sendJson(res, 500, { message: 'Could not save enquiry.' });
        return;
      }

      sendJson(res, 201, {
        message: 'Enquiry saved successfully.',
        id: this.lastID
      });
    }
  );
}

function markReviewed(id, res) {
  db.get('SELECT id FROM enquiries WHERE id = ?', [id], (err, row) => {
    if (err) {
      sendJson(res, 500, { message: 'Database read error.' });
      return;
    }

    if (!row) {
      sendJson(res, 404, { message: 'Enquiry not found.' });
      return;
    }

    const now = new Date().toLocaleString();

    db.run(
      `UPDATE enquiries
       SET status = 'Reviewed', updated_at = ?
       WHERE id = ?`,
      [now, id],
      function (updateErr) {
        if (updateErr) {
          sendJson(res, 500, { message: 'Could not update enquiry.' });
          return;
        }

        sendJson(res, 200, { message: 'Enquiry updated successfully.' });
      }
    );
  });
}

function deleteEnquiry(id, res) {
  db.run('DELETE FROM enquiries WHERE id = ?', [id], function (err) {
    if (err) {
      sendJson(res, 500, { message: 'Could not delete enquiry.' });
      return;
    }

    if (this.changes === 0) {
      sendJson(res, 404, { message: 'Enquiry not found.' });
      return;
    }

    sendJson(res, 200, { message: 'Enquiry deleted successfully.' });
  });
}

//Validating the recovery form inputs before scoring
function validateRecoveryInput(data) {
  const errors = [];

  const goal = sanitiseValue(data.goal);
  const workoutDays = Number(data.workout_days);
  const sleepQuality = Number(data.sleep_quality);
  const stressLevel = Number(data.stress_level);
  const soreness = Number(data.soreness);
  const energy = Number(data.energy);

  if (!goal) {
    errors.push('Please select your goal.');
  }

  if (!Number.isInteger(workoutDays) || workoutDays < 1 || workoutDays > 7) {
    errors.push('Workout days must be selected between 1 and 7.');
  }

  if (!Number.isInteger(sleepQuality) || sleepQuality < 1 || sleepQuality > 5) {
    errors.push('Sleep quality must be selected.');
  }

  if (!Number.isInteger(stressLevel) || stressLevel < 1 || stressLevel > 5) {
    errors.push('Stress level must be selected.');
  }

  if (!Number.isInteger(soreness) || soreness < 1 || soreness > 5) {
    errors.push('Soreness level must be selected.');
  }

  if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
    errors.push('Energy level must be selected.');
  }

  return {
    errors,
    clean: {
      goal,
      workoutDays,
      sleepQuality,
      stressLevel,
      soreness,
      energy
    }
  };
}

//Generating the next-week plan so that the feature feels actionable
function buildWeeklyPlan(goal, riskLevel) {
  let plan = {
    Mon: 'Light',
    Tue: 'Strength',
    Wed: 'Recovery',
    Thu: 'Rest',
    Fri: 'Light',
    Sat: 'Walk',
    Sun: 'Rest'
  };

  if (riskLevel === 'Low') {
    plan = {
      Mon: 'Strength',
      Tue: 'Conditioning',
      Wed: 'Recovery',
      Thu: 'Strength',
      Fri: 'Light Cardio',
      Sat: 'Walk',
      Sun: 'Rest'
    };
  }

  if (riskLevel === 'High') {
    plan = {
      Mon: 'Recovery',
      Tue: 'Light',
      Wed: 'Rest',
      Thu: 'Recovery',
      Fri: 'Walk',
      Sat: 'Light',
      Sun: 'Rest'
    };
  }

  //Some small goal-based adjustments
  if (goal === 'Build Strength' && riskLevel === 'Low') {
    plan.Mon = 'Strength';
    plan.Thu = 'Strength';
  }

  if (goal === 'Fat Loss' && riskLevel === 'Low') {
    plan.Tue = 'Conditioning';
    plan.Fri = 'Conditioning';
  }

  if (goal === 'Improve Endurance' && riskLevel === 'Low') {
    plan.Tue = 'Cardio';
    plan.Fri = 'Conditioning';
  }

  if (goal === 'Recover Better') {
    plan.Mon = 'Recovery';
    plan.Wed = 'Recovery';
    plan.Sat = 'Walk';
  }

  return plan;
}

//Rule-based scoring engine
function buildRecoveryResult(clean) {
  let score = 0;
  const reasons = [];
  const advice = [];

  if (clean.workoutDays >= 6) {
    score += 2;
    pushUnique(reasons, 'Training load is high');
    pushUnique(advice, 'Add 1 full rest day');
  } else if (clean.workoutDays === 5) {
    score += 1;
    pushUnique(reasons, 'Workout frequency is building up');
    pushUnique(advice, 'Keep 1 lighter day in the week');
  }

  if (clean.sleepQuality <= 2) {
    score += 2;
    pushUnique(reasons, 'Sleep is low');
    pushUnique(advice, 'Replace 1 HIIT session with recovery work');
  } else if (clean.sleepQuality === 3) {
    score += 1;
    pushUnique(reasons, 'Sleep is only moderate');
    pushUnique(advice, 'Try to improve sleep before your next hard session');
  }

  if (clean.stressLevel >= 4) {
    score += 2;
    pushUnique(reasons, 'Stress is high');
    pushUnique(advice, 'Lower session intensity by 20%');
  } else if (clean.stressLevel === 3) {
    score += 1;
    pushUnique(reasons, 'Stress is building up');
    pushUnique(advice, 'Keep one lower-pressure training day');
  }

  if (clean.soreness >= 4) {
    score += 2;
    pushUnique(reasons, 'Soreness is high');
    pushUnique(advice, 'Swap one hard session for mobility or stretching');
  } else if (clean.soreness === 3) {
    score += 1;
    pushUnique(reasons, 'Soreness is moderate');
    pushUnique(advice, 'Avoid back-to-back intense sessions');
  }

  if (clean.energy <= 2) {
    score += 2;
    pushUnique(reasons, 'Energy is low');
    pushUnique(advice, 'Choose shorter and lighter sessions this week');
  } else if (clean.energy === 3) {
    score += 1;
    pushUnique(reasons, 'Energy is only moderate');
    pushUnique(advice, 'Keep the next session light if fatigue stays the same');
  }

  let riskLevel = 'Low';
  let summary = 'Your current responses look relatively balanced.';

  if (score >= 7) {
    riskLevel = 'High';
    summary = 'Your check-in shows a high burnout risk. Recovery should be prioritised before another intense week.';
  } else if (score >= 4) {
    riskLevel = 'Medium';
    summary = 'Your check-in shows a medium burnout risk. A lighter and more balanced week is recommended.';
  }

  if (reasons.length === 0) {
    reasons.push('Your current responses look balanced');
  }

  //Making sure that the user always gets four actionable items similar to the lo-fi sketch
  if (riskLevel === 'High') {
    pushUnique(advice, 'Replace 1 HIIT session with recovery work');
    pushUnique(advice, 'Add 1 full rest day');
    pushUnique(advice, 'Lower session intensity by 20%');
    pushUnique(advice, 'Check again after 7 days');
  } else if (riskLevel === 'Medium') {
    pushUnique(advice, 'Keep 1 lighter day in the week');
    pushUnique(advice, 'Prioritise sleep and hydration');
    pushUnique(advice, 'Reduce one session if soreness stays high');
    pushUnique(advice, 'Check again after 7 days');
  } else {
    pushUnique(advice, 'Keep your training balanced');
    pushUnique(advice, 'Maintain 1 recovery-focused day each week');
    pushUnique(advice, 'Continue your current sleep and recovery routine');
    pushUnique(advice, 'Check again after 7 days');
  }

  const weeklyPlan = buildWeeklyPlan(clean.goal, riskLevel);

  return {
    score,
    riskLevel,
    summary,
    reasons: reasons.slice(0, 4),
    advice: advice.slice(0, 4),
    weeklyPlan
  };
}

//This will save the recovery result so that the users can review the previous check-ins
function insertRecoveryCheck(body, res) {
  const { errors, clean } = validateRecoveryInput(body);

  if (errors.length > 0) {
    sendJson(res, 400, { message: 'Validation failed.', errors });
    return;
  }

  const result = buildRecoveryResult(clean);
  const now = new Date().toLocaleString();

  db.run(
    `INSERT INTO recovery_checks (
      goal, workout_days, sleep_quality, stress_level, soreness, energy,
      risk_score, risk_level, reasons, advice, weekly_plan, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clean.goal,
      clean.workoutDays,
      clean.sleepQuality,
      clean.stressLevel,
      clean.soreness,
      clean.energy,
      result.score,
      result.riskLevel,
      JSON.stringify(result.reasons),
      JSON.stringify(result.advice),
      JSON.stringify(result.weeklyPlan),
      now
    ],
    function (err) {
      if (err) {
        sendJson(res, 500, { message: 'Could not save recovery check.' });
        return;
      }

      sendJson(res, 201, {
        message: 'Recovery check saved successfully.',
        id: this.lastID,
        result: {
          goal: clean.goal,
          workoutDays: clean.workoutDays,
          sleepQuality: clean.sleepQuality,
          stressLevel: clean.stressLevel,
          soreness: clean.soreness,
          energy: clean.energy,
          score: result.score,
          riskLevel: result.riskLevel,
          summary: result.summary,
          reasons: result.reasons,
          advice: result.advice,
          weeklyPlan: result.weeklyPlan,
          createdAt: now
        }
      });
    }
  );
}

//Returns the previous recovery results for the history panel
function listRecoveryChecks(res) {
  db.all(
    `SELECT *
     FROM recovery_checks
     ORDER BY id DESC
     LIMIT 6`,
    [],
    (err, rows) => {
      if (err) {
        sendJson(res, 500, { message: 'Could not load recovery history.' });
        return;
      }

      const parsedRows = rows.map((row) => ({
        ...row,
        reasons: JSON.parse(row.reasons || '[]'),
        advice: JSON.parse(row.advice || '[]'),
        weekly_plan: JSON.parse(row.weekly_plan || '{}')
      }));

      sendJson(res, 200, parsedRows);
    }
  );
}

//This is Server routing

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  try {
    //Existing enquiry routes
    if (pathname === '/api/enquiries' && req.method === 'GET') {
      listEnquiries(urlObj, res);
      return;
    }

    if (pathname === '/api/enquiries' && req.method === 'POST') {
      const body = await readJsonBody(req);
      insertEnquiry(body, res);
      return;
    }

    const reviewMatch = pathname.match(/^\/api\/enquiries\/(\d+)\/review$/);
    if (reviewMatch && req.method === 'PUT') {
      markReviewed(Number(reviewMatch[1]), res);
      return;
    }

    const deleteMatch = pathname.match(/^\/api\/enquiries\/(\d+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      deleteEnquiry(Number(deleteMatch[1]), res);
      return;
    }

    //New recovery assistant routes
    if (pathname === '/api/recovery-checks' && req.method === 'GET') {
      listRecoveryChecks(res);
      return;
    }

    if (pathname === '/api/recovery-checks' && req.method === 'POST') {
      const body = await readJsonBody(req);
      insertRecoveryCheck(body, res);
      return;
    }

    //Static files serving
    const filePath = path.join(
      publicDir,
      pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    );

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    serveFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { message: 'Server error.', error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`PulsePeak Fitness is running at http://localhost:${PORT}`);
});