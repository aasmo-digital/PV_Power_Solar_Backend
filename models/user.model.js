const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const rolesEnum = [
    "superadmin",
    "admin",
    "telecaller",
    "fieldexecutive",
    "installation_admin",
    "mpeb_admin",
    "loan_admin",
    "accounting_admin"
];

const statesEnum = ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Gujarat"];
const districtsEnum = ["Indore", "Bhopal", "Ujjain", "Nagpur", "Jaipur", "Ahmedabad"];
const citiesEnum = ["Indore City", "Bhopal City", "Ujjain City", "Nagpur City", "Jaipur City", "Ahmedabad City"];
const areasEnum = ["Vijay Nagar", "Rajwada", "TT Nagar", "Old City", "Civil Lines", "Shivaji Nagar"];

const userSchema = new mongoose.Schema(
    {
        profileImage: { type: String, required: true },
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        contactNo: { type: String, required: true },
        altContactNo: { type: String },

        state: { type: String, enum: statesEnum, required: true },
        district: { type: String, enum: districtsEnum, required: true },
        city: { type: String, enum: citiesEnum, required: true },
        area: { type: String, enum: areasEnum },

        age: { type: Number },
        qualifications: { type: String },

        password: { type: String, required: true },

        role: { type: String, enum: rolesEnum, required: true },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
