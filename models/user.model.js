const mongoose = require('mongoose')


let userSchema = mongoose.Schema({
    userName: {type: String, required: true, unique: [true,"Username has been taken, please choose another one"]},
    fullName: {type: String, required: true},
    email: {type: String, required: true, unique: [true,"Email has been taken, please choose another one"]},
    password: {type: String, required: true},
    avatar: {type: String, default: '/default-avatar.png'},
    bio: {type: String, default: ''},
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
    following: [{type: mongoose.Schema.Types.ObjectId, ref: 'user'}]
});

module.exports = mongoose.model('user', userSchema)