const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log("Incoming token:", token);

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    req.user = decoded;

    if (!req.user.id) {
      return res.status(400).json({ message: 'Invalid token structure. User ID missing.' });
    }

    next();
  } catch (error) {
    console.log("JWT Error:", error.message); 
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Generic Role Check function
const checkRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. You are not a ${role}.` });
    }
    next();
  };
};

// Multiple Roles Check function
const checkRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Requires role: ${roles.join(", ")}` });
    }
    next();
  };
};

// Individual role functions (optional, for direct use like before)
const isSuperAdmin = checkRole("superadmin");
const isAdmin = checkRole("admin");
const isTelecaller = checkRole("telecaller");
const isFieldExecutive = checkRole("fieldexecutive");
const isInstallationAdmin = checkRole("installation_admin");
const isMPEBAdmin = checkRole("mpeb_admin");
const isLoanAdmin = checkRole("loan_admin");
const isAccountingAdmin = checkRole("accounting_admin");

// Example for multiple roles
const isAdminOrSuperAdmin = checkRoles("admin", "superadmin");
const isTelecallerOrFieldExecutive = checkRoles("telecaller", "fieldexecutive");

module.exports = {
  authenticate,
  isSuperAdmin,
  isAdmin,
  isTelecaller,
  isFieldExecutive,
  isInstallationAdmin,
  isMPEBAdmin,
  isLoanAdmin,
  isAccountingAdmin,
  isAdminOrSuperAdmin,
  isTelecallerOrFieldExecutive,
  checkRole,
  checkRoles
};
