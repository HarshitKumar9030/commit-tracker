import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { MongoClient } from "mongodb";
const client = new MongoClient("mongodb://127.0.0.1:27017", {
  serverSelectionTimeoutMS: 1000,
});
try {
  await client.connect();
  console.log("MongoDB is already running on 127.0.0.1:27017.");
} catch {
  const path = resolve(".local/mongodb");
  mkdirSync(path, { recursive: true });
  const result = spawnSync(
    "mongod",
    [
      "--dbpath",
      path,
      "--bind_ip",
      "127.0.0.1",
      "--port",
      "27017",
      "--logpath",
      resolve(".local/mongodb.log"),
      "--fork",
    ],
    { stdio: "inherit" },
  );
  if (result.error) {
    console.error(
      "Install MongoDB Community Server (mongod) first. See README.md.",
    );
    process.exitCode = 1;
  } else process.exitCode = result.status || 0;
} finally {
  await client.close();
}
