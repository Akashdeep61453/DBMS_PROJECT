const express = require("express");
const oracledb = require("oracledb");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ---------------- DB CONFIG ----------------
const dbConfig = {
    user: "ASINGH15_BE24_SCHEMA_J0VNR",
    password: "#30OFEQEQJOBEAN8iALMTWW4N4MZ9X",
    connectString: "tcps://db.freesql.com:2484/23ai_34ui2"
};

// ---------------- TEST CONNECTION ----------------
async function testConnection() {
    try {
        const con = await oracledb.getConnection(dbConfig);
        console.log("Connected to Oracle Free SQL");
        await con.close();
    } catch (err) {
        console.log("Oracle Connection ERROR:", err.message);
    }
}
testConnection();


// ---------------- ADD STUDENT ----------------
app.post("/student", async (req, res) => {
    let con;
    try {
        const { name, course, contact, age } = req.body;

        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `INSERT INTO STUDENT (STUDENT_ID, NAME, COURSE, CONTACT, AGE)
             VALUES (student_seq.NEXTVAL, :name, :course, :contact, :age)`,
            { name, course, contact, age }
        );

        await con.commit();
        res.send("Student Added Successfully");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- GET STUDENTS ----------------
app.get("/students", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(
            `SELECT * FROM STUDENT ORDER BY STUDENT_ID`
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- ALLOCATE ROOM ----------------
app.post("/allocate", async (req, res) => {
    let con;
    try {
        const { student_id, room_id } = req.body;

        con = await oracledb.getConnection(dbConfig);

        const check = await con.execute(
            `SELECT COUNT(*) CNT FROM ALLOCATION WHERE STUDENT_ID = :student_id`,
            { student_id }
        );

        const count = check.rows[0].CNT;

        if (count > 0) {
            return res.send("Student already has a room");
        }

        await con.execute(
            `INSERT INTO ALLOCATION (ALLOC_ID, STUDENT_ID, ROOM_ID)
             VALUES (alloc_seq.NEXTVAL, :student_id, :room_id)`,
            { student_id, room_id }
        );

        await con.execute(
            `UPDATE ROOM 
             SET OCCUPIED = NVL(OCCUPIED,0) + 1
             WHERE ROOM_ID = :room_id`,
            { room_id }
        );

        await con.commit();

        res.send("Room Allocated Successfully");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- DEALLOCATE ROOM ----------------
app.post("/deallocate", async (req, res) => {
    let con;
    try {
        const student_id = Number(req.body.student_id);

        con = await oracledb.getConnection(dbConfig);

        // 1. get room
        const result = await con.execute(
            `SELECT ROOM_ID FROM ALLOCATION WHERE STUDENT_ID = :id`,
            { id: student_id }
        );

        if (result.rows.length === 0) {
            return res.send("No allocation found for this student");
        }

        const room_id = result.rows[0].ROOM_ID;

        // 2. delete allocation
        await con.execute(
            `DELETE FROM ALLOCATION WHERE STUDENT_ID = :id`,
            { id: student_id }
        );

        // 3. safely decrease occupancy (IMPORTANT FIX)
        await con.execute(
            `UPDATE ROOM 
             SET OCCUPIED = CASE 
                 WHEN NVL(OCCUPIED,0) > 0 THEN OCCUPIED - 1 
                 ELSE 0 
             END
             WHERE ROOM_ID = :room_id`,
            { room_id }
        );

        await con.commit();

        res.send(`Student ${student_id} deallocated from room ${room_id}`);

    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});

// ---------------- ROOMS ----------------
app.get("/rooms", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(`
            SELECT ROOM_ID, CAPACITY, OCCUPIED,
            CASE 
                WHEN NVL(OCCUPIED,0) >= CAPACITY THEN 'Occupied'
                ELSE 'Available'
            END AS STATUS
            FROM ROOM
            ORDER BY ROOM_ID
        `);

        res.json(result.rows);

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- ALLOCATIONS ----------------
app.get("/allocations", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(`
            SELECT a.ALLOC_ID, a.STUDENT_ID, s.NAME, a.ROOM_ID
            FROM ALLOCATION a
            JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
            ORDER BY a.ALLOC_ID
        `);

        res.json(result.rows);

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- COMPLAINT ----------------
app.post("/complaint", async (req, res) => {
    let con;
    try {
        const { student_id, description } = req.body;

        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `INSERT INTO COMPLAINT (COMPLAINT_ID, STUDENT_ID, DESCRIPTION, STATUS)
             VALUES (complaint_seq.NEXTVAL, :student_id, :description, 'Pending')`,
            { student_id, description }
        );

        await con.commit();
        res.send("Complaint Added");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- COMPLAINTS ----------------
app.get("/complaints", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(`
            SELECT c.COMPLAINT_ID, c.STUDENT_ID, s.NAME,
                   c.DESCRIPTION, c.STATUS
            FROM COMPLAINT c
            INNER JOIN STUDENT s ON c.STUDENT_ID = s.STUDENT_ID
            ORDER BY c.COMPLAINT_ID
        `);

        res.json(result.rows);

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- RESOLVE COMPLAINT ----------------
app.put("/complaint/:id", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `UPDATE COMPLAINT 
             SET STATUS = 'RESOLVED'
             WHERE COMPLAINT_ID = :id`,
            { id: Number(req.params.id) }
        );

        await con.commit();
        res.send("Resolved");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- DELETE STUDENT ----------------
app.delete("/student/:id", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `DELETE FROM STUDENT WHERE STUDENT_ID = :id`,
            { id: Number(req.params.id) }
        );

        await con.commit();
        res.send("Student Deleted");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});


// ---------------- START SERVER ----------------
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});