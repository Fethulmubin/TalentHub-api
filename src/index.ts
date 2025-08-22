import express from 'express'
import cors from 'cors'
import userRoute from './routes/userRoute'
import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
export { prisma };


const app = express()
const PORT = process.env.PORT || 3500

app.use(cors())
app.use(express.json())
 //routes

app.use('/users', userRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}
)
