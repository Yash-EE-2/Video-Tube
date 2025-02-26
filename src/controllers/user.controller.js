import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

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

export {registerUser};