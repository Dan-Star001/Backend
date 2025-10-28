import userModel from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Notification from '../models/notification.model.js';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const postSignup = (req, res) => {
    let salt = bcrypt.genSaltSync(10);
    let hashedPassword = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hashedPassword;


    let newUser = new userModel(req.body);
    
    newUser.save()
        .then(() => {
            newUser.password = hashedPassword;

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: [req.body.email, 'davidsome2004@gmail.com', 'adedayodaniel1711@gmail.com', 'adedayoadeboye0107@gmail.com' ],
                subject: 'Welcome to Communio',
                html: `
                        <div style="background-color: #f4f4f4; padding: 0 0 10px; border-radius: 30px 30px 0 0  ;">
                            <div style="padding-top: 20px; height: 100px; border-radius: 30px 30px 0 0 ; background: linear-gradient(-45deg, #f89b29 0%, #ff0f7b 100% );">
                                <h1 style="color:white; text-align: center;">Welcome to Communio</h1>
                            </div>
                            <div style="padding: 30px 0; text-align: center;">
                                <p style="font-size: 18px;"><span style="font-weight: 600;">Congratulations!</span> Your sign-up was successful!</p>
                                <p>Thank you for registering. We are excited to have you on board.</p>
                                <div style="padding: 20px 0;">
                                    <hr style="width: 50%;">
                                    <p style="margin-bottom: 10px;">Best Regards</p>
                                    <p style="color: #f89b29; margin-top: 0;">Communio</p>
                                </div>
                            </div>
                        </div>
                `
            };

            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                } else {
                }
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully'
            });
        })
        .catch((err) => {
            console.error("Error registering user:", err);
            
            if (err.code === 11000) {
                if (err.keyPattern.userName) {
                    return res.status(400).json({
                        success: false,
                        message: '❌ Username already taken!'
                    });
                }
                if (err.keyPattern.email) {
                    return res.status(400).json({
                        success: false,
                        message: '❌ Email already taken!'
                    });
                }
            }
        });
};

// ✅ FIXED LOGIN - Returns consistent user object
const postSignin = (req, res) => {
    const { userName, password } = req.body;

    userModel.findOne({ userName })
        .then((foundUser) => {
            if (!foundUser) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Username or password"
                });
            } 

            const isMatch = bcrypt.compareSync(password, foundUser.password);

            if(!isMatch) {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid email or password"
                });
            }


            // ✅ CREATE TOKEN WITH userId
            const token = jwt.sign(
                { userId: foundUser._id }, 
                JWT_SECRET, 
                { expiresIn: '7d' }
            );


            // ✅ RETURN CONSISTENT USER OBJECT
            return res.json({
                success: true,
                status: true,
                message: "Login Successful",
                token: token,  // ✅ Return token at top level
                user: {
                    _id: foundUser._id.toString(),  // ✅ Convert to string
                    id: foundUser._id.toString(),   // ✅ Add id field for compatibility
                    userName: foundUser.userName,
                    email: foundUser.email,
                    fullName: foundUser.fullName,
                    avatar: foundUser.avatar || '/default-avatar.png',
                    bio: foundUser.bio || '',
                    token: token  // ✅ Also include in user object
                }
            });
        })
        .catch((err) => {
            console.error("Error during signin:", err);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        });
};

const getHomepage = (req, res) => {
    let token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ status: false, message: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, result) => {
        if (err) {
            res.send({status:false, message:"Token is expired or invalid"})
        } else {
            let userId = result.userId;  // ✅ Use userId from token
            userModel.findById(userId)
                .then((foundUser) => {
                    res.send({
                        status: true, 
                        message: "token is valid", 
                        foundUser
                    });
                })
                .catch(err => {
                    res.status(500).json({
                        status: false,
                        message: "Error finding user"
                    });
                });
        }
    });
};

const getSuggestedUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const currentUser = await userModel.findById(currentUserId).select('following');

        const excludeIds = [
            currentUserId,
            ...currentUser.following
        ];

        const suggested = await userModel.find({
            _id: { $nin: excludeIds }
        }).select('userName fullName avatar _id')
          .limit(10);

        const suggestedWithFlag = suggested.map(user => ({
            ...user.toObject(),
            isFollowing: false
        }));

        res.json({
            success: true,
            suggested: suggestedWithFlag
        });
    } catch (error) {
        console.error('💥 [USER] Suggested error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query required' });
        }

        const users = await userModel.find({
            $or: [
                { userName: { $regex: q, $options: 'i' } },
                { fullName: { $regex: q, $options: 'i' } }
            ]
        }).select('userName fullName avatar _id')
          .limit(10);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('💥 [USER] Search error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const followUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;

        if (id === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
        }

        const userToFollow = await userModel.findById(id);
        const currentUser = await userModel.findById(currentUserId);

        if (!userToFollow) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (currentUser.following.includes(id)) {
            return res.status(400).json({ success: false, message: 'Already following this user' });
        }

        currentUser.following.push(id);
        userToFollow.followers.push(currentUserId);

        await currentUser.save();
        await userToFollow.save();

        const notification = new Notification({
            recipient: id,
            sender: currentUserId,
            type: 'follow',
            message: `${currentUser.userName} started following you`
        });
        await notification.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`notifications_${id}`).emit('new_notification', {
                notification: await notification.populate('sender', 'userName fullName avatar')
            });
        }

        res.json({ success: true, message: 'User followed successfully' });
    } catch (error) {
        console.error('💥 [USER] Follow error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const unfollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;

        const userToUnfollow = await userModel.findById(id);
        const currentUser = await userModel.findById(currentUserId);

        if (!userToUnfollow) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        currentUser.following = currentUser.following.filter(followId => followId.toString() !== id);
        userToUnfollow.followers = userToUnfollow.followers.filter(followerId => followerId.toString() !== currentUserId.toString());

        await currentUser.save();
        await userToUnfollow.save();

        res.json({ success: true, message: 'User unfollowed successfully' });
    } catch (error) {
        console.error('💥 [USER] Unfollow error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;

        const user = await userModel.findById(id)
            .select('userName fullName email avatar bio followers following')
            .populate('followers', 'userName fullName avatar')
            .populate('following', 'userName fullName avatar');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isFollowing = user.followers.some(follower => follower._id.toString() === currentUserId.toString());

        res.json({
            success: true,
            user: {
                ...user.toObject(),
                isFollowing
            }
        });
    } catch (error) {
        console.error('💥 [USER] Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { fullName, bio, website, avatar, gender, showSuggestions } = req.body;

        const updatedUser = await userModel.findByIdAndUpdate(
            currentUserId,
            {
                $set: {
                    fullName: fullName,
                    bio: bio,
                    website: website,
                    avatar: avatar,
                    gender: gender,
                    showSuggestions: showSuggestions
                }
            },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('💥 [USER] Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export { 
    postSignup, 
    postSignin, 
    getHomepage, 
    getSuggestedUsers, 
    searchUsers, 
    followUser, 
    unfollowUser, 
    getUserById,
    updateUserProfile
};