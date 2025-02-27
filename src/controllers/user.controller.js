import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

    //generate access and refresh token
    const generateAccessAndRefreshToken = async (userId) => {
        try {
            const user = await User.findById(userId)
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()
            
            user.refreshToken = refreshToken;
            await user.save({validateBeforeSave: false})

            return {accessToken,refreshToken}
        } 
        catch (error) {
            throw new ApiError(500, "Something went wrong while generating access and refresh token");
        }
    }

const registerUser = asyncHandler(async (req, res) => {
    //get the user details from front end
    //validation
    //check if user already exists: username,email
    //hash the password
    //check for image upload
    //upload image to cloudinary
    //create  user object - create entry in database
    //remove password and refresh token field from response
    //check for user verification
    //send response

    const {fullName, email, username, password} = req.body;
    // console.log("name: ", fullName);
    // console.log("email: ", email);
    // console.log("username: ", username);
    // console.log("password: ", password);

    //validation
    if(
        [fullName, email, username, password].some((field) =>field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists: username,email
    const existedUser = await User.findOne({
        $or: [{ username: username }, { email: email }]
    });

    //if exist throw error
    if(existedUser){
        throw new ApiError(400, "User with email or username already exists");
    }
    // console.log(req.files);

    //check for avatar and coverImage upload
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError(500, "Error in uploading avatar");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //create user object after all validation
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url ||"",
        email,
        password,
        username: username.toLowerCase()
    });

    //if user is created successfully
    //remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error in creating user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    //req body -> data
    //user input through user name or email
    //check if user name and email exists
    //if not exist throw error
    //if exist then check for password validation
    //if password is not valid throw error
    //after pasword verification, generate access and refresh token
    //send cookies with access and refresh token
    //message successfully login
    //give access to user profile/dashboard
    //send response

    const {username, email, password} = req.body
    console.log("email: ", email);

    if((!username && !email)){ //alternate condn !(username || email)
        throw new ApiError(400, "Username or email is required");
    }

    //check if user name and email exists
    const user = await User.findOne({
        $or: [{ username: username }, { email: email }]
    })

    if(!user){
        throw new ApiError(404, "User not found");
    }

    //password validation
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //send cookies with access and refresh token
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: "undefined"
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
        
            if(!user){
                throw new ApiError(401, "Invalid Refresh Token")
            }
        
            if(incomingRefreshToken !== user?.refreshToken){
                throw new ApiError(401, "Referesh Token is invalid or expired")
            }
        
            const options = {
                httpOnly: true,
                secure: true,
            }
        
            const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        newRefreshToken
                    },
                    "Access Token Refreshed Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    ) 
})

const getCurrentuser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "Current User fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, username} = req.body

    if(!fullName || !email || !username){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
                username
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Account details updated successfully"
        )
    )
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError(500, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar updated successfully"
        )
    )
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is Missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage){
        throw new ApiError(500, "Error while uploading Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover Image updated successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentuser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};