const mongoose = require("mongoose");

const stageDetailSchema = new mongoose.Schema({
    status: { type: String, default: 'Pending' },
    email: { type: String },
    district: { type: String },
    amount: { type: Number },
    remark: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date },
});

const leadSchema = new mongoose.Schema(
    {
        leadNo: { type: String, unique: true },
        name: { type: String, required: true },
        contactNumber: { type: String },
        solarKv: { type: String },
        paymentType: { type: String, enum: ['Cash', 'Loan'], default: 'Cash' },
        solarCompany: { type: String },
        plant_1: stageDetailSchema,
        mpeb_1: stageDetailSchema,
        account_1: stageDetailSchema,
        portal_1: stageDetailSchema,
        bank: stageDetailSchema,
        loan_1: stageDetailSchema,
        installation_1: stageDetailSchema,
        account_2: stageDetailSchema,
        portal_2: stageDetailSchema,
        installation_2: stageDetailSchema,
        account_3: stageDetailSchema,
        mpeb_2: stageDetailSchema,
        meter_sn: {
            serialNumber: { type: String },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            updatedAt: { type: Date },
        },
        loan_2: stageDetailSchema,
        account_4: stageDetailSchema,
        portal_3: stageDetailSchema,
        dcr_invoice: {
            value: { type: String },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            updatedAt: { type: Date },
        },
        totalProjectCost: { type: Number, default: 0 },
        tat: { type: String },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        currentStage: { type: String, default: 'plant_1' },
        statusHistory: [
            {
                stage: { type: String, required: true },
                status: { type: String, required: true },
                updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                updatedAt: { type: Date, default: Date.now },
                remark: String,
                amount: Number,
            }
        ],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

leadSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastLead = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
        let nextId = 1;
        if (lastLead && lastLead.leadNo) {
            const lastId = parseInt(lastLead.leadNo.substring(1), 10);
            nextId = lastId + 1;
        }
        this.leadNo = 'N' + String(nextId).padStart(9, '0');
    }
    next();
});

leadSchema.virtual('receivedAmount').get(function () {
    const amounts = [
        this.account_1?.amount,
        this.account_2?.amount,
        this.account_3?.amount,
        this.account_4?.amount,
    ];
    return amounts.reduce((total, amount) => total + (amount || 0), 0);
});

leadSchema.virtual('pendingAmount').get(function () {
    return (this.totalProjectCost || 0) - this.receivedAmount;
});

module.exports = mongoose.model("Lead", leadSchema);