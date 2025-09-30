const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // Ensure this path is correct

exports.register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      contactNo,
      altContactNo,
      state,
      district,
      city,
      area,
      password,
      role,
      age,
      qualifications,
    } = req.body || {};

    // Profile Image URL (from DigitalOcean Spaces via multer + uploadToSpaces)
    let profileImage = null;
    if (req.file && req.file.location) {
      profileImage = req.file.location;
    } else if (req.body.profileImage) { // Fallback if image comes as URL directly
      profileImage = req.body.profileImage;
    }

    // Required field check (adjust as per your needs for different roles)
    if (
      !profileImage ||
      !fullName ||
      !email ||
      !contactNo ||
      !state ||
      !district ||
      !city ||
      !password ||
      !role
    ) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Validate role
    if (!User.schema.path("role").enumValues.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Password hashing is handled by pre-save hook in user.model.js
    const newUser = new User({
      profileImage,
      fullName,
      email,
      contactNo,
      altContactNo,
      state,
      district,
      city,
      area,
      password, // Hashing done in model
      role,
      age,
      qualifications,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "✅ User registered successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        profileImage: newUser.profileImage,
        contactNo: newUser.contactNo,
        state: newUser.state,
        district: newUser.district,
        city: newUser.city
      }
    });
  } catch (err) {
    console.error("❌ Register Error:", err);
    res.status(500).json({ message: "Server error occurred. Please try again later." });
  }
};

// Login User (for all roles)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const isMatch = await user.comparePassword(password); // Using method from user.model.js
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // Increased expiry
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        contactNo: user.contactNo,
        state: user.state,
        district: user.district,
        city: user.city
      }
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error occurred", errorCode: "SERVER_ERROR" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // यहाँ आप pagination, sorting, filtering के लिए req.query का उपयोग कर सकते हैं
    const { page, limit, sortBy, sortDirection, globalSearch, role, city, state } = req.query;

    let query = {};

    // रोल-आधारित फ़िल्टर
    if (role) {
      query.role = role;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    // ग्लोबल सर्च फ़िल्टर
    if (globalSearch) {
      const searchRegex = { $regex: globalSearch, $options: 'i' };
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { contactNo: searchRegex },
        { role: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
      ];
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    let sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortDirection === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // डिफ़ॉल्ट रूप से नए को पहले
    }

    const users = await User.find(query)
      .select("-password") // सिक्योरिटी के लिए पासवर्ड न भेजें
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalUsers = await User.countDocuments(query); // कुल यूज़र्स की संख्या

    res.status(200).json({
      data: users,
      total: totalUsers,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ message: "Server error occurred while fetching users." });
  }
};

// ************ नया फंक्शन: यूज़र अपडेट करें ************
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      // पासवर्ड अपडेट होने पर हैश करें
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error occurred while updating user." });
  }
};

// ************ नया फंक्शन: यूज़र डिलीट करें ************
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error occurred while deleting user." });
  }
};

exports.getAssignableUsers = async (req, res) => {
    try {
        const assignableRoles = ["fieldexecutive", "installation_admin", "mpeb_admin", "loan_admin", "accounting_admin"];
        
        const users = await User.find({ role: { $in: assignableRoles } })
                                .select("fullName role profileImage"); // प्रोफाइल इमेज भी भेजें यदि आप Avatar में उपयोग करना चाहते हैं

        res.status(200).json({ data: users, total: users.length });
    } catch (error) {
        console.error("Error in getAssignableUsers:", error);
        res.status(500).json({ message: "Server error occurred while fetching assignable users." });
    }
};