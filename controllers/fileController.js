import fileService from "../services/fileService.js";
import User from "../models/User.js";
import File from '../models/File.js';
import Descriptor from '../models/Descriptor.js';
import path from 'path';
import config from 'config';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as faceapi from 'face-api.js';
import * as nodeCanvas from 'canvas';
import ImageDataURI from 'image-data-uri'
import jimp from 'jimp';
import { MongoClient, UnorderedBulkOperation } from "mongodb";

class FileController {

    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body
            const file = new File({name, type, parent, user: req.user.id})
            const parentFile = await File.findOne({_id: parent})
            if(!parentFile) {
                file.path = name
                await fileService.createDir(file)
            } else {
                file.path = `${parentFile.path}/${file.name}`
                // file.path = path.resolve(parentFile.path, file.name);
                await fileService.createDir(file)
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            await file.save()
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e)
        }
    }

    // СЛЕДУЮЩИЙ ШАГ = ПОЛУЧИТЬ МАССИВ ДЕСКРИПТОРОВ ИЗ БАЗЫ ДАННЫХ
    async getDescriptors(req, res) {
        
        try {

            console.log('we are in back')
            // const descriptors = Descriptor.
            const test = 'TEST DATA'
            return res.json(test)

        } catch(e) {
            console.log(e)
            return res.status(500).json({message: "Can not get DESCRIPTORS"})

        }
    }
    
    async getFiles(req, res) {
        try {

            const {sort} = req.query
            let files;

            switch (sort) {
                
                case 'name':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({name: 1})
                    break;
                case 'type':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({type: 1})
                    break;
                case 'date':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({date: 1})
                    break;
                default: 
                    files = await File.find({user: req.user.id, parent: req.query.parent})
                    break;
            }

            
            return res.json(files)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Can not get files"})
        }
    }

    async uploadSelfy(req, res) {

        // const image = fs.readFileSync('controllers/results/data.png')
        // const buffer = Buffer.from(image, "base64");
        // return res.json({buffer})

        // return res
        //     .set('Content-Type', 'image/png')
        //     .send(image);

       
       
        Promise.resolve(req)
            .then((req) => {
                console.log('1 step - Get URI');
                return req.body.image;
            })
            .then((uri) => {
                console.log('2 step - URI convert')
                
                const string = uri;
                const regex = /^data:.+\/(.+);base64,(.*)$/;

                const matches = string.match(regex);
                const ext = matches[1];
                const data = matches[2];
                const buffer = Buffer.from(data, 'base64');
                const path = 'controllers/results/data.' + ext
                fs.writeFileSync(path, buffer);
                return path
            })
            .then(async (path) => {
                console.log('3 step - load image')
                const image = await nodeCanvas.loadImage(path);
                return image;
            })
            .then(async (img) => {
                console.log('4 step - image detections')
                const targetDetections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                
                const labeledTarget = new faceapi.LabeledFaceDescriptors('Target selfy', [targetDetections.descriptor])
                const faceMatcher = new faceapi.FaceMatcher(labeledTarget, 0.6)
                return faceMatcher
            })
            .then(async (fm) => {
                console.log('I am in faceMatcher STEP - all rigth');
               

                const descriptors = await Descriptor.find({})
                const handleDesc = descriptors
                    .map(item => {
                        const path = item.path
                        const d = item.desc
                        return {path, descriptor: d}
                    })
                    .filter(item => {
                    return Object.entries(item.descriptor).length !== 0
                    })
                    .map(item => {
                        return {path: item.path, desc: Object.values(item.descriptor.descriptor) }
                    })

                


                return handleDesc.map(({path, desc}) => {
                    return {
                        path,
                        result: fm.findBestMatch(desc).toString().trim(),
                    }
                    })
                    .filter(el => el.result.split(' ')[0] !== 'unknown');
            })
            .then(finalRES => {
                console.log('FINAL step - SEND to FRONT')
                console.log('==============')
                console.log(finalRES)

                return res.json({message: finalRES})
            })
                
    
            

    }

    async uploadFile(req, res) {
        try {

            const file = req.files.file

            const parent = await File.findOne({user: req.user.id, _id: req.body.parent})
            const user = await User.findOne({_id: req.user.id})

            if(user.usedSpace + file.size > user.diskSpace) {
                return res.status(400).json({message: 'There no space in disk'})
            }

            user.usedSpace = user.usedSpace + file.size

            let path;

            if (parent) {

                path = `${config.get('filePath')}/${user._id}/${parent.path}/${file.name}`

            } else {
                path = `${config.get('filePath')}/${user._id}/${file.name}`
            }

            if (fs.existsSync(path)) {
                return res.status(400).json({message: 'File is already exist'})
            }

            file.mv(path);
            const type = file.name.split('.').pop()
            let filePath = file.name

            if (parent) {
                filePath = parent.path + '/' + file.name
            }

            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent?._id,
                user: user._id,

            })

            await dbFile.save();
            console.log("файл сохранен")
            await user.save();
            console.log("Информация о пользователе обновлена")

            

            // create descriptor

            if(type === 'jpg') {
                let image = await nodeCanvas.loadImage(`./${path}`);
                console.log(`image | ./${path} LOADED.`);
                const desc = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
                console.log(`image | ./${path} DETECTED.`);
                const descriptor = new Descriptor({path, desc});
                await descriptor.save();
            }
           
            
            
            
            // db.push({
            // path: `./store/${path}`,
            // desc: result,
            // });
            // console.log(`image | ./store/${path} add to DB.`);

            // const findedDesc = Descriptor.findOne()
            
            res.json(dbFile);
        } catch(e) {
            console.log(e)
            return res.status(500).json({message: "Upload error!"})
        }
    }

    async downloadFile(req, res) {
        try {

            // console.log('-----------')
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            // console.log(file)
            const path = fileService.getPath(file)
            // const path = config.get('filePath') + '/' + req.user.id + '/' + file.path;
            // console.log(path)
            if(fs.existsSync(path)) {
                return res.download(path, file.name)
            }

            return res.status(400).json({message: 'File is does not find....hummm....'})

        } catch(e) {

            console.log(e)
            res.status(500).json({message: 'Download error!'})
        }
    }

    

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            if (!file) {
                return res.status(400).json({message: 'file not found'})
            }

            console.log('i am here')

            fileService.deleteFile(file)
            await File.deleteOne(file)
            return res.json({message: 'File was deleted'})
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Dir is not empty1'})
        }
    }

    // ВАЖНО!!!!!! - СОРТИРОВКУ ПУСТЬ НА СЕБЯ ВОЗЬМЕТ БАЗА ДАННЫХ!!!!!!!1
    async searchFile(req, res) {

        try {

            const searchName = req.query.search
            let files = await File.find({user: req.user.id})
            files = files.filter(file => file.name.includes(searchName))
            return res.json(files)

        } catch(e) {
            console.log(e)
            return res.status(400).json({message: 'Serch error'})
        }
    }

    async uploadAvatar(req, res) {

        try {

            const file = req.files.file
            const user = await User.findById(req.user.id)
            console.log(user)
            const avatarName = uuidv4() + '.jpg'
            file.mv(config.get('staticPath') + '/' + avatarName)
            user.avatar = avatarName
            await user.save()
            return res.json(user)

        } catch(e) {
            console.log(e)
            
            return res.status(400).json({message: 'Avatar upload error'})
        }
    }

    async deleteAvatar(req, res) {

        try {

            
            const user = await User.findById(req.user.id)
            
            fs.unlinkSync(config.get('staticPath') + '/' + user.avatar)
            user.avatar = null
            await user.save()
            return res.json(user)

        } catch(e) {
            console.log(e)
            
            return res.status(400).json({message: 'Delete error'})
        }
    }

}

export default new FileController();
