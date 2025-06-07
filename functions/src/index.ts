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

export const api = onRequest(async (req, res) => {
  try {
    // 1) Vérifier le token Firebase
    const authHeader = req.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).send({ error: "Token manquant ou mal formé" });
      return;
    }
    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      logger.warn("Token invalide ou expiré :", err);
      res.status(401).send({ error: "Token invalide ou expiré" });
      return;
    }
    const uid = decodedToken.uid;
    logger.info(`Requête autorisée pour UID = ${uid}`);

    // 2) Connexion à MySQL et exécution de la requête
    const connection = await mysql.createConnection(dbConfig);
    const { action, id, name, email } = req.body;

    if (action === "insert") {
      const [result] = await connection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        [name, email]
      );
      await connection.end();
      res.send({ success: true, insertedId: (result as any).insertId });
      return;

    } else if (action === "update") {
      await connection.execute("UPDATE users SET name = ? WHERE id = ?", [name, id]);
      await connection.end();
      res.send({ success: true });
      return;

    } else if (action === "delete") {
      await connection.execute("DELETE FROM users WHERE id = ?", [id]);
      await connection.end();
      res.send({ success: true });
      return;

    } else {
      await connection.end();
      res.status(400).send({ success: false, message: "Action invalide" });
      return;
    }

  } catch (err: any) {
    logger.error("Erreur dans la fonction API :", err);
    res.status(500).send({ success: false, error: err.message });
    return;
  }
});
