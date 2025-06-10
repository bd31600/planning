// src/index.ts

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as mysql from "mysql2/promise";
import * as admin from "firebase-admin";
import type { RowDataPacket } from "mysql2";

admin.initializeApp();

const dbConfig = {
  host:     process.env.MYSQL_HOST!,
  user:     process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
};

type Body = {
  action:   "getRole" | "list" | "insert" | "update" | "delete";
  entity?:  string;
  payload?: Record<string, any>;
};

function sanitize(vals: any[]): any[] {
  return vals.map(v => v === undefined ? null : v);
}

export const api = onRequest({ invoker: "public" }, async (req, res): Promise<void> => {
  // CORS préflight
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // Authentification Firebase
  const idToken = req.get("Authorization")?.split("Bearer ")[1] || "";
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).send({ error: "Token invalide ou manquant" });
    return;
  }
  const email = decoded.email!;
  const conn  = await mysql.createConnection(dbConfig);

  try {
    const { action, entity, payload } = req.body as Body;

    // ─── getRole ─────────────────────────────────────────────────────────
    if (action === "getRole") {
      // admin
      const [admRows] = await conn.query<
        (RowDataPacket & { id_intervenant: number })[]
      >(
        "SELECT id_intervenant FROM intervenants WHERE mailreferent = ? AND referent = 1",
        [email]
      );
      if (admRows.length) {
        res.send({ success: true, role: "admin", id: admRows[0].id_intervenant });
        return;
      }
      // intervenant simple
      const [intRows] = await conn.query<
        (RowDataPacket & { id_intervenant: number })[]
      >(
        "SELECT id_intervenant FROM intervenants WHERE mailreferent = ?",
        [email]
      );
      if (intRows.length) {
        res.send({ success: true, role: "intervenant", id: intRows[0].id_intervenant });
        return;
      }
      // élève
      const [eleRows] = await conn.query<
        (RowDataPacket & { id_eleve: number })[]
      >(
        "SELECT id_eleve FROM eleves WHERE maileleve = ?",
        [email]
      );
      if (eleRows.length) {
        res.send({ success: true, role: "eleve", id: eleRows[0].id_eleve });
        return;
      }
      // sinon
      res.status(403).send({ error: "Accès refusé : non inscrit(e)." });
      return;
    }

    // ─── Autorisation élève ──────────────────────────────────────────────
    if (action !== "list") {
      const [checkEle] = await conn.query<
        (RowDataPacket & { n: number })[]
      >(
        "SELECT COUNT(*) AS n FROM eleves WHERE maileleve = ?",
        [email]
      );
      if (checkEle[0].n > 0) {
        res.status(403).send({ error: "Les élèves ne peuvent pas modifier." });
        return;
      }
    }

    if (!entity) {
      res.status(400).send({ error: "entity requis pour cette action." });
      return;
    }

    // ─── LIST ──────────────────────────────────────────────────────────────
    if (action === "list") {
      // liste élèves avec modules majeur/mineur
      if (entity === "eleves") {
        const sql = `
          SELECT
            e.*,
            et.id_module_majeur,
            m1.nommodule AS nommodule_majeur,
            et.id_module_mineur,
            m2.nommodule AS nommodule_mineur
          FROM eleves e
          LEFT JOIN etudier et ON et.id_eleve = e.id_eleve
          LEFT JOIN module_thematique m1 ON m1.id_module = et.id_module_majeur
          LEFT JOIN module_thematique m2 ON m2.id_module = et.id_module_mineur
        `;
        logger.info("SQL LIST ELEVES:", sql);
        const [rows] = await conn.query<RowDataPacket[]>(sql);
        res.send({ success: true, data: rows });
        return;
      }

      // liste intervenants avec modules
      if (entity === "intervenants") {
        const sql = `
          SELECT
            i.id_intervenant,
            i.nom,
            i.prenom,
            i.referent,
            i.mailreferent,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id_module', m.id_module,
                'nommodule', m.nommodule
              )
            ) AS modules
          FROM intervenants i
          LEFT JOIN intervenir iv ON iv.id_intervenant = i.id_intervenant
          LEFT JOIN module_thematique m ON m.id_module = iv.id_module
          GROUP BY i.id_intervenant
        `;
        logger.info("SQL LIST INTERVENANTS:", sql);
        const [rows] = await conn.query<RowDataPacket[]>(sql);

        // parser la colonne JSON en tableau JS
        const data = (rows as any[]).map(r => ({
          ...r,
          modules: r.modules ? JSON.parse(r.modules as string) : []
        }));

        res.send({ success: true, data });
        return;
      }

      // générique
      const sql = `SELECT * FROM \`${entity}\``;
      logger.info("SQL LIST:", sql);
      const [rows] = await conn.query<RowDataPacket[]>(sql);
      res.send({ success: true, data: rows });
      return;
    }

    // ─── UPSERT etudier ───────────────────────────────────────────────────
    if (action === "insert" && entity === "etudier" && payload) {
      const { id_eleve, id_module_majeur, id_module_mineur } = payload;
      const vals = sanitize([id_eleve, id_module_majeur, id_module_mineur]);
      const sql = `
        INSERT INTO \`etudier\` (id_eleve, id_module_majeur, id_module_mineur)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id_module_majeur = VALUES(id_module_majeur),
          id_module_mineur = VALUES(id_module_mineur)
      `;
      logger.info("SQL UPSERT ETUDIER:", sql, "VALS:", vals);
      await conn.execute(sql, vals);
      res.send({ success: true });
      return;
    }

    // ─── INSERT générique ────────────────────────────────────────────────
    if (action === "insert" && payload) {
      const cols  = Object.keys(payload).map(c => `\`${c}\``).join(",");
      const raw   = Object.values(payload);
      const vals  = sanitize(raw);
      const marks = vals.map(() => "?").join(",");
      const sql   = `INSERT INTO \`${entity}\` (${cols}) VALUES (${marks})`;
      logger.info("SQL INSERT:", sql, "VALS:", vals);
      const [r] = await conn.execute(sql, vals);
      res.send({ success: true, insertedId: (r as any).insertId });
      return;
    }

    // ─── UPDATE générique ────────────────────────────────────────────────
    if (action === "update" && payload) {
      const p     = { ...payload };
      const pkKey = Object.keys(p).find(k => k.startsWith("id_"))!;
      const idVal = p[pkKey];
      delete p[pkKey];
      const cols   = Object.keys(p);
      const raw    = [...cols.map(c => p[c]), idVal];
      const vals   = sanitize(raw);
      const setSQL = cols.map(c => `\`${c}\` = ?`).join(",");
      const sql    = `UPDATE \`${entity}\` SET ${setSQL} WHERE \`${pkKey}\` = ?`;
      logger.info("SQL UPDATE:", sql, "VALS:", vals);
      await conn.execute(sql, vals);
      res.send({ success: true });
      return;
    }

    // ─── DELETE générique ────────────────────────────────────────────────
    if (action === "delete" && payload) {
      const keys  = Object.keys(payload);
      const raw   = keys.map(k => payload[k]);
      const vals  = sanitize(raw);
      const where = keys.map(k => `\`${k}\` = ?`).join(" AND ");
      const sql   = `DELETE FROM \`${entity}\` WHERE ${where}`;
      logger.info("SQL DELETE:", sql, "VALS:", vals);
      await conn.execute(sql, vals);
      res.send({ success: true });
      return;
    }

    // action invalide
    res.status(400).send({ error: "Action ou entity invalide." });
  } catch (err: any) {
    logger.error("Erreur interne:", err);
    res.status(500).send({ error: err.message });
  } finally {
    await conn.end();
  }
});