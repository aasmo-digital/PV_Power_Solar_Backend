const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/auth.routes.js');
const leadRoutes = require('./routes/lead.routes.js');
const optionsRoutes = require('./routes/options.routes.js');
const adminRoutes = require("./routes/admin.routes.js");
const superadminRoutes = require('./routes/superadmin.routes.js');

const app = express();
connectDB();

app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/options', optionsRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});