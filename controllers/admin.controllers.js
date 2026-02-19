const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Admin============================================================================================
exports.register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: "Admin already exists", errorCode: "ADMIN_EXISTS" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    admin = new Admin({ email, password: hashedPassword });
    await admin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Error during admin registration:", error.message);
    res.status(500).json({ message: "Server error occurred. Please try again later.", errorCode: "SERVER_ERROR" });
  }
};

// Login Admin================================================================================================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  try {
    let user = await Admin.findOne({ email });
    let role = "admin";

    if (!user) {
      user = await SubAdmin.findOne({ email });
      role = "sub-admin";
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.status(200).json({ message: "Login successful", token, role });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error occurred", errorCode: "SERVER_ERROR" });
  }
};

