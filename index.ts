import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";

import emailTemplate from "./src/template/emailTemplate";

dotenv.config();

const app = express();
const apiRouter = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set various security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Restrictive CORS settings
const corsOptions = {
  origin: 'https://edward-codes.tez',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

apiRouter.post("/send-email", 
  [
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('message').isString().notEmpty()
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: email,
      to: process.env.DESTINATION_EMAIL,
      subject: `Message from ${name}`,
      html: emailTemplate.html(name, email, message),
      headers: {
        Priority: "high",
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "High",
      },
    };

    try {
  await transporter.sendMail(mailOptions);
  res.status(200).send({ success: true });
} catch (error) {
  if (error instanceof Error) {
    console.error("Error sending email:", error.message);
  } else {
    console.error("Error sending email:", error);
  }
  res.status(500).send({ error: "Something went wrong" });
}

});

app.use("/api", apiRouter);

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
