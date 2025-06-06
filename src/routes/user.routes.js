import { Router } from "express";
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelprofile,
    getWatchHistory,
    getCurrentuser
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {name: 'avatar', maxCount: 1},
        {name: 'coverImage', maxCount: 1}
    ]),
    registerUser);

router.route("/login").post(loginUser);

router.route("/current-user").get(getCurrentuser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentUserPassword);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelprofile);
router.route("/watchHistory").get(verifyJWT, getWatchHistory);

export default router;