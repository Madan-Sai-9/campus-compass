/**
 * Role Check Checkpoint Middleware
 * Restricts route invocation to authorized administrative system tiers
 */
const requireStaffPrivileges = (permittedRoles = ['coordinator', 'senior', 'admin']) => {
  return (req, res, next) => {
    // req.user is populated earlier by authenticateToken middleware
    if (!req.user || !permittedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access Denied: Your account security clearance is insufficient to broadcast content." 
      });
    }
    next();
  };
};

export { requireStaffPrivileges };
