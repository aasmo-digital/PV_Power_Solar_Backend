const express = require('express');
require('dotenv').config();
const cors = require('cors')
const adminRoutes = require("./routes/admin.routes.js")
const authRoutes = require('./routes/auth.routes.js');
const superadmin = require('./routes/superadmin.routes.js');
const accounting = require('./routes/accountingadmin.routes.js');
const fieldExecutive = require('./routes/fieldexecutive.routes.js');
const installation = require('./routes/installationadmin.routes.js');
const loan = require('./routes/loanadmin.routes.js');
const mpeb = require('./routes/mpebadmin.routes.js');
const telecaller = require('./routes/telecaller.routes.js');
const connectDB = require('./config/db.js');


const app = express();
connectDB();
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadmin);
app.use('/api/accounting', accounting);
app.use('/api/field/executive', fieldExecutive);
app.use('/api/installation', installation);
app.use('/api/loan', loan);
app.use('/api/mpeb', mpeb);
app.use('/api/telecaller', telecaller);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Server running on port${PORT}`);
})
