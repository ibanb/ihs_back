import { Schema, model, ObjectId } from "mongoose";

// Создается схема Дескриптор для БД
const Descriptor = new Schema({

    path: {type: String, default: ''},
    desc: {type: Object, default: {}},
    
})

// Происходит запрос на создание МОДЕЛИ ФАЙЛА в БД
const newModel = model('Descriptor', Descriptor);
export default newModel;