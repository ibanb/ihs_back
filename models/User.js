import { Schema, model, ObjectId } from "mongoose";


// Создается схема ПОЛЬЗОВАТЕЛЬ для БД
const User = new Schema({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    diskSpace: {type: Number, default: 1024**3*10},
    password: {type: String, default: 0},
    avatar: {type: String},
    files: [{type: ObjectId, ref: 'File'}]
})

// Происходит запрос на создание МОДЕЛИ ПОЛЬЗОВАТЕЛЯ в БД
const newModel = model('User', User);
export default newModel;