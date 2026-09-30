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
export const ADMIN = `/admin`;
export const OPERATIONS = `/operations`;
export const SALES = `/sales`;


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
export const APP_WORKFLOW_DRAWER = 'workflow_drawer'
export const APP_ROLE_DRAWER = 'role_drawer'
export const APP_MENU_DRAWER = 'menu_drawer'
export const APP_AUDIT_DETAIL_DRAWER = 'audit_detail_drawer'

// Operations page - tab / sub-tab selection
export const OPERATIONS_TAB = 'tab'
export const OPERATIONS_SUB_TAB = 'sub'

// Operations page - modals
export const APP_FACILITY_STAT_MODAL = 'facility_stat_modal'
export const APP_FACILITY_COHORTS_MODAL = 'facility_cohorts_modal'
export const APP_FACILITY_UNIT_MODAL = 'facility_unit_modal'
// Processing record modals take "true" to add, or a record id to edit.
export const APP_BATCH_MODAL = 'batch_modal'
export const APP_ORDER_REQUEST_MODAL = 'order_request_modal'
export const APP_YIELD_ENTRY_MODAL = 'yield_entry_modal'
export const APP_PRODUCT_MODAL = 'product_modal'
export const APP_STOCK_CARD_MODAL = 'stock_card_modal'
export const APP_MACHINE_USAGE_MODAL = 'machine_usage_modal'
export const APP_VEHICLE_TRACKING_MODAL = 'vehicle_tracking_modal'
export const APP_VEHICLE_REFUELING_MODAL = 'vehicle_refueling_modal'

// Sales page - tab selection
export const SALES_TAB = 'tab'
/** "produce" selects Fresh Produce; absent means EPL Poultry. */
export const SALES_DIVISION = 'division'

// Sales page - modals
export const APP_PRODUCTION_MODAL = 'production_modal'
export const APP_SALE_MODAL = 'sale_modal'
export const APP_FEED_COST_MODAL = 'feed_cost_modal'
export const APP_STOCK_MODAL = 'stock_modal'
export const APP_PACKHOUSE_INTAKE_MODAL = 'packhouse_intake_modal'
export const APP_PRODUCE_SALE_MODAL = 'produce_sale_modal'
export const APP_PRODUCE_WEEK_MODAL = 'produce_week_modal'
