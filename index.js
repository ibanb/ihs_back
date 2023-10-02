import express from 'express';
import mongoose from 'mongoose';
import fileUpload from 'express-fileupload';
import config from 'config';
import {router as authRouter} from './routes/auth.routes.js';
import fileRouter from './routes/file.routes.js';
import { cors } from './middleware/cors.middleware.js';

// create server
const app = express();

// enable opportunity file upload process
app.use(fileUpload({}))

// подключаем статику
app.use(express.static('static'))
// Выключаем политику CORS
app.use(cors)
// Чтобы экспресс мог парсить json
app.use(express.json());
// создаем маршруты для запросов (REST API)
app.use("/api/auth", authRouter);
app.use("/api/files", fileRouter);

// get port number from config
const PORT = config.get('serverPort');

// start server function
const start = async () => {

    try {

        // connect to mongoDB with client mongoose
        await mongoose.connect('mongodb://localhost:27017');
    
        // set listen PORT
        app.listen(PORT, () => {
            console.log('server was started on ', PORT)
        })

    } catch(e) {

        console.log(e);
    }
    

        
}

// start server to LISTEN request
start();