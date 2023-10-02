import { Schema, model, ObjectId } from "mongoose";

// Создается схема ФАЙЛ для БД
const File = new Schema({
    name: {type: String, required: true},
    type: {type: String, required: true},
    accessLink: {type: String},
    size: {type: Number, default: 0},
    path: {type: String, default: ''},
    date: {type: Date, default: Date.now()},
    user: {type: ObjectId, ref: 'User'},
    parent: {type: ObjectId, ref: 'File'},
    childs: [{type: ObjectId, ref: 'File'}]
})

// Происходит запрос на создание МОДЕЛИ ФАЙЛА в БД
const newModel = model('File', File);
export default newModel;