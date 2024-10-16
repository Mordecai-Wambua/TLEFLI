// Creates connection and configures Database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to Database successfully :)');
      console.log('Connected to database:', this.connection.connection.name);
    } catch (error) {
      console.error('Error connecting to Database :( :', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('Disconnected to Database successfully');
      }
    } catch (error) {
      console.error('Error disconnecting from Database:', error.message);
    }
  }
}

const database = new Database();
export default database;
