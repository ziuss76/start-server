import express from "express";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import cron from "node-cron";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

const app = express();
const port = 8080;

let db;
let collection;

MongoClient.connect(process.env.MONGODB_URI)
  .then((client) => {
    db = client.db("StartSmall");
    collection = db.collection("subscriptions");
  })
  .catch((err) => {
    console.error(err);
  });

app.get("/", (req, res) => {
  res.send("이 곳은 StartSmall 알림 서버입니다.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

cron.schedule("* * * * *", async () => {
  if (!collection) {
    console.log("Database not initialized");
    return;
  }

  const users = await collection.find({}).toArray();

  users.forEach(async (user) => {
    const currentTime = dayjs().tz().startOf("minute");
    const [userHour, userMinute] = user.alarmTime.split(":");
    const userNotificationTime = dayjs().tz().hour(userHour).minute(userMinute).startOf("minute");

    if (currentTime.isSame(userNotificationTime)) {
      const { _id, userEmail, alarmTime, ...subscription } = user;

      await fetch("https://start-small-ziuss.vercel.app/api/sendNotification", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  });
});
