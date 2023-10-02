import express from 'express';
import mongoose from 'mongoose';
import fileUpload from 'express-fileupload';
import config from 'config';
import {router as authRouter} from './routes/auth.routes.js';
import fileRouter from './routes/file.routes.js';
import { cors } from './middleware/cors.middleware.js';
// implements nodejs wrappers for HTMLCanvasElement, HTMLImageElement, ImageData
import * as nodeCanvas from 'canvas';
// import '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import fs from 'fs';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement
const { Canvas, Image, ImageData, loadImage } = nodeCanvas;
const canvas = new Canvas();
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

// Fake DB
const db = [];


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
        console.log('-- mongoose connect --');

        // ЗАГРУЗКА МОДЕЛЕЙ распознавания и определения
        await faceapi.nets.faceRecognitionNet.loadFromDisk('./mdls')
        await faceapi.nets.faceLandmark68Net.loadFromDisk('./mdls')
        await faceapi.nets.ssdMobilenetv1.loadFromDisk('./mdls')
        console.log('MODELS UPLOAD')

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