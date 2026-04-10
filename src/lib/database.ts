// Simple in-memory database for demo purposes
// In production, this would be replaced with a real database like MongoDB, PostgreSQL, etc.

interface User {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  password: string; // In production, this would be hashed
  role: string;
  createdAt: string;
}

interface Database {
  users: User[];
  sessions: { [key: string]: User };
}

// Initialize database with admin user
const database: Database = {
  users: [
    {
      id: '1',
      userId: '6878e1ae0fb58374501b677e',
      email: 'admin@legal.com',
      fullName: 'Admin User',
      password: 'admin123', // In production, this would be hashed
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ],
  sessions: {}
};

// Database operations
export const db = {
  // User operations
  findUserByEmail: (email: string): User | undefined => {
    console.log('Searching for user with email:', email);
    const user = database.users.find(user => user.email.toLowerCase() === email.toLowerCase());
    console.log('Found user:', user ? user.email : 'Not found');
    return user;
  },
  
  findUserById: (id: string): User | undefined => {
    return database.users.find(user => user.id === id);
  },
  
  createUser: (userData: Omit<User, 'id' | 'userId' | 'createdAt'>): User => {
    const newUser: User = {
      id: Date.now().toString(),
      userId: 'user-' + Date.now(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    database.users.push(newUser);
    console.log('User created successfully:', newUser);
    console.log('Total users in database:', database.users.length);
    return newUser;
  },
  
  getAllUsers: (): User[] => {
    return database.users;
  },
  
  // Session operations
  createSession: (token: string, user: User): void => {
    database.sessions[token] = user;
    console.log('Session created:', { token, user: user.email });
  },
  
  findSession: (token: string): User | undefined => {
    return database.sessions[token];
  },
  
  deleteSession: (token: string): void => {
    delete database.sessions[token];
    console.log('Session deleted:', token);
  },
  
  // Authentication
  authenticateUser: (email: string, password: string): User | null => {
    console.log('Authenticating user:', email);
    const user = db.findUserByEmail(email);
    console.log('User found for authentication:', user ? user.email : 'Not found');
    
    if (user) {
      console.log('Password match:', user.password === password ? 'Success' : 'Failed');
      if (user.password === password) {
        console.log('Authentication successful for:', user.email);
        return user;
      }
    }
    console.log('Authentication failed for:', email);
    return null;
  },
  
  // Debug
  getDatabase: (): Database => {
    return { ...database };
  },
  
  clearDatabase: (): void => {
    database.users = [
      {
        id: '1',
        userId: '6878e1ae0fb58374501b677e',
        email: 'admin@legal.com',
        fullName: 'Admin User',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    database.sessions = {};
    console.log('Database cleared');
  }
};

// Export database for debugging
export default database;
