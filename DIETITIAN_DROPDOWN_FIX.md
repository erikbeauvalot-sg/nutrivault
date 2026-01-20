# Fix: Dietitian Dropdown Only Showing Admin

## Problem
When creating a Visit in the VisitModal, the dietitian dropdown only showed "Admin" as the only option. Other active dietitians were not appearing in the list.

## Root Cause
The issue was a **permission/authorization problem** at the backend API level:

1. The VisitModal was trying to fetch all users using `userService.getUsers()`
2. This endpoint (`GET /api/users`) required `ADMIN` role (via `requireRole('ADMIN')` middleware)
3. When a non-admin user (e.g., DIETITIAN) tried to access it, they received a **403 Forbidden** error
4. The frontend had a fallback in the error handler that only added the current logged-in user to the dietitian list
5. Result: Only the Admin user (or whoever was logged in) appeared in the dropdown

## Solution
Created a **new dedicated endpoint** specifically for fetching dietitians that:
- Does NOT require admin role
- Only returns active DIETITIAN and ADMIN users
- Is accessible to any authenticated user
- Filters out inactive users automatically

### Backend Changes

**1. New Route: `GET /api/users/list/dietitians`**

File: `/backend/src/routes/users.js`

```javascript
router.get(
  '/list/dietitians',
  authenticate,  // Only requires authentication, not ADMIN role
  userController.getDietitians
);
```

**2. New Controller Method**

File: `/backend/src/controllers/userController.js`

```javascript
exports.getDietitians = async (req, res, next) => {
  try {
    const result = await userService.getDietitians();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
```

**3. New Service Method**

File: `/backend/src/services/user.service.js`

```javascript
async function getDietitians() {
  const dietitians = await User.findAll({
    where: {
      is_active: true  // Only active users
    },
    attributes: { exclude: ['password_hash'] },
    include: [{
      model: Role,
      as: 'role',
      attributes: ['id', 'name', 'description'],
      where: {
        name: ['DIETITIAN', 'ADMIN']  // Both DIETITIAN and ADMIN
      },
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    }],
    order: [['first_name', 'ASC'], ['last_name', 'ASC']]
  });

  return dietitians;
}
```

### Frontend Changes

**1. Add Service Method**

File: `/frontend/src/services/userService.js`

```javascript
export const getDietitians = async () => {
  const response = await api.get('/api/users/list/dietitians');
  return response;
};
```

**2. Update VisitModal**

File: `/frontend/src/components/VisitModal.jsx`

```javascript
const fetchDietitians = async () => {
  try {
    // Use new dietitians-only endpoint
    const response = await userService.getDietitians();
    const data = response.data || response;
    
    console.log('👥 Dietitians from API:', data);
    
    // Already filtered by backend, use directly
    setDietitians(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('❌ Error fetching dietitians:', err);
    // Fallback: only current user
    setDietitians([{
      id: user.id,
      username: user.username,
      first_name: user.first_name || user.username,
      last_name: user.last_name || ''
    }]);
  }
};
```

**3. Improved Display Name Logic**

```javascript
{dietitians.map(dietitian => {
  const displayName = dietitian.first_name || dietitian.last_name 
    ? `${dietitian.first_name || ''} ${dietitian.last_name || ''}`.trim()
    : dietitian.username;
  return (
    <option key={dietitian.id} value={dietitian.id}>
      {displayName} ({dietitian.username})
    </option>
  );
})}
```

## Files Modified

### Backend:
- ✅ `/backend/src/routes/users.js` - Added new `/list/dietitians` route
- ✅ `/backend/src/controllers/userController.js` - Added `getDietitians()` method
- ✅ `/backend/src/services/user.service.js` - Added `getDietitians()` service method

### Frontend:
- ✅ `/frontend/src/services/userService.js` - Added `getDietitians()` method
- ✅ `/frontend/src/components/VisitModal.jsx` - Updated `fetchDietitians()` and dropdown rendering

## How to Verify

1. **Restart backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Clear browser cache** (or open DevTools, disable cache, reload):
   - F12 → Application → Clear site data

3. **Test as Dietitian user**:
   - Login as: `dietitian` / `Dietitian123!`
   - Navigate to Visits → Create Visit
   - Click on "Dietitian" dropdown
   - ✅ Should see multiple dietitians listed (at least Admin and the dietitian user)

4. **Test as Assistant user** (optional):
   - Login as: `assistant` / `Assistant123!`
   - Navigate to Visits → Create Visit
   - Dietitian dropdown should still work

5. **Check browser console**:
   - F12 → Console
   - Should see: `👥 Dietitians from API: [...]` with all dietitians listed

## Technical Details

### Why This Approach?

1. **Authorization Separation**: Different endpoints for different use cases
   - `GET /api/users` - Full user management (admin only)
   - `GET /api/users/list/dietitians` - Dietitian list for assignment (all authenticated users)

2. **Performance**: The new endpoint only fetches active dietitians, not all users

3. **Security**: Non-admin users can't access full user list, only see dietitians

4. **Flexibility**: Can be extended later for other lists (e.g., `/api/users/list/supervisors`)

### Route Order Important

The new route MUST come before the `/:id` route in the router:
```javascript
// Specific routes first
router.get('/list/dietitians', ...);

// Generic routes after
router.get('/:id', ...);
```

If the order is reversed, `/list/dietitians` would be treated as a UUID parameter.

## Testing Recommendations

- [ ] Login as different roles and verify each sees the correct dietitian list
- [ ] Verify active/inactive status filtering works
- [ ] Check that dietitian dropdown still works after creating a visit
- [ ] Test on different browsers to ensure cache doesn't hide the fix

## Prevention for Future

When adding dropdown lists that fetch from the backend:
1. Consider what role needs to access the data
2. Create specific endpoints with appropriate permission levels
3. Don't reuse admin-only endpoints for general features
4. Test with non-admin user before considering done

---

**Last Updated**: January 9, 2026  
**Status**: ✅ Ready for Testing
