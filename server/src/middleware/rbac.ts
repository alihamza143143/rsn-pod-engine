// ─── Role-Based Access Control Middleware ────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { UserRole, hasRoleAtLeast } from '@rsn/shared';
import { ForbiddenError, UnauthorizedError } from './errors';

/**
 * Requires that req.user exists and has one of the specified roles.
 * Also grants access to any role higher in the hierarchy than the
 * highest allowed role (so admin/super_admin always pass).
 * Must be used AFTER authenticate middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRole = req.user.role;

    // Direct match
    if (allowedRoles.includes(userRole)) {
      next();
      return;
    }

    // Hierarchy: allow if user's role is at least as high as any allowed role
    const passes = allowedRoles.some(r => hasRoleAtLeast(userRole, r));
    if (passes) {
      next();
      return;
    }

    next(new ForbiddenError(`Role '${userRole}' does not have access. Required: ${allowedRoles.join(', ')}`));
  };
}

/**
 * Requires the user to be the resource owner OR have an admin/host role.
 * The ownerIdExtractor function gets the owner ID from the request.
 */
export function requireOwnerOrRole(
  ownerIdExtractor: (req: Request) => string | undefined,
  ...fallbackRoles: UserRole[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const ownerId = ownerIdExtractor(req);

    // If user is the owner, allow
    if (ownerId && req.user.userId === ownerId) {
      next();
      return;
    }

    // If user has a fallback role (direct or via hierarchy), allow
    if (fallbackRoles.length > 0 && fallbackRoles.some(r => hasRoleAtLeast(req.user!.role, r))) {
      next();
      return;
    }

    next(new ForbiddenError('You do not have permission to access this resource'));
  };
}
