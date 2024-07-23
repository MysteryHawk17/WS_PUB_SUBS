import express, { json } from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { PubSubManager } from "./pubsub";

const app = express();
const port = 8080 || process.env.PORT;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });



const userSockets: Map<string, WebSocket> = new Map();


function generateRandomString(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);
  
  ws.on("message", function message(message: string, isBinary) {
    const data = JSON.parse(message) as {
      userId?: string;
      type: string;
      item: string;
    };

    switch (data.type) {
      case "login":
        const generateUserId = generateRandomString();
        userSockets.set(generateUserId, ws);
        ws.send(JSON.stringify({ message: `User logged in.`, userId: generateUserId }));
        break;

      case "subscribe":
        if (data.userId) {
          PubSubManager.getInstance().userSubscribe(data.item, data.userId);
        }
        break;

      case "unsubscribe":
        if (data.userId) {
          PubSubManager.getInstance().userUnSubscribe(data.item, data.userId);
        }
        break;
    }
  });
  ws.send("Hello! Message From Server!!");
});




app.get("/", (req, res) => {

  res.status(200).json({ message: "SERVER STATUS GOOD" });
});


server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { userSockets };
