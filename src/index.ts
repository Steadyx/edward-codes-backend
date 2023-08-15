import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const apiRouter = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

apiRouter.post("/send-email", async (req, res) => {
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
    html: `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            box-shadow: 0px 3px 10px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #2f1050;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 24px;
            border-radius: 5px 5px 0 0;
        }

        .content {
            padding: 20px;
            color: #333;
            line-height: 1.5;
        }

        .footer {
            background-color: #2f1050;
            color: #ffffff;
            text-align: center;
            padding: 10px;
            font-size: 14px;
            border-radius: 0 0 5px 5px;
        }

        .details {
            border: 1px solid #e0e0e0;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }

        .details p {
            margin: 5px 0;
        }

        @media only screen and (max-width: 600px) {
            .email-container {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            New Message from Your Website
        </div>
        <div class="content">
            <p>Recieved a new message from ${name}.</p>
            <p>You've received a new message from your website's contact form:</p>
            
            <div class="details">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            </div>

            <p>Make sure to respond as soon as possible.</p>
        </div>
        <div class="footer">
            This is an automated email. Please do not reply directly.
        </div>
    </div>
</body>
</html>
    `,
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
    console.error("Error sending email:", error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.use("/api", apiRouter);

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
