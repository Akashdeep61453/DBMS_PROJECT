const express = require("express");
const oracledb = require("oracledb");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const dbConfig = {
    user: "ASINGH15_BE24_SCHEMA_J0VNR",
    password: "1NUNI8VTRP3BHQEZY5DYAG0XBkP!RF",
    connectString: "tcps://db.freesql.com:2484/23ai_34ui2"
};

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

app.post("/student", async (req, res) => {
    let con;
    try {
        const { name, course, contact } = req.body;

        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `INSERT INTO STUDENT (STUDENT_ID, NAME, COURSE, CONTACT)
             VALUES (student_seq.NEXTVAL, :name, :course, :contact)`,
            { name, course, contact }
        );

        await con.commit();

        res.send("Student Added Successfully");
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});

app.get("/rooms", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(
            `SELECT ROOM_ID, CAPACITY, OCCUPIED,
                    CASE 
                        WHEN OCCUPIED >= CAPACITY THEN 'Occupied'
                        ELSE 'Available'
                    END AS STATUS
             FROM ROOM
             ORDER BY ROOM_ID`
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});
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
app.post("/allocate", async (req, res) => {
    let con;
    try {
        const { student_id, room_id } = req.body;

        con = await oracledb.getConnection(dbConfig);

        const check = await con.execute(
            `SELECT COUNT(*) AS CNT FROM ALLOCATION WHERE STUDENT_ID = :student_id`,
            { student_id }
        );

        if (check.rows[0].CNT > 0) {
            await con.close();
            return res.send("Student already has a room");
        }

        await con.execute(
            `INSERT INTO ALLOCATION (ALLOC_ID, STUDENT_ID, ROOM_ID)
             VALUES (alloc_seq.NEXTVAL, :student_id, :room_id)`,
            { student_id, room_id }
        );

        await con.commit();

        res.send("Room Allocated Successfully");

    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});
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
app.get("/allocations", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        const result = await con.execute(
            `SELECT a.ALLOC_ID, s.NAME, a.ROOM_ID
             FROM ALLOCATION a
             JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
             ORDER BY a.ALLOC_ID`
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});
app.delete("/student/:id", async (req, res) => {
    let con;
    try {
        con = await oracledb.getConnection(dbConfig);

        await con.execute(
            `DELETE FROM STUDENT WHERE STUDENT_ID = :id`,
            { id: req.params.id }
        );

        await con.commit();

        res.send("Student Deleted");
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (con) await con.close();
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});