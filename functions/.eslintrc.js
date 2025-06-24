/* eslint-disable */

import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: true }));

app.get("/hello", (req, res) => {
  res.send("Hello from Firebase!");
});

export const api = functions.region("europe-west1").https.onRequest(app);
