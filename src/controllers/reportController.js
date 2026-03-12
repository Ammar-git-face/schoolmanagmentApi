// =====================================================
// controllers/reportCardController.js  (FINAL — with school name/logo)
// npm install pdfkit
// =====================================================
const PDFDocument = require("pdfkit")
const Result  = require("../models/result")
const Student = require("../models/student")
const School  = require("../models/school")

const getGrade = (t) => {
    if (t >= 90) return "A+"; if (t >= 80) return "A"
    if (t >= 70) return "B";  if (t >= 60) return "C"
    if (t >= 50) return "D";  return "F"
}
const getGradeRemark = (t) => {
    if (t >= 90) return "Excellent";   if (t >= 80) return "Very Good"
    if (t >= 70) return "Good";        if (t >= 60) return "Average"
    if (t >= 50) return "Below Avg";   return "Fail"
}
const ordinal = (n) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
const gradeHex = (g) => {
    if (!g) return "#6b7280"
    if (g.startsWith("A")) return "#16a34a"
    if (g.startsWith("B")) return "#2563eb"
    if (g.startsWith("C")) return "#d97706"
    return "#dc2626"
}
const scoreHex = (val, max) => {
    if (val == null) return "#6b7280"
    const p = (val / max) * 100
    if (p >= 80) return "#16a34a"; if (p >= 60) return "#2563eb"
    if (p >= 40) return "#d97706"; return "#dc2626"
}

// GET /result/report-card/:studentId?term=First Term&session=2024/2025
exports.generateReportCard = async (req, res) => {
    try {
        const { studentId } = req.params
        const { term, session } = req.query

        if (!term || !session)
            return res.status(400).json({ error: "term and session are required" })

        // 1. Fetch student
        const student = await Student.findById(studentId).lean()
        if (!student) return res.status(404).json({ error: "Student not found" })

        // 2. ✅ Fetch school using schoolCode from student (or from req.schoolCode via middleware)
        const schoolCode = student.schoolCode || req.schoolCode
        const school = await School.findOne({ schoolCode }).lean()
        const schoolName = school?.name || "School Management System"
        const schoolLogo = school?.logo || null  // base64 data URL or null

        // 3. Fetch approved results
        const results = await Result.find({ studentId, term, approved: true }).lean()
        if (!results.length)
            return res.status(404).json({ error: "No approved results found for this term" })

        // 4. Average + grade
        const avg = Math.round(results.reduce((s, r) => s + (r.total || 0), 0) / results.length)
        const overallGrade = getGrade(avg)

        // 5. Position in class
        const classmates = await Result.find({
            term, approved: true, schoolCode, studentClass: student.studentClass
        }).lean()
        const avgMap = {}
        classmates.forEach(r => {
            if (!avgMap[r.studentId]) avgMap[r.studentId] = []
            if (r.total != null) avgMap[r.studentId].push(r.total)
        })
        const ranked = Object.entries(avgMap)
            .map(([id, scores]) => ({ id, avg: scores.reduce((a,b) => a+b,0)/scores.length }))
            .sort((a, b) => b.avg - a.avg)
        const posIdx = ranked.findIndex(s => s.id.toString() === studentId.toString())
        const position = posIdx >= 0 ? posIdx + 1 : null
        const totalInClass = ranked.length

        const teacherRemark   = results[0]?.teacherRemark   || "No remark provided"
        const principalRemark = results[0]?.principalRemark || "No remark provided"

        // ─────────────────────────────────────
        // 6. Build PDF
        // ─────────────────────────────────────
        const doc = new PDFDocument({ margin: 0, size: "A4" })
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition",
            `attachment; filename="${student.fullname}_${term}.pdf"`)
        doc.pipe(res)

        const PW = 595.28, PH = 841.89
        const ML = 40, W = PW - ML - 40

        // ── Header ───────────────────────────
        doc.rect(0, 0, PW, 88).fill("#1e40af")

        if (schoolLogo) {
            // Draw logo on left — base64 PNG/JPEG
            try {
                const imgData = schoolLogo.split(",")[1] || schoolLogo
                const mimeMatch = schoolLogo.match(/data:(image\/\w+);/)
                const mime = mimeMatch ? mimeMatch[1] : "image/png"
                doc.image(Buffer.from(imgData, "base64"), ML, 14, {
                    width: 60, height: 60, fit: [60, 60], align: "center", valign: "center"
                })
            } catch (e) { /* logo failed silently — still render text */ }
        }

        // School name — centered or shifted right if logo present
        const textX = schoolLogo ? ML + 70 : ML
        const textW = schoolLogo ? W - 70  : W
        doc.fillColor("white")
            .font("Helvetica-Bold").fontSize(18)
            .text(schoolName, textX, 16, { width: textW, align: schoolLogo ? "left" : "center" })
        doc.font("Helvetica").fontSize(9)
            .text("Student Academic Report Card", textX, 42, { width: textW, align: schoolLogo ? "left" : "center" })
        doc.fontSize(8)
            .text(`${term}  ·  ${session}`, textX, 58, { width: textW, align: schoolLogo ? "left" : "center" })

        // ── Student info strip ───────────────
        const infoY = 102
        doc.roundedRect(ML, infoY, W, 52, 6).strokeColor("#e5e7eb").lineWidth(1).stroke()

        doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("STUDENT NAME", ML+14, infoY+10)
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text(student.fullname, ML+14, infoY+22)

        doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("CLASS", ML+220, infoY+10)
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text(student.studentClass||"—", ML+220, infoY+22)

        doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("ADMISSION NO.", ML+380, infoY+10)
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text(student.admissionNumber||"—", ML+380, infoY+22)

        // ── Stats row ────────────────────────
        const statsY = infoY + 66
        const statW  = (W - 20) / 3
        const stats  = [
            { label: "AVERAGE SCORE",    value: `${avg} / 100`,                           color: "#2563eb" },
            { label: "OVERALL GRADE",    value: overallGrade,                              color: gradeHex(overallGrade) },
            { label: "POSITION IN CLASS",value: position ? `${ordinal(position)} of ${totalInClass}` : "—", color: "#7c3aed" }
        ]
        stats.forEach((s, i) => {
            const x = ML + i * (statW + 10)
            doc.roundedRect(x, statsY, statW, 48, 6).fill("#f0f9ff")
            doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text(s.label, x+10, statsY+9, { width: statW-20 })
            doc.fillColor(s.color).font("Helvetica-Bold").fontSize(15).text(s.value, x+10, statsY+22, { width: statW-20 })
        })

        // ── Results table ────────────────────
        const tableY = statsY + 62
        const ROW_H  = 22
        const cols   = [
            { label: "SUBJECT",     x: ML,       w: 142 },
            { label: "TEST (20)",   x: ML+146,   w: 50  },
            { label: "NOTE (20)",   x: ML+200,   w: 50  },
            { label: "ASSIGN (10)", x: ML+254,   w: 52  },
            { label: "EXAM (50)",   x: ML+310,   w: 50  },
            { label: "TOTAL",       x: ML+364,   w: 50  },
            { label: "GRADE",       x: ML+418,   w: 38  },
            { label: "REMARK",      x: ML+460,   w: 95  },
        ]

        // Header
        doc.rect(ML, tableY, W, ROW_H+2).fill("#1e40af")
        doc.fillColor("white").font("Helvetica-Bold").fontSize(7)
        cols.forEach(c => doc.text(c.label, c.x+2, tableY+7, { width: c.w-4, align: "center" }))

        // Rows
        results.forEach((r, i) => {
            const rowY = tableY + ROW_H + 2 + i * ROW_H
            doc.rect(ML, rowY, W, ROW_H).fill(i % 2 === 0 ? "#f8fafc" : "#ffffff")
            doc.fillColor("#111827").font("Helvetica").fontSize(8.5)
                .text(r.subject||"—", cols[0].x+6, rowY+7, { width: cols[0].w-8 })
            const vals  = [r.test, r.note, r.assignment, r.exam, r.total]
            const maxes = [20, 20, 10, 50, 100]
            vals.forEach((v, si) => {
                const c = cols[si+1]
                doc.fillColor(scoreHex(v, maxes[si])).font("Helvetica-Bold").fontSize(8.5)
                    .text(v??'—', c.x+2, rowY+7, { width: c.w-4, align: "center" })
            })
            const g = r.grade || getGrade(r.total)
            doc.fillColor(gradeHex(g)).font("Helvetica-Bold").fontSize(8.5)
                .text(g, cols[6].x+2, rowY+7, { width: cols[6].w-4, align: "center" })
            doc.fillColor("#6b7280").font("Helvetica").fontSize(7.5)
                .text(getGradeRemark(r.total), cols[7].x+3, rowY+7, { width: cols[7].w-4 })
            doc.moveTo(ML, rowY+ROW_H).lineTo(ML+W, rowY+ROW_H).strokeColor("#e5e7eb").lineWidth(0.5).stroke()
        })

        const tableH = ROW_H + 2 + results.length * ROW_H
        doc.rect(ML, tableY, W, tableH).strokeColor("#d1d5db").lineWidth(1).stroke()
        cols.slice(1).forEach(c => {
            doc.moveTo(c.x, tableY).lineTo(c.x, tableY+tableH).strokeColor("#e5e7eb").lineWidth(0.5).stroke()
        })

        // ── Remark boxes ─────────────────────
        const remarkY = tableY + tableH + 18
        const boxW    = (W - 10) / 2
        doc.roundedRect(ML, remarkY, boxW, 55, 6).strokeColor("#e5e7eb").lineWidth(1).stroke()
        doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("CLASS TEACHER'S REMARK", ML+10, remarkY+10)
        doc.fillColor("#111827").font("Helvetica").fontSize(9)
            .text(teacherRemark, ML+10, remarkY+22, { width: boxW-20, lineGap: 2 })

        const b2x = ML + boxW + 10
        doc.roundedRect(b2x, remarkY, boxW, 55, 6).strokeColor("#e5e7eb").lineWidth(1).stroke()
        doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("PRINCIPAL'S REMARK", b2x+10, remarkY+10)
        doc.fillColor("#111827").font("Helvetica").fontSize(9)
            .text(principalRemark, b2x+10, remarkY+22, { width: boxW-20, lineGap: 2 })

        // ── Signatures ───────────────────────
        const sigY = remarkY + 72
        doc.moveTo(ML+10, sigY).lineTo(ML+160, sigY).strokeColor("#9ca3af").lineWidth(0.8).stroke()
        doc.fillColor("#374151").font("Helvetica").fontSize(8).text("Class Teacher's Signature", ML+10, sigY+5)
        doc.moveTo(b2x+10, sigY).lineTo(b2x+160, sigY).strokeColor("#9ca3af").lineWidth(0.8).stroke()
        doc.fillColor("#374151").font("Helvetica").fontSize(8).text("Principal's Signature", b2x+10, sigY+5)

        // ── Footer ───────────────────────────
        doc.rect(0, PH-26, PW, 26).fill("#1e40af")
        doc.fillColor("white").font("Helvetica").fontSize(7)
            .text(
                `${schoolName}  ·  Generated ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}`,
                ML, PH-16, { width: W, align: "center" }
            )

        doc.end()

    } catch (err) {
        console.error("generateReportCard:", err.message)
        if (!res.headersSent) res.status(500).json({ error: err.message })
    }
}