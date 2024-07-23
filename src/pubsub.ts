import { createClient, RedisClientType } from "redis";
import { userSockets } from "./index";

export class PubSubManager {
  private static instance: PubSubManager;
  private redisClient: RedisClientType;
  private subscriptions: Map<string, string[]>;

  private constructor() {
    this.redisClient = createClient();
    this.redisClient.connect();
    this.subscriptions = new Map();
  }

  public static getInstance(): PubSubManager {
    if (!PubSubManager.instance) {
      PubSubManager.instance = new PubSubManager();
    }
    return PubSubManager.instance;
  }

  public userSubscribe(stock: string, userId?: string) {
    if (!this.subscriptions.has(stock)) {
      this.subscriptions.set(stock, []);
    }
    if (userId === undefined) return;
    if(this.subscriptions.get(stock)?.indexOf(userId)!=-1)return;
    this.subscriptions.get(stock)?.push(userId);

    if (this.subscriptions.get(stock)?.length === 1) {
      this.redisClient.subscribe(stock, (message) => {
        this.handleMessage(stock, message);
      });
      console.log(`Subscribed to Redis channel: ${stock}`);
    }
    if(userId==undefined)return;
    const userSocket=userSockets.get(userId);
    if(userSocket){
        userSocket.send(JSON.stringify({message:`Subscribed to ${stock}`}))
    }
  }

  public userUnSubscribe(stock: string, userId?: string) {
    this.subscriptions.set(
      stock,
      this.subscriptions.get(stock)?.filter((sub) => sub !== userId) || []
    );

    if (this.subscriptions.get(stock)?.length === 0) {
      this.redisClient.unsubscribe(stock);
      console.log(`Unsubscribed from Redis channel: ${stock}`);
    }
    if(userId==undefined)return;
    const userSocket=userSockets.get(userId);
    if(userSocket){
        userSocket.send(JSON.stringify({message:`Unsubscribed to ${stock}`}))
    }
  }

  private handleMessage(stock: string, message: string) {
    console.log(`Message received on channel ${stock}: ${message}`);
    this.subscriptions.get(stock)?.forEach((userId) => {
      const userSocket = userSockets.get(userId);
      if (userSocket) {
        userSocket.send(JSON.stringify({ stock, message }));
        console.log(`Sending message to user: ${userId}`);
      }
    });
  }

  public async disconnect() {
    await this.redisClient.quit();
  }
}
