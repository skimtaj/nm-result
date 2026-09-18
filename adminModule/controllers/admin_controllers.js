require('dotenv').config();
const class_inserting_model = require("../models/class_inserting_model");
const result_model = require("../models/result_model");
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs/promises');
const nodemailer = require('nodemailer')
const path = require('path');
const exceljs = require('exceljs');
const bcryptjs = require('bcryptjs')
const guardian_feedback_model = require("../models/guardian_feedback_model");
const admin_signup_model = require("../models/admin_signup_model");
const student_admission_model = require('../models/student_admission_model');








const adminDashboard = async (req, res) => {



    const allStudents = await result_model.countDocuments();
    const totalBoys = await result_model.find({ section: 'Boys' });
    const totalGirls = await result_model.find({ section: 'Girls' });


    const totalBoysCount = totalBoys.length;
    const totalGirlsCount = totalGirls.length



    const adminSourse = await admin_signup_model.findById(req.adminId)

    const { search, current_class, section } = req.query;

    let query = {}

    const page = Number(req.query.page) || 1;
    const limit = 85;
    const skip = (page - 1) * limit;
    const serialNumber = skip;


    if (search) {
        query.student_name = {
            $regex: search,
            $options: "i"
        };
    }

    if (current_class) {
        query.current_class = current_class;
    }

    if (section) {
        query.section = section;
    }


    const totalDoc = await result_model.countDocuments(query);
    const totalPage = Math.ceil(totalDoc / limit);

    const allResults = await result_model.find(query).skip(skip).limit(limit);

    res.render('../adminModule/Views/admin_dashboard', { totalGirlsCount, totalBoysCount, allStudents, adminSourse, section, current_class, search, allResults, serialNumber, currentPage: page, totalPage, previousPage: page > 1 ? page - 1 : null, nextPage: page < totalPage ? page + 1 : null });
};

const addResult = async (req, res) => {

    const allClass = await class_inserting_model.find();


    res.render('../adminModule/Views/result_input_form', { allClass })
}

const addResultPost = async (req, res) => {

    try {

        const resultData = req.body;


        const existresult = await result_model.findOne({
            section: resultData.section,
            current_class: resultData.current_class,
            roll_no: resultData.roll_no
        });

        if (existresult) {
            req.flash('error', 'Result already exists');
            return res.redirect('/nababiamission/admin-dashboard/add-result');
        }


        if (
            resultData.current_class === "XI (Science)" ||
            resultData.current_class === "XI (Arts)" ||
            resultData.current_class === "XII (Science)" ||
            resultData.current_class === "XII (Arts)"
        ) {

            const optionalSubjects = resultData.result.filter(subject =>
                subject.subject !== "Bengali" &&
                subject.subject !== "English"
            );

            if (optionalSubjects.length > 0) {

                const lowestSubject = optionalSubjects.reduce((min, s) =>
                    Number(s.om) < Number(min.om) ? s : min
                );

                resultData.total_om =
                    Number(resultData.total_om) - Number(lowestSubject.om);

                resultData.total_fm =
                    Number(resultData.total_fm) - Number(lowestSubject.fm);

                resultData.result_percentage = Number(
                    ((Number(resultData.total_om) / Number(resultData.total_fm)) * 100).toFixed(2)
                );
            }
        }

        else {

            resultData.result_percentage = Number(
                ((Number(resultData.total_om) / Number(resultData.total_fm)) * 100).toFixed(2)
            );

        }



        // Result Status
        if (resultData.result_percentage >= 90) {
            resultData.result_status = "Outstanding";
        }
        else if (resultData.result_percentage >= 80) {
            resultData.result_status = "Excellent";
        }
        else if (resultData.result_percentage >= 70) {
            resultData.result_status = "Very Good";
        }
        else if (resultData.result_percentage >= 60) {
            resultData.result_status = "Good";
        }
        else if (resultData.result_percentage >= 50) {
            resultData.result_status = "Satisfactory";
        }
        else if (resultData.result_percentage >= 40) {
            resultData.result_status = "Needs Improvement";
        }
        else {
            resultData.result_status = "Unsatisfactory";
        }

        const new_result_model = new result_model(resultData);

        await new_result_model.save();

        req.flash('success', 'Result inserted successfully');
        return res.redirect('/nababiamission/admin-dashboard/add-result');

    }

    catch (err) {

        console.error(err);

        req.flash('error', 'Something went wrong. Please try again later');
        return res.status(500).redirect('/nababiamission/admin-dashboard/add-result');

    }
};

const addClass = (req, res) => {

    res.render('../adminModule/Views/class_inserting')

}

const addClassPost = async (req, res) => {
    try {

        const classInsertingData = req.body;

        const existClass = await class_inserting_model.findOne({ class_name: classInsertingData.class_name });

        if (existClass) {
            req.flash('error', 'Class already exist');
            return res.redirect('/nababiamission/admin-dashboard/add-class')
        }

        const new_class_inserting_model = class_inserting_model(classInsertingData);
        await new_class_inserting_model.save();

        console.log('Class insertung data', classInsertingData);
        req.flash('success', 'Class Inserted succssfully');
        return res.redirect('/nababiamission/admin-dashboard/add-class')

    }

    catch (err) {

        console.log('Class Inserting error', err);
        req.flash('error', 'Something went wrong. Please try again later');
        return res.redirect('/nababiamission/admin-dashboard/add-class')
    }
}

const viewResult = async (req, res) => {

    const resultSourse = await result_model.findById(req.params.id).populate('result');

    res.render('../adminModule/Views/view_result', { resultSourse })
}

const editResult = async (req, res) => {

    const allClass = await class_inserting_model.find();
    const resultSourse = await result_model.findById(req.params.id);

    res.render('../adminModule/Views/edit_result_form', { allClass, resultSourse })
}

const editResultPost = async (req, res) => {

    try {

        const editResultData = req.body;


        if (
            editResultData.current_class === "XI (Science)" ||
            editResultData.current_class === "XI (Arts)" ||
            editResultData.current_class === "XII (Science)" ||
            editResultData.current_class === "XII (Arts)"
        ) {

            const optionalSubjects = editResultData.result.filter(subject =>
                subject.subject !== "Bengali" &&
                subject.subject !== "English"
            );

            if (optionalSubjects.length > 0) {

                const lowestSubject = optionalSubjects.reduce((min, s) =>
                    Number(s.om) < Number(min.om) ? s : min
                );

                editResultData.total_om =
                    Number(editResultData.total_om) - Number(lowestSubject.om);

                editResultData.total_fm =
                    Number(editResultData.total_fm) - Number(lowestSubject.fm);

                editResultData.result_percentage = Number(
                    ((Number(editResultData.total_om) / Number(editResultData.total_fm)) * 100).toFixed(2)
                );
            }
        }

        else {

            editResultData.result_percentage = Number(
                (
                    (Number(editResultData.total_om) / Number(editResultData.total_fm)) * 100
                ).toFixed(2)
            );

        }


        if (editResultData.result_percentage >= 90) {
            editResultData.result_status = "Outstanding";
        }
        else if (editResultData.result_percentage >= 80) {
            editResultData.result_status = "Excellent";
        }
        else if (editResultData.result_percentage >= 70) {
            editResultData.result_status = "Very Good";
        }
        else if (editResultData.result_percentage >= 60) {
            editResultData.result_status = "Good";
        }
        else if (editResultData.result_percentage >= 50) {
            editResultData.result_status = "Satisfactory";
        }
        else if (editResultData.result_percentage >= 40) {
            editResultData.result_status = "Needs Improvement";
        }
        else {
            editResultData.result_status = "Unsatisfactory";
        }


        await result_model.findByIdAndUpdate(req.params.id, editResultData);

        req.flash("success", "Result updated successfully.");
        return res.redirect("/nababiamission/admin-dashboard");
    }

    catch (err) {

        const resultSourse = await result_model.findById(req.params.id);
        console.log('This is result update error', err);
        req.flash('error', 'Something is wrong');
        return res.redirect(`/nababiamission/admin-dashboard/edit-result/${resultSourse._id}`)
    }
}

const resultChecking = (req, res) => {

    res.render('../adminModule/Views/result_check')
}

const resultCheckingPost = async (req, res) => {

    try {

        const studentResultData = req.body;
        const studentResult = await result_model.findOne({ current_class: studentResultData.current_class, roll_no: studentResultData.roll_no, section: studentResultData.section })

        if (studentResult) {
            return res.redirect(`/nababiamission/student-result/${studentResult._id}`)
        }

        else {

            req.flash('error', 'Student does not exist');
            return res.redirect('/nababiamission/results/class-test-result')
        }
    }

    catch (err) {
        console.log('Result checking post erorr', err)
        req.flash('error', 'Something went wrong');
        return res.redirect('/nababiamission/results/class-test-result')
    }

}

const deleteResult = async (req, res) => {

    await result_model.findByIdAndDelete(req.params.id);
    req.flash('success', 'Result Deleted Successfully');
    return res.redirect('/nababiamission/admin-dashboard')
}

const studentResult = async (req, res) => {

    const studentResultSourse = await result_model.findById(req.params.id)

    res.render('../adminModule/Views/student_result_view', { studentResultSourse })
}

const downloadResult = async (req, res) => {

    try {

        const resultSourse = await result_model.findById(req.params.id)

        const inputPdfPath = path.join(__dirname, '../../nm-result/NM-RESULT (3).pdf');
        const existingPdfBytes = await fs.readFile(inputPdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        const firstPage = pdfDoc.getPage(0);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        let startY = 500;
        const rowHeight = 30;

        function drawLeft(page, text, col, y, size, font) {
            page.drawText(text, { x: col.left, y, size, font });
        }

        const colBounds = {
            subject: { left: 65, right: 85 },
            fm: { left: 270, right: 370 },
            om: { left: 430, right: 370 },
            student_name: { left: 150, right: 480 },
            section: { left: 500, right: 540 },
            current_class: { left: 250, right: 620 },
            roll_no: { left: 410, right: 620 },
            total_fm: { left: 200, right: 620 },
            total_om: { left: 200, right: 620 },
            result_percentage: { left: 200, right: 620 },
            result_status: { left: 200, right: 620 },
        };

        resultSourse.result.forEach((r, index) => {

            const y = startY - (index * rowHeight);

            drawLeft(firstPage, r.subject || '', colBounds.subject, y, 11, font);
            drawLeft(firstPage, String(r.fm) || '', colBounds.fm, y, 11, font);
            drawLeft(firstPage, String(r.om || 0), colBounds.om, y, 11, font);
        });


        const studentInfoY = 620;

        drawLeft(firstPage, resultSourse.student_name || '', colBounds.student_name, studentInfoY, 12, font);
        drawLeft(firstPage, resultSourse.section || '', colBounds.section, studentInfoY, 11, font);

        drawLeft(firstPage, resultSourse.current_class || '', colBounds.current_class, 590, 11, font);
        drawLeft(firstPage, String(resultSourse.roll_no || ''), colBounds.roll_no, 590, 11, font);

        drawLeft(firstPage, String(resultSourse.total_fm) || '', colBounds.total_fm, 180, 11, font);
        drawLeft(firstPage, String(resultSourse.total_om || ''), colBounds.total_om, 158, 11, font);
        drawLeft(firstPage, String(resultSourse.result_percentage || ''), colBounds.result_percentage, 135, 11, font);
        drawLeft(firstPage, resultSourse.result_status || '', colBounds.result_status, 115, 11, font);


        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Student_Result.pdf"');
        res.end(pdfBytes);

    }

    catch (err) {

        const resultSourse = await result_model.findById(req.params.id)
        console.log('This is studnet result download error', err);
        req.flash('error', 'PDF generating error');
        return res.redirect(`/nababiamission/student-result/${resultSourse._id}`)
    }
}

const guardianFeedback = async (req, res) => {

    const guardianFeedback = req.body;
    const new_guardian_feedback = guardian_feedback_model(guardianFeedback);
    await new_guardian_feedback.save();

    console.log(new_guardian_feedback)

    res.send('Thank you for your Feedback')
}

const guardianFeedbackList = async (req, res) => {

    const allFeedback = await guardian_feedback_model.find();

    res.render('../adminModule/Views/guardian_feedback', { allFeedback });
}

const deleteFeedback = async (req, res) => {

    await guardian_feedback_model.findByIdAndDelete(req.params.id);
    req.flash('success', 'Guardina feedback deleted successfully');
    return res.redirect('/nababiamission/admin-dashboard/guardian-feedback')
}



const downloadStudentResultNursery = async (req, res) => {
    try {

        const current_class = "Nursery";

        // Fetch all students of the class
        const studentResults = await result_model
            .find({ current_class })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");

        // ==========================
        // Collect all subjects
        // ==========================

        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];

        // ==========================
        // Header Row 1 & Row 2
        // ==========================

        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);

        // ==========================
        // Merge Cells
        // ==========================

        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);

        // ==========================
        // Header Style
        // ==========================

        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });

        // ==========================
        // Student Data
        // ==========================

        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });

        // ==========================
        // Data Row Style
        // ==========================

        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };


            });

        });

        // ==========================
        // Auto Width
        // ==========================

        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });

        // ==========================
        // Freeze Header
        // ==========================

        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        // ==========================
        // Response
        // ==========================

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultI = async (req, res) => {
    try {

        const current_class = "I";

        // Fetch all students of the class
        const studentResults = await result_model
            .find({ current_class })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultII = async (req, res) => {
    try {

        const current_class = "II";

        // Fetch all students of the class
        const studentResults = await result_model
            .find({ current_class })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultIII = async (req, res) => {
    try {

        const current_class = "III";

        // Fetch all students of the class
        const studentResults = await result_model
            .find({ current_class })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultIVB = async (req, res) => {
    try {

        const current_class = "IV";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultIVG = async (req, res) => {
    try {

        const current_class = "IV";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVB = async (req, res) => {
    try {

        const current_class = "V";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVG = async (req, res) => {
    try {

        const current_class = "V";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIB = async (req, res) => {
    try {

        const current_class = "VI";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIG = async (req, res) => {
    try {

        const current_class = "VI";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIIB = async (req, res) => {
    try {

        const current_class = "VII";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIIG = async (req, res) => {
    try {

        const current_class = "VII";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIIIB = async (req, res) => {
    try {

        const current_class = "VIII";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultVIIIG = async (req, res) => {
    try {

        const current_class = "VIII";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultIXB = async (req, res) => {
    try {

        const current_class = "IX";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultIXG = async (req, res) => {
    try {

        const current_class = "IX";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXB = async (req, res) => {
    try {

        const current_class = "X";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXG = async (req, res) => {
    try {

        const current_class = "X";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXIB = async (req, res) => {
    try {

        const current_class = "XI";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXIG = async (req, res) => {
    try {

        const current_class = "XI";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXIIB = async (req, res) => {
    try {

        const current_class = "XII";


        const studentResults = await result_model
            .find({ current_class, section: 'Boys' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};

const downloadStudentResultXIIG = async (req, res) => {
    try {

        const current_class = "XII";


        const studentResults = await result_model
            .find({ current_class, section: 'Girls' })
            .sort({ roll_no: 1 });

        if (!studentResults.length) {
            return res.status(404).send("No result found.");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Student Result");



        const subjectSet = new Set();

        studentResults.forEach(student => {
            (student.result || []).forEach(sub => {
                subjectSet.add(sub.subject);
            });
        });

        const subjects = [...subjectSet];



        const row1 = [
            "Student Name",
            "Roll No",
            "Class",
            "Section"
        ];

        const row2 = [
            "",
            "",
            "",
            ""
        ];

        subjects.forEach(subject => {
            row1.push(subject);
            row1.push("");

            row2.push("OM");
            row2.push("FM");
        });

        row1.push(
            "Total OM",
            "Total FM",
            "Percentage",
            "Status"
        );

        row2.push("", "", "", "");

        worksheet.addRow(row1);
        worksheet.addRow(row2);


        worksheet.mergeCells("A1:A2");
        worksheet.mergeCells("B1:B2");
        worksheet.mergeCells("C1:C2");
        worksheet.mergeCells("D1:D2");

        let col = 5;

        subjects.forEach(() => {
            worksheet.mergeCells(1, col, 1, col + 1);
            col += 2;
        });

        const summaryStart = col;

        worksheet.mergeCells(1, summaryStart, 2, summaryStart);
        worksheet.mergeCells(1, summaryStart + 1, 2, summaryStart + 1);
        worksheet.mergeCells(1, summaryStart + 2, 2, summaryStart + 2);
        worksheet.mergeCells(1, summaryStart + 3, 2, summaryStart + 3);



        [1, 2].forEach(rowNumber => {

            const row = worksheet.getRow(rowNumber);

            row.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "00A884" }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

            });

        });



        studentResults.forEach(student => {

            const row = [
                student.student_name,
                student.roll_no,
                student.current_class,
                student.section
            ];

            subjects.forEach(subject => {

                const marks = (student.result || []).find(
                    item => item.subject === subject
                );

                row.push(marks ? marks.om : "");
                row.push(marks ? marks.fm : "");

            });

            row.push(
                student.total_om,
                student.total_fm,
                `${student.result_percentage}%`,
                student.result_status
            );

            worksheet.addRow(row);

        });



        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber <= 2) return;

            row.eachCell(cell => {

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center"
                };

            });
        });


        worksheet.columns.forEach(column => {

            let maxLength = 12;

            column.eachCell({ includeEmpty: true }, cell => {

                const value = cell.value ? cell.value.toString() : "";

                if (value.length > maxLength) {
                    maxLength = value.length;
                }

            });

            column.width = maxLength + 3;

        });


        worksheet.views = [
            {
                state: "frozen",
                ySplit: 2
            }
        ];

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Student-Result-${current_class}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {

        console.error(err);
        res.status(500).send(err.message);

    }
};





















const adminCredential = (req, res) => {

    res.render('../adminModule/Views/admin_credential')

};

const adminSignup = (req, res) => {

    res.render('../adminModule/Views/admin_signup')

}

const adminSignupPost = async (req, res) => {

    try {

        const adminSignUpData = req.body;


        const existMobile = await admin_signup_model.findOne({ mobile: adminSignUpData.mobile });

        const existEmail = await admin_signup_model.findOne({ email: adminSignUpData.email });


        if (existMobile) {
            req.flash('error', 'Mobile number already exist');
            return res.redirect('/nababiamission/admin-signup/SSSSS')
        }


        if (existEmail) {
            req.flash('error', 'Email already exist');
            return res.redirect('/nababiamission/admin-signup/SSSSS')
        }

        const mobilePattern = /^[6-9]\d{9}$/;

        if (!mobilePattern.test(adminSignUpData.mobile)) {
            req.flash('error', 'Invalid mobile number');
            return res.redirect('/nababiamission/admin-signup/SSSSS')
        };


        const new_admin_signup_model = admin_signup_model(adminSignUpData);
        await new_admin_signup_model.save();

        console.log(new_admin_signup_model)

        req.flash('success', 'Account created successfully');
        return res.redirect('/nababiamission/nm-admin')
    }

    catch (err) {

        console.log('This is admin signup error', err);
        req.flash('error', 'Something is wrong, Please try again');
        return res.redirect('/nababiamission/admin-signup/SSSSS')
    }
}

const adminLoginPost = async (req, res) => {

    const adminLoginData = req.body;


    const adminEmail = await admin_signup_model.findOne({ email: adminLoginData.email });

    if (adminEmail) {

        const matchPassword = await bcryptjs.compare(adminLoginData.password, adminEmail.password);

        if (matchPassword) {

            const token = await adminEmail.adminTokenGenerate();

            res.cookie('adminToken', token, {
                httpOnly: true,
                secure: true,
                maxAge: 365 * 24 * 60 * 60 * 1000,
            });

            return res.redirect('/nababiamission/admin-dashboard')
        }

        else {
            req.flash('error', 'Incorrent Email or Password');
            return res.redirect('/nababiamission/nm-admin')
        }
    }

    else {
        req.flash('error', 'Incorrect login details');
        return res.redirect('/nababiamission/nm-admin')
    }

}

const adminLogout = (req, res, next) => {

    res.clearCookie('adminToken');
    req.flash('error', 'You are logged out succesfully')
    return res.redirect('/nababiamission/nm-admin');
    next()
}

const forgetPassword = async (req, res) => {

    const { email } = req.body;

    console.log('Email', email)
    const adminSourse = await admin_signup_model.findOne({ email: email });

    if (adminSourse) {

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.User,
                pass: process.env.Pass
            }
        });

        let mailOptions = {
            from: process.env.User,
            to: adminSourse.email,
            subject: 'Password Reset',
            text: `Hello ${adminSourse.name},

We received a request to reset the password for your Nababia Mission Admin account.

To create a new password, please click the link below:

http://localhost:3000/nababiamission/admin-credential/reset-password/${adminSourse._id}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        req.flash('success', 'Please check your Email');
        return res.redirect('/nababiamission/nm-admin')

    }

    else {

        req.flash('error', 'Email does not exist');
        return res.redirect('/nababiamission/nm-admin')
    }

}

const resetPassword = async (req, res) => {

    const adminSourse = await admin_signup_model.findById(req.params.id)

    res.render('../adminModule/Views/reset_password', { adminSourse })
}

const resetPasswordPost = async (req, res) => {

    try {

        const { new_password } = req.body

        const adminSourse = await admin_signup_model.findById(req.params.id);

        adminSourse.password = new_password;
        await adminSourse.save();

        req.flash('success', 'Password updated successfully');
        return res.redirect('/nababiamission/nm-admin')

    }

    catch (err) {

        const adminSourse = await admin_signup_model.findById(req.params.id);
        req.flash('error', 'Something is wrong');
        return res.redirect(`/nababiamission/admin-credential/reset-password/${adminSourse._id}`)

    }

}

const onlineAdmissionForm = (req, res) => {

    res.render('../adminModule/Views/online_admission_form')
}



const onlineAdmissionFormPost = async (req, res) => {

    try {

        const onlineAdmissionData = req.body;

        console.log(onlineAdmissionData);

        if (req.file) {
            onlineAdmissionData.student_photo = req.file.filename;
        }

        const formNoGenerateFunction = async () => {

            const countStudents = await student_admission_model.countDocuments();

            return String(countStudents + 1051);
        };

        onlineAdmissionData.form_no = await formNoGenerateFunction();



        const new_student_admission_model =
            student_admission_model(onlineAdmissionData);

        await new_student_admission_model.save();

        req.flash('success', 'Form submitted successfully');

        return res.redirect(
            `/nm/student-admission/${new_student_admission_model._id}`
        );

    } catch (err) {

        console.log(err);
        req.flash('error', err.message);

        return res.redirect('/apply-online');
    }
};

const downloadAdmissionForm = async (req, res) => {

    const studentSourse = await student_admission_model.findById(req.params.studentid)

    res.render('../adminModule/Views/admission_form_download', { studentSourse })
}

const downloadForm = async (req, res) => {
    try {

        const studentSourse = await student_admission_model.findById(
            req.params.studentid
        );



        const inputPdfPath = path.join(
            __dirname,
            '../../nm-result/student admission form (9) (1).pdf'
        );

        const existingPdfBytes = await fs.readFile(inputPdfPath);

        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const form = pdfDoc.getForm();



        form.getTextField('student_name').setText(
            studentSourse.student_name || ''
        );

        form.getTextField('dob').setText(
            studentSourse.dob || ''
        );

        form.getTextField('gender').setText(
            studentSourse.gender || ''
        );

        form.getTextField('student_adhaar_no').setText(
            studentSourse.student_adhaar_no || ''
        );

        form.getTextField('father_name').setText(
            studentSourse.father_name || ''
        );

        form.getTextField('father_adhaar_no').setText(
            studentSourse.father_adhaar_no || ''
        );

        form.getTextField('occupation').setText(
            studentSourse.occupation || ''
        );

        form.getTextField('relation_with_student').setText(
            studentSourse.relation_with_student || ''
        );

        form.getTextField('mobile_no').setText(
            studentSourse.mobile_no || ''
        );

        form.getTextField('mother_name').setText(
            studentSourse.mother_name || ''
        );

        form.getTextField('total_family_member').setText(
            studentSourse.total_family_member?.toString() || ''
        );

        form.getTextField('family_monthly_income').setText(
            studentSourse.family_monthly_income?.toString() || ''
        );

        form.getTextField('present_school_details').setText(
            studentSourse.present_school_details || ''
        );

        form.getTextField('present_class').setText(
            studentSourse.present_class || ''
        );

        form.getTextField('appling_for_class').setText(
            studentSourse.appling_for_class || ''
        );

        form.getTextField('full_address').setText(
            studentSourse.full_address || ''
        );

        form.getTextField('appling_date').setText(
            studentSourse.appling_date || ''
        );

        form.getTextField('residential_status').setText(
            studentSourse.residential_status || ''
        );

        form.getTextField('form_no').setText(
            studentSourse.form_no || ''
        );


        const firstPage = pdfDoc.getPage(0);

        if (studentSourse.student_photo) {

            const imagePath = path.join(
                __dirname,
                '../../uploads',
                studentSourse.student_photo
            );

            const imageBytes = await fs.readFile(imagePath);

            const fileExtension = path
                .extname(studentSourse.student_photo)
                .toLowerCase();

            let image;

            if (
                fileExtension === '.jpg' ||
                fileExtension === '.jpeg'
            ) {
                image = await pdfDoc.embedJpg(imageBytes);
            }

            else if (fileExtension === '.png') {
                image = await pdfDoc.embedPng(imageBytes);
            }

            if (image) {
                firstPage.drawImage(image, {
                    x: 506,
                    y: 690,
                    width: 75,
                    height: 110
                });

            }

            if (image) {
                firstPage.drawImage(image, {
                    x: 497,
                    y: 135,
                    width: 70,
                    height: 90
                });

            }

        }

        const pdfBytes = await pdfDoc.save();

        res.setHeader(
            'Content-Type',
            'application/pdf'
        );

        res.setHeader(
            'Content-Disposition',
            'attachment; filename="Student_Admission_Form.pdf"'
        );

        return res.end(pdfBytes);


    } catch (err) {

        console.log(
            'Admission form download error:',
            err
        );

        req.flash(
            'error',
            'Something is wrong while generating the admission form'
        );

        return res.redirect(
            `/nm/student-admission/${req.params.studentid}`
        );
    }
};


const onlineAdmissionData = async (req, res) => {

    const allOnlineAdmissionDocuments = await student_admission_model.find();

    res.render('../adminModule/Views/online_admission', { allOnlineAdmissionDocuments })
}

const deleteOnlineAdmissionCandidate = async (req, res) => {

    await student_admission_model.findByIdAndDelete(req.params.cadidateid);
    req.flash('success', 'Candidate deleted successfully');
    return res.redirect('/nababiamission/admin-dashboard/online-admission')
}

module.exports = { deleteOnlineAdmissionCandidate, onlineAdmissionData, downloadForm, downloadAdmissionForm, onlineAdmissionFormPost, onlineAdmissionForm, downloadStudentResultXIIG, downloadStudentResultXIIB, downloadStudentResultXIG, downloadStudentResultXIB, downloadStudentResultXG, downloadStudentResultXB, downloadStudentResultIXG, downloadStudentResultIXB, downloadStudentResultVIIIG, downloadStudentResultVIIIB, downloadStudentResultVIIG, downloadStudentResultVIIB, downloadStudentResultVIG, downloadStudentResultVIB, downloadStudentResultVG, downloadStudentResultVB, downloadStudentResultIVG, downloadStudentResultIVB, downloadStudentResultIII, downloadStudentResultII, downloadStudentResultI, downloadStudentResultNursery, resetPasswordPost, adminSignup, resetPassword, forgetPassword, adminLogout, adminLoginPost, adminSignupPost, adminCredential, deleteFeedback, guardianFeedbackList, guardianFeedback, downloadResult, resultCheckingPost, studentResult, deleteResult, resultChecking, editResultPost, editResult, viewResult, addResultPost, addClassPost, addClass, addResult, adminDashboard }