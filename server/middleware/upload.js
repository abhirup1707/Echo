const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        const roomCode = req.params.roomCode;

        if (!roomCode) {

            return cb(new Error("Room code missing"));

        }

        const uploadPath = path.join(

            __dirname,

            "..",

            "uploads",

            roomCode

        );

        // Create room folder if it doesn't exist
        fs.mkdirSync(uploadPath, {

            recursive: true

        });

        cb(null, uploadPath);

    },

filename: (req, file, cb) => {

    const timestamp = Date.now();

    const originalName = path.parse(file.originalname).name;

    const extension = path.extname(file.originalname);

    const safeName = originalName.replace(/[^a-zA-Z0-9-_]/g, "_");

    cb(

        null,

        `${safeName}-${timestamp}${extension}`

    );

}

});

const upload = multer({

    storage,

    limits: {

        fileSize: 5 * 1024 * 1024 * 1024 // 5 GB

    },

    fileFilter: (req, file, cb) => {

        if (

            file.mimetype.startsWith("video/")

        ) {

            cb(null, true);

        }

        else {

            cb(

                new Error("Only video files allowed.")

            );

        }

    }

});

module.exports = upload;