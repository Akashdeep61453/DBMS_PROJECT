-- This SQL  PLSQL code from my online freesql site
--  SECTION 1: TABLES

CREATE TABLE Student (
    Student_ID NUMBER PRIMARY KEY,
    Name VARCHAR2(100) NOT NULL,
    Course VARCHAR2(50),
    Contact VARCHAR2(15)
);

CREATE TABLE Room (
    Room_ID NUMBER PRIMARY KEY,
    Capacity NUMBER NOT NULL,
    Occupied NUMBER DEFAULT 0,
    Room_Type VARCHAR2(20) DEFAULT 'Standard',
    CONSTRAINT chk_capacity CHECK (Occupied <= Capacity)
);

CREATE TABLE Allocation (
    Alloc_ID NUMBER PRIMARY KEY,
    Student_ID NUMBER UNIQUE, -- prevents duplicate allocation
    Room_ID NUMBER,
    Alloc_Date DATE DEFAULT SYSDATE,
    FOREIGN KEY (Student_ID) REFERENCES Student(Student_ID),
    FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID)
);

CREATE TABLE Payment (
    Payment_ID NUMBER PRIMARY KEY,
    Student_ID NUMBER,
    Amount NUMBER,
    Payment_Date DATE DEFAULT SYSDATE,
    FOREIGN KEY (Student_ID) REFERENCES Student(Student_ID)
);

CREATE TABLE Complaint (
    Complaint_ID NUMBER PRIMARY KEY,
    Student_ID NUMBER,
    Description VARCHAR2(200),
    Status VARCHAR2(20) DEFAULT 'Pending',
    FOREIGN KEY (Student_ID) REFERENCES Student(Student_ID)
);

--  SECTION 2: SEQUENCES

CREATE SEQUENCE student_seq START WITH 1;
CREATE SEQUENCE room_seq START WITH 101;
CREATE SEQUENCE alloc_seq START WITH 1;
CREATE SEQUENCE payment_seq START WITH 1;
CREATE SEQUENCE complaint_seq START WITH 1;

--  SECTION 3: TRIGGERS

-- Increase occupancy
CREATE OR REPLACE TRIGGER trg_room_inc
AFTER INSERT ON Allocation
FOR EACH ROW
BEGIN
    UPDATE Room
    SET Occupied = Occupied + 1
    WHERE Room_ID = :NEW.Room_ID;
END;
/

-- Decrease occupancy
CREATE OR REPLACE TRIGGER trg_room_dec
AFTER DELETE ON Allocation
FOR EACH ROW
BEGIN
    UPDATE Room
    SET Occupied = Occupied - 1
    WHERE Room_ID = :OLD.Room_ID;
END;
/

--  SECTION 4: PROCEDURES

SET SERVEROUTPUT ON;

-- Add Student
CREATE OR REPLACE PROCEDURE Add_Student(
    p_name VARCHAR2,
    p_course VARCHAR2,
    p_contact VARCHAR2
) IS
    v_id NUMBER;
BEGIN
    v_id := student_seq.NEXTVAL;
    INSERT INTO Student VALUES (v_id, p_name, p_course, p_contact);
    DBMS_OUTPUT.PUT_LINE('Student Added ID: ' || v_id);
END;
/

-- Add Room
CREATE OR REPLACE PROCEDURE Add_Room(
    p_capacity NUMBER,
    p_type VARCHAR2
) IS
    v_id NUMBER;
BEGIN
    v_id := room_seq.NEXTVAL;
    INSERT INTO Room (Room_ID, Capacity, Room_Type)
    VALUES (v_id, p_capacity, p_type);
    DBMS_OUTPUT.PUT_LINE('Room Added: ' || v_id);
END;
/

-- Smart Room Allocation
CREATE OR REPLACE PROCEDURE Allocate_Room(p_student_id NUMBER) IS
    v_room NUMBER;
    v_count NUMBER;
BEGIN
    -- Check if student already has room
    SELECT COUNT(*) INTO v_count
    FROM Allocation
    WHERE Student_ID = p_student_id;

    IF v_count > 0 THEN
        DBMS_OUTPUT.PUT_LINE('Student already has a room');
        RETURN;
    END IF;

    -- Find best available room
SELECT Room_ID INTO v_room
FROM (
    SELECT Room_ID
    FROM Room
    WHERE Occupied < Capacity
    ORDER BY (Capacity - Occupied) DESC
)
WHERE ROWNUM = 1;

    INSERT INTO Allocation
    VALUES (alloc_seq.NEXTVAL, p_student_id, v_room, SYSDATE);

    DBMS_OUTPUT.PUT_LINE('Allocated Room ' || v_room || ' to student ' || p_student_id);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('No rooms available');
    WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);

END;
/

-- Add Payment
CREATE OR REPLACE PROCEDURE Add_Payment(
    p_student_id NUMBER,
    p_amount NUMBER
) IS
BEGIN
    INSERT INTO Payment
    VALUES (payment_seq.NEXTVAL, p_student_id, p_amount, SYSDATE);

    DBMS_OUTPUT.PUT_LINE('Payment Added for Student ' || p_student_id);
END;
/

-- Add Complaint
CREATE OR REPLACE PROCEDURE Add_Complaint(
    p_student_id NUMBER,
    p_desc VARCHAR2
) IS
BEGIN
    INSERT INTO Complaint (Complaint_ID, Student_ID, Description)
    VALUES (complaint_seq.NEXTVAL, p_student_id, p_desc);

    DBMS_OUTPUT.PUT_LINE('Complaint Registered for Student ' || p_student_id);
END;
/

--  SECTION 5: VIEW

CREATE OR REPLACE VIEW Available_Rooms AS
SELECT *
FROM Room
WHERE Occupied < Capacity;

-- Join
SELECT s.Name, r.Room_ID, r.Room_Type
FROM Student s
JOIN Allocation a ON s.Student_ID = a.Student_ID
JOIN Room r ON r.Room_ID = a.Room_ID;

-- GROUP BY
SELECT s.Name, SUM(p.Amount) AS Total_Payment
FROM Student s
JOIN Payment p ON s.Student_ID = p.Student_ID
GROUP BY s.Name;

-- HAVING
SELECT s.Name, SUM(p.Amount) AS Total
FROM Student s
JOIN Payment p ON s.Student_ID = p.Student_ID
GROUP BY s.Name
HAVING SUM(p.Amount) > 1000;

-- Subquery
SELECT Name
FROM Student
WHERE Student_ID NOT IN (SELECT Student_ID FROM Allocation);

-- Full rooms
SELECT Room_ID
FROM Room
WHERE Occupied = Capacity;

-- UPDATE
UPDATE Complaint
SET Status = 'Resolved'
WHERE Complaint_ID = 1;


--  SECTION 9: CHECK OUTPUT

BEGIN Add_Student('Akashdeep', 'CSE', '9876543210'); END;
/
BEGIN Add_Student('Rohit', 'CSE', '9876543211'); END;
/

BEGIN Add_Room(2, 'Double'); END;
/
BEGIN Add_Room(3, 'Double'); END;
/
BEGIN Add_Room(4,'Double'); END;
/

BEGIN Add_Room(5,'Double'); END;
/
BEGIN Add_Room(6,'Double'); END;
/
BEGIN Add_Room(7,'Double'); END;
/
BEGIN Add_Room(8,'Double'); END;
/
BEGIN Add_Room(9,'Double'); END;
/
BEGIN Add_Room(10,'Double'); END;
/
BEGIN Add_Room(11,'Double'); END;
/

BEGIN Allocate_Room(41); END;
/
BEGIN Allocate_Room(42); END;
/

BEGIN Add_Payment(1, 1500); END;
/
BEGIN Add_Complaint(1, 'Fan not working'); END;
/

--  SECTION 7: TRANSACTION CONTROL

BEGIN
    Add_Student('TestUser', 'CSE', '9999999999');
    COMMIT;
END;
/
BEGIN
    Add_Student('TempUser', 'ECE', '8888888888');
    ROLLBACK;
END;
/
ALTER TABLE STUDENT ADD AGE NUMBER;
SELECT * FROM Student;
SELECT * FROM Room;
SELECT * FROM Allocation;
SELECT * FROM Available_Rooms;
SELECT * FROM Complaint;

CREATE INDEX idx_alloc_student ON ALLOCATION(STUDENT_ID);


