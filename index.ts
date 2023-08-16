import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import AWS from "aws-sdk";
import emailTemplate from "./src/template/emailTemplate";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const apiRouter = express.Router();



AWS.config.update({ region: "eu-west-2" });

const ssm = new AWS.SSM();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

const corsOptions = {
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

type Config = {
  emailUser: string;
  emailPassword: string;
};

const fetchConfigFromSSM = async (parameterName: string) => {
  const params = {
    Name: parameterName,
    WithDecryption: true,
  };

  try {
    const data = await ssm.getParameter(params).promise();
    if (data.Parameter) {
      return data.Parameter.Value;
    }
    throw new Error("No parameter found");
  } catch (error) {
    console.error(`Error fetching ${parameterName} from SSM:`, error);
    throw error;
  }
};

const fetchAllConfigurations = async (): Promise<Config> => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    return {
      emailUser: process.env.EMAIL_USER || "",
      emailPassword: process.env.EMAIL_PASS || "",
    };
  } else if (process.env.NODE_ENV === "production") {
    const emailUser = await fetchConfigFromSSM("emailUser");
    const emailPassword = await fetchConfigFromSSM("emailPass");

    if (!emailUser || !emailPassword) {
      throw new Error("Failed to fetch all configurations from SSM");
    }

    return {
      emailUser,
      emailPassword,
    };
  } else {
    throw new Error(`Unknown NODE_ENV value: ${process.env.NODE_ENV}`);
  }
};

const sendEmail = (config: Config) => async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
  });

  const mailOptions = {
    from: email,
    to: config.emailUser,
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
    console.error("Error sending email:", error);
    res.status(500).send({ error: "Something went wrong" });
  }
};

fetchAllConfigurations().then((config) => {
  apiRouter.post(
    "/send-email",
    [
      body("name").isString().notEmpty(),
      body("email").isEmail(),
      body("message").isString().notEmpty(),
    ],

    sendEmail(config),
  );

  app.use("/api", apiRouter);

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
