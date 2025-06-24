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
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Timezone-Offset");
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
  // Apply client timezone offset if provided (in minutes)
  const tzOffsetHeader = req.get("X-Timezone-Offset");
  if (tzOffsetHeader) {
    const offsetMin = parseInt(tzOffsetHeader, 10);
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    const minutes = Math.abs(offsetMin) % 60;
    const zone = `${offsetMin <= 0 ? "+" : "-"}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    await conn.query("SET time_zone = ?", [zone]);
  }

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

      // liste des modules avec type_module majeur/mineur (pour toolbar admin)
      if (entity === "ModuleOptions") {
        const sql = `
          SELECT m.id_module, m.nommodule, 'majeur' AS type_module
          FROM AssociationModules a
          JOIN module_thematique m ON m.id_module = a.id_module_majeur
          UNION ALL
          SELECT m.id_module, m.nommodule, 'mineur' AS type_module
          FROM AssociationModules a
          JOIN module_thematique m ON m.id_module = a.id_module_mineur
        `;
        logger.info("SQL LIST MODULEOPTIONS:", sql);
        const [rows] = await conn.query<RowDataPacket[]>(sql);
        res.send({ success: true, data: rows });
        return;
      }

      // ─── Cours special branch ──────────────────────────────────────────────
      if (entity === "Cours") {
        // determine role and id as in getRole
        // admin
        const [admRows] = await conn.query<
          (RowDataPacket & { id_intervenant: number })[]
        >(
          "SELECT id_intervenant FROM intervenants WHERE mailreferent = ? AND referent = 1",
          [email]
        );
        if (admRows.length) {
          const sql = `
            SELECT
              c.*,
              CONCAT(s.batiment, ' ', s.numerosalle) AS salle,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id_intervenant', i.id_intervenant,
                  'nom', i.nom,
                  'prenom', i.prenom
                )
              ) AS intervenants,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id_module', cm.id_module,
                  'type_module', cm.type_module
                )
              ) AS modules
            FROM Cours c
            LEFT JOIN effectuer ef ON ef.id_cours = c.id_cours
            LEFT JOIN salles s ON s.id_salle = ef.id_salle
            LEFT JOIN enseigner en ON en.id_cours = c.id_cours
            LEFT JOIN intervenants i ON i.id_intervenant = en.id_intervenant
            LEFT JOIN CoursModules cm ON cm.id_cours = c.id_cours
            GROUP BY c.id_cours
          `;
          logger.info("SQL LIST COURS ADMIN:", sql);
          const [rows] = await conn.query<RowDataPacket[]>(sql);
          // parse JSON arrays
          const data = (rows as any[]).map(r => ({
            ...r,
            intervenants: r.intervenants ? JSON.parse(r.intervenants as string) : [],
            modules: r.modules ? JSON.parse(r.modules as string) : [],
          }));
          res.send({ success: true, data });
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
          const intervenantId = intRows[0].id_intervenant;
          const sql = `
            SELECT
              c.*,
              CONCAT(s.batiment, ' ', s.numerosalle) AS salle,
              JSON_ARRAYAGG(DISTINCT
                JSON_OBJECT(
                  'id_intervenant', i2.id_intervenant,
                  'nom', i2.nom,
                  'prenom', i2.prenom
                )
              ) AS intervenants,
              JSON_ARRAYAGG(DISTINCT
                JSON_OBJECT(
                  'id_module', cm.id_module,
                  'type_module', cm.type_module
                )
              ) AS modules
            FROM Cours c
            LEFT JOIN effectuer ef  ON ef.id_cours = c.id_cours
            LEFT JOIN salles s      ON s.id_salle  = ef.id_salle
            LEFT JOIN enseigner en  ON en.id_cours = c.id_cours
            LEFT JOIN intervenants i2 ON i2.id_intervenant = en.id_intervenant
            LEFT JOIN CoursModules cm ON cm.id_cours = c.id_cours
            LEFT JOIN intervenir iv   ON iv.id_module = cm.id_module
            WHERE en.id_intervenant = ? OR iv.id_intervenant = ?
            GROUP BY c.id_cours
          `;
          logger.info("SQL LIST COURS INTERVENANT:", sql, "VALS:", [intervenantId, intervenantId]);
          const [rows] = await conn.query<RowDataPacket[]>(sql, [intervenantId, intervenantId]);
          const data = (rows as any[]).map(r => ({
            ...r,
            intervenants: r.intervenants ? JSON.parse(r.intervenants as string) : [],
            modules: r.modules ? JSON.parse(r.modules as string) : [],
          }));
          res.send({ success: true, data });
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
          const eleveId = eleRows[0].id_eleve;
          // Fetch parcours of the student
          const [parcoursRows] = await conn.query<
            (RowDataPacket & { parcours: string })[]
          >(
            "SELECT parcours FROM eleves WHERE id_eleve = ?",
            [eleveId]
          );
          const parcoursEleve = parcoursRows.length ? parcoursRows[0].parcours : null;
          const sql = `
            SELECT
              c.*,
              CONCAT(s.batiment, ' ', s.numerosalle) AS salle,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id_intervenant', i.id_intervenant,
                  'nom', i.nom,
                  'prenom', i.prenom
                )
              ) AS intervenants,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id_module', cm.id_module,
                  'type_module', cm.type_module
                )
              ) AS modules
            FROM Cours c
            LEFT JOIN effectuer ef ON ef.id_cours = c.id_cours
            LEFT JOIN salles s ON s.id_salle = ef.id_salle
            LEFT JOIN enseigner en ON en.id_cours = c.id_cours
            LEFT JOIN intervenants i ON i.id_intervenant = en.id_intervenant
            LEFT JOIN CoursModules cm ON cm.id_cours = c.id_cours
            LEFT JOIN etudier et ON et.id_eleve = ?
            WHERE 
              (
                (cm.type_module = 'majeur' AND cm.id_module = et.id_module_majeur)
                OR (cm.type_module = 'mineur' AND cm.id_module = et.id_module_mineur)
              )
              AND (c.parcours = 'Tous' OR c.parcours = ?)
            GROUP BY c.id_cours
          `;
          logger.info("SQL LIST COURS ELEVE:", sql, "VALS:", [eleveId, parcoursEleve]);
          const [rows] = await conn.query<RowDataPacket[]>(sql, [eleveId, parcoursEleve]);
          const data = (rows as any[]).map(r => ({
            ...r,
            intervenants: r.intervenants ? JSON.parse(r.intervenants as string) : [],
            modules: r.modules ? JSON.parse(r.modules as string) : [],
          }));
          res.send({ success: true, data });
          return;
        }
        // sinon
        res.status(403).send({ error: "Accès refusé : non inscrit(e)." });
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

    // ─── INSERT réservation salle (effectuer) avec vérif de conflit ────────────────────
    if (action === "insert" && entity === "effectuer" && payload) {
      const { id_salle, id_cours } = payload as { id_salle: number; id_cours: number };
      // Récupère les horaires du cours cible
      const [[times]] = await conn.query<RowDataPacket[]>(
        "SELECT debut_cours, fin_cours FROM Cours WHERE id_cours = ?",
        [id_cours]
      );
      const { debut_cours, fin_cours } = times as any;
      // Vérifie si la salle est déjà réservée sur cette plage
      const [conflicts] = await conn.query<RowDataPacket[]>(
        `SELECT c.id_cours
         FROM Cours c
         JOIN effectuer ef ON ef.id_cours = c.id_cours
         WHERE ef.id_salle = ?
           AND c.id_cours <> ?
           AND NOT (c.fin_cours <= ? OR c.debut_cours >= ?)
         LIMIT 1`,
        [id_salle, id_cours, debut_cours, fin_cours]
      );
      if ((conflicts as any[]).length > 0) {
        res.status(400).send({ error: "Salle déjà réservée pour ce créneau." });
        return;
      }
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

    // ─── UPDATE réservation salle (effectuer) avec vérif de conflit ────────────────────
    if (action === "update" && entity === "effectuer" && payload) {
      const { id_salle, id_cours } = payload as { id_salle: number; id_cours: number };
      // Récupère les horaires du cours cible
      const [[times]] = await conn.query<RowDataPacket[]>(
        "SELECT debut_cours, fin_cours FROM Cours WHERE id_cours = ?",
        [id_cours]
      );
      const { debut_cours, fin_cours } = times as any;
      // Vérifie si la salle est déjà réservée sur cette plage
      const [conflicts] = await conn.query<RowDataPacket[]>(
        `SELECT c.id_cours
         FROM Cours c
         JOIN effectuer ef ON ef.id_cours = c.id_cours
         WHERE ef.id_salle = ?
           AND c.id_cours <> ?
           AND NOT (c.fin_cours <= ? OR c.debut_cours >= ?)
         LIMIT 1`,
        [id_salle, id_cours, debut_cours, fin_cours]
      );
      if ((conflicts as any[]).length > 0) {
        res.status(400).send({ error: "Salle déjà réservée pour ce créneau." });
        return;
      }
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