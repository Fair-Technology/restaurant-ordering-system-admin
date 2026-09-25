import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { baseApi } from '../../services/baseApi';
import type { StaffSession } from './staffSession';
import { writeStaffSession } from './staffSession';

// Staff sign-in is a client-side navigation, so the RTK Query cache from the
// previous person on this tablet is still in memory. Cached responses such as
// the shop (which carries callerRole/callerPermissions) are keyed by shopId
// only, so without a reset the new staff member would see the previous
// member's nav and data until a full reload.
export function startStaffSession(dispatch: Dispatch<UnknownAction>, session: StaffSession): void {
  dispatch(baseApi.util.resetApiState());
  writeStaffSession(session);
}
