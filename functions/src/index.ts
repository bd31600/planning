// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as mysql from "mysql2/promise";
import * as admin from "firebase-admin";

admin.initializeApp();

const dbConfig = {
  host: process.env.MYSQL_HOST!,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
};

export const api = onRequest(
  { invoker: "public" },
  async (req, res) => {
    // 1) CORS preflight
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      // Répondre au preflight et arrêter le handler
      res.status(204).send("");
      return;
    }

    try {
      // 2) Vérification du token Firebase (si tu as retiré public en prod)
      const authHeader = req.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.status(401).send({ error: "Token manquant ou mal formé" });
        return;
      }
      const idToken = authHeader.split("Bearer ")[1];
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch {
        res.status(401).send({ error: "Token invalide ou expiré" });
        return;
      }

      // 3) Connexion MySQL + CRUD
      const connection = await mysql.createConnection(dbConfig);
      const { action, id, name, email } = req.body as {
        action: string;
        id?: number;
        name?: string;
        email?: string;
      };

      if (action === "list") {
        const [rows] = await connection.query("SELECT id, name, email FROM users");
        await connection.end();
        res.send({ success: true, users: rows });
        return;
      }

      if (action === "insert") {
        const [result] = await connection.execute(
          "INSERT INTO users (name, email) VALUES (?, ?)",
          [name, email]
        );
        await connection.end();
        res.send({ success: true, insertedId: (result as any).insertId });
        return;
      }

      if (action === "update") {
        await connection.execute(
          "UPDATE users SET name = ? , email = ? WHERE id = ?",
          [name, email, id]
        );
        await connection.end();
        res.send({ success: true });
        return;
      }

      if (action === "delete") {
        await connection.execute("DELETE FROM users WHERE id = ?", [id]);
        await connection.end();
        res.send({ success: true });
        return;
      }

      // Action non reconnue
      await connection.end();
      res.status(400).send({ success: false, message: "Action invalide" });
      return;

    } catch (err: any) {
      logger.error("Erreur dans la fonction API :", err);
      res.status(500).send({ success: false, error: err.message });
      return;
    }
  }
);
