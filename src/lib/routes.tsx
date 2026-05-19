import { createRoute } from "./utils";

export const SIGN_IN = "/auth/sign-in";
export const SIGN_UP = '/auth/register';
export const RESET_PASSWORD = '/auth/reset-password';
export const RESET_PASSWORD_SIGN_IN = '/auth/reset-password/sign-in';
export const RESET_PASSWORD_OTP = '/auth/reset-password/otp';


export const APP_DEFAULT_PAGE = () => '/dashboard';
// export const DASHBOARD = (id: string) => createRoute([id, 'dashboard']);

export const CONFIG = `/configurations`;
export const PARAMETERS = `parameters`
export const NOTIFICATIONS = `/notifications`;


// export const BILLING_REPORT = "/reports/billing-report";
// export const OUTSTANDING_BALANCE = "/reports/outstanding-balance";
// export const STUDENT_NOT_BILLED = "/reports/student-not-billed";
// export const DASHBOARD = `/dashboard`;

//Query Parameter
export const APP_DRAWER = 'drawer'
export const APP_CANCEL_DIALOG = 'cancel_dialog'
export const APP_ERP_SETTINGS_DIALOG = 'ces_dialog'
export const APP_FEE_ITEM_DIALOG = 'cfi_dialog'
export const APP_IMPORT_DIALOG = 'imp_dialog'
export const APP_FETCH_SUCCESS_DIALOG = 'fs_dialog'
export const APP_STUDENT_BILL_DIALOG = 'sb_dialog'
export const APP_MISCELLANEOUS_BILL_DIALOG = 'mb_dialog'
export const APP_PAYMENT_HISTORY_DIALOG = 'ph_dialog'
export const APP_CREDIT_NOTE_DIALOG = 'cn_dialog'
export const APP_REQUISITION_DRAWER = 'req_drawer'
export const APP_ITEM_REQUEST_DRAWER = 'item_req_drawer'
export const APP_INCIDENT_DRAWER = 'incident_drawer'
export const APP_MONTHLY_REPORT_DRAWER = 'monthly_report_drawer'
export const APP_ADD_USER_DRAWER = 'add_user_drawer'
export const APP_UPDATE_USER_DRAWER = 'update_user_drawer'
export const APP_ADD_DEPARTMENT_DRAWER = 'add_dept_drawer'
export const APP_EDIT_DEPARTMENT_DRAWER = 'edit_dept_drawer'