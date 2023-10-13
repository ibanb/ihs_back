import { Router } from "express";
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import {check, validationResult} from 'express-validator';
import jsonwebtoken from 'jsonwebtoken';
import config from 'config';
import authMiddleware from "../middleware/auth.middleware.js";
import fileService from "../services/fileService.js";
import File from '../models/File.js';

// Create instance router
const router = new Router();

// REST API

// registration
router.post('/registration', 
    [
        check('email', 'Is incorrect email').isEmail(),
        check('password', 'Password must be longer than 3 and shorter then 12').isLength({min: 3, max: 12}),
    ], 
    async (req, res) => {

        try {

            console.log(req.body);
            // validation email & pass with check
            const errors = validationResult(req);

            // check result
            if (!errors.isEmpty()) {
                return res.status(400).json({message: 'Uncorrect request', errors})
            }
            
            // extract authdata
            const {email, password} = req.body;

            // req to DB
            const condidate = await User.findOne({email});

            if (condidate) {
                return res.status(400).json({message: `User with email ${email} already exist`});
            }

            // crypt pass and get hash
            const hashPassword = await bcrypt.hash(password, 8);
            const user = new User({email, password: hashPassword});

            // save user to db
            await user.save();
            await fileService.createDir(new File({user: user.id, name: ''}))

            // responce positive
            return res.json({message: 'User was created'});


        } catch(e) {
            console.log(e);
            res.send({message: 'Server ERROR!'});
        }

    })


// LOGIN
router.post('/login', 
 
    async (req, res) => {

        try {

            const {email, password} = req.body;
            const user = await User.findOne({email});

            // check user exist
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }

            // hash validation
            const isPassValid = bcrypt.compareSync(password, user.password);

            if (!isPassValid) {
                return res.status(404).json({message: "Invalid password"});
            }

            // create token by secret key
            const token = jsonwebtoken.sign({id: user.id}, config.get('secretKEY'), {expiresIn: '10h'});
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    diskspace: user.diskSpace,
                    userSpace: user.userSpace,
                    avatar: user.avatar,
                }
            })


        } catch(e) {
            console.log(e);
            res.send({message: 'Server ERROR!'});
        }

    }
)

router.get('/auth', authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findOne({_id: req.user.id})
            const token = jsonwebtoken.sign({id: user.id}, config.get("secretKEY"), {expiresIn: "1h"})
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({message: "Server error"})
        }
    })

// export all router from REST API    
export {router};

