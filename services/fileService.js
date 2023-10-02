import fs from 'fs';
import File from '../models/File.js';
import path from 'path';
import { fileURLToPath } from 'url';
import config from 'config'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileService {

    createDir(file) {

        console.log(`file.user - ${file.user}`)
        const filePath = `${config.get('filePath')}/${file.user}/${file.path}`
        return new Promise(((resolve, reject) => {
            try {
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath)
                    return resolve({message: 'File was created'})
                } else {
                    return reject({message: "File already exist"})
                }
            } catch (e) {
                console.log(filePath);
                return reject({message: 'File error'})
            }
        }))
    }

    getPath(file) {
        return config.get('filePath') + '/' + file.user + '/' + file.path
    }

    deleteFile(file) {
        const path = this.getPath(file)
        if(file.type === 'dir') {
            fs.rmdirSync(path)
        } else {
            fs.unlinkSync(path)
        }
    }

}





export default new FileService;