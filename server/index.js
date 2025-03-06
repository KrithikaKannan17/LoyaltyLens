import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup SQLite database
const dbPath = 'churn.db';
const db = new sqlite3.Database(dbPath);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER,
      credit_score INTEGER,
      balance REAL,
      num_products INTEGER,
      has_insurance BOOLEAN,
      tenure INTEGER,
      is_active BOOLEAN,
      last_transaction DATE,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Prediction algorithm
const predictChurn = (customer) => {
  let riskScore = 0;
  
  // Age factor
  if (customer.age > 60) riskScore += 0.2;
  else if (customer.age < 30) riskScore += 0.1;
  
  // Credit score factor
  if (customer.credit_score < 650) riskScore += 0.3;
  else if (customer.credit_score < 750) riskScore += 0.1;
  
  // Balance factor
  if (customer.balance < 1000) riskScore += 0.2;
  
  // Product usage factor
  if (customer.num_products === 1) riskScore += 0.2;
  else if (customer.num_products > 3) riskScore -= 0.1;
  
  // Insurance factor
  if (!customer.has_insurance) riskScore += 0.1;
  
  // Tenure factor
  if (customer.tenure < 2) riskScore += 0.3;
  else if (customer.tenure > 5) riskScore -= 0.2;
  
  // Activity factor
  if (!customer.is_active) riskScore += 0.4;
  
  // Normalize score between 0 and 1
  return Math.min(Math.max(riskScore, 0), 1);
};

// Auth routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer routes
app.post('/api/customers', authenticateToken, async (req, res) => {
  const customer = req.body;
  
  try {
    await dbRun(
      `INSERT INTO customers (
        id, name, age, credit_score, balance, num_products,
        has_insurance, tenure, is_active, last_transaction, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        customer.age,
        customer.creditScore,
        customer.balance,
        customer.numProducts,
        customer.hasInsurance,
        customer.tenure,
        customer.isActive,
        customer.lastTransaction,
        customer.location
      ]
    );
    
    const churnProbability = predictChurn(customer);
    res.status(201).json({ ...customer, churnProbability });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await dbAll('SELECT * FROM customers');
    const customersWithPredictions = customers.map(customer => ({
      ...customer,
      churnProbability: predictChurn(customer)
    }));
    
    res.json(customersWithPredictions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const churnProbability = predictChurn(customer);
    res.json({ ...customer, churnProbability });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});