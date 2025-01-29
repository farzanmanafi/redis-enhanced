import "dotenv/config";
import { Client, Schema } from "redis-om";
import { createClient } from "redis";
import { validateEnv } from "../src/utils/env.validator";
import { EntityData } from "../src/interfaces/entity.interface";

// Define an interface for bank account entity
interface BankAccount extends EntityData {
  accountNumber: string;
  balance: number;
  owner: string;
}

async function transactionExample() {
  // Validate environment configuration
  validateEnv();

  // Construct Redis connection URL
  const redisUrl = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Create native Redis client
  const client = createClient({ url: redisUrl });

  // Create Redis-OM client
  const redisOmClient = new Client();

  try {
    // Connect both clients
    await Promise.all([client.connect(), redisOmClient.open(redisUrl)]);

    // Flush the database to start with a clean slate
    await client.flushDb();

    // Create schema for bank account
    const accountSchema = new Schema<BankAccount>("account", {
      accountNumber: { type: "string" },
      balance: { type: "number" },
      owner: { type: "string" },
    });

    // Repository for bank accounts
    const repository = redisOmClient.fetchRepository(accountSchema);

    // Scenario: Creating bank accounts
    console.log("\n1. Creating Bank Accounts");

    // Save accounts using Redis-OM repository
    const aliceAccount = await repository.save({
      accountNumber: "ACC001",
      balance: 1000,
      owner: "Alice",
    });

    const bobAccount = await repository.save({
      accountNumber: "ACC002",
      balance: 500,
      owner: "Bob",
    });

    // Extract entity IDs
    const getEntityId = (account: any) => {
      const entityIdSymbol = Object.getOwnPropertySymbols(account).find(
        (sym) => sym.description === "entityId"
      );
      return entityIdSymbol ? account[entityIdSymbol] : null;
    };

    const aliceEntityId = getEntityId(aliceAccount);
    const bobEntityId = getEntityId(bobAccount);

    console.log("Alice's Account:", {
      ...aliceAccount,
      entityId: aliceEntityId,
    });
    console.log("Bob's Account:", {
      ...bobAccount,
      entityId: bobEntityId,
    });

    // Scenario: Money Transfer Transaction
    console.log("\n2. Money Transfer Transaction");

    try {
      // Start transaction
      const multi = client.multi();

      const transferAmount = 200;

      // Prepare transaction commands
      multi.set(
        `account:${aliceEntityId}:balance`,
        aliceAccount.balance - transferAmount
      );
      multi.set(
        `account:${bobEntityId}:balance`,
        bobAccount.balance + transferAmount
      );

      // Execute transaction
      const results = await multi.exec();
      console.log("Transfer Transaction Results:", results);

      // Fetch updated account balances
      const updatedAliceBalance = await client.get(
        `account:${aliceEntityId}:balance`
      );
      const updatedBobBalance = await client.get(
        `account:${bobEntityId}:balance`
      );

      console.log("Alice's Updated Balance:", updatedAliceBalance);
      console.log("Bob's Updated Balance:", updatedBobBalance);
    } catch (transferError) {
      console.error("Transfer Failed.", transferError);
    }

    // Scenario: Removing an Account
    console.log("\n3. Removing Bob's Account");

    if (bobEntityId) {
      await repository.remove(bobEntityId);

      console.log("Attempting to fetch removed account:");
      try {
        await repository.fetch(bobEntityId);
      } catch (error) {
        console.log("Account successfully removed (Not Found Error Expected)");
      }
    }
  } catch (error) {
    console.error("Error in Transaction Example:", error);
  } finally {
    try {
      // Disconnect clients
      await client.quit();
      await redisOmClient.close();
      console.log("\nDisconnected from Redis");
    } catch (disconnectError) {
      console.error("Disconnection Error:", disconnectError);
    }
  }
}

// Execute the transaction example
transactionExample().catch(console.error);
